-- =========================================================================
-- MIGRATION 006: BOOKING CANCELLATION & RESCHEDULING LOGIC
-- =========================================================================

-- 1. TRIGGER: Auto-decrement capacity when a booking is cancelled
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS trigger AS $$
BEGIN
    IF (NEW.status = 'cancelled'::public.booking_status AND OLD.status != 'cancelled'::public.booking_status) THEN
        UPDATE public.booking_dates
        SET 
            booked_count = GREATEST(0, booked_count - 1),
            status = CASE 
                WHEN GREATEST(0, booked_count - 1) < capacity THEN 'open'::public.booking_date_status 
                ELSE status 
            END
        WHERE id = NEW.booking_date_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_status_cancelled ON public.bookings;
CREATE TRIGGER on_booking_status_cancelled
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation();


-- 2. RPC: cancel_farmer_booking
CREATE OR REPLACE FUNCTION public.cancel_farmer_booking(
    p_booking_id uuid,
    p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_farmer_id uuid;
    v_status text;
    v_booking_date date;
    v_cancellation_window int;
BEGIN
    -- Verify the user owns the booking and get details
    SELECT b.farmer_id, b.status, bd.date, pc.cancellation_window_hours
    INTO v_farmer_id, v_status, v_booking_date, v_cancellation_window
    FROM public.bookings b
    JOIN public.booking_dates bd ON b.booking_date_id = bd.id
    JOIN public.procurement_centres pc ON b.centre_id = pc.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Ensure the caller is the owner
    IF v_farmer_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check status
    IF v_status != 'booked' THEN
        RAISE EXCEPTION 'Booking cannot be cancelled because it is %', v_status;
    END IF;

    -- Check cancellation window
    -- We assume the slot starts at 00:00 of the date for window calculation
    IF (v_booking_date::timestamp - (v_cancellation_window || ' hours')::interval) < now() THEN
        RAISE EXCEPTION 'Cancellation window has closed';
    END IF;

    -- Update booking
    UPDATE public.bookings
    SET 
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason
    WHERE id = p_booking_id;

    -- Log history
    INSERT INTO public.booking_history (booking_id, previous_status, new_status, changed_by, note)
    VALUES (p_booking_id, 'booked', 'cancelled', auth.uid(), 'Cancelled by farmer: ' || p_reason);

    -- Send Notification
    INSERT INTO public.notifications (user_id, type, channel, message)
    VALUES (
        v_farmer_id, 
        'cancellation', 
        'app', 
        'Your booking for ' || v_booking_date || ' has been successfully cancelled.'
    );

    RETURN true;
END;
$$;


-- 3. RPC: reschedule_farmer_booking
CREATE OR REPLACE FUNCTION public.reschedule_farmer_booking(
    p_old_booking_id uuid,
    p_new_booking_date_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_farmer_id uuid;
    v_old_status text;
    v_old_date date;
    v_cancellation_window int;
    
    v_centre_id uuid;
    v_product_name text;
    v_quantity numeric;
    
    v_new_capacity int;
    v_new_booked_count int;
    v_new_status text;
    
    v_token text;
    v_new_booking_id uuid;
BEGIN
    -- 1. Get old booking details
    SELECT b.farmer_id, b.status, bd.date, pc.cancellation_window_hours, b.centre_id, b.product_name, b.quantity
    INTO v_farmer_id, v_old_status, v_old_date, v_cancellation_window, v_centre_id, v_product_name, v_quantity
    FROM public.bookings b
    JOIN public.booking_dates bd ON b.booking_date_id = bd.id
    JOIN public.procurement_centres pc ON b.centre_id = pc.id
    WHERE b.id = p_old_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Old booking not found';
    END IF;

    IF v_farmer_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_old_status != 'booked' THEN
        RAISE EXCEPTION 'Cannot reschedule a booking that is %', v_old_status;
    END IF;

    IF (v_old_date::timestamp - (v_cancellation_window || ' hours')::interval) < now() THEN
        RAISE EXCEPTION 'Rescheduling window has closed for the original date';
    END IF;

    -- 2. Lock and verify NEW booking date
    SELECT capacity, booked_count, status 
    INTO v_new_capacity, v_new_booked_count, v_new_status
    FROM public.booking_dates
    WHERE id = p_new_booking_date_id AND centre_id = v_centre_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'New booking slot not found';
    END IF;

    IF v_new_status = 'closed' OR v_new_status = 'full' THEN
        RAISE EXCEPTION 'New booking slot is %', v_new_status;
    END IF;

    IF v_new_booked_count >= v_new_capacity THEN
        UPDATE public.booking_dates SET status = 'full' WHERE id = p_new_booking_date_id;
        RAISE EXCEPTION 'New booking slot is already full';
    END IF;

    -- 3. Cancel the old booking
    UPDATE public.bookings
    SET 
        status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Rescheduled'
    WHERE id = p_old_booking_id;

    -- 4. Create the NEW booking
    v_new_booked_count := v_new_booked_count + 1;
    v_token := 'TKT-' || LPAD(v_new_booked_count::text, 3, '0');

    UPDATE public.booking_dates 
    SET 
        booked_count = v_new_booked_count,
        status = CASE WHEN v_new_booked_count >= v_new_capacity THEN 'full'::public.booking_date_status ELSE 'open'::public.booking_date_status END
    WHERE id = p_new_booking_date_id;

    INSERT INTO public.bookings (
        farmer_id, centre_id, booking_date_id, product_name, quantity, token, status
    ) VALUES (
        v_farmer_id, v_centre_id, p_new_booking_date_id, v_product_name, v_quantity, v_token, 'booked'
    ) RETURNING id INTO v_new_booking_id;

    -- 5. Cross-reference history
    INSERT INTO public.booking_history (booking_id, previous_status, new_status, changed_by, note)
    VALUES (p_old_booking_id, 'booked', 'cancelled', auth.uid(), 'Rescheduled to booking ' || v_token);

    INSERT INTO public.booking_history (booking_id, new_status, changed_by, note)
    VALUES (v_new_booking_id, 'booked', auth.uid(), 'Created via reschedule from previous booking');

    -- 6. Notification
    INSERT INTO public.notifications (user_id, type, channel, message)
    VALUES (
        v_farmer_id, 'reschedule', 'app', 'Booking successfully rescheduled to new token ' || v_token
    );

    RETURN json_build_object(
        'success', true,
        'booking_id', v_new_booking_id,
        'token', v_token
    );
END;
$$;
