-- =========================================================================
-- MIGRATION 002: GEO-LOCATION SCHEMA OVERHAUL
-- =========================================================================

-- 1. Create geo_blocks reference table
CREATE TABLE IF NOT EXISTS public.geo_blocks (
    block_code integer PRIMARY KEY,
    block_name text NOT NULL,
    district_code integer NOT NULL,
    district_name text NOT NULL,
    state_code integer NOT NULL,
    state_name text NOT NULL,
    block_version integer
);

COMMENT ON TABLE public.geo_blocks IS 'Government reference data list of states, districts, and blocks.';

-- Indexes for cascading search queries
CREATE INDEX IF NOT EXISTS idx_geo_blocks_state_code ON public.geo_blocks(state_code);
CREATE INDEX IF NOT EXISTS idx_geo_blocks_district_code ON public.geo_blocks(district_code);

-- Enable Row Level Security (RLS)
ALTER TABLE public.geo_blocks ENABLE ROW LEVEL SECURITY;

-- Allow select reads to all authenticated users
CREATE POLICY "All authenticated users can list geo blocks"
ON public.geo_blocks FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Create distinct states and districts views for optimized frontend cascading dropdowns
CREATE OR REPLACE VIEW public.distinct_states AS
SELECT DISTINCT state_code, state_name
FROM public.geo_blocks;

CREATE OR REPLACE VIEW public.distinct_districts AS
SELECT DISTINCT district_code, district_name, state_code
FROM public.geo_blocks;

-- Grant select rights to authenticated users on views
GRANT SELECT ON public.distinct_states TO authenticated;
GRANT SELECT ON public.distinct_districts TO authenticated;

-- 3. Update handle_new_user trigger function to remove dropped columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
    v_name text;
    v_phone text;
BEGIN
    -- Determine role from metadata, default to 'farmer'
    v_role := COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role, 
        'farmer'::public.user_role
    );
    
    -- Extract full name from metadata, fallback to generic User ID
    v_name := COALESCE(
        new.raw_user_meta_data->>'name', 
        'User_' || substring(new.id::text from 1 for 8)
    );
    
    -- Extract phone. In Supabase Auth, new.phone stores phone provider values.
    v_phone := COALESCE(
        new.phone, 
        new.raw_user_meta_data->>'phone', 
        new.raw_user_meta_data->>'mobile_number',
        'temp_' || substring(new.id::text from 1 for 8)
    );

    -- Insert profile into public.users
    INSERT INTO public.users (id, role, name, mobile_number, preferred_language)
    VALUES (
        new.id,
        v_role,
        v_name,
        v_phone,
        COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
    );

    -- If the role is farmer, also initialize public.farmers profile row (no location data stored on signup)
    IF v_role = 'farmer'::public.user_role THEN
        INSERT INTO public.farmers (user_id)
        VALUES (new.id);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Alter public.farmers (drop location fields)
ALTER TABLE public.farmers DROP COLUMN IF EXISTS district;
ALTER TABLE public.farmers DROP COLUMN IF EXISTS block;
ALTER TABLE public.farmers DROP COLUMN IF EXISTS panchayat;

-- 5. Alter public.procurement_centres
-- To avoid foreign key violations due to schema alteration, truncate dependent logs first
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.procurement_centres CASCADE;

ALTER TABLE public.procurement_centres DROP COLUMN IF EXISTS district;
ALTER TABLE public.procurement_centres DROP COLUMN IF EXISTS block;
ALTER TABLE public.procurement_centres DROP COLUMN IF EXISTS panchayat;

-- Add block_code referencing geo_blocks
ALTER TABLE public.procurement_centres ADD COLUMN block_code integer NOT NULL REFERENCES public.geo_blocks(block_code);
