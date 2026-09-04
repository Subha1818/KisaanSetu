import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mobile_number, otp_code } = await req.json()

    if (!mobile_number || !otp_code) {
      return new Response(JSON.stringify({ error: 'mobile_number and otp_code are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the latest unverified OTP for this number
    const { data: record, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('mobile_number', mobile_number)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !record) {
      return new Response(JSON.stringify({ error: 'No pending OTP found for this number.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'OTP has expired. Please request a new one.' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check attempts limit (e.g., max 5 attempts per generated code)
    if (record.attempts >= 5) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Hash the incoming code to compare
    const encoder = new TextEncoder()
    const data = encoder.encode(otp_code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (inputHash !== record.otp_hash) {
      // Increment attempts
      await supabase
        .from('otp_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)

      return new Response(JSON.stringify({ error: 'Invalid OTP code.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Match! Mark as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', record.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('verify-otp error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
