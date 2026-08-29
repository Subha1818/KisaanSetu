-- Database Function: public.create_farmer_booking
-- Purpose: Atomically creates a farmer booking, checks capacities, formats sequence tokens, 
-- updates slot counts, and logs history in a single database transaction under SECURITY DEFINER privileges.

CREATE OR REPLACE FUNCTION public.create_farmer_booking(
    p_farmer_id UUID,
    p_centre_id UUID,
    p_booking_date_id UUID,
    p_product_name TEXT,
    p_quantity NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_centre_letter CHAR(1);
    v_seq_num INTEGER;
    v_token VARCHAR(50);
    v_booking_id UUID;
    v_booked_count INTEGER;
    v_capacity INTEGER;
    v_max_quantity NUMERIC;
BEGIN
    -- 1. Check if the booking date is open and get limits
    SELECT booked_count, capacity INTO v_booked_count, v_capacity
    FROM public.booking_dates
    WHERE id = p_booking_date_id AND centre_id = p_centre_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking date slot not found for this centre.';
    END IF;
    
    IF v_booked_count >= v_capacity THEN
        RAISE EXCEPTION 'This booking date slot is already full.';
    END IF;

    -- 2. Validate product quantity limit
    SELECT max_quantity_per_farmer INTO v_max_quantity
    FROM public.centre_products
    WHERE centre_id = p_centre_id AND product_name = p_product_name;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not accepted at this procurement centre.';
    END IF;
    
    IF p_quantity > v_max_quantity THEN
        RAISE EXCEPTION 'Quantity exceeds the maximum allowed limit of % kg for this product.', v_max_quantity;
    END IF;

    -- 3. Generate token
    -- Get first letter of centre name
    SELECT COALESCE(substring(name from 1 for 1), 'T') INTO v_centre_letter
    FROM public.procurement_centres
    WHERE id = p_centre_id;

    -- Get next sequence number for this specific booking date and centre
    SELECT COALESCE(count(*), 0) + 1 INTO v_seq_num
    FROM public.bookings
    WHERE booking_date_id = p_booking_date_id;

    v_token := v_centre_letter || '-' || lpad(v_seq_num::text, 3, '0');

    -- 4. Insert booking
    INSERT INTO public.bookings (
        farmer_id,
        centre_id,
        booking_date_id,
        product_name,
        quantity,
        token,
        status,
        booking_source
    )
    VALUES (
        p_farmer_id,
        p_centre_id,
        p_booking_date_id,
        p_product_name,
        p_quantity,
        v_token,
        'booked'::public.booking_status,
        'online'::public.booking_source
    )
    RETURNING id INTO v_booking_id;

    -- 5. Increment booking_dates.booked_count
    UPDATE public.booking_dates
    SET booked_count = booked_count + 1,
        status = CASE 
            WHEN booked_count + 1 >= capacity THEN 'full'::public.booking_date_status
            ELSE status
        END
    WHERE id = p_booking_date_id;

    -- 6. Log to booking_history
    INSERT INTO public.booking_history (
        booking_id,
        previous_status,
        new_status,
        changed_by,
        note
    )
    VALUES (
        v_booking_id,
        NULL,
        'booked'::public.booking_status,
        p_farmer_id,
        'Initial online booking created by farmer'
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
