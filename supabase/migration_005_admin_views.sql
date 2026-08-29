-- =========================================================================
-- MIGRATION 005: ADMIN VIEWS AND RPCs
-- =========================================================================

-- View: admin_centre_list_stats
-- Purpose: Provides a flat list of all procurement centres with total aggregated purchase quantities.
CREATE OR REPLACE VIEW public.admin_centre_list_stats AS
SELECT 
    pc.id as centre_id,
    pc.name as centre_name,
    pc.owner_name,
    pc.status,
    COALESCE(SUM(p.quantity_accepted), 0) as total_quantity_purchased
FROM public.procurement_centres pc
LEFT JOIN public.bookings b ON b.centre_id = pc.id
LEFT JOIN public.procurements p ON p.booking_id = b.id
GROUP BY pc.id, pc.name, pc.owner_name, pc.status;

GRANT SELECT ON public.admin_centre_list_stats TO authenticated;

-- View: admin_centre_product_stats
-- Purpose: Provides aggregated product-level quantities purchased per centre.
CREATE OR REPLACE VIEW public.admin_centre_product_stats AS
SELECT 
    b.centre_id,
    b.product_name,
    COALESCE(SUM(p.quantity_accepted), 0) as total_quantity
FROM public.bookings b
JOIN public.procurements p ON p.booking_id = b.id
WHERE p.quantity_accepted > 0
GROUP BY b.centre_id, b.product_name;

GRANT SELECT ON public.admin_centre_product_stats TO authenticated;

-- Function: get_centre_farmers_served
-- Purpose: Returns the distinct count of farmers who have completed a procurement at the given centre.
CREATE OR REPLACE FUNCTION public.get_centre_farmers_served(p_centre_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT count(DISTINCT b.farmer_id)::integer
    FROM public.bookings b
    JOIN public.procurements p ON p.booking_id = b.id
    WHERE b.centre_id = p_centre_id AND p.quantity_accepted > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_centre_farmers_served(uuid) TO authenticated;
