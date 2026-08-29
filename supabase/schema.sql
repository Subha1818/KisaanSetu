-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- CUSTOM ENUMS DEFINITION
-- =========================================================================

-- Defines the roles for system users
CREATE TYPE public.user_role AS ENUM ('farmer', 'staff', 'admin');

-- Defines operational statuses of procurement centres
CREATE TYPE public.centre_status AS ENUM ('open', 'closed');

-- Defines availability status for booking dates
CREATE TYPE public.booking_date_status AS ENUM ('open', 'full', 'closed');

-- Defines status of individual booking tokens
CREATE TYPE public.booking_status AS ENUM ('booked', 'called', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Defines how a booking was initiated
CREATE TYPE public.booking_source AS ENUM ('online', 'walk_in');

-- Defines the status of MSP payout disbursements
CREATE TYPE public.payment_status AS ENUM ('pending', 'initiated', 'credited');

-- Defines message classification types
CREATE TYPE public.notification_type AS ENUM ('reminder_1day', 'turn_approaching', 'turn_near', 'cancellation', 'reschedule');

-- Defines transmission channels for notifications
CREATE TYPE public.notification_channel AS ENUM ('app', 'sms');

-- Defines notification delivery statuses
CREATE TYPE public.delivery_status AS ENUM ('sent', 'failed', 'pending');


-- =========================================================================
-- CORE TABLES DEFINITION
-- =========================================================================

-- Table: public.users
-- Purpose: Holds customized user profile info syncing from Supabase auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'farmer',
    name text NOT NULL,
    mobile_number text UNIQUE NOT NULL,
    preferred_language text NOT NULL DEFAULT 'en',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Stores custom profile details for all registered system users, synced with auth.users.';

-- Table: public.procurement_centres
-- Purpose: Houses individual regional crop depots and their operating limits
CREATE TABLE public.procurement_centres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_name text NOT NULL,
    district text NOT NULL,
    block text NOT NULL,
    panchayat text NOT NULL,
    status public.centre_status NOT NULL DEFAULT 'open',
    daily_capacity integer NOT NULL,
    booking_window_start date NOT NULL,
    booking_window_end date NOT NULL,
    cancellation_window_hours integer NOT NULL DEFAULT 24,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT chk_dates CHECK (booking_window_start <= booking_window_end)
);

COMMENT ON TABLE public.procurement_centres IS 'Represents regional grains collection depots with custom caps, calendar windows, and cancellation rules.';

-- Table: public.farmers
-- Purpose: Contains location metadata for farmer roles (assigned/updated at booking time)
CREATE TABLE public.farmers (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    district text,
    block text,
    panchayat text
);

COMMENT ON TABLE public.farmers IS 'Extends users table for farmer-specific demographic location properties.';

-- Table: public.staff
-- Purpose: Maps staff/operators to their designated procurement center
CREATE TABLE public.staff (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    centre_id UUID REFERENCES public.procurement_centres(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.staff IS 'Maps user accounts with staff role to their designated procurement depot.';

-- Table: public.centre_products
-- Purpose: Lists crops/products accepted at a centre and farmer limits
CREATE TABLE public.centre_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    max_quantity_per_farmer numeric NOT NULL CHECK (max_quantity_per_farmer > 0),
    UNIQUE (centre_id, product_name)
);

COMMENT ON TABLE public.centre_products IS 'Lists which grain products are procurable at a specific depot and their individual farmer caps.';

-- Table: public.booking_dates
-- Purpose: Tracks total and current reservations booked per day per depot
CREATE TABLE public.booking_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    date date NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 0),
    booked_count integer NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
    status public.booking_date_status NOT NULL DEFAULT 'open',
    UNIQUE (centre_id, date)
);

COMMENT ON TABLE public.booking_dates IS 'Maintains slot counts, limits, and statuses for daily scheduling per depot.';

-- Table: public.bookings
-- Purpose: Tracks procurement reservations, queue numbers (tokens), and booking status
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES public.procurement_centres(id) ON DELETE CASCADE,
    booking_date_id UUID NOT NULL REFERENCES public.booking_dates(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    quantity numeric NOT NULL CHECK (quantity > 0),
    token varchar(50) NOT NULL,
    status public.booking_status NOT NULL DEFAULT 'booked',
    booking_source public.booking_source NOT NULL DEFAULT 'online',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    -- Unique token per centre and date to avoid queue conflicts
    UNIQUE (centre_id, booking_date_id, token)
);

