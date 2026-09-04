-- =========================================================================
-- MIGRATION 014: FIX RLS SELECT-AFTER-INSERT FOR CENTRE REGISTRATION
-- =========================================================================

-- When inserting a new centre with .select(), Supabase immediately tries to read the row back.
-- Because the centre is 'pending' and the staff linkage hasn't been created yet,
-- the existing SELECT policies block the read, causing the INSERT to fail.

-- This policy allows the owner to read their own centre row immediately after inserting it.
CREATE POLICY "Users can view their own centre registration"
ON public.procurement_centres FOR SELECT
USING (
    auth.role() = 'authenticated' AND
    owner_user_id = auth.uid()
);
