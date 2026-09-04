import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSMS } from '../_shared/httpsms.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mobile_number } = await req.json()

    if (!mobile_number) {
      return new Response(JSON.stringify({ error: 'mobile_number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with SERVICE_ROLE key to bypass RLS on otp_verifications and users
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if mobile number is already registered in public.users
    const formattedClean = mobile_number.trim()
    const variants = [formattedClean]
    if (formattedClean.startsWith('+91')) {
      variants.push(formattedClean.slice(3))
      variants.push(formattedClean.replace('+', ''))
    } else if (/^\d{10}$/.test(formattedClean)) {
      variants.push(`+91${formattedClean}`)
      variants.push(`91${formattedClean}`)
    }

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .in('mobile_number', variants)
      .limit(1)
      .maybeSingle()

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'This mobile number is already registered. Please log in instead.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate Limiting Check 1: 60-second cooldown
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('otp_verifications')
      .select('id')
      .eq('mobile_number', mobile_number)
      .gt('last_sent_at', oneMinuteAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ error: 'Please wait 60 seconds before requesting another OTP.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate Limiting Check 2: Max 3 sends per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: hourlyCount, error: countError } = await supabase
      .from('otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('mobile_number', mobile_number)
      .gt('last_sent_at', oneHourAgo)

    if (hourlyCount !== null && hourlyCount >= 3) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Hash the code
    const encoder = new TextEncoder()
    const data = encoder.encode(code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Set expiry to 5 mins from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Store in DB
    const { error: insertError } = await supabase
      .from('otp_verifications')
      .insert({
        mobile_number: mobile_number,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Error inserting OTP:', insertError)
      throw insertError
    }

    // Send via httpSMS
    const message = `Your AgriProcure OTP is: ${code}. Valid for 5 minutes.`
    const smsSent = await sendSMS(mobile_number, message)

    if (!smsSent) {
      return new Response(JSON.stringify({ error: 'Failed to send SMS.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('send-otp error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
