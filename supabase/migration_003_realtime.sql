-- =========================================================================
-- MIGRATION 003: ENABLE REALTIME FOR BOOKINGS
-- =========================================================================

-- Add the bookings table to the supabase_realtime publication
-- so that the frontend can subscribe to postgres_changes.
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
