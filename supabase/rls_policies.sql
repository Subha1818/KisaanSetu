-- =========================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (Avoids recursion on RLS checks)
-- =========================================================================

-- Function: public.get_auth_role
-- Purpose: Safely fetches the role of the current authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function: public.get_auth_staff_centre
-- Purpose: Safely fetches the assigned centre ID of the staff user
CREATE OR REPLACE FUNCTION public.get_auth_staff_centre()
RETURNS uuid AS $$
  SELECT centre_id FROM public.staff WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centre_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- TABLE POLICIES DEFINITIONS
-- =========================================================================

----------------------------------------------------------------------------
-- Table: public.users
----------------------------------------------------------------------------

CREATE POLICY "Users can view their own profile row"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile row"
ON public.users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles"
ON public.users FOR SELECT
USING (public.get_auth_role() = 'staff');

CREATE POLICY "Admins can view all profiles"
ON public.users FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.farmers
----------------------------------------------------------------------------

CREATE POLICY "Farmers can select/update their own profile details"
ON public.farmers FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all farmer profiles"
ON public.farmers FOR SELECT
USING (public.get_auth_role() = 'staff');

CREATE POLICY "Admins can view all farmer profiles"
ON public.farmers FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.staff
----------------------------------------------------------------------------

CREATE POLICY "Staff can view their own staff row mapping"
ON public.staff FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view/manage all staff mappings"
ON public.staff FOR ALL
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.procurement_centres
----------------------------------------------------------------------------

CREATE POLICY "All authenticated users can list procurement centres"
ON public.procurement_centres FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage procurement centres"
ON public.procurement_centres FOR ALL
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.centre_products
----------------------------------------------------------------------------

CREATE POLICY "All authenticated users can list centre products"
ON public.centre_products FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can configure products for their assigned centre"
ON public.centre_products FOR ALL
USING (
    public.get_auth_role() = 'staff' 
    AND centre_id = public.get_auth_staff_centre()
);

CREATE POLICY "Admins can view all centre products"
ON public.centre_products FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.booking_dates
----------------------------------------------------------------------------

CREATE POLICY "All authenticated users can view slot calendars"
ON public.booking_dates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage slots for their assigned centre"
ON public.booking_dates FOR ALL
USING (
    public.get_auth_role() = 'staff' 
    AND centre_id = public.get_auth_staff_centre()
);

CREATE POLICY "Admins can view all slots"
ON public.booking_dates FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.bookings
----------------------------------------------------------------------------

CREATE POLICY "Farmers can manage their own bookings"
ON public.bookings FOR ALL
USING (
    public.get_auth_role() = 'farmer' 
    AND farmer_id = auth.uid()
);

CREATE POLICY "Staff can manage bookings for their assigned centre"
ON public.bookings FOR ALL
USING (
    public.get_auth_role() = 'staff' 
    AND centre_id = public.get_auth_staff_centre()
);

-- Admin has read-only access to select bookings (restricted fields should be selected in frontend)
CREATE POLICY "Admins can read bookings for aggregate reporting"
ON public.bookings FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.booking_history
----------------------------------------------------------------------------

CREATE POLICY "Farmers can read history for their own bookings"
ON public.booking_history FOR SELECT
USING (
    booking_id IN (
        SELECT id FROM public.bookings WHERE farmer_id = auth.uid()
    )
);

CREATE POLICY "Staff can view history logs for their centre"
ON public.booking_history FOR SELECT
USING (
    booking_id IN (
        SELECT id FROM public.bookings WHERE centre_id = public.get_auth_staff_centre()
    )
);

CREATE POLICY "Staff can log history entries"
ON public.booking_history FOR INSERT
WITH CHECK (
    public.get_auth_role() = 'staff' 
    AND changed_by = auth.uid()
);

CREATE POLICY "Admins can read all history logs"
ON public.booking_history FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.procurements
----------------------------------------------------------------------------

CREATE POLICY "Farmers can view receipts of their own transactions"
ON public.procurements FOR SELECT
USING (
    booking_id IN (
        SELECT id FROM public.bookings WHERE farmer_id = auth.uid()
    )
);

CREATE POLICY "Staff can manage procurements for their assigned centre"
ON public.procurements FOR ALL
USING (
    public.get_auth_role() = 'staff' 
    AND booking_id IN (
        SELECT id FROM public.bookings WHERE centre_id = public.get_auth_staff_centre()
    )
);

CREATE POLICY "Admins can read all procurement receipts"
ON public.procurements FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.payments
----------------------------------------------------------------------------

CREATE POLICY "Farmers can view their payment statuses"
ON public.payments FOR SELECT
USING (
    procurement_id IN (
        SELECT id FROM public.procurements 
        WHERE booking_id IN (
            SELECT id FROM public.bookings WHERE farmer_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff can manage payments for their assigned centre"
ON public.payments FOR ALL
USING (
    public.get_auth_role() = 'staff' 
    AND procurement_id IN (
        SELECT id FROM public.procurements 
        WHERE booking_id IN (
            SELECT id FROM public.bookings WHERE centre_id = public.get_auth_staff_centre()
        )
    )
);

CREATE POLICY "Admins can read all payment logs"
ON public.payments FOR SELECT
USING (public.get_auth_role() = 'admin');


----------------------------------------------------------------------------
-- Table: public.notifications
----------------------------------------------------------------------------

CREATE POLICY "Farmers can view their own alerts"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications logs"
ON public.notifications FOR SELECT
USING (public.get_auth_role() = 'admin');
