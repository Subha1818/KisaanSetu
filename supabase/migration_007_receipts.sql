-- migration_007_receipts.sql
-- Adds an optional note column to the procurements table for staff comments

ALTER TABLE public.procurements
ADD COLUMN IF NOT EXISTS note text;
