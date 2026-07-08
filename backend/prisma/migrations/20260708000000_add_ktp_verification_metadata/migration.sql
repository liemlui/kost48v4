-- Additive migration: metadata verifikasi KTP (G5+)
-- Semua kolom nullable → aman di database yang sudah ada data.
-- Tidak ada DEFAULT karena nullable string.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ktpVerificationMethod"  VARCHAR(50);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ktpVerificationNotes"   TEXT;