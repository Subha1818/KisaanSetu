-- =========================================================================
-- MIGRATION 018: OTP PHONE VERIFICATION & REMINDERS 
-- =========================================================================

-- 1. Add phone_verified to users
ALTER TABLE public.users 
ADD COLUMN phone_verified boolean NOT NULL DEFAULT false;

-- 2. Create otp_verifications table for tracking rate limits & verification
CREATE TABLE public.otp_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number text NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts int NOT NULL DEFAULT 0,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_sent_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying rate limits per number
CREATE INDEX idx_otp_mobile ON public.otp_verifications(mobile_number, created_at DESC);

-- Enable RLS on otp_verifications but create NO policies.
-- This restricts access entirely to the service role (used by Edge Functions),
-- preventing any direct API access from the frontend.
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- 3. Link notifications to bookings to support idempotency/deduplication
ALTER TABLE public.notifications 
ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE;

-- 4. Set up daily reminder cron job using pg_cron
-- Note: On Supabase Free tier, projects are paused after 7 days of inactivity.
-- If the project pauses, this cron job will silently stop firing until the project is unpaused.
-- Ensure the pg_cron and pg_net extensions exist (needed for http_post)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the Edge Function to run daily at 18:00 UTC (11:30 PM IST for tomorrow's bookings)
SELECT cron.schedule(
    'send-booking-reminders-job',
    '0 18 * * *',
    $$
    SELECT net.http_post(
        url:='https://ljfqbrdaznbmzgymfywp.supabase.co/functions/v1/send-booking-reminders',
        headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_OR_ANON"}'::jsonb
    )
    $$
);
