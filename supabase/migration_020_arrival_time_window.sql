-- =========================================================================
-- MIGRATION 020: ESTIMATED ARRIVAL TIME WINDOW
-- =========================================================================

-- 1. Add opening_time and avg_minutes_per_farmer to procurement_centres
ALTER TABLE public.procurement_centres
ADD COLUMN IF NOT EXISTS opening_time TIME NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS avg_minutes_per_farmer INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.procurement_centres.opening_time IS 'The daily operational start time for the centre.';
COMMENT ON COLUMN public.procurement_centres.avg_minutes_per_farmer IS 'Manual fallback average minutes it takes to process one farmer.';


-- 2. Create function to calculate long-term average processing time
CREATE OR REPLACE FUNCTION public.get_centre_avg_processing_time(p_centre_id UUID)
RETURNS integer AS $$
DECLARE
    v_avg_minutes numeric;
    v_sample_size integer;
    v_fallback_minutes integer;
BEGIN
    -- Get the fallback manual configuration for the centre
    SELECT avg_minutes_per_farmer INTO v_fallback_minutes
    FROM public.procurement_centres
    WHERE id = p_centre_id;

    -- If centre not found, return a default safe value
    IF v_fallback_minutes IS NULL THEN
        RETURN 10;
    END IF;

    -- Calculate the average time delta between 'in_progress' and 'completed' for this centre
    -- We join booking_history to bookings to filter by centre_id
    WITH status_times AS (
        SELECT 
            bh1.booking_id,
            bh1.changed_at AS in_progress_at,
            bh2.changed_at AS completed_at
        FROM public.booking_history bh1
        JOIN public.booking_history bh2 ON bh1.booking_id = bh2.booking_id
        JOIN public.bookings b ON bh1.booking_id = b.id
        WHERE b.centre_id = p_centre_id
          AND bh1.new_status = 'in_progress'
          AND bh2.new_status = 'completed'
          AND bh2.changed_at > bh1.changed_at
    )
    SELECT 
        COUNT(*),
        AVG(EXTRACT(EPOCH FROM (completed_at - in_progress_at)) / 60)
    INTO 
        v_sample_size, 
        v_avg_minutes
    FROM status_times;

    -- Fallback logic: if less than 5 samples exist, use the centre's manual config
    IF v_sample_size < 5 OR v_avg_minutes IS NULL THEN
        RETURN v_fallback_minutes;
    END IF;

    -- Return the calculated real average, bounded to a reasonable minimum and maximum
    -- so that anomalies (e.g. 1 second or 5 hours) don't skew the estimate insanely.
    IF v_avg_minutes < 2 THEN
        RETURN 2;
    ELSIF v_avg_minutes > 60 THEN
        RETURN 60;
    ELSE
        RETURN ROUND(v_avg_minutes)::integer;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_centre_avg_processing_time IS 'Calculates the real historical average minutes it takes to process a farmer at the given centre, with a fallback to the manual setting if insufficient data.';

-- 3. Create function to calculate TODAY's processing pace (very reactive)
CREATE OR REPLACE FUNCTION public.get_todays_processing_pace(p_centre_id UUID)
RETURNS integer AS $$
DECLARE
    v_avg_minutes numeric;
    v_sample_size integer;
    v_long_term_avg integer;
BEGIN
    -- Get the long-term historical average as the ultimate fallback
    SELECT public.get_centre_avg_processing_time(p_centre_id) INTO v_long_term_avg;

    -- Calculate the average time delta between 'in_progress' and 'completed' for this centre,
    -- but ONLY for bookings that are for TODAY (based on booking_dates.date = CURRENT_DATE).
    WITH status_times AS (
        SELECT 
            bh1.booking_id,
            bh1.changed_at AS in_progress_at,
            bh2.changed_at AS completed_at
        FROM public.booking_history bh1
        JOIN public.booking_history bh2 ON bh1.booking_id = bh2.booking_id
        JOIN public.bookings b ON bh1.booking_id = b.id
        JOIN public.booking_dates bd ON b.booking_date_id = bd.id
        WHERE b.centre_id = p_centre_id
          AND bd.date = CURRENT_DATE
          AND bh1.new_status = 'in_progress'
          AND bh2.new_status = 'completed'
          AND bh2.changed_at > bh1.changed_at
    )
    SELECT 
        COUNT(*),
        AVG(EXTRACT(EPOCH FROM (completed_at - in_progress_at)) / 60)
    INTO 
        v_sample_size, 
        v_avg_minutes
    FROM status_times;

    -- If less than 3 samples exist TODAY, the pace is too noisy. Fall back to long-term.
    IF v_sample_size < 3 OR v_avg_minutes IS NULL THEN
        RETURN v_long_term_avg;
    END IF;

    -- Return the calculated real average, bounded
    IF v_avg_minutes < 2 THEN
        RETURN 2;
    ELSIF v_avg_minutes > 60 THEN
        RETURN 60;
    ELSE
        RETURN ROUND(v_avg_minutes)::integer;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_todays_processing_pace IS 'Calculates the processing pace for the current day only, falling back to historical average if less than 3 bookings have been completed today.';
