-- =========================================================================
-- MIGRATION 004: CREATE FARMER BOOKING RPC (TRANSACTION SAFE)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.create_farmer_booking(
    p_booking_date_id uuid,
    p_centre_id uuid,
    p_farmer_id uuid,
    p_product_name text,
    p_quantity numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_capacity int;
    v_booked_count int;
    v_status text;
    v_token text;
    v_booking_id uuid;
BEGIN
    -- 1. Lock the booking_dates row to prevent race conditions when multiple farmers book exactly at the same time
    SELECT capacity, booked_count, status 
    INTO v_capacity, v_booked_count, v_status
    FROM public.booking_dates
    WHERE id = p_booking_date_id AND centre_id = p_centre_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking slot not found';
    END IF;

    IF v_status = 'closed' OR v_status = 'full' THEN
        RAISE EXCEPTION 'This booking slot is %', v_status;
    END IF;

    IF v_booked_count >= v_capacity THEN
        -- Auto close the slot if capacity is reached
        UPDATE public.booking_dates SET status = 'full' WHERE id = p_booking_date_id;
        RAISE EXCEPTION 'This booking slot is already full';
    END IF;

    -- 2. Increment booked_count
    v_booked_count := v_booked_count + 1;
    
    -- Generate simple sequential token like TKT-001
    v_token := 'TKT-' || LPAD(v_booked_count::text, 3, '0');

    -- Update the slot
    UPDATE public.booking_dates 
    SET 
        booked_count = v_booked_count,
        status = CASE WHEN v_booked_count >= v_capacity THEN 'full'::public.booking_date_status ELSE 'open'::public.booking_date_status END
    WHERE id = p_booking_date_id;

    -- 3. Insert the booking
    INSERT INTO public.bookings (
        farmer_id, 
        centre_id, 
        booking_date_id, 
        product_name, 
        quantity, 
        token, 
        status
    ) VALUES (
        p_farmer_id,
        p_centre_id,
        p_booking_date_id,
        p_product_name,
        p_quantity,
        v_token,
        'booked'
    ) RETURNING id INTO v_booking_id;

    -- 4. Log the history
    INSERT INTO public.booking_history (
        booking_id,
        new_status,
        changed_by,
        note
    ) VALUES (
        v_booking_id,
        'booked',
        p_farmer_id,
        'Booking created by farmer'
    );

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'token', v_token
    );
END;
$$;
