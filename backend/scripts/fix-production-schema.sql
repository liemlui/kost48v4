-- ═══════════════════════════════════════════════════════════════════════════
-- fix-production-schema.sql — IDEMPOTEN, aman dijalankan berulang kali.
-- Menambahkan tabel/kolom yang mungkin belum ada di DB produksi karena
-- migrasi additive terlambat atau prisma db push dari schema lama.
--
-- Cara pakai:
--   psql -p 5432 -d kost48_v3 -f backend/scripts/fix-production-schema.sql
--   (untuk UAT: psql -p 5433 -d kost48_v3_pro -f ...)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) ExternalReview — tabel review eksternal (Google Maps, dll)
--    Migrasi: 20260624100000_add_external_review
CREATE TABLE IF NOT EXISTS "ExternalReview" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'google',
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExternalReview_isVisible_rating_idx" ON "ExternalReview"("isVisible", "rating");
CREATE INDEX IF NOT EXISTS "ExternalReview_reviewedAt_idx" ON "ExternalReview"("reviewedAt");

-- 2) OperationalSetting.adminWhatsappNumber — nomor WhatsApp admin untuk publik
--    Ditambahkan di schema.prisma (D-25) tanpa migration file terpisah.
ALTER TABLE "OperationalSetting"
  ADD COLUMN IF NOT EXISTS "adminWhatsappNumber" TEXT NOT NULL DEFAULT '6285648887628';

-- ═══════════════════════════════════════════════════════════════════════════
-- Verifikasi:
--   SELECT count(*) FROM "ExternalReview";
--   SELECT "adminWhatsappNumber" FROM "OperationalSetting" WHERE id=1;
-- ═══════════════════════════════════════════════════════════════════════════
