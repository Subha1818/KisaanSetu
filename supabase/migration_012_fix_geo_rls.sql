-- =========================================================================
-- MIGRATION 012: FIX GEO BLOCKS RLS FOR REGISTRATION
-- =========================================================================

-- The Register page needs to fetch blocks before the user is authenticated.
-- The previous policy only allowed authenticated users. We need to allow anon reads.

DROP POLICY IF EXISTS "All authenticated users can list geo blocks" ON public.geo_blocks;

CREATE POLICY "Anyone can list geo blocks"
ON public.geo_blocks FOR SELECT
USING (true);
