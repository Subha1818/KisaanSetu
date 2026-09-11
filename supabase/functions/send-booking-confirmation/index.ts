import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSMS } from '../_shared/httpsms.ts'

serve(async (req) => {
  try {
    // Only allow authorized requests (e.g., from pg_net trigger using service key or valid auth token)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const bookingId = body?.booking_id
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing booking_id parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Initialize Supabase admin client to bypass RLS for this background notification
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Check idempotency: avoid duplicate confirmation SMS if already processed
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('type', 'booking_confirmation')
      .eq('channel', 'sms')
      .maybeSingle()

    if (existingNotification) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Confirmation SMS already recorded for this booking.',
        skipped: true 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch booking details along with farmer, centre, and date info
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        farmer_id,
        token,
        product_name,
        quantity,
        booking_dates!inner(date),
        procurement_centres(name),
        users!inner(mobile_number, name)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      console.error(`Booking not found or error fetching booking ${bookingId}:`, fetchError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Booking not found', 
        details: fetchError?.message 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const centreName = (booking.procurement_centres as any)?.name || 'the procurement centre'
    const dateStr = (booking.booking_dates as any)?.date || 'scheduled date'
    const mobileNumber = (booking.users as any)?.mobile_number
    const token = booking.token || 'N/A'
    const quantity = booking.quantity
    const crop = booking.product_name

    // 3. Compose concise confirmation SMS
    const message = `Booking confirmed! Token ${token} at ${centreName} on ${dateStr} for ${quantity}kg ${crop}. Track queue: https://kisaansetu.vercel.app/farmer`

    // 4. Validate farmer mobile number
    if (!mobileNumber) {
      console.error(`Missing mobile number for farmer ${booking.farmer_id} on booking ${bookingId}`)
      await supabase.from('notifications').insert({
        user_id: booking.farmer_id,
        booking_id: booking.id,
        type: 'booking_confirmation',
        channel: 'sms',
        message: message,
        delivery_status: 'failed'
      })

      return new Response(JSON.stringify({
        success: false,
        error: 'Farmer mobile number missing',
        delivery_status: 'failed'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Send SMS via shared httpSMS helper
    let smsSent = false
    try {
      smsSent = await sendSMS(mobileNumber, message)
    } catch (smsErr) {
      console.error(`sendSMS exception for booking ${bookingId}:`, smsErr)
      smsSent = false
    }

    // 6. Record notification record in database regardless of SMS delivery outcome
    const { error: notifInsertError } = await supabase.from('notifications').insert({
      user_id: booking.farmer_id,
      booking_id: booking.id,
      type: 'booking_confirmation',
      channel: 'sms',
      message: message,
      delivery_status: smsSent ? 'sent' : 'failed'
    })

    if (notifInsertError) {
      console.error(`Failed to insert notification record for booking ${bookingId}:`, notifInsertError)
    }

    return new Response(JSON.stringify({
      success: true,
      delivered: smsSent,
      delivery_status: smsSent ? 'sent' : 'failed',
      booking_id: booking.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('send-booking-confirmation uncaught error:', error)
    // Return graceful 200/500 without crashing caller
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Internal Server Error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
