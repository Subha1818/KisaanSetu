-- =========================================================================
-- SEED DATA FOR Farmer Procurement & Queue Platform
-- Current Date Context: August 27, 2026
-- =========================================================================

-- 1. Insert Mock Geo Reference Blocks
INSERT INTO public.geo_blocks (
    block_code, block_name, district_code, district_name, state_code, state_name, block_version
) VALUES 
(999001, 'Rampur Block', 201, 'Patna District', 10, 'Bihar State', 1),
(999002, 'Danapur Block', 201, 'Patna District', 10, 'Bihar State', 1),
(999003, 'Bodhi Gaya Block', 202, 'Gaya District', 10, 'Bihar State', 1);

-- 2. Insert Procurement Centres
INSERT INTO public.procurement_centres (
    id, name, owner_name, block_code, status, daily_capacity, booking_window_start, booking_window_end, cancellation_window_hours
) VALUES 
('11111111-1111-1111-1111-111111111111', 'Rampur Depot A', 'Rajesh Sharma', 999001, 'open', 50, '2026-08-28', '2026-09-12', 24),
('22222222-2222-2222-2222-222222222222', 'Rampur Depot B', 'Amit Kumar', 999001, 'open', 30, '2026-08-28', '2026-09-12', 24),
('33333333-3333-3333-3333-333333333333', 'Danapur Cantonment Yard', 'Sunil Yadav', 999002, 'open', 100, '2026-08-28', '2026-09-12', 12),
('44444444-4444-4444-4444-444444444444', 'Bodhi Gaya Mandi', 'Vinay Singh', 999003, 'open', 80, '2026-08-28', '2026-09-12', 24);

-- 3. Insert Centre Products
INSERT INTO public.centre_products (centre_id, product_name, max_quantity_per_farmer) VALUES
('11111111-1111-1111-1111-111111111111', 'Wheat', 5000),
('11111111-1111-1111-1111-111111111111', 'Paddy', 3000),
('22222222-2222-2222-2222-222222222222', 'Wheat', 4000),
('22222222-2222-2222-2222-222222222222', 'Maize', 3500),
('33333333-3333-3333-3333-333333333333', 'Wheat', 10000),
('33333333-3333-3333-3333-333333333333', 'Paddy', 8000),
('33333333-3333-3333-3333-333333333333', 'Maize', 7500),
('44444444-4444-4444-4444-444444444444', 'Paddy', 6000),
('44444444-4444-4444-4444-444444444444', 'Maize', 5000);

-- 4. Insert Booking Slots
INSERT INTO public.booking_dates (centre_id, date, capacity, booked_count, status) VALUES
-- Rampur Depot A (10 slots available)
('11111111-1111-1111-1111-111111111111', '2026-08-28', 10, 2, 'open'),
('11111111-1111-1111-1111-111111111111', '2026-08-29', 10, 10, 'full'),
('11111111-1111-1111-1111-111111111111', '2026-08-30', 12, 0, 'open'),

-- Rampur Depot B
('22222222-2222-2222-2222-222222222222', '2026-08-28', 8, 3, 'open'),
('22222222-2222-2222-2222-222222222222', '2026-08-29', 8, 1, 'open'),

-- Danapur Yard
('33333333-3333-3333-3333-333333333333', '2026-08-28', 20, 0, 'open'),
('33333333-3333-3333-3333-333333333333', '2026-08-29', 20, 5, 'open'),

-- Bodhi Gaya Mandi
('44444444-4444-4444-4444-444444444444', '2026-08-28', 15, 14, 'open'),
('44444444-4444-4444-4444-444444444444', '2026-08-29', 15, 15, 'full');
