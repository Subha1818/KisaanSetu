-- =========================================================================
-- MIGRATION 019: GOVERNMENT MINIMUM SUPPORT PRICES (MSP) RATES TABLE
-- =========================================================================

-- 1. Create table public.msp_rates
CREATE TABLE IF NOT EXISTS public.msp_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name text UNIQUE NOT NULL,
    rate_per_kg numeric NOT NULL CHECK (rate_per_kg > 0),
    effective_date date NOT NULL DEFAULT CURRENT_DATE,
    updated_by UUID REFERENCES public.users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.msp_rates IS 'Stores official government minimum support prices per crop, managed by administrators.';

-- 2. Enable Row Level Security
ALTER TABLE public.msp_rates ENABLE ROW LEVEL SECURITY;

-- 3. Read Policy: All authenticated users (farmers, staff, admins) can view MSP rates
CREATE POLICY "Anyone authenticated can view msp_rates"
ON public.msp_rates FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. Write Policies: Only admins can manage (insert, update, delete) MSP rates
CREATE POLICY "Admins can manage msp_rates"
ON public.msp_rates FOR ALL
USING (public.get_auth_role() = 'admin')
WITH CHECK (public.get_auth_role() = 'admin');

-- 5. Seed initial baseline MSP rates (rate_per_kg in INR; 1 Quintal = 100 kg)
INSERT INTO public.msp_rates (crop_name, rate_per_kg, effective_date)
VALUES 
    ('Wheat', 22.75, CURRENT_DATE),
    ('Paddy', 21.83, CURRENT_DATE),
    ('Maize', 20.90, CURRENT_DATE),
    ('Mustard', 56.50, CURRENT_DATE),
    ('Soybean', 46.00, CURRENT_DATE)
ON CONFLICT (crop_name) DO UPDATE
SET 
    rate_per_kg = EXCLUDED.rate_per_kg,
    effective_date = EXCLUDED.effective_date,
    updated_at = now();
