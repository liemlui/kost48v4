-- Demografi customer teranonim (keputusan owner 2026-06-19): provinsi asal untuk breakdown marketing.
-- Additive, nullable; tidak menyentuh data existing.

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "originProvince" TEXT;
