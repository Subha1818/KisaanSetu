import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSMS } from '../_shared/httpsms.ts'

serve(async (req) => {
  try {
    // Only allow authorized requests (e.g., from pg_cron using anon or service key)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // We use the service role key to bypass RLS for this background job
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate tomorrow's date in YYYY-MM-DD
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // 1. Fetch bookings for tomorrow that are booked/called
    // We need to join with users to get the mobile_number, and booking_dates to filter the date
    const { data: targetBookings, error: fetchError } = await supabase
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
      .in('status', ['booked', 'called'])
      .eq('booking_dates.date', tomorrowStr)

    if (fetchError) {
      throw fetchError
    }

    if (!targetBookings || targetBookings.length === 0) {
      return new Response(JSON.stringify({ message: 'No bookings to remind.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch existing sms reminders for these bookings to prevent duplicates
    const bookingIds = targetBookings.map(b => b.id)
    const { data: existingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('booking_id')
      .in('booking_id', bookingIds)
      .eq('type', 'reminder_1day')
      .eq('channel', 'sms')

    if (notifError) throw notifError

    const alreadyRemindedIds = new Set(existingNotifications?.map(n => n.booking_id) || [])

    // 3. Filter out ones already reminded
    const toRemind = targetBookings.filter(b => !alreadyRemindedIds.has(b.id))

    let successCount = 0
    let failCount = 0

    // 4. Send SMS and log notification
    for (const booking of toRemind) {
      try {
        const farmerName = booking.users.name.split(' ')[0]
        const centreName = booking.procurement_centres?.name || 'the procurement centre'
        const mobileNumber = booking.users.mobile_number
        const dateStr = booking.booking_dates.date

        // Template message
        const message = `Reminder: Hi ${farmerName}, you have a booking tomorrow (${dateStr}) at ${centreName} to drop off ${booking.quantity}kg of ${booking.product_name}. Your token is ${booking.token}.`

        // Send SMS
        const smsSent = await sendSMS(mobileNumber, message)

        // Log to notifications table regardless of success, tracking the delivery_status
        await supabase.from('notifications').insert({
          user_id: booking.farmer_id,
          booking_id: booking.id,
          type: 'reminder_1day',
          channel: 'sms',
          message: message,
          delivery_status: smsSent ? 'sent' : 'failed'
        })

        if (smsSent) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error(`Error processing reminder for booking ${booking.id}:`, err)
        failCount++
        // Continue to the next booking despite individual failure
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: toRemind.length, 
      sent: successCount, 
      failed: failCount,
      skipped: alreadyRemindedIds.size 
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-booking-reminders error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
