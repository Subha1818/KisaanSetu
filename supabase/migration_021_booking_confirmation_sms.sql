-- Migration 021: Instant SMS Booking Confirmation
-- Adds an immediate SMS confirmation sent via Edge Function when a booking is created.

-- PART 1: Extend notification_type enum
-- Note: 'booking_confirmation' is added to public.notification_type. Existing values are preserved.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'booking_confirmation';

-- PART 3: Database Trigger to trigger send-booking-confirmation Edge Function
-- Ensures pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function that invokes the send-booking-confirmation Edge Function asynchronously
CREATE OR REPLACE FUNCTION public.handle_booking_confirmation_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Edge Function URL
    v_url text := 'https://ljfqbrdaznbmzgymfywp.supabase.co/functions/v1/send-booking-confirmation';
    -- Valid Supabase JWT token to pass Kong API Gateway authentication
    v_token text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZnFicmRhem5ibXpneW1meXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTU3MjksImV4cCI6MjEwMzMzMTcyOX0.6gY5eUEffdDSzbzC5BxiMCSH4gtBIruTb0ZQ9B-1hCA';
    v_payload jsonb;
    v_headers jsonb;
BEGIN
    v_payload := jsonb_build_object('booking_id', NEW.id);
    v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_token
    );

    -- Fire-and-forget async HTTP POST via pg_net
    -- Enclose in exception block so network or extension issues NEVER abort or rollback the booking insert
    BEGIN
        PERFORM net.http_post(
            url := v_url,
            body := v_payload,
            headers := v_headers
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but do not raise an error, preserving booking creation integrity
        RAISE WARNING 'handle_booking_confirmation_sms failed for booking %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Trigger: Fires strictly AFTER INSERT on public.bookings (never on UPDATE)
DROP TRIGGER IF EXISTS on_booking_created_send_confirmation ON public.bookings;
CREATE TRIGGER on_booking_created_send_confirmation
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_confirmation_sms();
