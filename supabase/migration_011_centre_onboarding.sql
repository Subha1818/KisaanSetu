-- =========================================================================
-- MIGRATION 011: CENTRE ONBOARDING WITH ADMIN APPROVAL
-- =========================================================================

-- 1. Add approval columns to procurement_centres
ALTER TABLE public.procurement_centres
    ADD COLUMN approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN owner_user_id UUID REFERENCES public.users(id),
    ADD COLUMN reviewed_by UUID REFERENCES public.users(id),
    ADD COLUMN reviewed_at timestamptz,
    ADD COLUMN rejection_reason text;

-- 2. Explicitly grandfather existing rows just to be safe
UPDATE public.procurement_centres SET approval_status = 'approved' WHERE approval_status IS NULL;

-- 3. Drop staff_requests if it exists
DROP TABLE IF EXISTS public.staff_requests;

-- 4. Update RLS on procurement_centres
-- Drop the existing "All authenticated users can list procurement centres"
DROP POLICY IF EXISTS "All authenticated users can list procurement centres" ON public.procurement_centres;

-- Recreate policy for farmers/public to only see approved centres
CREATE POLICY "Public can view approved procurement centres"
ON public.procurement_centres FOR SELECT
USING (auth.role() = 'authenticated' AND approval_status = 'approved');

-- Create policy for staff to see their own centre regardless of status
CREATE POLICY "Staff can view their own procurement centre"
ON public.procurement_centres FOR SELECT
USING (
    id = public.get_auth_staff_centre()
);

-- Admin policy remains unchanged (Admins can manage procurement centres)

-- 5. Create RPCs for Admin Approval/Rejection
CREATE OR REPLACE FUNCTION public.approve_centre(
    p_centre_id uuid,
    p_reviewer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can approve centres.';
    END IF;

    UPDATE public.procurement_centres
    SET 
        approval_status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_centre_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_centre(
    p_centre_id uuid,
    p_reviewer_id uuid,
    p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin
    IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reject centres.';
    END IF;

    UPDATE public.procurement_centres
    SET 
        approval_status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_at = now(),
        rejection_reason = p_reason
    WHERE id = p_centre_id;
END;
$$;
