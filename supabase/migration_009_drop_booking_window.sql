-- Drop booking window columns from procurement_centres
ALTER TABLE public.procurement_centres DROP CONSTRAINT IF EXISTS chk_dates;
ALTER TABLE public.procurement_centres DROP COLUMN IF EXISTS booking_window_start;
ALTER TABLE public.procurement_centres DROP COLUMN IF EXISTS booking_window_end;
