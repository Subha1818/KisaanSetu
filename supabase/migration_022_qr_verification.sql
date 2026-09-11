-- Migration 022: QR Verification Gate
-- Adds qr_verified_at and verified_by columns to public.bookings to gate procurement intake behind identity verification.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS qr_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.qr_verified_at IS 'Timestamp when the farmer QR code or token identity was verified by depot staff.';
COMMENT ON COLUMN public.bookings.verified_by IS 'Staff user ID who verified the farmer identity at the depot gate.';
