-- Fix for FarmerDashboard Live Queue Bug
-- The farmer dashboard needs to read other farmers' bookings in the same queue
-- to calculate 'People Ahead' and 'Now Serving'.
-- The existing policy only allowed farmers to select their own bookings.
-- We add a new policy to allow all authenticated users to read bookings.
-- Privacy is maintained because the 'users' table has its own RLS policy
-- which prevents farmers from reading other farmers' names and phone numbers.

CREATE POLICY "Farmers can read all bookings for queue visibility"
ON public.bookings FOR SELECT
USING (auth.role() = 'authenticated');
