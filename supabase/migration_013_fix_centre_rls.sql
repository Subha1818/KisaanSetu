-- =========================================================================
-- MIGRATION 013: FIX RLS FOR CENTRE REGISTRATION
-- =========================================================================

-- Allow any authenticated user to insert a centre request where they are the owner
CREATE POLICY "Users can register a procurement centre"
ON public.procurement_centres FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    owner_user_id = auth.uid()
);

-- Allow any authenticated user to insert their own staff mapping
CREATE POLICY "Users can register as staff"
ON public.staff FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id = auth.uid()
);
