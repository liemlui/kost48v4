-- KOST48 default production data seed
-- PostgreSQL 9.6 compatible.
--
-- Run AFTER:
--   1) setup.sql
--   2) sql/bootstrap.sql
--   3) npm run seed:owner
--
-- Safe to run again. It updates the same 13 rooms, default inventory,
-- room facilities, FAQ, operational settings, and additional services.
--
-- In phpPgAdmin: upload this file as SQL script, or paste with
-- "Paginate results" unchecked.

SET search_path = public;

-- ---------------------------------------------------------------------------
-- 1. Operational settings
-- ---------------------------------------------------------------------------

INSERT INTO "OperationalSetting" (id, "updatedAt")
SELECT 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "OperationalSetting" WHERE id = 1);

UPDATE "OperationalSetting"
SET
  "freeElectricityKwhPerMonth" = 30,
  "electricityTariffPerKwhRupiah" = 2500,
  "waterMeteringEnabled" = false,
  "waterTariffPerM3Rupiah" = 0,
  "freeWaterM3PerMonth" = 0,
  "wifiRupiah" = 50000,
  "galonRupiah" = 20000,
  "petDepositRupiah" = 100000,
  "extraOccupantFeePercent" = 20,
  "acCleanKwhThreshold" = 200,
  "adminWhatsappNumber" = '6285648887628',
  "updatedAt" = NOW()
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- 2. Rooms: 13 real KOST48 rooms
--
-- Current seed uses AVAILABLE so you can input the real tenants/stays from
-- the admin check-in flow. When a stay is created, the system will set that
-- room to OCCUPIED and attach the tenant, invoices, meter readings, and
-- deposit snapshot correctly. On rerun, rooms that already have an ACTIVE
-- stay keep their current status.
--
-- Deposit rule:
--   DELUXE   = 200000
--   STANDARD = 150000
--   ECONOMY  = 100000
--
-- Room.images uses frontend public assets. These files exist in:
--   client/room-images/*.webp
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_room;
CREATE TEMP TABLE seed_room (
  code text PRIMARY KEY,
  name text,
  floor text,
  status text,
  category text,
  room_type text,
  room_size text,
  monthly_rate int,
  deposit int,
  has_ac boolean,
  ac_wattage int,
  ac_clean_interval_days int,
  ac_usage_hours_per_day double precision,
  images text[],
  notes text
);

INSERT INTO seed_room
  (code, name, floor, status, category, room_type, room_size, monthly_rate, deposit,
   has_ac, ac_wattage, ac_clean_interval_days, ac_usage_hours_per_day, images, notes)
VALUES
  ('A', 'Kamar A', '1', 'AVAILABLE', 'DELUXE', 'MEZZANINE', 'STANDARD', 1700000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-a.webp','/room-images/kamar-a-1.webp','/room-images/kamar-a-2.webp','/room-images/kamar-a-3.webp','/room-images/kamar-a-4.webp','/room-images/kamar-a-5.webp']::text[],
   '2m x 3,5m + mezanin 2m x 2m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200'),

  ('B', 'Kamar B', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'STANDARD', 1700000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-b.webp','/room-images/kamar-b-1.webp','/room-images/kamar-b-2.webp','/room-images/kamar-b-3.webp','/room-images/kamar-b-4.webp','/room-images/kamar-b-5.webp']::text[],
   '2,5m x 3,5m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200'),

  ('C', 'Kamar C', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'STANDARD', 1700000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-c.webp','/room-images/kamar-c-1.webp','/room-images/kamar-c-2.webp','/room-images/kamar-c-3.webp']::text[],
   '2,5m x 3,5m; KM dalam 1,5m x 1,5m; kasur busa tebal 180 x 200'),

  ('D', 'Kamar D', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'STANDARD', 1600000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-d.webp','/room-images/kamar-d-1.webp','/room-images/kamar-d-2.webp','/room-images/kamar-d-3.webp','/room-images/kamar-d-4.webp','/room-images/kamar-d-5.webp']::text[],
   '2m x 3,5m; KM dalam 1,5m x 1,5m; kasur busa tebal 180 x 200'),

  ('G', 'Kamar G', '1', 'AVAILABLE', 'ECONOMY', 'REGULAR', 'STANDARD', 850000, 100000,
   false, NULL, 90, NULL,
   ARRAY['/room-images/kamar-g.webp','/room-images/kamar-g-1.webp','/room-images/kamar-g-2.webp','/room-images/kamar-g-3.webp','/room-images/kamar-g-4.webp','/room-images/kamar-g-5.webp']::text[],
   '2m x 3,5m; KM luar bersama; kasur busa tebal 180 x 200'),

  ('H', 'Kamar H', '1', 'AVAILABLE', 'ECONOMY', 'REGULAR', 'STANDARD', 850000, 100000,
   false, NULL, 90, NULL,
   ARRAY['/room-images/kamar-h.webp','/room-images/kamar-h-1.webp','/room-images/kamar-h-2.webp','/room-images/kamar-h-3.webp','/room-images/kamar-h-4.webp','/room-images/kamar-h-5.webp']::text[],
   '2m x 3,5m; KM luar bersama; kasur busa tebal 180 x 200'),

  ('I', 'Kamar I', '1', 'AVAILABLE', 'ECONOMY', 'REGULAR', 'STANDARD', 850000, 100000,
   false, NULL, 90, NULL,
   ARRAY['/room-images/kamar-i.webp','/room-images/kamar-i-1.webp','/room-images/kamar-i-2.webp','/room-images/kamar-i-3.webp','/room-images/kamar-i-4.webp','/room-images/kamar-i-5.webp']::text[],
   '2m x 3,5m; KM luar bersama; kasur busa tebal 180 x 200'),

  ('J', 'Kamar J', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'STANDARD', 1600000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-j.webp','/room-images/kamar-j-1.webp','/room-images/kamar-j-2.webp','/room-images/kamar-j-3.webp','/room-images/kamar-j-4.webp','/room-images/kamar-j-5.webp']::text[],
   '2m x 3,5m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200'),

  ('K', 'Kamar K', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'LARGE', 1800000, 200000,
   true, 450, 90, 8,
   ARRAY['/room-images/kamar-k.webp','/room-images/kamar-k-1.webp','/room-images/kamar-k-2.webp','/room-images/kamar-k-3.webp','/room-images/kamar-k-4.webp']::text[],
   '3m x 3,5m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200'),

  ('L', 'Kamar L', '1', 'AVAILABLE', 'DELUXE', 'REGULAR', 'LARGE', 1800000, 200000,
   true, 450, 90, 8,
   ARRAY['/room-images/kamar-l.webp','/room-images/kamar-l-1.webp','/room-images/kamar-l-2.webp','/room-images/kamar-l-3.webp','/room-images/kamar-l-4.webp','/room-images/kamar-l-5.webp']::text[],
   '3m x 3,5m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200'),

  ('M', 'Kamar M', '1', 'AVAILABLE', 'STANDARD', 'REGULAR', 'LARGE', 1400000, 150000,
   false, NULL, 90, NULL,
   ARRAY['/room-images/kamar-m.webp','/room-images/kamar-m-1.webp','/room-images/kamar-m-2.webp','/room-images/kamar-m-3.webp','/room-images/kamar-m-4.webp','/room-images/kamar-m-5.webp']::text[],
   '3m x 3,5m; KM dalam 1,2m x 1,5m; kasur busa tebal 180 x 200; kipas tanpa AC'),

  ('F1', 'Kamar F1', '2', 'AVAILABLE', 'DELUXE', 'MEZZANINE', 'STANDARD', 1750000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-a.webp','/room-images/kamar-a-1.webp','/room-images/kamar-a-2.webp','/room-images/kamar-a-3.webp','/room-images/kamar-a-4.webp']::text[],
   '2,5m x 3m + mezanin 1,5m x 3m; KM dalam 1,5m x 1,2m; kasur busa 90 x 200 atau double bed'),

  ('F2', 'Kamar F2', '2', 'AVAILABLE', 'DELUXE', 'MEZZANINE', 'STANDARD', 1750000, 200000,
   true, 380, 90, 8,
   ARRAY['/room-images/kamar-b.webp','/room-images/kamar-b-1.webp','/room-images/kamar-b-2.webp','/room-images/kamar-b-3.webp','/room-images/kamar-b-4.webp']::text[],
   '2,5m x 3m + mezanin 1,5m x 3m; KM dalam 1,5m x 1,2m; double bed; perabot lengkap');

UPDATE "Room" r
SET
  name = s.name,
  floor = s.floor,
  status = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "Stay" st
      WHERE st."roomId" = r.id
        AND st.status = 'ACTIVE'::"StayStatus"
    )
    THEN r.status
    ELSE s.status::"RoomStatus"
  END,
  category = s.category::"RoomCategory",
  "roomType" = s.room_type::"RoomType",
  "roomSize" = s.room_size::"RoomSize",
  "monthlyRateRupiah" = s.monthly_rate,
  "defaultDepositRupiah" = s.deposit,
  "electricityTariffPerKwhRupiah" = 2500,
  "waterTariffPerM3Rupiah" = 0,
  images = s.images,
  notes = s.notes,
  "isActive" = true,
  "allowBookingWhileCleaning" = false,
  "hasAc" = s.has_ac,
  "acWattage" = s.ac_wattage,
  "acCleanIntervalDays" = s.ac_clean_interval_days,
  "acUsageHoursPerDay" = s.ac_usage_hours_per_day,
  "updatedAt" = NOW()
FROM seed_room s
WHERE r.code = s.code;

INSERT INTO "Room"
  (code, name, floor, status, category, "roomType", "roomSize",
   "monthlyRateRupiah", "defaultDepositRupiah",
   "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah",
   images, notes, "isActive", "allowBookingWhileCleaning",
   "hasAc", "acWattage", "acCleanIntervalDays", "acUsageHoursPerDay",
   "createdAt", "updatedAt")
SELECT
  s.code, s.name, s.floor, s.status::"RoomStatus", s.category::"RoomCategory",
  s.room_type::"RoomType", s.room_size::"RoomSize",
  s.monthly_rate, s.deposit,
  2500, 0,
  s.images, s.notes, true, false,
  s.has_ac, s.ac_wattage, s.ac_clean_interval_days, s.ac_usage_hours_per_day,
  NOW(), NOW()
FROM seed_room s
WHERE NOT EXISTS (SELECT 1 FROM "Room" r WHERE r.code = s.code);

-- ---------------------------------------------------------------------------
-- 3. Inventory master items
-- qtyOnHand here means spare stock in warehouse, not items already installed
-- inside rooms.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_inventory;
CREATE TEMP TABLE seed_inventory (
  sku text PRIMARY KEY,
  name text,
  category text,
  unit text,
  qty_on_hand numeric(12,2),
  min_qty numeric(12,2),
  status text,
  notes text,
  images text[]
);

INSERT INTO seed_inventory
  (sku, name, category, unit, qty_on_hand, min_qty, status, notes, images)
VALUES
  ('INV-FURN-001', 'Kasur Busa Tebal 180x200', 'Furniture', 'pcs', 0, 0, 'GOOD', 'Terpasang 1 per kamar utama.', ARRAY['/room-images/fasilitas-kasurbusatebalsingle.webp']::text[]),
  ('INV-FURN-002', 'Lemari Baju', 'Furniture', 'pcs', 0, 0, 'GOOD', 'Terpasang 1 per kamar.', ARRAY['/room-images/fasilitas-lemaripakaian.webp']::text[]),
  ('INV-FURN-003', 'Gantungan Baju', 'Furniture', 'set', 5, 2, 'GOOD', 'Stok cadangan gantungan baju.', ARRAY[]::text[]),
  ('INV-FURN-004', 'Kipas Angin', 'Electronic', 'pcs', 2, 1, 'GOOD', 'Semua kamar punya kipas; stok ini cadangan.', ARRAY['/room-images/fasilitas-kipasangin.webp']::text[]),
  ('INV-FURN-005', 'AC Split 1/2 PK 380W', 'Electronic', 'pcs', 1, 1, 'GOOD', 'Untuk kamar A, B, C, D, J, F1, F2; stok cadangan 1 unit.', ARRAY['/room-images/fasilitas-air-conditioner.webp']::text[]),
  ('INV-FURN-006', 'AC Split 1/2 PK 450W', 'Electronic', 'pcs', 0, 0, 'GOOD', 'Untuk kamar besar K dan L.', ARRAY['/room-images/fasilitas-air-conditioner.webp']::text[]),
  ('INV-FURN-007', 'Kasur Busa 90x200', 'Furniture', 'pcs', 0, 0, 'GOOD', 'Untuk kamar mezanin F1/F2.', ARRAY['/room-images/fasilitas-kasurbusatebalsingle.webp']::text[]),
  ('INV-FURN-008', 'Double Bed', 'Furniture', 'pcs', 0, 0, 'GOOD', 'Double bed untuk kamar F2.', ARRAY['/room-images/fasilitas-springbed.webp']::text[]),
  ('INV-ROOM-KEY', 'Kunci Kamar', 'Access', 'pcs', 5, 2, 'GOOD', 'Cadangan kunci kamar dan gantungan kunci.', ARRAY[]::text[]),
  ('INV-ELEC-LAMP', 'Lampu LED Kamar', 'Electric', 'pcs', 10, 4, 'GOOD', 'Stok lampu pengganti kamar.', ARRAY[]::text[]),
  ('INV-FURN-CURTAIN', 'Gorden Kamar', 'Furniture', 'pcs', 2, 1, 'GOOD', 'Gorden cadangan kamar.', ARRAY[]::text[]),
  ('INV-FURN-TRASH', 'Tempat Sampah Kamar', 'Furniture', 'pcs', 3, 1, 'GOOD', 'Tempat sampah kecil untuk kamar.', ARRAY[]::text[]),
  ('INV-BATH-BUCKET', 'Ember dan Gayung', 'Bathroom', 'set', 2, 1, 'GOOD', 'Cadangan kamar mandi dalam.', ARRAY[]::text[]),
  ('INV-AC-REMOTE', 'Remote AC', 'Electronic', 'pcs', 2, 1, 'GOOD', 'Remote cadangan untuk kamar AC.', ARRAY[]::text[]),
  ('INV-OPS-CLEAN', 'Peralatan Kebersihan Umum', 'Operation', 'set', 2, 1, 'GOOD', 'Sapu, pel, kain lap, dan alat kebersihan area umum.', ARRAY['/room-images/fasilitas-peralatankebersihan.webp']::text[]),
  ('INV-WIFI-ROUTER', 'Router WiFi', 'Electronic', 'pcs', 1, 1, 'GOOD', 'Perangkat jaringan WiFi area kos.', ARRAY['/room-images/fasilitas-wifi.webp']::text[]),
  ('INV-SEC-CCTV', 'CCTV Area Kos', 'Security', 'pcs', 1, 1, 'GOOD', 'Perangkat keamanan area kos.', ARRAY['/room-images/fasilitas-cctv.webp']::text[]),
  ('INV-WATER-TANDON-650', 'Tandon Air 650 Liter', 'Water', 'pcs', 2, 0, 'GOOD', 'Tandon air PDAM cadangan.', ARRAY['/room-images/fasilitas-tandon.webp']::text[]),
  ('INV-WATER-PUMP', 'Pompa Air', 'Water', 'pcs', 1, 0, 'GOOD', 'Pompa air operasional.', ARRAY[]::text[]),
  ('INV-OPS-LADDER', 'Tangga Lipat', 'Operation', 'pcs', 1, 0, 'GOOD', 'Tangga untuk maintenance ringan.', ARRAY[]::text[]);

UPDATE "InventoryItem" i
SET
  name = s.name,
  category = s.category,
  unit = s.unit,
  "qtyOnHand" = s.qty_on_hand,
  "minQty" = s.min_qty,
  status = s.status::"InventoryItemStatus",
  notes = s.notes,
  images = s.images,
  "isActive" = true,
  "updatedAt" = NOW()
FROM seed_inventory s
WHERE i.sku = s.sku;

INSERT INTO "InventoryItem"
  (sku, name, category, unit, "qtyOnHand", "minQty", status, notes, images, "isActive", "createdAt", "updatedAt")
SELECT
  s.sku, s.name, s.category, s.unit, s.qty_on_hand, s.min_qty,
  s.status::"InventoryItemStatus", s.notes, s.images, true, NOW(), NOW()
FROM seed_inventory s
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i.sku = s.sku);

-- ---------------------------------------------------------------------------
-- 4. Room item mapping: items already installed in each room
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_room_item;
CREATE TEMP TABLE seed_room_item (
  room_code text,
  sku text,
  qty numeric(12,2)
);

-- Basic room items for every room.
INSERT INTO seed_room_item (room_code, sku, qty)
SELECT r.code, x.sku, 1
FROM seed_room r
CROSS JOIN (
  VALUES
    ('INV-FURN-001'),
    ('INV-FURN-002'),
    ('INV-FURN-003'),
    ('INV-FURN-004'),
    ('INV-ROOM-KEY'),
    ('INV-ELEC-LAMP'),
    ('INV-FURN-CURTAIN'),
    ('INV-FURN-TRASH')
) AS x(sku);

-- Bathroom kit for rooms with private bathroom.
INSERT INTO seed_room_item (room_code, sku, qty)
SELECT code, 'INV-BATH-BUCKET', 1
FROM seed_room
WHERE category IN ('DELUXE', 'STANDARD');

-- AC units and remotes.
INSERT INTO seed_room_item (room_code, sku, qty)
SELECT code, CASE WHEN code IN ('K','L') THEN 'INV-FURN-006' ELSE 'INV-FURN-005' END, 1
FROM seed_room
WHERE has_ac = true;

INSERT INTO seed_room_item (room_code, sku, qty)
SELECT code, 'INV-AC-REMOTE', 1
FROM seed_room
WHERE has_ac = true;

-- Mezzanine bed items.
INSERT INTO seed_room_item (room_code, sku, qty)
VALUES
  ('F1', 'INV-FURN-007', 1),
  ('F2', 'INV-FURN-007', 1),
  ('F2', 'INV-FURN-008', 1);

UPDATE "RoomItem" ri
SET
  qty = s.qty,
  status = 'GOOD'::"RoomItemStatus",
  "updatedAt" = NOW()
FROM seed_room_item s
JOIN "Room" r ON r.code = s.room_code
JOIN "InventoryItem" i ON i.sku = s.sku
WHERE ri."roomId" = r.id
  AND ri."itemId" = i.id;

INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, s.qty, 'GOOD'::"RoomItemStatus", NOW(), NOW()
FROM seed_room_item s
JOIN "Room" r ON r.code = s.room_code
JOIN "InventoryItem" i ON i.sku = s.sku
WHERE NOT EXISTS (
  SELECT 1
  FROM "RoomItem" ri
  WHERE ri."roomId" = r.id
    AND ri."itemId" = i.id
);

-- ---------------------------------------------------------------------------
-- 5. Room facilities shown in public room catalogue
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_room_facility;
CREATE TEMP TABLE seed_room_facility (
  room_code text,
  name text,
  quantity int,
  category text,
  public_visible boolean,
  condition text,
  note text,
  sku text
);

-- Remove only seed-managed facilities so rerun stays clean.
DELETE FROM "RoomFacility" rf
USING "Room" r
WHERE rf."roomId" = r.id
  AND r.code IN (SELECT code FROM seed_room)
  AND (
    lower(rf.name) LIKE 'kasur%' OR
    lower(rf.name) LIKE 'lemari%' OR
    lower(rf.name) LIKE 'gantungan%' OR
    lower(rf.name) LIKE 'kipas%' OR
    lower(rf.name) LIKE 'ac%' OR
    lower(rf.name) LIKE 'remote ac%' OR
    lower(rf.name) LIKE 'kamar mandi%' OR
    lower(rf.name) LIKE 'kunci%' OR
    lower(rf.name) LIKE 'lampu%' OR
    lower(rf.name) LIKE 'gorden%' OR
    lower(rf.name) LIKE 'tempat sampah%' OR
    lower(rf.name) LIKE 'ember%' OR
    lower(rf.name) LIKE 'mezanin%' OR
    lower(rf.name) LIKE 'mezzanine%' OR
    lower(rf.name) LIKE 'ukuran%'
  );

-- Basic public facilities.
INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT r.code, x.name, x.quantity, x.category, x.public_visible, 'GOOD', x.note, x.sku
FROM seed_room r
CROSS JOIN (
  VALUES
    ('Kasur Busa Tebal 180x200', 1, 'Tidur', true, 'Kasur busa tebal untuk tidur nyaman.', 'INV-FURN-001'),
    ('Lemari Baju', 1, 'Perabot', true, 'Lemari baju di dalam kamar.', 'INV-FURN-002'),
    ('Gantungan Baju', 1, 'Perabot', true, 'Set gantungan baju.', 'INV-FURN-003'),
    ('Kipas Angin', 1, 'Pendingin', true, 'Kipas angin tersedia di semua kamar.', 'INV-FURN-004'),
    ('Lampu LED Kamar', 1, 'Elektrik', true, 'Penerangan kamar.', 'INV-ELEC-LAMP'),
    ('Gorden Kamar', 1, 'Perabot', true, 'Gorden jendela kamar.', 'INV-FURN-CURTAIN'),
    ('Tempat Sampah Kamar', 1, 'Perabot', true, 'Tempat sampah kecil.', 'INV-FURN-TRASH'),
    ('Kunci Kamar', 1, 'Akses', false, 'Kunci diserahkan saat check-in.', 'INV-ROOM-KEY')
) AS x(name, quantity, category, public_visible, note, sku);

-- Bathroom type.
INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Kamar Mandi Dalam', 1, 'Kamar Mandi', true, 'GOOD', 'Kamar mandi berada di dalam kamar.', NULL
FROM seed_room
WHERE category IN ('DELUXE', 'STANDARD');

INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Kamar Mandi Luar Bersama', 1, 'Kamar Mandi', true, 'GOOD', 'Kamar mandi luar bersama untuk kamar economy.', NULL
FROM seed_room
WHERE category = 'ECONOMY';

INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Ember dan Gayung', 1, 'Kamar Mandi', true, 'GOOD', 'Perlengkapan kamar mandi dasar.', 'INV-BATH-BUCKET'
FROM seed_room
WHERE category IN ('DELUXE', 'STANDARD');

-- AC, remote, and mezzanine.
INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'AC Split', 1, 'Pendingin', true, 'GOOD',
       CASE WHEN code IN ('K','L') THEN 'AC 450W untuk kamar besar.' ELSE 'AC 380W.' END,
       CASE WHEN code IN ('K','L') THEN 'INV-FURN-006' ELSE 'INV-FURN-005' END
FROM seed_room
WHERE has_ac = true;

INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Remote AC', 1, 'Pendingin', false, 'GOOD', 'Remote AC diserahkan saat check-in.', 'INV-AC-REMOTE'
FROM seed_room
WHERE has_ac = true;

INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Mezzanine / Loteng', 1, 'Tipe Kamar', true, 'GOOD', 'Area mezanin/loteng tambahan.', NULL
FROM seed_room
WHERE room_type = 'MEZZANINE';

INSERT INTO seed_room_facility (room_code, name, quantity, category, public_visible, condition, note, sku)
SELECT code, 'Ukuran Besar', 1, 'Ukuran', true, 'GOOD', 'Kamar ukuran besar.', NULL
FROM seed_room
WHERE room_size = 'LARGE';

INSERT INTO "RoomFacility"
  ("roomId", name, quantity, category, "publicVisible", condition, note, "inventoryItemId", "createdAt", "updatedAt")
SELECT
  r.id,
  f.name,
  f.quantity,
  f.category,
  f.public_visible,
  f.condition,
  f.note,
  i.id,
  NOW(),
  NOW()
FROM seed_room_facility f
JOIN "Room" r ON r.code = f.room_code
LEFT JOIN "InventoryItem" i ON i.sku = f.sku;

-- ---------------------------------------------------------------------------
-- 6. FAQ defaults
-- Existing FAQ with the same question will be updated.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_faq;
CREATE TEMP TABLE seed_faq (
  question text PRIMARY KEY,
  answer text,
  category text,
  sort_order int,
  is_active boolean
);

INSERT INTO seed_faq (question, answer, category, sort_order, is_active)
VALUES
  ('Fasilitasnya apa saja Kak?',
   E'Fasilitas umum: parkir mobil dan motor, dapur bersama, air PDAM dengan tandon, balkon santai, area jemur, taman/area hijau, CCTV, dan WiFi sebagai layanan tambahan.\n\nFasilitas kamar: kasur, lemari, gantungan baju, kipas angin, lampu, gorden, tempat sampah, serta AC dan kamar mandi dalam untuk tipe tertentu.',
   'Fasilitas', 1, true),

  ('Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?',
   E'Lokasi KOST48 ada di Jalan Hikmah V No. 48, Surabaya Barat, area Lontar/Sambikerep. Lokasinya dekat Pakuwon Mall / PTC, sekitar 7 menit berjalan kaki tergantung titik masuk.',
   'Lokasi', 2, true),

  ('Satu kamar bisa untuk berapa orang?',
   E'Standar kamar untuk 1 sampai 2 orang. Kamar ukuran besar bisa dipertimbangkan sampai maksimal 4 orang setelah konfirmasi pengelola. Penghuni tambahan di atas batas gratis dikenakan biaya tambahan 20% dari tarif kamar per orang per bulan.',
   'Aturan', 3, true),

  ('Apakah tersedia WiFi?',
   E'Tersedia WiFi sebagai layanan tambahan per perangkat. Tarif default: bulanan Rp 50.000 per perangkat. Untuk durasi pendek atau kebutuhan khusus, konfirmasi dulu ke admin.',
   'Fasilitas', 4, true),

  ('Apakah disediakan dispenser air minum?',
   E'Tidak ada dispenser bersama. Penghuni dapat membeli galon air Voila melalui pengelola dengan tarif default Rp 20.000 per galon.',
   'Fasilitas', 5, true),

  ('Ini kost cewek apa cowok?',
   E'KOST48 adalah kos campur putra dan putri. Pengelola tinggal/berada di lokasi dan menjaga ketertiban lingkungan.',
   'Aturan', 6, true),

  ('Apakah boleh untuk Pasutri?',
   E'Boleh untuk pasangan suami istri dengan membawa bukti pernikahan seperti buku nikah, kartu keluarga, atau dokumen pendukung lain yang diminta pengelola.',
   'Aturan', 7, true),

  ('Apakah boleh membawa hewan peliharaan?',
   E'Bisa dipertimbangkan jika tidak mengganggu dan tidak merusak fasilitas. Ada deposit hewan peliharaan Rp 100.000 yang dapat dikembalikan jika tidak ada kerusakan.',
   'Aturan', 8, true),

  ('Apakah ada TV di kamar?',
   E'TV tidak menjadi fasilitas standar kamar. Jika tersedia, TV dapat diajukan sebagai layanan tambahan dengan biaya bulanan sesuai konfirmasi admin.',
   'Fasilitas', 9, true),

  ('Apakah tempatnya bersih?',
   E'Area umum dijaga dan dibersihkan berkala. Penghuni tetap wajib menjaga kebersihan kamar masing-masing dan melapor bila ada fasilitas yang perlu diperbaiki.',
   'Fasilitas', 10, true),

  ('Apakah ada kamar kosong?',
   E'Ketersediaan kamar dapat berubah sewaktu-waktu. Cek katalog kamar di aplikasi untuk status terbaru, atau hubungi admin WhatsApp untuk konfirmasi cepat.',
   'Booking', 11, true),

  ('Berapa tarif kamarnya kak?',
   E'Tarif bulanan KOST48 saat ini berkisar Rp 850.000 sampai Rp 1.800.000, tergantung tipe kamar, ukuran, AC/kipas, kamar mandi dalam/luar, dan mezanin. Harga aktif bisa dicek pada detail kamar.',
   'Tarif', 12, true),

  ('Apakah sudah termasuk listrik?',
   E'Setiap kamar mendapat jatah listrik gratis 30 kWh per bulan. Kelebihan pemakaian ditagihkan Rp 2.500 per kWh berdasarkan meter. Air saat ini termasuk/gratis selama meter air belum diaktifkan.',
   'Tarif', 13, true),

  ('Berapa deposit jaminannya?',
   E'Deposit jaminan berbeda dengan DP booking. Deposit jaminan default: Economy Rp 100.000, Standard Rp 150.000, Deluxe Rp 200.000. Deposit ini untuk antisipasi kunci belum kembali, listrik terakhir belum dibayar, atau kerusakan ringan.',
   'Pembayaran', 14, true),

  ('Apa beda DP dengan deposit jaminan?',
   E'DP adalah uang muka booking sebesar 30% dari tarif sewa dan menjadi bagian dari pembayaran sewa. Deposit jaminan adalah titipan yang dapat dikembalikan saat checkout setelah dikurangi tagihan/kerusakan bila ada. Keduanya dicatat terpisah oleh sistem.',
   'Pembayaran', 15, true),

  ('Apakah boleh mencicil pembayaran sewa?',
   E'Tidak ada cicilan bebas. Untuk booking, nominal yang sah adalah DP 30% atau langsung lunas. Tagihan sewa, utilitas, dan pelunasan wajib dibayar sesuai invoice.',
   'Pembayaran', 16, true),

  ('Bagaimana cara membayar?',
   E'Pembayaran bisa tunai atau transfer. Untuk transfer, unggah bukti bayar di aplikasi. Admin akan memverifikasi sebelum pembayaran tercatat.',
   'Pembayaran', 17, true),

  ('Bagaimana cara memesan kamar?',
   E'Pilih kamar di katalog, isi data booking, lalu bayar DP 30% atau langsung lunas. Setelah bukti pembayaran diverifikasi admin, kamar akan dikunci sesuai alur booking.',
   'Booking', 18, true),

  ('Berapa lama batas waktu booking?',
   E'Booking berlaku 3 jam. Jika belum ada pembayaran valid dalam batas waktu tersebut, booking dapat kedaluwarsa dan kamar bisa tersedia kembali.',
   'Booking', 19, true),

  ('Bagaimana jika beberapa orang memesan kamar yang sama?',
   E'Sistem memakai prinsip pembayaran valid pertama yang menang. Jika ada beberapa peminat pada kamar yang sama, admin akan memproses sesuai pembayaran yang lebih dulu diverifikasi.',
   'Booking', 20, true),

  ('Kapan saya bisa memperpanjang sewa?',
   E'Penghuni bisa mengajukan perpanjangan sebelum masa sewa habis. Sistem juga dapat memberi pengingat mendekati tanggal selesai sewa.',
   'Perpanjangan', 21, true),

  ('Apakah harga naik saat perpanjang?',
   E'Selama kontrak tidak putus dan penghuni memperpanjang sesuai aturan, harga lama dapat dipertahankan mengikuti kebijakan pengelola. Jika kontrak putus dan booking ulang, harga mengikuti tarif aktif.',
   'Perpanjangan', 22, true),

  ('Bagaimana proses checkout?',
   E'Ajukan checkout melalui aplikasi atau admin, lunasi tagihan yang masih terbuka, lalu kamar diperiksa. Setelah pemeriksaan selesai, deposit jaminan dihitung dan dikembalikan jika masih ada sisa.',
   'Checkout & Deposit', 23, true),

  ('Kapan deposit jaminan dikembalikan?',
   E'Deposit dikembalikan setelah pemeriksaan kamar dan penyelesaian tagihan. Potongan bisa terjadi untuk listrik terakhir, kunci belum kembali, kerusakan, atau tunggakan lain. Jika potongan melebihi deposit, sisa tagihan tetap harus dibayar.',
   'Checkout & Deposit', 24, true),

  ('Jika keluar lebih awal, apakah sewa dikembalikan?',
   E'Sewa yang sudah dibayar tidak otomatis dikembalikan prorata. Deposit jaminan tetap dapat dikembalikan setelah pemeriksaan dan penyelesaian tagihan.',
   'Checkout & Deposit', 25, true),

  ('Bagaimana cara melapor kerusakan?',
   E'Buat tiket keluhan di aplikasi dan sertakan foto jika ada. Staf/admin akan memproses sesuai prioritas dan statusnya bisa dipantau.',
   'Keluhan', 26, true),

  ('Apakah perbaikan fasilitas dikenakan biaya?',
   E'Kerusakan wajar karena pemakaian normal akan ditangani pengelola. Kerusakan karena kelalaian penghuni dapat dibebankan kepada penghuni atau dipotong dari deposit.',
   'Keluhan', 27, true),

  ('Apakah saya wajib menyerahkan KTP?',
   E'Ya, foto KTP diperlukan untuk verifikasi penghuni. Data digunakan untuk administrasi kos dan tidak dibuka ke publik.',
   'KTP & Privasi', 28, true),

  ('Apakah ada layanan galon?',
   E'Ada layanan galon air Voila dengan tarif default Rp 20.000 per galon. Pesanan bisa dikonfirmasi ke admin.',
   'Layanan Tambahan', 29, true),

  ('Apakah ada layanan bersih kamar?',
   E'Bersih kamar bisa diajukan sebagai layanan tambahan jika staf tersedia. Biaya default Rp 50.000 per kunjungan, atau sesuai konfirmasi admin.',
   'Layanan Tambahan', 30, true),

  ('Bagaimana cara mengaktifkan notifikasi?',
   E'Login ke aplikasi lalu aktifkan izin notifikasi browser. Notifikasi membantu mengingatkan invoice, status pembayaran, pengumuman, dan jadwal penting.',
   'Aplikasi', 31, true);

UPDATE "Faq" f
SET
  answer = s.answer,
  category = s.category,
  "sortOrder" = s.sort_order,
  "isActive" = s.is_active,
  "updatedAt" = NOW()
FROM seed_faq s
WHERE trim(f.question) = trim(s.question);

INSERT INTO "Faq" (question, answer, category, "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT s.question, s.answer, s.category, s.sort_order, s.is_active, NOW(), NOW()
FROM seed_faq s
WHERE NOT EXISTS (
  SELECT 1 FROM "Faq" f WHERE trim(f.question) = trim(s.question)
);

-- ---------------------------------------------------------------------------
-- 7. External Google reviews / social proof
--
-- Source: exported/pasted Google Maps review text supplied by owner.
-- Question-only entries are intentionally not inserted here because this table
-- feeds public social proof. Dates are approximate from Google relative labels.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_external_review;
CREATE TEMP TABLE seed_external_review (
  author_name text PRIMARY KEY,
  rating int,
  comment text,
  reviewed_at timestamp
);

INSERT INTO seed_external_review (author_name, rating, comment, reviewed_at)
VALUES
  ('aloysius alfa', 5,
   'Nice, murah, nyaman.',
   TIMESTAMP '2017-07-06 00:00:00'),

  ('Yuvita J', 5,
   'Pernah tinggal di kos ini. Kos yang paling enak dan nyaman selama kami di Surabaya. Bisa bawa hewan anjing/kucing, pemiliknya ramah.',
   TIMESTAMP '2025-08-06 00:00:00'),

  ('ranny uswatun khasanah', 5,
   'Bersih, bapak/ibu kos ramah, sangat memperhatikan penghuni kos dan memastikan kos tetap bersih.',
   TIMESTAMP '2025-11-06 00:00:00'),

  ('dini marlia', 5,
   'Hampir satu tahun tinggal di kos ini karena pekerjaan. Pemilik kos sangat cepat tanggap, kalau ada kendala langsung dibantu, termasuk WiFi. Kondisi kamar sesuai budget. Dekat tempat makan, mall, minimarket, pom bensin, dan strategis. Overall worth it.',
   TIMESTAMP '2023-07-06 00:00:00'),

  ('lukman pelu', 5,
   'Tempatnya bagus, bersih, halaman parkir luas. Respon cepat kalau WiFi mati atau kran rusak. Strategis ke PTC, Lenmarc, Citraland, Manukan, Darmo Permai, HR Muhammad, dan Babatan.',
   TIMESTAMP '2022-07-06 00:00:00'),

  ('Yosafat Seje', 4,
   'Harga masih sesuai karena lokasi dekat kampus dan mall, serta fasilitas banyak seperti AC, WiFi, air, dan listrik.',
   TIMESTAMP '2017-07-06 00:00:00'),

  ('Nur Aditya DLP', 4,
   'Salah satu rumah kost yang lokasinya dekat dengan Pakuwon Mall / PTC. Halaman rumah lumayan luas, bisa menampung mobil dan beberapa sepeda motor.',
   TIMESTAMP '2019-07-06 00:00:00'),

  ('Rosa', 3,
   'Very close to Pakuwon Mall. The price is okay as it is one of the kost with AC and car park at this price. Pets are allowed, but room size is small and cleanliness needed improvement at that time.',
   TIMESTAMP '2020-07-06 00:00:00');

DELETE FROM "ExternalReview"
WHERE source = 'google'
  AND "authorName" IN (SELECT author_name FROM seed_external_review);

INSERT INTO "ExternalReview"
  (source, "authorName", rating, comment, "isVisible", "reviewedAt", "createdAt")
SELECT
  'google',
  author_name,
  rating,
  comment,
  true,
  reviewed_at,
  NOW()
FROM seed_external_review;

-- ---------------------------------------------------------------------------
-- 8. Additional services
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS seed_service;
CREATE TEMP TABLE seed_service (
  name text PRIMARY KEY,
  description text,
  price_rupiah int,
  unit text,
  is_active boolean,
  sort_order int
);

INSERT INTO seed_service (name, description, price_rupiah, unit, is_active, sort_order)
VALUES
  ('WiFi per perangkat', 'Layanan WiFi tambahan per perangkat penghuni.', 50000, 'per perangkat / bulan', true, 1),
  ('Galon Air Voila', 'Pembelian galon air minum melalui pengelola.', 20000, 'per galon', true, 2),
  ('TV tambahan', 'TV tambahan jika stok tersedia.', 50000, 'per bulan', true, 3),
  ('Bersih kamar request', 'Jasa bersih kamar berdasarkan permintaan penghuni.', 50000, 'per kunjungan', true, 4),
  ('Laundry titip admin', 'Layanan titip laundry; harga mengikuti nota vendor.', 0, 'sesuai nota', true, 5),
  ('Parkir tambahan', 'Parkir tambahan untuk kendaraan ekstra bila slot tersedia.', 50000, 'per bulan', true, 6);

UPDATE "AdditionalService" a
SET
  description = s.description,
  "priceRupiah" = s.price_rupiah,
  unit = s.unit,
  "isActive" = s.is_active,
  "sortOrder" = s.sort_order,
  "updatedAt" = NOW()
FROM seed_service s
WHERE trim(a.name) = trim(s.name);

INSERT INTO "AdditionalService"
  (name, description, "priceRupiah", unit, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT s.name, s.description, s.price_rupiah, s.unit, s.is_active, s.sort_order, NOW(), NOW()
FROM seed_service s
WHERE NOT EXISTS (
  SELECT 1 FROM "AdditionalService" a WHERE trim(a.name) = trim(s.name)
);

-- ---------------------------------------------------------------------------
-- 9. Quick verification
-- ---------------------------------------------------------------------------

SELECT * FROM (
  SELECT 'rooms_13_seeded' AS check_name, COUNT(*)::text AS result
  FROM "Room"
  WHERE code IN (SELECT code FROM seed_room)

  UNION ALL
  SELECT 'rooms_with_images', COUNT(*)::text
  FROM "Room"
  WHERE code IN (SELECT code FROM seed_room)
    AND COALESCE(array_length(images, 1), 0) > 0

  UNION ALL
  SELECT 'room_items_installed', COUNT(*)::text
  FROM "RoomItem" ri
  JOIN "Room" r ON r.id = ri."roomId"
  WHERE r.code IN (SELECT code FROM seed_room)

  UNION ALL
  SELECT 'public_facilities', COUNT(*)::text
  FROM "RoomFacility" rf
  JOIN "Room" r ON r.id = rf."roomId"
  WHERE r.code IN (SELECT code FROM seed_room)
    AND rf."publicVisible" = true

  UNION ALL
  SELECT 'inventory_items_seeded', COUNT(*)::text
  FROM "InventoryItem"
  WHERE sku IN (SELECT sku FROM seed_inventory)

  UNION ALL
  SELECT 'faq_active_seeded', COUNT(*)::text
  FROM "Faq"
  WHERE question IN (SELECT question FROM seed_faq)
    AND "isActive" = true

  UNION ALL
  SELECT 'external_reviews_seeded', COUNT(*)::text
  FROM "ExternalReview"
  WHERE source = 'google'
    AND "authorName" IN (SELECT author_name FROM seed_external_review)

  UNION ALL
  SELECT 'additional_services_seeded', COUNT(*)::text
  FROM "AdditionalService"
  WHERE name IN (SELECT name FROM seed_service)
) AS verification;
