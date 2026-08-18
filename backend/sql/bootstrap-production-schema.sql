-- Bootstrap KOST48 production database yang BENAR-BENAR baru/kosong.
-- Jalankan hanya lewat psql bersama --single-transaction dan ON_ERROR_STOP.
-- Script berhenti bila schema public sudah berisi tabel agar tidak merusak DB UAT/produksi.
--
-- Contoh:
--   psql -h 127.0.0.1 -U USER -d DATABASE --single-transaction \
--     -v ON_ERROR_STOP=1 -f sql/bootstrap-production-schema.sql

DO $$
DECLARE
  existingTableCount integer;
BEGIN
  SELECT count(*) INTO existingTableCount
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public';

  IF existingTableCount > 0 THEN
    RAISE EXCEPTION
      'Bootstrap dibatalkan: schema public sudah memiliki % tabel. Gunakan hanya database baru/kosong.',
      existingTableCount;
  END IF;
END $$;

-- \ir membuat path relatif terhadap lokasi file ini, bukan cwd Terminal.
\ir schema.sql
\ir ../prisma/migrations/20260723000000_announcement_notification_delivery/migration.sql
\ir ../prisma/migrations/20260724090000_public_room_availability/migration.sql
\ir ../prisma/migrations/20260818000000_settings_tuya_vapid/migration.sql
