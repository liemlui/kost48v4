-- KOST48 production room master seed
--
-- Prasyarat:
--   1. Jalankan sql/schema.sql pada database PostgreSQL yang benar-benar baru.
--   2. Jalankan migration 20260724090000_public_room_availability.
--
-- Aman dijalankan ulang: hanya INSERT untuk kode kamar yang belum ada.
-- File ini TIDAK membuat tenant, stay, invoice, pembayaran, foto, atau data UAT.
-- Status di bawah mengikuti master data 2026-07-23: semua 13 kamar sedang OCCUPIED
-- dan ditampilkan FULL di katalog publik. Ubah status aktual selanjutnya melalui UI Owner.

BEGIN;

INSERT INTO "Room" (
  "code",
  "name",
  "floor",
  "status",
  "category",
  "roomType",
  "roomSize",
  "monthlyRateRupiah",
  "defaultDepositRupiah",
  "hasAc",
  "acWattage",
  "createdAt",
  "updatedAt"
)
VALUES
  ('A',  'Kamar A',  '1', 'OCCUPIED', 'DELUXE',  'MEZZANINE', 'STANDARD', 1700000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('B',  'Kamar B',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'STANDARD', 1700000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('C',  'Kamar C',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'STANDARD', 1700000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('D',  'Kamar D',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'STANDARD', 1600000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('F1', 'Kamar F1', '2', 'OCCUPIED', 'DELUXE',  'MEZZANINE', 'STANDARD', 1750000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('F2', 'Kamar F2', '2', 'OCCUPIED', 'DELUXE',  'MEZZANINE', 'STANDARD', 1750000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('G',  'Kamar G',  '1', 'OCCUPIED', 'ECONOMY', 'REGULAR',   'STANDARD',  850000, 300000, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('H',  'Kamar H',  '1', 'OCCUPIED', 'ECONOMY', 'REGULAR',   'STANDARD',  850000, 300000, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('I',  'Kamar I',  '1', 'OCCUPIED', 'ECONOMY', 'REGULAR',   'STANDARD',  850000, 300000, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('J',  'Kamar J',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'STANDARD', 1600000, 500000, true,  380, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('K',  'Kamar K',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'LARGE',    1800000, 600000, true,  450, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('L',  'Kamar L',  '1', 'OCCUPIED', 'DELUXE',  'REGULAR',   'LARGE',    1800000, 600000, true,  450, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('M',  'Kamar M',  '1', 'OCCUPIED', 'STANDARD', 'REGULAR',  'LARGE',    1400000, 500000, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

DO $$
DECLARE
  seededRoomCount integer;
BEGIN
  SELECT count(*) INTO seededRoomCount
  FROM "Room"
  WHERE "code" = ANY (ARRAY['A', 'B', 'C', 'D', 'F1', 'F2', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);

  IF seededRoomCount <> 13 THEN
    RAISE EXCEPTION 'Seed kamar gagal: diharapkan 13 kode kamar, ditemukan %.', seededRoomCount;
  END IF;
END $$;

-- Override katalog publik. Tidak mengubah Room.status dan tidak membuat data sewa.
INSERT INTO "PublicRoomAvailability" ("roomId", "status", "updatedAt")
SELECT "id", 'FULL'::"PublicRoomAvailabilityStatus", CURRENT_TIMESTAMP
FROM "Room"
WHERE "code" = ANY (ARRAY['A', 'B', 'C', 'D', 'F1', 'F2', 'G', 'H', 'I', 'J', 'K', 'L', 'M'])
ON CONFLICT ("roomId") DO NOTHING;

COMMIT;
