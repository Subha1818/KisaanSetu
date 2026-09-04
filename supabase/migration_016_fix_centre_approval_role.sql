-- =========================================================================
-- MIGRATION 016: FIX CENTRE APPROVAL ROLE 
-- =========================================================================

-- 1. Update approve_centre RPC to also grant the 'staff' role
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

    -- Update centre status
    UPDATE public.procurement_centres
    SET 
        approval_status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    WHERE id = p_centre_id;

    -- Grant 'staff' role to all users linked to this centre via the staff table
    UPDATE public.users
    SET role = 'staff'
    WHERE id IN (
        SELECT user_id FROM public.staff WHERE centre_id = p_centre_id
    ) AND role != 'admin';
END;
$$;

-- 2. Bulk Migration: Fix existing accounts
-- Any user linked to an 'approved' centre must have role='staff'
UPDATE public.users u
SET role = 'staff'
FROM public.staff s
JOIN public.procurement_centres pc ON s.centre_id = pc.id
WHERE u.id = s.user_id 
  AND pc.approval_status = 'approved'
  AND u.role = 'farmer';
