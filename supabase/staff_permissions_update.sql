-- =========================================================================
-- DATABASE POLICIES EXTENSION FOR STAFF OPERATIONAL ACCESS
-- =========================================================================

-- 1. Enable UPDATE on procurement_centres for assigned staff
-- Allows centre staff to change daily capacity, calendar windows, and opening status.
CREATE POLICY "Staff can update their assigned centre details"
ON public.procurement_centres FOR UPDATE
USING (
    id = public.get_auth_staff_centre() 
    AND public.get_auth_role() = 'staff'
);

-- 2. Enable INSERT on notifications for staff members
-- Allows staff to insert in-app alerts when calling the next farmer ticket.
CREATE POLICY "Staff can log notifications for farmers"
ON public.notifications FOR INSERT
WITH CHECK (
    public.get_auth_role() = 'staff'
);
