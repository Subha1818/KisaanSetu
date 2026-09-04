-- =========================================================================
-- MIGRATION 017: ADD CENTRE COORDINATES
-- =========================================================================

-- Add nullable latitude and longitude columns to procurement_centres
ALTER TABLE public.procurement_centres 
ADD COLUMN latitude double precision NULL,
ADD COLUMN longitude double precision NULL;

-- These columns default to NULL, avoiding 0,0 (Null Island) issues.