COMMENT ON TABLE public.bookings IS 'Stores individual farmer reservation tickets, token queue values, and status tracking state.';

-- Table: public.booking_history
-- Purpose: Audit log to track booking status transitions (cancellations, reschedules, etc.)
CREATE TABLE public.booking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    previous_status public.booking_status,
    new_status public.booking_status NOT NULL,
    changed_at timestamp with time zone NOT NULL DEFAULT now(),
    changed_by UUID NOT NULL REFERENCES public.users(id),
    note text
);

COMMENT ON TABLE public.booking_history IS 'Audit logs capturing state transitions of scheduling tickets.';

-- Table: public.procurements
-- Purpose: Stores grain weighments and moisture check receipts at center
CREATE TABLE public.procurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    quantity_brought numeric NOT NULL CHECK (quantity_brought >= 0),
    quantity_accepted numeric NOT NULL CHECK (quantity_accepted >= 0),
    quantity_rejected numeric NOT NULL CHECK (quantity_rejected >= 0),
    rate_per_kg numeric NOT NULL CHECK (rate_per_kg >= 0),
    total_amount numeric GENERATED ALWAYS AS (quantity_accepted * rate_per_kg) STORED,
    recorded_by UUID NOT NULL REFERENCES public.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT chk_total_brought CHECK (quantity_brought = (quantity_accepted + quantity_rejected))
);

COMMENT ON TABLE public.procurements IS 'Stores logs of physical grain inspection, moisture levels, accepted weights, and calculated payout values.';

-- Table: public.payments
-- Purpose: Tracks bank payouts to farmers for their grain procurement
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_id UUID NOT NULL REFERENCES public.procurements(id) ON DELETE CASCADE,
    status public.payment_status NOT NULL DEFAULT 'pending',
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by UUID NOT NULL REFERENCES public.users(id)
);

COMMENT ON TABLE public.payments IS 'Manages bank disbursement flow to farmers for certified procurements.';

-- Table: public.notifications
-- Purpose: Stores app alerts and queue SMS records dispatch status
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    channel public.notification_channel NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    delivery_status public.delivery_status NOT NULL DEFAULT 'pending'
);

COMMENT ON TABLE public.notifications IS 'Audit tracking of all SMS messages or in-app alerts dispatched.';


-- =========================================================================
-- DATABASE INDEXES FOR FREQUENT QUERIES
-- =========================================================================

-- Bookings Search Indexes
CREATE INDEX idx_bookings_farmer_id ON public.bookings(farmer_id);
CREATE INDEX idx_bookings_centre_id ON public.bookings(centre_id);
CREATE INDEX idx_bookings_booking_date_id ON public.bookings(booking_date_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Booking Dates Search Indexes
CREATE INDEX idx_booking_dates_centre_date ON public.booking_dates(centre_id, date);

-- Booking History Search Index
CREATE INDEX idx_booking_history_booking_id ON public.booking_history(booking_id);

-- Staff Search Index
CREATE INDEX idx_staff_centre_id ON public.staff(centre_id);

-- Centre Products Search Index
CREATE INDEX idx_centre_products_centre_id ON public.centre_products(centre_id);

-- Procurements Search Index
CREATE INDEX idx_procurements_booking_id ON public.procurements(booking_id);

-- Payments Search Index
CREATE INDEX idx_payments_procurement_id ON public.payments(procurement_id);

-- Notifications Search Index
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);


-- =========================================================================
-- SUPABASE AUTH MAP TRIGGER
-- =========================================================================

-- Function: public.handle_new_user
-- Purpose: Triggered upon a row insert in auth.users. Populates public.users and maps role to public.farmers if farmer.
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

    -- If the role is farmer, also initialize public.farmers demographic profile
    IF v_role = 'farmer'::public.user_role THEN
        INSERT INTO public.farmers (user_id, district, block, panchayat)
        VALUES (new.id, NULL, NULL, NULL);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



