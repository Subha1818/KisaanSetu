-- =========================================================================
-- MIGRATION 015: UPDATE ADMIN VIEWS FOR CENTRE APPROVAL STATUS
-- =========================================================================

-- Recreate the admin_centre_list_stats view to include approval_status
-- This ensures pending/rejected centres don't show up in the active centres list

DROP VIEW IF EXISTS public.admin_centre_list_stats;

CREATE VIEW public.admin_centre_list_stats AS
SELECT 
    pc.id as centre_id,
    pc.name as centre_name,
    pc.owner_name,
    pc.status,
    pc.approval_status,
    COALESCE(SUM(p.quantity_accepted), 0) as total_quantity_purchased
FROM public.procurement_centres pc
LEFT JOIN public.bookings b ON b.centre_id = pc.id
LEFT JOIN public.procurements p ON p.booking_id = b.id
GROUP BY pc.id, pc.name, pc.owner_name, pc.status, pc.approval_status;

GRANT SELECT ON public.admin_centre_list_stats TO authenticated;
