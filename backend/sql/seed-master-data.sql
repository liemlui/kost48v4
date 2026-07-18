BEGIN;

-- ============================================================================
-- KOST48 — PATCH DATA MASTER 13 TENANT (AMAN DIJALANKAN ULANG)
--
-- Tujuan:
--   1. Mengisi/melengkapi NIK, HP, email, dan gender tenant yang sudah ada.
--   2. Menyamakan email akun portal TENANT dengan email tenant bila email nyata ada.
--   3. Memperbarui harga sewa kontrak dan deposit pada STAY AKTIF yang sudah ada.
--
-- Aman untuk database yang sudah berisi data:
--   - Tidak memakai ID tetap.
--   - Mencocokkan tenant terutama lewat NIK, lalu nama/HP/email.
--   - Berhenti dan rollback bila menemukan NIK atau email portal yang bentrok.
--   - Tidak menghapus data, tidak membuat invoice, dan tidak membuat STAY baru.
--
-- CATATAN TANGGAL MASUK:
-- Data sumber hanya memberikan HARI (mis. 26), tanpa bulan/tahun. Karena itu
-- patch ini sengaja TIDAK mengubah atau membuat checkInDate. Lengkapi tanggal
-- lengkap lewat UI Masa Sewa bila belum ada STAY aktif.
--
-- Jalankan (setelah backup database):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/patch-13-tenant-master-data.sql
-- ============================================================================


CREATE TEMP TABLE _tenant_patch_source (
  room_code text PRIMARY KEY,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  identity_number text NOT NULL UNIQUE CHECK (identity_number ~ '^[0-9]{16}$'),
  gender "Gender",
  check_in_day integer NOT NULL CHECK (check_in_day BETWEEN 1 AND 31),
  agreed_rent_rupiah integer NOT NULL CHECK (agreed_rent_rupiah >= 0),
  deposit_rupiah integer NOT NULL CHECK (deposit_rupiah >= 0)
) ON COMMIT DROP;

INSERT INTO _tenant_patch_source
  (room_code, full_name, phone, email, identity_number, gender, check_in_day, agreed_rent_rupiah, deposit_rupiah)
VALUES
  ('A',  'Shinta Larista',              '082230184559', 'shinta22larista@gmail.com',       '3574036206990003', 'FEMALE', 26, 1700000,      0),
  ('B',  'Dini Widiastutik',            '089679596799', 'diniwidi11@gmail.com',            '3275085012800021', 'FEMALE',  1, 1500000,      0),
  ('C',  'Miko Rakatama Adhi Winarto',  '089682611559', 'mikorakatamaa@gmail.com',         '6471051708970006', 'MALE',   28, 1600000,      0),
  ('D',  'Ade Chandra',                 '085716345588', 'adhechan72@gmail.com',            '3173052309720009', 'MALE',   24, 1500000, 200000),
  ('F1', 'Yufita Hieng',                '081330787868', NULL,                              '6405025701970003', 'FEMALE', 26, 1700000,      0),
  ('F2', 'Patrick Wilfred',             '081289399915', 'wilfredpatrick@hotmail.com',      '3275020504910019', 'MALE',    8, 1600000,      0),
  ('G',  'Yofi Nurkolifah',             '082244277043', 'jtt1234511@gmail.com',            '3519122204030003', 'FEMALE',  1,  800000,      0),
  ('H',  'Welly Tanoto',                '082139730928', 'wellytanoto73@gmail.com',         '3578070811730004', 'MALE',   10,  800000,      0),
  -- Nama panggilan pada data sumber: Theo Wijaya. NIK terdaftar atas Agus Settiyo Budi.
  ('I',  'Theo Wijaya',                 '081717531937', 'theowijaya0886@gmail.com',        '3571021308860003', 'MALE',    5,  800000,      0),
  ('J',  'Lovandra',                    '08812149261',  NULL,                              '3175070312930003', NULL,    30, 1500000,      0),
  ('K',  'Meliana Tamara',              '085334192220', 'melontamara556@gmail.com',        '3578125102000002', 'FEMALE', 10, 1600000,      0),
  ('L',  'Destarika Hasan',             '085964263779', NULL,                              '1671065812020008', 'FEMALE',  1, 1600000,      0),
  ('M',  'Gabriel Excelly Pranajaya',   '082228871199', 'gabrielexcelly1908@gmail.com',    '3511115908030001', NULL,     3, 1200000,      0);

-- Semua kamar harus sudah ada. Berhenti sebelum mengubah apa pun bila master kamar belum lengkap.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _tenant_patch_source source
    LEFT JOIN "Room" room ON room.code = source.room_code
    WHERE room.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Patch dibatalkan: ada kode kamar sumber yang belum ada di master Room.';
  END IF;
END $$;

-- Jangan pernah menimpa NIK yang berbeda pada tenant yang tampaknya sama.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _tenant_patch_source source
    JOIN "Tenant" tenant ON (
      lower(btrim(tenant."fullName")) = lower(btrim(source.full_name))
      OR regexp_replace(tenant.phone, '[^0-9]', '', 'g') IN (source.phone, '62' || substr(source.phone, 2))
      OR (source.email IS NOT NULL AND lower(tenant.email) = lower(source.email))
    )
    WHERE tenant."identityNumber" IS NOT NULL
      AND tenant."identityNumber" <> source.identity_number
  ) THEN
    RAISE EXCEPTION 'Patch dibatalkan: ada tenant dengan nama/HP/email yang sama tetapi NIK berbeda. Periksa data terlebih dahulu.';
  END IF;
END $$;

-- Tambahkan hanya tenant yang benar-benar belum ditemukan melalui NIK, nama, HP, atau email.
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", gender, "isActive", "createdAt", "updatedAt")
SELECT
  source.full_name,
  source.phone,
  lower(source.email),
  source.identity_number,
  source.gender,
  true,
  NOW(),
  NOW()
FROM _tenant_patch_source source
WHERE NOT EXISTS (
  SELECT 1
  FROM "Tenant" tenant
  WHERE tenant."identityNumber" = source.identity_number
     OR lower(btrim(tenant."fullName")) = lower(btrim(source.full_name))
     OR regexp_replace(tenant.phone, '[^0-9]', '', 'g') IN (source.phone, '62' || substr(source.phone, 2))
     OR (source.email IS NOT NULL AND lower(tenant.email) = lower(source.email))
)
ON CONFLICT ("identityNumber") DO NOTHING;

-- Isi NIK dan data kontak terbaru. Email sumber yang kosong tidak menimpa email yang sudah tersimpan.
UPDATE "Tenant" tenant
SET
  phone = source.phone,
  email = COALESCE(lower(source.email), tenant.email),
  "identityNumber" = source.identity_number,
  gender = COALESCE(tenant.gender, source.gender),
  "isActive" = true,
  "updatedAt" = NOW()
FROM _tenant_patch_source source
WHERE tenant."identityNumber" = source.identity_number;

-- Sebelum sinkronisasi portal, pastikan email target belum dipakai akun lain.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _tenant_patch_source source
    JOIN "Tenant" tenant ON tenant."identityNumber" = source.identity_number
    JOIN "User" portal_user ON portal_user."tenantId" = tenant.id AND portal_user.role = 'TENANT'
    JOIN "User" other_user ON lower(other_user.email) = lower(tenant.email) AND other_user.id <> portal_user.id
    WHERE source.email IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Patch dibatalkan: email tenant sudah dipakai akun portal/user lain.';
  END IF;
END $$;

-- Tenant.email adalah sumber utama email login portal. Tenant tanpa email baru dibiarkan apa adanya.
UPDATE "User" portal_user
SET
  email = lower(tenant.email),
  "updatedAt" = NOW()
FROM "Tenant" tenant
JOIN _tenant_patch_source source ON source.identity_number = tenant."identityNumber"
WHERE portal_user."tenantId" = tenant.id
  AND portal_user.role = 'TENANT'
  AND source.email IS NOT NULL
  AND lower(portal_user.email) IS DISTINCT FROM lower(tenant.email);

-- Ubah nilai kontrak hanya pada stay aktif tenant di kamar yang sesuai.
-- Check-in date sengaja dipertahankan karena data sumber hanya memberi nomor hari.
UPDATE "Stay" stay
SET
  "agreedRentAmountRupiah" = source.agreed_rent_rupiah,
  "depositAmountRupiah" = source.deposit_rupiah,
  "depositPaidAmountRupiah" = CASE
    WHEN source.deposit_rupiah = 0 THEN stay."depositPaidAmountRupiah"
    WHEN stay."depositPaidAmountRupiah" = 0 THEN source.deposit_rupiah
    ELSE stay."depositPaidAmountRupiah"
  END,
  "depositPaymentStatus" = CASE
    WHEN source.deposit_rupiah = 0 THEN stay."depositPaymentStatus"
    WHEN stay."depositPaidAmountRupiah" >= source.deposit_rupiah THEN 'PAID'::"BookingDepositPaymentStatus"
    WHEN stay."depositPaidAmountRupiah" > 0 THEN 'PARTIAL'::"BookingDepositPaymentStatus"
    ELSE 'PAID'::"BookingDepositPaymentStatus"
  END,
  "depositNote" = CASE
    WHEN source.deposit_rupiah > 0 AND COALESCE(stay."depositNote", '') = ''
      THEN 'Data deposit awal dikonfirmasi owner: Rp200.000.'
    ELSE stay."depositNote"
  END,
  "updatedAt" = NOW()
FROM "Tenant" tenant
JOIN _tenant_patch_source source ON source.identity_number = tenant."identityNumber"
JOIN "Room" room ON room.code = source.room_code
WHERE stay."tenantId" = tenant.id
  AND stay."roomId" = room.id
  AND stay.status = 'ACTIVE';

-- Jejak audit untuk deposit yang dimigrasikan. Idempoten berdasarkan stayId.
INSERT INTO "TenantDepositLedgerEntry" (
  "stayId", "tenantId", "roomId", type, direction, "amountRupiah", "balanceAfterRupiah",
  "depositStatusAfter", "depositPaymentStatusAfter", "sourceType", "sourceId", note,
  "metadataJson", "occurredAt", "createdAt"
)
SELECT
  stay.id,
  tenant.id,
  room.id,
  'MIGRATION_SNAPSHOT'::"TenantDepositLedgerEntryType",
  'INFO'::"TenantDepositLedgerDirection",
  stay."depositPaidAmountRupiah",
  stay."depositPaidAmountRupiah",
  stay."depositStatus",
  stay."depositPaymentStatus",
  'TENANT_MASTER_DATA_PATCH',
  stay.id::text,
  'Snapshot deposit dari patch data awal tenant.',
  jsonb_build_object('source', 'owner-tenant-list', 'depositRupiah', source.deposit_rupiah),
  NOW(),
  NOW()
FROM "Stay" stay
JOIN "Tenant" tenant ON tenant.id = stay."tenantId"
JOIN _tenant_patch_source source ON source.identity_number = tenant."identityNumber"
JOIN "Room" room ON room.id = stay."roomId" AND room.code = source.room_code
WHERE stay.status = 'ACTIVE'
  AND source.deposit_rupiah > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "TenantDepositLedgerEntry" entry
    WHERE entry."sourceType" = 'TENANT_MASTER_DATA_PATCH'
      AND entry."sourceId" = stay.id::text
  );

-- Kamar dengan stay aktif yang cocok dipastikan berstatus OCCUPIED.
UPDATE "Room" room
SET status = 'OCCUPIED', "updatedAt" = NOW()
WHERE EXISTS (
  SELECT 1
  FROM "Stay" stay
  JOIN "Tenant" tenant ON tenant.id = stay."tenantId"
  JOIN _tenant_patch_source source ON source.identity_number = tenant."identityNumber"
  WHERE stay."roomId" = room.id
    AND stay.status = 'ACTIVE'
    AND room.code = source.room_code
);

-- Hasil verifikasi. Baris MISSING_ACTIVE_STAY membutuhkan tanggal check-in lengkap via UI.
SELECT
  source.room_code AS kamar,
  tenant."fullName" AS tenant,
  tenant."identityNumber" AS nik,
  tenant.phone AS whatsapp,
  tenant.email,
  stay."checkInDate" AS tanggal_masuk_tersimpan,
  source.check_in_day AS hari_masuk_sumber,
  stay."agreedRentAmountRupiah" AS sewa_disepakati,
  stay."depositAmountRupiah" AS deposit,
  CASE
    WHEN tenant.id IS NULL THEN 'MISSING_TENANT'
    WHEN stay.id IS NULL THEN 'MISSING_ACTIVE_STAY'
    WHEN EXTRACT(DAY FROM stay."checkInDate") <> source.check_in_day THEN 'CHECK_DATE_NEEDS_REVIEW'
    ELSE 'OK'
  END AS hasil
FROM _tenant_patch_source source
LEFT JOIN "Tenant" tenant ON tenant."identityNumber" = source.identity_number
LEFT JOIN "Room" room ON room.code = source.room_code
LEFT JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id AND stay.status = 'ACTIVE'
ORDER BY source.room_code;

-- ============================================================================
-- KOST48 — PATCH 15: UPDATE DATA KONTAK 13 TENANT (IDEMPOTEN)
--
-- Tujuan:
--   1. Update nomor WhatsApp lengkap (dengan dash) untuk 13 tenant aktif
--   2. Update email tenant + sinkronisasi akun portal
--
-- Sumber: Data terbaru dari owner (18 Juli 2026)
-- Delta vs patch-13:
--   - Semua WhatsApp: dari terpotong/parsial → lengkap dengan format +62 xxx-xxxx-xxxx
--   - 2 email baru: Lovandra (lovandra.fachri103@gmail.com), Destarika (desterikahasan@gmail.com)
--
-- Aman dijalankan ulang — hanya UPDATE jika data berbeda (IS DISTINCT FROM)
-- ============================================================================


-- ============================================================================
-- 1. UPDATE PHONE & EMAIL TENANT
-- ============================================================================

-- Kamar A — Shinta Larista
UPDATE "Tenant" SET phone = '+6282230184559', email = 'shinta22larista@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3574036206990003'
  AND (phone IS DISTINCT FROM '+6282230184559' OR email IS DISTINCT FROM 'shinta22larista@gmail.com');

-- Kamar B — Dini Widiastutik
UPDATE "Tenant" SET phone = '+6289679596799', email = 'diniwidi11@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3275085012800021'
  AND (phone IS DISTINCT FROM '+6289679596799' OR email IS DISTINCT FROM 'diniwidi11@gmail.com');

-- Kamar C — Miko Rakatama Adhi Winarto
UPDATE "Tenant" SET phone = '+6289682611559', email = 'mikorakatamaa@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '6471051708970006'
  AND (phone IS DISTINCT FROM '+6289682611559' OR email IS DISTINCT FROM 'mikorakatamaa@gmail.com');

-- Kamar D — Ade Chandra
UPDATE "Tenant" SET phone = '+6285716345588', email = 'adhechan72@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3173052309720009'
  AND (phone IS DISTINCT FROM '+6285716345588' OR email IS DISTINCT FROM 'adhechan72@gmail.com');

-- Kamar F1 — Yufita Hieng
UPDATE "Tenant" SET phone = '+6281330787868', email = NULL, "updatedAt" = NOW()
WHERE "identityNumber" = '6405025701970003'
  AND (phone IS DISTINCT FROM '+6281330787868' OR email IS DISTINCT FROM NULL);

-- Kamar F2 — Patrick Wilfred
UPDATE "Tenant" SET phone = '+6281289399915', email = 'wilfredpatrick@hotmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3275020504910019'
  AND (phone IS DISTINCT FROM '+6281289399915' OR email IS DISTINCT FROM 'wilfredpatrick@hotmail.com');

-- Kamar G — Yofi Nurkolifah
UPDATE "Tenant" SET phone = '+6282244277043', email = 'jtt1234511@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3519122204030003'
  AND (phone IS DISTINCT FROM '+6282244277043' OR email IS DISTINCT FROM 'jtt1234511@gmail.com');

-- Kamar H — Welly Tanoto
UPDATE "Tenant" SET phone = '+6282139730928', email = 'wellytanoto73@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3578070811730004'
  AND (phone IS DISTINCT FROM '+6282139730928' OR email IS DISTINCT FROM 'wellytanoto73@gmail.com');

-- Kamar I — Theo Wijaya (Agus Settiyo Budi)
UPDATE "Tenant" SET phone = '+6281717531937', email = 'theowijaya0886@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3571021308860003'
  AND (phone IS DISTINCT FROM '+6281717531937' OR email IS DISTINCT FROM 'theowijaya0886@gmail.com');

-- Kamar J — Lovandra (🆕 email baru)
UPDATE "Tenant" SET phone = '+628812149261', email = 'lovandra.fachri103@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3175070312930003'
  AND (phone IS DISTINCT FROM '+628812149261' OR email IS DISTINCT FROM 'lovandra.fachri103@gmail.com');

-- Kamar K — Meliana Tamara
UPDATE "Tenant" SET phone = '+6285334192220', email = 'melontamara556@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3578125102000002'
  AND (phone IS DISTINCT FROM '+6285334192220' OR email IS DISTINCT FROM 'melontamara556@gmail.com');

-- Kamar L — Destarika Hasan (🆕 email baru)
UPDATE "Tenant" SET phone = '+6285964263779', email = 'desterikahasan@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '1671065812020008'
  AND (phone IS DISTINCT FROM '+6285964263779' OR email IS DISTINCT FROM 'desterikahasan@gmail.com');

-- Kamar M — Gabriel Excelly Pranajaya
UPDATE "Tenant" SET phone = '+6282228871199', email = 'gabrielexcelly1908@gmail.com', "updatedAt" = NOW()
WHERE "identityNumber" = '3511115908030001'
  AND (phone IS DISTINCT FROM '+6282228871199' OR email IS DISTINCT FROM 'gabrielexcelly1908@gmail.com');

-- ============================================================================
-- 2. SINKRONISASI EMAIL AKUN PORTAL (USER) — hanya untuk email baru/berubah
-- ============================================================================

-- Lovandra — email baru
UPDATE "User" portal_user
SET email = 'lovandra.fachri103@gmail.com', "updatedAt" = NOW()
FROM "Tenant" tenant
WHERE portal_user."tenantId" = tenant.id
  AND portal_user.role = 'TENANT'
  AND tenant."identityNumber" = '3175070312930003'
  AND lower(portal_user.email) IS DISTINCT FROM 'lovandra.fachri103@gmail.com';

-- Destarika Hasan — email baru
UPDATE "User" portal_user
SET email = 'desterikahasan@gmail.com', "updatedAt" = NOW()
FROM "Tenant" tenant
WHERE portal_user."tenantId" = tenant.id
  AND portal_user.role = 'TENANT'
  AND tenant."identityNumber" = '1671065812020008'
  AND lower(portal_user.email) IS DISTINCT FROM 'desterikahasan@gmail.com';

-- Sinkronisasi ulang semua email tenant → user portal (jika ada perubahan)
UPDATE "User" portal_user
SET email = lower(tenant.email), "updatedAt" = NOW()
FROM "Tenant" tenant
WHERE portal_user."tenantId" = tenant.id
  AND portal_user.role = 'TENANT'
  AND tenant.email IS NOT NULL
  AND lower(portal_user.email) IS DISTINCT FROM lower(tenant.email);

-- ============================================================================
-- VERIFIKASI
-- ============================================================================

SELECT
  room.code AS kamar,
  tenant."fullName" AS nama,
  tenant.phone AS whatsapp,
  tenant.email AS email_tenant,
  portal_user.email AS email_portal,
  CASE
    WHEN tenant.phone IS NULL THEN 'MISSING_PHONE'
    WHEN portal_user.email IS NULL AND tenant.email IS NOT NULL THEN 'NO_PORTAL_ACCOUNT'
    WHEN lower(portal_user.email) IS DISTINCT FROM lower(tenant.email) AND tenant.email IS NOT NULL THEN 'EMAIL_MISMATCH'
    ELSE 'OK'
  END AS status
FROM "Tenant" tenant
JOIN "Room" room ON room.code IN ('A','B','C','D','F1','F2','G','H','I','J','K','L','M')
LEFT JOIN "User" portal_user ON portal_user."tenantId" = tenant.id AND portal_user.role = 'TENANT'
WHERE tenant."identityNumber" IN (
  '3574036206990003','3275085012800021','6471051708970006','3173052309720009',
  '6405025701970003','3275020504910019','3519122204030003','3578070811730004',
  '3571021308860003','3175070312930003','3578125102000002','1671065812020008',
  '3511115908030001'
)
ORDER BY room.code;

-- ============================================================================
-- KOST48 — PATCH DATA MASTER FINANCE (IDEMPOTEN, AMAN DIJALANKAN ULANG)
--
-- Tujuan:
--   A. Import tenant historis dari data kwitansi (isActive=false untuk non-aktif)
--   B. Buat Stay INACTIVE untuk setiap periode sewa historis
--   C. Buat Invoice PAID + InvoiceLine + InvoicePayment dari ~180 kwitansi
--   D. Import pengeluaran operasional bulanan 2025
--   E. Import pengeluaran detail tahunan 2021-2025
--
-- Aman untuk database yang sudah berisi data:
--   - Tidak memakai ID tetap.
--   - Mencocokkan tenant terutama lewat NIK, lalu nama/HP.
--   - Semua INSERT pakai WHERE NOT EXISTS / ON CONFLICT DO NOTHING.
--   - Tidak menghapus atau mengubah data existing.
--   - Bisa dijalankan ulang tanpa duplikasi.
--
-- SUMBER: Scan/Master_Database_Kost_48_Lengkap_Terkini.xlsx
-- GENERATED: 2026-07-18T13:51:24.580Z
--
-- Jalankan (setelah backup database):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/patch-14-master-data-finance.sql
-- ============================================================================


-- ============================================================================
-- A. TENANT HISTORIS — Import semua tenant dari data kwitansi
-- ============================================================================

-- Tenant: Patrick Wilfred (NIK: 3275020504910019)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Patrick Wilfred', NULL, NULL, '3275020504910019', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3275020504910019'
);

-- Tenant: Yufita Hieng (NIK: 6405025701970003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Yufita Hieng', NULL, NULL, '6405025701970003', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '6405025701970003'
);

-- Tenant: Ade Chandra (NIK: 3173052309720009)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ade Chandra', NULL, NULL, '3173052309720009', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3173052309720009'
);

-- Tenant: Ester Rada Kadunga (NIK: 5312115509950001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ester Rada Kadunga', NULL, NULL, '5312115509950001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '5312115509950001'
);

-- Tenant: Theo Wijaya (NIK: 3571021308860003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Theo Wijaya', NULL, NULL, '3571021308860003', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3571021308860003'
);

-- Tenant: Yofi Nurkolifah (NIK: 3519122204030003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Yofi Nurkolifah', NULL, NULL, '3519122204030003', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3519122204030003'
);

-- Tenant: Welly Tanoto (NIK: 3578070811730004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Welly Tanoto', NULL, NULL, '3578070811730004', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3578070811730004'
);

-- Tenant: Bunga Allo Novalia (NIK: 3271016808840018)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Bunga Allo Novalia', NULL, NULL, '3271016808840018', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3271016808840018'
);

-- Tenant: Lovandra (NIK: 3175070312930003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Lovandra', NULL, NULL, '3175070312930003', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3175070312930003'
);

-- Tenant: Gabriel Excelly Pranajaya (NIK: 3511115908030001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Gabriel Excelly Pranajaya', NULL, NULL, '3511115908030001', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3511115908030001'
);

-- Tenant: Destarika Hasan (NIK: 1671065812020008)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Destarika Hasan', NULL, NULL, '1671065812020008', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '1671065812020008'
);

-- Tenant: Dini (NIK: 3275085012800021)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Dini', NULL, NULL, '3275085012800021', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3275085012800021'
);

-- Tenant: Meliana Tamara (NIK: 3578125102000002)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Meliana Tamara', NULL, NULL, '3578125102000002', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3578125102000002'
);

-- Tenant: Muhammad Alzidan Putra (NIK: 3312252710070001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Muhammad Alzidan Putra', NULL, NULL, '3312252710070001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3312252710070001'
);

-- Tenant: Miko Rakatama Adhi (NIK: 6471051708970006)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Miko Rakatama Adhi', NULL, NULL, '6471051708970006', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '6471051708970006'
);

-- Tenant: Echa Qurniatunnafiah (NIK: 3502016607060004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Echa Qurniatunnafiah', NULL, NULL, '3502016607060004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3502016607060004'
);

-- Tenant: Annisa (NIK: 7310035704070001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Annisa', NULL, NULL, '7310035704070001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '7310035704070001'
);

-- Tenant: Natasya Uska Maharani (NIK: 3374137107020004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Natasya Uska Maharani', NULL, NULL, '3374137107020004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3374137107020004'
);

-- Tenant: Shinta Larista (NIK: 3574036206990003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Shinta Larista', NULL, NULL, '3574036206990003', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3574036206990003'
);

-- Tenant: Yoga Aprilian (NIK: 3522210411030001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Yoga Aprilian', NULL, NULL, '3522210411030001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3522210411030001'
);

-- Tenant: YAN ATAURAHMAN (NIK: 6471042201780003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'YAN ATAURAHMAN', NULL, NULL, '6471042201780003', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '6471042201780003'
);

-- Tenant: Ruth Angeline Carolee (NIK: 3175056912980001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ruth Angeline Carolee', NULL, NULL, '3175056912980001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3175056912980001'
);

-- Tenant: Ishaq (NIK: 7322111909990005)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ishaq', NULL, NULL, '7322111909990005', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '7322111909990005'
);

-- Tenant: Margareth - Ika Supartika (NIK: 3201375704950003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Margareth - Ika Supartika', NULL, NULL, '3201375704950003', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3201375704950003'
);

-- Tenant: Canon Daiyumi Aprian Domeng (NIK: 9109010704010004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Canon Daiyumi Aprian Domeng', NULL, NULL, '9109010704010004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '9109010704010004'
);

-- Tenant: Sianly (NIK: 3173065206830006)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Sianly', NULL, NULL, '3173065206830006', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3173065206830006'
);

-- Tenant: Pertiwi Lintang Kalas Wungu (NIK: 3578166902960003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Pertiwi Lintang Kalas Wungu', NULL, NULL, '3578166902960003', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3578166902960003'
);

-- Tenant: Juli Hendrawan (NIK: 3202402502820001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Juli Hendrawan', NULL, NULL, '3202402502820001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3202402502820001'
);

-- Tenant: Imam Wahyudi (NIK: 3506211007880001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Imam Wahyudi', NULL, NULL, '3506211007880001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3506211007880001'
);

-- Tenant: Yevy Eko Nurcahyo (NIK: 3505210805900001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Yevy Eko Nurcahyo', NULL, NULL, '3505210805900001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3505210805900001'
);

-- Tenant: Dhio Andralian Alfariski (NIK: 3503010104000005)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Dhio Andralian Alfariski', NULL, NULL, '3503010104000005', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3503010104000005'
);

-- Tenant: Wiyadi (NIK: 3171020401820003)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Wiyadi', NULL, NULL, '3171020401820003', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3171020401820003'
);

-- Tenant: Viviana Arwanto (NIK: 3577036311980002)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Viviana Arwanto', NULL, NULL, '3577036311980002', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3577036311980002'
);

-- Tenant: Ludovikus Andrew Santoso (NIK: 3502172508950002)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ludovikus Andrew Santoso', NULL, NULL, '3502172508950002', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3502172508950002'
);

-- Tenant: Ponadi (NIK: 3307072303810004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ponadi', NULL, NULL, '3307072303810004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3307072303810004'
);

-- Tenant: INDUNG TRI HARIARTO (NIK: 3311042711950002)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'INDUNG TRI HARIARTO', NULL, NULL, '3311042711950002', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3311042711950002'
);

-- Tenant: Mufsona (NIK: 3515174101920004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Mufsona', NULL, NULL, '3515174101920004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3515174101920004'
);

-- Tenant: Muhamad Fariz Al-Hafiz (NIK: 3175050409030006)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Muhamad Fariz Al-Hafiz', NULL, NULL, '3175050409030006', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3175050409030006'
);

-- Tenant: Thea & Felix (NIK: 3404120906990009)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Thea & Felix', NULL, NULL, '3404120906990009', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3404120906990009'
);

-- Tenant: Sakura Naeila Naikesyah (NIK: 3275067010050004)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Sakura Naeila Naikesyah', NULL, NULL, '3275067010050004', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3275067010050004'
);

-- Tenant: Ahmad Adiwitoko (NIK: 3320150308880001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ahmad Adiwitoko', NULL, NULL, '3320150308880001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3320150308880001'
);

-- Tenant: Ireane Cahyadi (NIK: 3273115711750010)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ireane Cahyadi', NULL, NULL, '3273115711750010', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3273115711750010'
);

-- Tenant: Ahmad Rosaid (NIK: 3320072803840005)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Ahmad Rosaid', NULL, NULL, '3320072803840005', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3320072803840005'
);

-- Tenant: Muhammad Efendi (NIK: 3316041812950001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Muhammad Efendi', NULL, NULL, '3316041812950001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3316041812950001'
);

-- Tenant: Trisha Larasati Putri (NIK: 3671105209040002)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Trisha Larasati Putri', NULL, NULL, '3671105209040002', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3671105209040002'
);

-- Tenant: Agus Winarso (NIK: 3324040508870006)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Agus Winarso', NULL, NULL, '3324040508870006', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3324040508870006'
);

-- Tenant: Krisna Adi Saputra (NIK: 3471041903990001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Krisna Adi Saputra', NULL, NULL, '3471041903990001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3471041903990001'
);

-- Tenant: Suryo Baskoro (NIK: 3318062111950001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Suryo Baskoro', NULL, NULL, '3318062111950001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3318062111950001'
);

-- Tenant: Nunuk Istiyowati (NIK: 3578295707870001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Nunuk Istiyowati', NULL, NULL, '3578295707870001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3578295707870001'
);

-- Tenant: Saferi Putra Samudra (NIK: 3514212109050001)
INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")
SELECT 'Saferi Putra Samudra', NULL, NULL, '3514212109050001', false, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Tenant" WHERE "identityNumber" = '3514212109050001'
);

-- Set isActive = false untuk tenant historis (tidak di Data Tenant Terkini)
UPDATE "Tenant" SET "isActive" = false, "updatedAt" = NOW()
WHERE "isActive" = true AND "identityNumber" NOT IN ('3275020504910019', '6405025701970003', '3173052309720009', '3571021308860003', '3519122204030003', '3578070811730004', '3175070312930003', '3511115908030001', '1671065812020008', '3275085012800021', '3578125102000002', '6471051708970006', '3574036206990003');


-- ============================================================================
-- B. STAY HISTORIS — Buat Stay untuk setiap periode sewa
-- ============================================================================

-- Stay #1: Patrick Wilfred | F1 | 2026-06-07 – 2026-07-07
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-08', '2026-07-08', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3275020504910019'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-08' AND s."checkOutDate" = '2026-07-08'
  );

-- Stay #2: Yufita Hieng | F1 | 2026-06-25 – 2026-07-25
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-26', '2026-07-26', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '6405025701970003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-26' AND s."checkOutDate" = '2026-07-26'
  );

-- Stay #3: Ade Chandra | D | 2026-06-23 – 2026-07-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-24', '2026-07-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-24' AND s."checkOutDate" = '2026-07-24'
  );

-- Stay #4: Ester Rada Kadunga | A | 2026-06-07 – 2026-06-14
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-08', '2026-06-15', 700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '5312115509950001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-08' AND s."checkOutDate" = '2026-06-15'
  );

-- Stay #5: Theo Wijaya | I | 2026-04-04 – 2026-05-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-05', '2026-05-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-05' AND s."checkOutDate" = '2026-05-05'
  );

-- Stay #6: Theo Wijaya | I | 2026-03-04 – 2026-04-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-05', '2026-04-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-05' AND s."checkOutDate" = '2026-04-05'
  );

-- Stay #7: Yofi Nurkolifah | G | 2026-05-31 – 2026-06-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-01', '2026-07-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-01' AND s."checkOutDate" = '2026-07-01'
  );

-- Stay #8: Welly Tanoto | H | 2026-06-09 – 2026-07-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-10', '2026-07-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-10' AND s."checkOutDate" = '2026-07-10'
  );

-- Stay #9: Bunga Allo Novalia | F1 | 2026-04-27 – 2026-05-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-28', '2026-05-28', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3271016808840018'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-28' AND s."checkOutDate" = '2026-05-28'
  );

-- Stay #10: Lovandra | J | 2026-04-29 – 2026-05-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-30', '2026-05-30', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-30' AND s."checkOutDate" = '2026-05-30'
  );

-- Stay #11: Gabriel Excelly Pranajaya | M | 2026-05-02 – 2026-06-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-03', '2026-06-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-03' AND s."checkOutDate" = '2026-06-03'
  );

-- Stay #12: Yofi Nurkolifah | G | 2026-03-31 – 2026-04-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-01', '2026-05-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-01' AND s."checkOutDate" = '2026-05-01'
  );

-- Stay #13: Yofi Nurkolifah | G | 2026-04-30 – 2026-05-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-01', '2026-06-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-01' AND s."checkOutDate" = '2026-06-01'
  );

-- Stay #14: Destarika Hasan | L | 2026-04-30 – 2026-05-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-01', '2026-06-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-01' AND s."checkOutDate" = '2026-06-01'
  );

-- Stay #15: Meliana Tamara | K | 2026-05-09 – 2026-06-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-10', '2026-06-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-10' AND s."checkOutDate" = '2026-06-10'
  );

-- Stay #16: Destarika Hasan | L | 2026-03-31 – 2026-04-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-01', '2026-05-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-01' AND s."checkOutDate" = '2026-05-01'
  );

-- Stay #17: Muhammad Alzidan Putra | A | 2026-04-04 – 2026-05-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-05', '2026-05-05', 1400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3312252710070001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-05' AND s."checkOutDate" = '2026-05-05'
  );

-- Stay #18: Dini | B | 2026-03-31 – 2026-04-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-01', '2026-05-01', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-01' AND s."checkOutDate" = '2026-05-01'
  );

-- Stay #19: Ade Chandra | D | 2026-04-23 – 2026-05-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-24', '2026-05-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-24' AND s."checkOutDate" = '2026-05-24'
  );

-- Stay #20: Welly Tanoto | H | 2026-04-09 – 2026-05-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-10', '2026-05-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-10' AND s."checkOutDate" = '2026-05-10'
  );

-- Stay #21: Gabriel Excelly Pranajaya | M | 2026-04-02 – 2026-05-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-03', '2026-05-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-03' AND s."checkOutDate" = '2026-05-03'
  );

-- Stay #22: Theo Wijaya | I | 2026-01-04 – 2026-03-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-05', '2026-03-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-05' AND s."checkOutDate" = '2026-03-05'
  );

-- Stay #23: Welly Tanoto | H | 2026-05-09 – 2026-06-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-10', '2026-06-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-10' AND s."checkOutDate" = '2026-06-10'
  );

-- Stay #24: Lovandra | J | 2026-03-29 – 2026-04-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-30', '2026-04-30', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-30' AND s."checkOutDate" = '2026-04-30'
  );

-- Stay #25: Miko Rakatama Adhi | C | 2026-03-27 – 2026-04-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-28', '2026-04-28', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '6471051708970006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-28' AND s."checkOutDate" = '2026-04-28'
  );

-- Stay #26: Bunga Allo Novalia | F1 | 2026-03-27 – 2026-04-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-28', '2026-04-28', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3271016808840018'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-28' AND s."checkOutDate" = '2026-04-28'
  );

-- Stay #27: Dini | C | 2025-12-31 – 2026-02-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-01', '2026-03-01', 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-01' AND s."checkOutDate" = '2026-03-01'
  );

-- Stay #28: Meliana Tamara | K | 2026-04-09 – 2026-05-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-10', '2026-05-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-10' AND s."checkOutDate" = '2026-05-10'
  );

-- Stay #29: Ade Chandra | D | 2026-03-23 – 2026-04-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-24', '2026-04-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-24' AND s."checkOutDate" = '2026-04-24'
  );

-- Stay #30: Echa Qurniatunnafiah | F2 | ????-??-?? – 2026-01-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-10', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F2'
WHERE tenant."identityNumber" = '3502016607060004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-10'
  );

-- Stay #31: Welly Tanoto | H | ????-??-?? – 2026-01-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-10'
  );

-- Stay #32: Muhammad Alzidan Putra | A | 2026-03-04 – 2026-04-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-05', '2026-04-05', 1400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3312252710070001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-05' AND s."checkOutDate" = '2026-04-05'
  );

-- Stay #33: Welly Tanoto | H | 2026-03-09 – 2026-04-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-10', '2026-04-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-10' AND s."checkOutDate" = '2026-04-10'
  );

-- Stay #34: Dini | C | 2026-02-28 – 2026-03-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-01', '2026-04-01', 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-01' AND s."checkOutDate" = '2026-04-01'
  );

-- Stay #35: Meliana Tamara | K | ????-??-?? – 2026-01-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-10'
  );

-- Stay #36: Annisa | J | ????-??-?? – ????-??-??
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, NULL, 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '7310035704070001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = NULL
  );

-- Stay #37: Theo Wijaya | I | 2025-10-04 – 2025-11-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-05', '2025-11-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-05' AND s."checkOutDate" = '2025-11-05'
  );

-- Stay #38: Lovandra | A | ????-??-?? – 2026-01-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-30', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-30'
  );

-- Stay #39: Destarika Hasan | L | ????-??-?? – 2025-12-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-01'
  );

-- Stay #40: Gabriel Excelly Pranajaya | M | ????-??-?? – 2026-01-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-03'
  );

-- Stay #41: Natasya Uska Maharani | B | ????-??-?? – 2026-01-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-05', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3374137107020004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-05'
  );

-- Stay #42: Shinta Larista | A | 2026-06-25 – 2026-07-25
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-26', '2026-07-26', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3574036206990003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-26' AND s."checkOutDate" = '2026-07-26'
  );

-- Stay #43: Gabriel Excelly Pranajaya | M | 2026-07-02 – 2026-08-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-03', '2026-08-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-03' AND s."checkOutDate" = '2026-08-03'
  );

-- Stay #44: Welly Tanoto | H | 2026-07-09 – 2026-08-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-10', '2026-08-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-10' AND s."checkOutDate" = '2026-08-10'
  );

-- Stay #45: Patrick Wilfred | F2 | 2026-07-07 – 2026-08-07
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-08', '2026-08-08', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F2'
WHERE tenant."identityNumber" = '3275020504910019'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-08' AND s."checkOutDate" = '2026-08-08'
  );

-- Stay #46: Yofi Nurkolifah | G | 2025-12-31 – 2026-02-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-01', '2026-03-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-01' AND s."checkOutDate" = '2026-03-01'
  );

-- Stay #47: Lovandra | J | ????-??-?? – 2026-01-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-28', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-28'
  );

-- Stay #48: Gabriel Excelly Pranajaya | M | 2026-01-02 – 2026-03-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-03', '2026-03-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-03' AND s."checkOutDate" = '2026-03-03'
  );

-- Stay #49: Ade Chandra | D | ????-??-?? – 2026-01-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-01-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-01-24'
  );

-- Stay #50: Natasya Uska Maharani | B | ????-??-?? – 2026-03-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-05', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3374137107020004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-05'
  );

-- Stay #51: Meliana Tamara | K | 2026-07-09 – 2026-08-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-10', '2026-08-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-10' AND s."checkOutDate" = '2026-08-10'
  );

-- Stay #52: Miko Rakatama Adhi Winarto | C | 2026-06-27 – 2026-07-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-28', '2026-07-28', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '6471051708970006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-28' AND s."checkOutDate" = '2026-07-28'
  );

-- Stay #53: Yofi Nurkolifah | G | 2026-06-30 – 2026-07-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-01', '2026-08-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-01' AND s."checkOutDate" = '2026-08-01'
  );

-- Stay #54: Destarika Hasan | L | 2026-06-30 – 2026-07-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-07-01', '2026-08-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-07-01' AND s."checkOutDate" = '2026-08-01'
  );

-- Stay #55: Meliana Tamara | K | 2026-01-09 – 2026-02-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-10', '2026-03-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-10' AND s."checkOutDate" = '2026-03-01'
  );

-- Stay #56: Destarika Hasan | L | 2025-12-31 – 2026-02-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-01', '2026-03-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-01' AND s."checkOutDate" = '2026-03-01'
  );

-- Stay #57: Dini | B | 2026-05-31 – 2026-06-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-01', '2026-07-01', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-01' AND s."checkOutDate" = '2026-07-01'
  );

-- Stay #58: Lovandra | J | 2026-05-29 – 2026-06-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-30', '2026-06-30', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-30' AND s."checkOutDate" = '2026-06-30'
  );

-- Stay #59: Gabriel Excelly Pranajaya | M | 2026-06-02 – 2026-07-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-03', '2026-07-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-03' AND s."checkOutDate" = '2026-07-03'
  );

-- Stay #60: Destarika Hasan | L | 2026-05-31 – 2026-06-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-01', '2026-07-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-01' AND s."checkOutDate" = '2026-07-01'
  );

-- Stay #61: Lovandra | J | 2026-06-29 – 2026-07-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-30', '2026-07-30', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-30' AND s."checkOutDate" = '2026-07-30'
  );

-- Stay #62: Echa Qurniatunnafiah | F2 | ????-??-?? – 2026-03-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-10', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F2'
WHERE tenant."identityNumber" = '3502016607060004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-10'
  );

-- Stay #63: Muhammad Alzidan Putra | A | ????-??-?? – 2026-03-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-05', 1400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3312252710070001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-05'
  );

-- Stay #64: Ade Chandra | D | 2026-05-23 – 2026-06-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-24', '2026-06-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-24' AND s."checkOutDate" = '2026-06-24'
  );

-- Stay #65: Miko Rakatama Adhi Winarto | C | 2026-05-27 – 2026-06-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-05-28', '2026-06-28', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '6471051708970006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-05-28' AND s."checkOutDate" = '2026-06-28'
  );

-- Stay #66: Meliana Tamara | K | 2026-06-09 – 2026-07-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-06-10', '2026-07-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-06-10' AND s."checkOutDate" = '2026-07-10'
  );

-- Stay #67: Meliana Tamara | K | 2026-03-09 – 2026-04-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-10', '2026-04-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-10' AND s."checkOutDate" = '2026-04-10'
  );

-- Stay #68: Ade Chandra | D | ????-??-?? – 2026-03-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-24'
  );

-- Stay #69: Miko Rakatama Adhi Winarto | C | 2026-04-27 – 2026-05-27
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-04-28', '2026-05-28', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '6471051708970006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-04-28' AND s."checkOutDate" = '2026-05-28'
  );

-- Stay #70: Welly Tanoto | H | ????-??-?? – 2026-03-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-10'
  );

-- Stay #71: Yoga Aprilian | B | ????-??-?? – ????-??-??
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, NULL, 230000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3522210411030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = NULL
  );

-- Stay #72: Destarika Hasan | L | 2026-02-28 – 2026-03-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-01', '2026-04-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-01' AND s."checkOutDate" = '2026-04-01'
  );

-- Stay #73: Yofi Nurkolifah | G | 2026-02-28 – 2026-03-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-01', '2026-04-01', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-01' AND s."checkOutDate" = '2026-04-01'
  );

-- Stay #74: Theo Wijaya | I | 2026-01-04 – ????-??-??
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-05', NULL, 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-05' AND s."checkOutDate" = NULL
  );

-- Stay #75: YAN ATAURAHMAN | B | ????-??-?? – 2026-03-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", NULL, '2026-03-24', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '6471042201780003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = NULL AND s."checkOutDate" = '2026-03-24'
  );

-- Stay #76: Dini | C | 2025-12-31 – ????-??-??
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-01', NULL, 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-01' AND s."checkOutDate" = NULL
  );

-- Stay #77: Lovandra | J | 2026-01-27 – 2026-03-29
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-01-28', '2026-03-30', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175070312930003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-01-28' AND s."checkOutDate" = '2026-03-30'
  );

-- Stay #78: Gabriel Excelly Pranajaya | M | 2026-03-02 – 2026-04-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2026-03-03', '2026-04-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2026-03-03' AND s."checkOutDate" = '2026-04-03'
  );

-- Stay #79: Ruth Angeline Carolee | J | 2025-09-06 – 2025-10-06
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-07', '2025-10-07', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3175056912980001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-07' AND s."checkOutDate" = '2025-10-07'
  );

-- Stay #80: Meliana Tamara | K | 2025-09-09 – 2025-10-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-10', '2025-10-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-10' AND s."checkOutDate" = '2025-10-10'
  );

-- Stay #81: Destarika Hasan | L | 2025-08-31 – 2025-09-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-01', '2025-10-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-01' AND s."checkOutDate" = '2025-10-01'
  );

-- Stay #82: Gabriel Excelly Pranajaya | M | 2025-09-02 – 2025-10-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-03', '2025-10-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-03' AND s."checkOutDate" = '2025-10-03'
  );

-- Stay #83: Theo Wijaya | I | 2025-09-04 – 2025-10-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-05', '2025-10-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-05' AND s."checkOutDate" = '2025-10-05'
  );

-- Stay #84: Ade Chandra | D | 2025-09-23 – 2025-10-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-24', '2025-10-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-24' AND s."checkOutDate" = '2025-10-24'
  );

-- Stay #85: Ishaq | F1 | 2025-09-25 – 2025-09-26
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-26', '2025-09-27', 150000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '7322111909990005'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-26' AND s."checkOutDate" = '2025-09-27'
  );

-- Stay #86: Margareth - Ika Supartika | F1 | 2025-09-08 – 2025-09-22
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-09', '2025-09-23', 650000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3201375704950003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-09' AND s."checkOutDate" = '2025-09-23'
  );

-- Stay #87: Yofi Nurkolifah | G | 2025-09-18 – 2025-10-18
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-19', '2025-10-19', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-19' AND s."checkOutDate" = '2025-10-19'
  );

-- Stay #88: Welly Tanoto | H | 2025-09-09 – 2025-10-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-10', '2025-10-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-10' AND s."checkOutDate" = '2025-10-10'
  );

-- Stay #89: Gabriel Excelly Pranajaya | M | 2025-10-02 – 2025-11-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-03', '2025-11-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-03' AND s."checkOutDate" = '2025-11-03'
  );

-- Stay #90: Canon Daiyumi Aprian Domeng | A | 2025-09-21 – 2025-09-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-22', '2025-09-29', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '9109010704010004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-22' AND s."checkOutDate" = '2025-09-29'
  );

-- Stay #91: Sianly | A | 2025-09-09 – 2025-09-21
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-10', '2025-09-22', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3173065206830006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-10' AND s."checkOutDate" = '2025-09-22'
  );

-- Stay #92: Pertiwi Lintang Kalas Wungu | B | 2025-09-02 – 2025-10-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-03', '2025-10-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-03' AND s."checkOutDate" = '2025-10-03'
  );

-- Stay #93: Dini | C | 2025-07-31 – 2025-08-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-01', '2025-09-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-01' AND s."checkOutDate" = '2025-09-01'
  );

-- Stay #94: Juli Hendrawan | J | 2025-10-04 – 2025-10-06
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-05', '2025-10-07', 400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3202402502820001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-05' AND s."checkOutDate" = '2025-10-07'
  );

-- Stay #95: Imam Wahyudi | J | 2025-10-01 – 2025-10-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-02', '2025-10-03', 150000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3506211007880001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-02' AND s."checkOutDate" = '2025-10-03'
  );

-- Stay #96: Yevy Eko Nurcahyo | J | 2025-10-02 – 2025-10-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-03', '2025-10-05', 360000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3505210805900001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-03' AND s."checkOutDate" = '2025-10-05'
  );

-- Stay #97: Meliana Tamara | K | 2025-10-09 – 2025-11-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-10', '2025-11-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-10' AND s."checkOutDate" = '2025-11-10'
  );

-- Stay #98: Destarika Hasan | L | 2025-09-30 – 2025-10-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-01', '2025-11-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-01' AND s."checkOutDate" = '2025-11-01'
  );

-- Stay #99: Echa Qurniatunnafiah | F2 | 2025-10-09 – 2025-11-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-10', '2025-11-10', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F2'
WHERE tenant."identityNumber" = '3502016607060004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-10' AND s."checkOutDate" = '2025-11-10'
  );

-- Stay #100: Welly Tanoto | H | 2025-10-09 – 2025-11-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-10', '2025-11-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-10' AND s."checkOutDate" = '2025-11-10'
  );

-- Stay #101: Dhio Andralian Alfariski | J | 2025-10-10 – 2025-10-11
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-11', '2025-10-12', 180000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3503010104000005'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-11' AND s."checkOutDate" = '2025-10-12'
  );

-- Stay #102: Wiyadi | J | 2025-10-13 – 2025-11-13
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-14', '2025-11-14', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3171020401820003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-14' AND s."checkOutDate" = '2025-11-14'
  );

-- Stay #103: Pertiwi Lintang Kalas Wungu | B | 2025-10-02 – 2025-11-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-03', '2025-11-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-03' AND s."checkOutDate" = '2025-11-03'
  );

-- Stay #104: Dini | C | 2025-08-31 – 2025-09-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-09-01', '2025-10-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-09-01' AND s."checkOutDate" = '2025-10-01'
  );

-- Stay #105: Ade Chandra | D | 2025-10-23 – 2025-11-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-24', '2025-11-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-24' AND s."checkOutDate" = '2025-11-24'
  );

-- Stay #106: Bunga Allo Novalia | F1 | 2025-10-03 – 2025-11-03
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-04', '2025-11-04', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3271016808840018'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-04' AND s."checkOutDate" = '2025-11-04'
  );

-- Stay #107: Viviana Arwanto | A | 2025-08-07 – 2025-09-07
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-08', '2025-09-08', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3577036311980002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-08' AND s."checkOutDate" = '2025-09-08'
  );

-- Stay #108: Juli Hendrawan | A | 2025-10-04 – 2025-10-08
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-05', '2025-10-09', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3202402502820001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-05' AND s."checkOutDate" = '2025-10-09'
  );

-- Stay #109: Ponadi | A | 2025-09-30 – 2025-10-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-01', '2025-10-02', 250000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3307072303810004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-01' AND s."checkOutDate" = '2025-10-02'
  );

-- Stay #110: Yofi Nurkolifah | G | 2025-08-18 – 2025-09-18
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-19', '2025-09-19', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3519122204030003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-19' AND s."checkOutDate" = '2025-09-19'
  );

-- Stay #111: INDUNG TRI HARIARTO | G | 2025-08-08 – 2025-08-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-09', '2025-08-10', 120000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3311042711950002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-09' AND s."checkOutDate" = '2025-08-10'
  );

-- Stay #112: Mufsona | F1 | 2025-08-14 – 2025-08-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-15', '2025-08-29', 2400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3515174101920004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-15' AND s."checkOutDate" = '2025-08-29'
  );

-- Stay #113: Muhamad Fariz Al-Hafiz | G | 2025-08-11 – 2025-08-13
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-12', '2025-08-14', 300000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3175050409030006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-12' AND s."checkOutDate" = '2025-08-14'
  );

-- Stay #114: Welly Tanoto | H | 2025-08-09 – 2025-09-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-10', '2025-09-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-10' AND s."checkOutDate" = '2025-09-10'
  );

-- Stay #115: Mufsona | F1 | 2025-08-28 – 2025-09-06
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-29', '2025-09-07', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3515174101920004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-29' AND s."checkOutDate" = '2025-09-07'
  );

-- Stay #116: Ade Chandra | D | 2025-08-23 – 2025-09-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-24', '2025-09-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-24' AND s."checkOutDate" = '2025-09-24'
  );

-- Stay #117: Dini | C | 2025-11-30 – ????-??-??
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-12-01', NULL, 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-12-01' AND s."checkOutDate" = NULL
  );

-- Stay #118: Pertiwi Lintang Kalas Wungu | B | 2025-08-02 – 2025-09-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-03', '2025-09-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-03' AND s."checkOutDate" = '2025-09-03'
  );

-- Stay #119: Thea & Felix | J | 2025-08-01 – 2025-09-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-02', '2025-09-02', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3404120906990009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-02' AND s."checkOutDate" = '2025-09-02'
  );

-- Stay #120: Imam Wahyudi | J | 2025-08-26 – 2025-08-28
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-27', '2025-08-29', 500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3506211007880001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-27' AND s."checkOutDate" = '2025-08-29'
  );

-- Stay #121: Imam Wahyudi | J | 2025-08-28 – 2025-08-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-29', '2025-08-31', 500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3506211007880001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-29' AND s."checkOutDate" = '2025-08-31'
  );

-- Stay #122: Imam Wahyudi | J | 2025-08-30 – 2025-08-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-31', '2025-09-01', 250000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3506211007880001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-31' AND s."checkOutDate" = '2025-09-01'
  );

-- Stay #123: Theo Wijaya | I | 2025-08-04 – 2025-09-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-05', '2025-09-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-05' AND s."checkOutDate" = '2025-09-05'
  );

-- Stay #124: Dini | C | 2025-10-31 – 2025-11-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-01', '2025-12-01', 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-01' AND s."checkOutDate" = '2025-12-01'
  );

-- Stay #125: Meliana Tamara | K | 2025-08-09 – 2025-09-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-10', '2025-09-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-10' AND s."checkOutDate" = '2025-09-10'
  );

-- Stay #126: Destarika Hasan | L | 2025-07-31 – 2025-08-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-01', '2025-09-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-01' AND s."checkOutDate" = '2025-09-01'
  );

-- Stay #127: Gabriel Excelly Pranajaya | M | 2025-08-02 – 2025-09-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-08-03', '2025-09-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-08-03' AND s."checkOutDate" = '2025-09-03'
  );

-- Stay #128: Sakura Naeila Naikesyah | F3 | 2025-12-05 – 2025-12-06
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-12-06', '2025-12-07', 120000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F3'
WHERE tenant."identityNumber" = '3275067010050004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-12-06' AND s."checkOutDate" = '2025-12-07'
  );

-- Stay #129: Bunga Allo Novalia | F1 | 2025-12-03 – 2025-12-10
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-12-04', '2025-12-11', 250000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3271016808840018'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-12-04' AND s."checkOutDate" = '2025-12-11'
  );

-- Stay #130: Thea & Laurentius Andrian | J | 2025-07-01 – 2025-08-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-02', '2025-08-02', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3404120906990009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-02' AND s."checkOutDate" = '2025-08-02'
  );

-- Stay #131: Meliana Tamara | K | 2025-07-09 – 2025-08-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-10', '2025-08-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-10' AND s."checkOutDate" = '2025-08-10'
  );

-- Stay #132: Destarika Hasan | L | 2025-06-30 – 2025-07-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-01', '2025-08-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-01' AND s."checkOutDate" = '2025-08-01'
  );

-- Stay #133: Gabriel Excelly Pranajaya | M | 2025-07-02 – 2025-08-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-03', '2025-08-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-03' AND s."checkOutDate" = '2025-08-03'
  );

-- Stay #134: Dini | C | 2025-06-30 – 2025-07-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-01', '2025-08-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-01' AND s."checkOutDate" = '2025-08-01'
  );

-- Stay #135: Ahmad Adiwitoko | G | 2025-07-05 – 2025-08-05
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-06', '2025-08-06', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3320150308880001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-06' AND s."checkOutDate" = '2025-08-06'
  );

-- Stay #136: Welly Tanoto | H | 2025-07-09 – 2025-08-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-10', '2025-08-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-10' AND s."checkOutDate" = '2025-08-10'
  );

-- Stay #137: Theo Wijaya | I | 2025-07-04 – 2025-08-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-05', '2025-08-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-05' AND s."checkOutDate" = '2025-08-05'
  );

-- Stay #138: Pertiwi Lintang Kalas Wungu | B | 2025-06-02 – 2025-07-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-03', '2025-07-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-03' AND s."checkOutDate" = '2025-07-03'
  );

-- Stay #139: Viviana Arwanto | A | 2025-06-07 – 2025-07-07
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-08', '2025-07-08', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3577036311980002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-08' AND s."checkOutDate" = '2025-07-08'
  );

-- Stay #140: Ireane Cahyadi | A | 2025-06-07 – 2025-06-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-08', '2025-06-10', 400000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3273115711750010'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-08' AND s."checkOutDate" = '2025-06-10'
  );

-- Stay #141: Viviana Arwanto | A | 2025-07-07 – 2025-08-07
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-08', '2025-08-08', 1700000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3577036311980002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-08' AND s."checkOutDate" = '2025-08-08'
  );

-- Stay #142: Pertiwi Lintang Kalas Wungu | B | 2025-07-02 – 2025-08-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-07-03', '2025-08-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-07-03' AND s."checkOutDate" = '2025-08-03'
  );

-- Stay #143: Theo Wijaya | I | 2025-06-04 – 2025-07-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-05', '2025-07-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-05' AND s."checkOutDate" = '2025-07-05'
  );

-- Stay #144: Welly Tanoto | H | 2025-06-09 – 2025-07-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-10', '2025-07-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-10' AND s."checkOutDate" = '2025-07-10'
  );

-- Stay #145: Ahmad Rosaid | G | 2025-06-05 – 2025-07-05
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-06', '2025-07-06', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3320072803840005'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-06' AND s."checkOutDate" = '2025-07-06'
  );

-- Stay #146: Muhammad Efendi | D | 2025-06-17 – 2025-07-17
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-18', '2025-07-18', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3316041812950001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-18' AND s."checkOutDate" = '2025-07-18'
  );

-- Stay #147: Dini | C | 2025-05-31 – 2025-06-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-01', '2025-07-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-01' AND s."checkOutDate" = '2025-07-01'
  );

-- Stay #148: Trisha Larasati Putri | A | 2025-05-06 – 2025-05-20
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-07', '2025-05-21', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'A'
WHERE tenant."identityNumber" = '3671105209040002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-07' AND s."checkOutDate" = '2025-05-21'
  );

-- Stay #149: Meliana Tamara | K | 2025-06-09 – 2025-07-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-10', '2025-07-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-10' AND s."checkOutDate" = '2025-07-10'
  );

-- Stay #150: Destarika Hasan | L | 2025-05-31 – 2025-06-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-01', '2025-07-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-01' AND s."checkOutDate" = '2025-07-01'
  );

-- Stay #151: Thea & Laurentius Andrian | J | 2025-06-01 – 2025-07-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-02', '2025-07-02', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3404120906990009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-02' AND s."checkOutDate" = '2025-07-02'
  );

-- Stay #152: Gabriel Excelly Pranajaya | M | 2025-06-02 – 2025-07-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-06-03', '2025-07-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-06-03' AND s."checkOutDate" = '2025-07-03'
  );

-- Stay #153: Agus Winarso | D | 2025-05-06 – 2025-05-20
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-07', '2025-05-21', 1300000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3324040508870006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-07' AND s."checkOutDate" = '2025-05-21'
  );

-- Stay #154: Agus Winarso | D | 2025-05-20 – 2025-06-10
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-21', '2025-06-11', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3324040508870006'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-21' AND s."checkOutDate" = '2025-06-11'
  );

-- Stay #155: Dini | C | 2025-04-30 – 2025-05-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-01', '2025-06-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-01' AND s."checkOutDate" = '2025-06-01'
  );

-- Stay #156: Gabriel Excelly Pranajaya | M | 2025-05-02 – 2025-06-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-03', '2025-06-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-03' AND s."checkOutDate" = '2025-06-03'
  );

-- Stay #157: Pertiwi Lintang Kalas Wungu | B | 2025-05-02 – 2025-06-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-03', '2025-06-03', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'B'
WHERE tenant."identityNumber" = '3578166902960003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-03' AND s."checkOutDate" = '2025-06-03'
  );

-- Stay #158: Welly Tanoto | H | 2025-05-09 – 2025-06-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-10', '2025-06-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-10' AND s."checkOutDate" = '2025-06-10'
  );

-- Stay #159: Theo Wijaya | I | 2025-05-04 – 2025-06-04
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-05', '2025-06-05', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'I'
WHERE tenant."identityNumber" = '3571021308860003'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-05' AND s."checkOutDate" = '2025-06-05'
  );

-- Stay #160: Thea & Laurentius Andrian | J | 2025-05-01 – 2025-06-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-02', '2025-06-02', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3404120906990009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-02' AND s."checkOutDate" = '2025-06-02'
  );

-- Stay #161: Meliana Tamara | K | 2025-05-09 – 2025-06-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-10', '2025-06-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-10' AND s."checkOutDate" = '2025-06-10'
  );

-- Stay #162: Destarika Hasan | L | 2025-04-30 – 2025-05-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-01', '2025-06-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-01' AND s."checkOutDate" = '2025-06-01'
  );

-- Stay #163: Ahmad Rosaid | G | 2025-05-05 – 2025-06-05
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-05-06', '2025-06-06', 950000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3320072803840005'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-05-06' AND s."checkOutDate" = '2025-06-06'
  );

-- Stay #164: Ade Chandra | D | 2025-11-23 – 2025-12-23
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-24', '2025-12-24', 1500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'D'
WHERE tenant."identityNumber" = '3173052309720009'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-24' AND s."checkOutDate" = '2025-12-24'
  );

-- Stay #165: Dini | C | 2025-09-30 – 2025-10-31
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-10-01', '2025-11-01', 1100000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-10-01' AND s."checkOutDate" = '2025-11-01'
  );

-- Stay #166: Dini | C | 2024-10-31 – 2024-11-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2024-11-01', '2024-12-01', 1450000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'C'
WHERE tenant."identityNumber" = '3275085012800021'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2024-11-01' AND s."checkOutDate" = '2024-12-01'
  );

-- Stay #167: Welly Tanoto | H | 2025-11-09 – 2025-12-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-10', '2025-12-10', 800000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'H'
WHERE tenant."identityNumber" = '3578070811730004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-10' AND s."checkOutDate" = '2025-12-10'
  );

-- Stay #168: Suryo Baskoro | G | 2025-11-17 – 2025-12-01
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-18', '2025-12-02', 500000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'G'
WHERE tenant."identityNumber" = '3318062111950001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-18' AND s."checkOutDate" = '2025-12-02'
  );

-- Stay #169: Echa Qurniatunnafiah | F2 | 2025-11-09 – 2025-12-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-10', '2025-12-10', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F2'
WHERE tenant."identityNumber" = '3502016607060004'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-10' AND s."checkOutDate" = '2025-12-10'
  );

-- Stay #170: Bunga Allo Novalia | F1 | 2025-11-03 – 2025-12-03
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-04', '2025-12-04', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F1'
WHERE tenant."identityNumber" = '3271016808840018'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-04' AND s."checkOutDate" = '2025-12-04'
  );

-- Stay #171: Nunuk Istiyowati | F3 | 2025-11-10 – 2025-11-24
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-11', '2025-11-25', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'F3'
WHERE tenant."identityNumber" = '3578295707870001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-11' AND s."checkOutDate" = '2025-11-25'
  );

-- Stay #172: Gabriel Excelly Pranajaya | M | 2025-11-02 – 2025-12-02
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-03', '2025-12-03', 1200000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'M'
WHERE tenant."identityNumber" = '3511115908030001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-03' AND s."checkOutDate" = '2025-12-03'
  );

-- Stay #173: Destarika Hasan | L | 2025-10-31 – 2025-11-30
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-01', '2025-12-01', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'L'
WHERE tenant."identityNumber" = '1671065812020008'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-01' AND s."checkOutDate" = '2025-12-01'
  );

-- Stay #174: Meliana Tamara | K | 2025-11-09 – 2025-12-09
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-10', '2025-12-10', 1600000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'K'
WHERE tenant."identityNumber" = '3578125102000002'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-10' AND s."checkOutDate" = '2025-12-10'
  );

-- Stay #175: Saferi Putra Samudra | J | 2025-11-17 – 2025-12-17
INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")
SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", '2025-11-18', '2025-12-18', 1000000, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()
FROM "Tenant" tenant
JOIN "Room" room ON room.code = 'J'
WHERE tenant."identityNumber" = '3514212109050001'
  AND NOT EXISTS (
    SELECT 1 FROM "Stay" s
    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id
      AND s."checkInDate" = '2025-11-18' AND s."checkOutDate" = '2025-12-18'
  );


-- ============================================================================
-- C. INVOICE, INVOICE LINE & PAYMENT — Dari data kwitansi
-- ============================================================================

-- Invoice #1: Patrick Wilfred | F1 | 2026-06-21 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0001', stay.id, 'PAID'::"InvoiceStatus", '2026-06-08', '2026-07-08', '2026-06-22', '2026-06-22', '2026-06-22', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275020504910019'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0001')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-08'::text || ' - ' || '2026-07-08'::text, 1, 1600000, 1600000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #2: Yufita Hieng | F1 | 2026-06-21 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0002', stay.id, 'PAID'::"InvoiceStatus", '2026-06-26', '2026-07-26', '2026-06-22', '2026-06-22', '2026-06-22', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6405025701970003'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0002')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-26'::text || ' - ' || '2026-07-26'::text, 1, 1700000, 1700000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #3: Ade Chandra | D | 2026-06-21 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0003', stay.id, 'PAID'::"InvoiceStatus", '2026-06-24', '2026-07-24', '2026-06-22', '2026-06-22', '2026-06-22', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0003')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-24'::text || ' - ' || '2026-07-24'::text, 1, 1445000, 1445000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5629 kWh', 1, 55000, 55000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #4: Ester Rada Kadunga | A | 2026-06-21 | Rp700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0004', stay.id, 'PAID'::"InvoiceStatus", '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-22', '2026-06-22', 700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '5312115509950001'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0004')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-08'::text || ' - ' || '2026-06-15'::text, 1, 700000, 700000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 700000);

-- Invoice #5: Theo Wijaya | I | 2026-06-21 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0005', stay.id, 'PAID'::"InvoiceStatus", '2026-04-05', '2026-05-05', '2026-06-22', '2026-06-22', '2026-06-22', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0005')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-05'::text || ' - ' || '2026-05-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #6: Theo Wijaya | I | 2026-06-21 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0006', stay.id, 'PAID'::"InvoiceStatus", '2026-03-05', '2026-04-05', '2026-06-22', '2026-06-22', '2026-06-22', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0006')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-05'::text || ' - ' || '2026-04-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #7: Yofi Nurkolifah | G | 2026-06-21 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0007', stay.id, 'PAID'::"InvoiceStatus", '2026-06-01', '2026-07-01', '2026-06-22', '2026-06-22', '2026-06-22', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0007')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-01'::text || ' - ' || '2026-07-01'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #8: Welly Tanoto | H | 2026-06-21 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260621-0008', stay.id, 'PAID'::"InvoiceStatus", '2026-06-10', '2026-07-10', '2026-06-22', '2026-06-22', '2026-06-22', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-06-22' AND stay."checkOutDate" >= '2026-06-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260621-0008')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-10'::text || ' - ' || '2026-07-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-22', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #9: Bunga Allo Novalia | F1 | 2026-05-07 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0009', stay.id, 'PAID'::"InvoiceStatus", '2026-04-28', '2026-05-28', '2026-05-08', '2026-05-08', '2026-05-08', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3271016808840018'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0009')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-28'::text || ' - ' || '2026-05-28'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #10: Lovandra | J | 2026-05-07 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0010', stay.id, 'PAID'::"InvoiceStatus", '2026-04-30', '2026-05-30', '2026-05-08', '2026-05-08', '2026-05-08', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0010')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-30'::text || ' - ' || '2026-05-30'::text, 1, 1370000, 1370000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3706 kWh', 1, 130000, 130000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #11: Gabriel Excelly Pranajaya | M | 2026-05-07 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0011', stay.id, 'PAID'::"InvoiceStatus", '2026-05-03', '2026-06-03', '2026-05-08', '2026-05-08', '2026-05-08', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0011')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-03'::text || ' - ' || '2026-06-03'::text, 1, 1112500, 1112500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 65 kWh', 1, 87500, 87500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #12: Yofi Nurkolifah | G | 2026-05-07 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0012', stay.id, 'PAID'::"InvoiceStatus", '2026-04-01', '2026-05-01', '2026-05-08', '2026-05-08', '2026-05-08', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0012')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-01'::text || ' - ' || '2026-05-01'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #13: Yofi Nurkolifah | G | 2026-05-07 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0013', stay.id, 'PAID'::"InvoiceStatus", '2026-05-01', '2026-06-01', '2026-05-08', '2026-05-08', '2026-05-08', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0013')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-01'::text || ' - ' || '2026-06-01'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #14: Destarika Hasan | L | 2026-05-07 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0014', stay.id, 'PAID'::"InvoiceStatus", '2026-05-01', '2026-06-01', '2026-05-08', '2026-05-08', '2026-05-08', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0014')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-01'::text || ' - ' || '2026-06-01'::text, 1, 1285000, 1285000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5503 kWh', 1, 315000, 315000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #15: Meliana Tamara | K | 2026-04-21 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0015', stay.id, 'PAID'::"InvoiceStatus", '2026-05-10', '2026-06-10', '2026-04-22', '2026-04-22', '2026-04-22', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0015')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-10'::text || ' - ' || '2026-06-10'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #16: Destarika Hasan | L | 2026-04-21 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0016', stay.id, 'PAID'::"InvoiceStatus", '2026-04-01', '2026-05-01', '2026-04-22', '2026-04-22', '2026-04-22', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0016')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-01'::text || ' - ' || '2026-05-01'::text, 1, 1550000, 1550000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #17: Muhammad Alzidan Putra | A | 2026-04-21 | Rp1.400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0017', stay.id, 'PAID'::"InvoiceStatus", '2026-04-05', '2026-05-05', '2026-04-22', '2026-04-22', '2026-04-22', 1400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3312252710070001'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0017')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-05'::text || ' - ' || '2026-05-05'::text, 1, 1400000, 1400000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1400000);

-- Invoice #18: Dini | B | 2026-04-21 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0018', stay.id, 'PAID'::"InvoiceStatus", '2026-04-01', '2026-05-01', '2026-04-22', '2026-04-22', '2026-04-22', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0018')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-01'::text || ' - ' || '2026-05-01'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #19: Ade Chandra | D | 2026-04-21 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0019', stay.id, 'PAID'::"InvoiceStatus", '2026-04-24', '2026-05-24', '2026-04-22', '2026-04-22', '2026-04-22', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0019')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-24'::text || ' - ' || '2026-05-24'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #20: Welly Tanoto | H | 2026-04-21 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0020', stay.id, 'PAID'::"InvoiceStatus", '2026-04-10', '2026-05-10', '2026-04-22', '2026-04-22', '2026-04-22', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0020')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-10'::text || ' - ' || '2026-05-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #21: Gabriel Excelly Pranajaya | M | 2026-04-21 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260421-0021', stay.id, 'PAID'::"InvoiceStatus", '2026-04-03', '2026-05-03', '2026-04-22', '2026-04-22', '2026-04-22', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-04-22' AND stay."checkOutDate" >= '2026-04-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260421-0021')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-03'::text || ' - ' || '2026-05-03'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-04-22', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #22: Theo Wijaya | I | 2026-05-23 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260523-0022', stay.id, 'PAID'::"InvoiceStatus", '2026-01-05', '2026-03-05', '2026-05-24', '2026-05-24', '2026-05-24', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2026-05-24' AND stay."checkOutDate" >= '2026-05-24'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260523-0022')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-05'::text || ' - ' || '2026-03-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-24', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #23: Welly Tanoto | H | 2026-05-23 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260523-0023', stay.id, 'PAID'::"InvoiceStatus", '2026-05-10', '2026-06-10', '2026-05-24', '2026-05-24', '2026-05-24', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-05-24' AND stay."checkOutDate" >= '2026-05-24'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260523-0023')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-10'::text || ' - ' || '2026-06-10'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-24', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #24: Lovandra | J | 2026-03-30 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260330-0024', stay.id, 'PAID'::"InvoiceStatus", '2026-03-30', '2026-04-30', '2026-03-31', '2026-03-31', '2026-03-31', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-03-31' AND stay."checkOutDate" >= '2026-03-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260330-0024')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-30'::text || ' - ' || '2026-04-30'::text, 1, 1450000, 1450000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-31', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #25: Miko Rakatama Adhi | C | 2026-03-30 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260330-0025', stay.id, 'PAID'::"InvoiceStatus", '2026-03-28', '2026-04-28', '2026-03-31', '2026-03-31', '2026-03-31', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471051708970006'
    AND stay."checkInDate" <= '2026-03-31' AND stay."checkOutDate" >= '2026-03-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260330-0025')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-28'::text || ' - ' || '2026-04-28'::text, 1, 1520000, 1520000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 80000, 80000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-31', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #26: Bunga Allo Novalia | F1 | 2026-03-30 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260330-0026', stay.id, 'PAID'::"InvoiceStatus", '2026-03-28', '2026-04-28', '2026-03-31', '2026-03-31', '2026-03-31', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3271016808840018'
    AND stay."checkInDate" <= '2026-03-31' AND stay."checkOutDate" >= '2026-03-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260330-0026')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-28'::text || ' - ' || '2026-04-28'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-31', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #27: Dini | C | 2026-03-12 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260312-0027', stay.id, 'PAID'::"InvoiceStatus", '2026-01-01', '2026-03-01', '2026-03-13', '2026-03-13', '2026-03-13', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-03-13' AND stay."checkOutDate" >= '2026-03-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260312-0027')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-01'::text || ' - ' || '2026-03-01'::text, 1, 1450000, 1450000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-13', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #28: Meliana Tamara | K | 2026-03-22 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260322-0028', stay.id, 'PAID'::"InvoiceStatus", '2026-04-10', '2026-05-10', '2026-03-23', '2026-03-23', '2026-03-23', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-03-23' AND stay."checkOutDate" >= '2026-03-23'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260322-0028')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-10'::text || ' - ' || '2026-05-10'::text, 1, 1600000, 1600000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-23', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #29: Ade Chandra | D | 2026-03-22 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260322-0029', stay.id, 'PAID'::"InvoiceStatus", '2026-03-24', '2026-04-24', '2026-03-23', '2026-03-23', '2026-03-23', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-03-23' AND stay."checkOutDate" >= '2026-03-23'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260322-0029')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-24'::text || ' - ' || '2026-04-24'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-23', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #30: Echa Qurniatunnafiah | F2 | 2026-01-13 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260113-0030', stay.id, 'PAID'::"InvoiceStatus", '2026-01-14', '2026-01-10', '2026-01-14', '2026-01-14', '2026-01-14', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3502016607060004'
    AND stay."checkInDate" <= '2026-01-14' AND stay."checkOutDate" >= '2026-01-14'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260113-0030')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-14'::text || ' - ' || '2026-01-10'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-14', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #31: Welly Tanoto | H | 2026-01-13 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260113-0031', stay.id, 'PAID'::"InvoiceStatus", '2026-01-14', '2026-01-10', '2026-01-14', '2026-01-14', '2026-01-14', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-01-14' AND stay."checkOutDate" >= '2026-01-14'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260113-0031')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-14'::text || ' - ' || '2026-01-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-14', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #32: Muhammad Alzidan Putra | A | 2026-03-12 | Rp1.400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260312-0032', stay.id, 'PAID'::"InvoiceStatus", '2026-03-05', '2026-04-05', '2026-03-13', '2026-03-13', '2026-03-13', 1400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3312252710070001'
    AND stay."checkInDate" <= '2026-03-13' AND stay."checkOutDate" >= '2026-03-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260312-0032')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-05'::text || ' - ' || '2026-04-05'::text, 1, 1400000, 1400000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-13', 1400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1400000);

-- Invoice #33: Welly Tanoto | H | 2026-03-12 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260312-0033', stay.id, 'PAID'::"InvoiceStatus", '2026-03-10', '2026-04-10', '2026-03-13', '2026-03-13', '2026-03-13', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-03-13' AND stay."checkOutDate" >= '2026-03-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260312-0033')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-10'::text || ' - ' || '2026-04-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-13', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #34: Dini | C | 2026-03-12 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260312-0034', stay.id, 'PAID'::"InvoiceStatus", '2026-03-01', '2026-04-01', '2026-03-13', '2026-03-13', '2026-03-13', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-03-13' AND stay."checkOutDate" >= '2026-03-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260312-0034')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-01'::text || ' - ' || '2026-04-01'::text, 1, 1450000, 1450000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-13', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #35: Theo Wijaya | I | 2025-12-30 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251230-0035', stay.id, 'PAID'::"InvoiceStatus", '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-12-31' AND stay."checkOutDate" >= '2025-12-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251230-0035')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-31'::text || ' - ' || '2025-12-31'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-31', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #36: Meliana Tamara | K | 2025-12-30 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251230-0036', stay.id, 'PAID'::"InvoiceStatus", '2025-12-31', '2026-01-10', '2025-12-31', '2025-12-31', '2025-12-31', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-12-31' AND stay."checkOutDate" >= '2025-12-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251230-0036')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-31'::text || ' - ' || '2026-01-10'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-31', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #37: Annisa | J | 2025-12-19 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251219-0037', stay.id, 'PAID'::"InvoiceStatus", '2025-12-20', '2025-12-20', '2025-12-20', '2025-12-20', '2025-12-20', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '7310035704070001'
    AND stay."checkInDate" <= '2025-12-20' AND stay."checkOutDate" >= '2025-12-20'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251219-0037')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-20'::text || ' - ' || '2025-12-20'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-20', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #38: Theo Wijaya | I | 2025-12-30 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251230-0038', stay.id, 'PAID'::"InvoiceStatus", '2025-10-05', '2025-11-05', '2025-12-31', '2025-12-31', '2025-12-31', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-12-31' AND stay."checkOutDate" >= '2025-12-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251230-0038')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-05'::text || ' - ' || '2025-11-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-31', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #39: Lovandra | A | 2026-01-13 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260113-0039', stay.id, 'PAID'::"InvoiceStatus", '2026-01-14', '2026-01-30', '2026-01-14', '2026-01-14', '2026-01-14', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-01-14' AND stay."checkOutDate" >= '2026-01-14'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260113-0039')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-14'::text || ' - ' || '2026-01-30'::text, 1, 1700000, 1700000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-14', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #40: Dini | C | 2026-02-01 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0040', stay.id, 'PAID'::"InvoiceStatus", '2026-02-02', '2026-02-02', '2026-02-02', '2026-02-02', '2026-02-02', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0040')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-02'::text || ' - ' || '2026-02-02'::text, 1, 1450000, 1450000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #41: Destarika Hasan | L | 2026-01-05 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260105-0041', stay.id, 'PAID'::"InvoiceStatus", '2026-01-06', '2026-01-01', '2026-01-06', '2026-01-06', '2026-01-06', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-01-06' AND stay."checkOutDate" >= '2026-01-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260105-0041')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-06'::text || ' - ' || '2026-01-01'::text, 1, 1600020, 1600020, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'DISCOUNT'::"InvoiceLineType", 'Diskon', 1, -20, -20, 4
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'DISCOUNT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-06', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #42: Gabriel Excelly Pranajaya | M | 2026-01-01 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260101-0042', stay.id, 'PAID'::"InvoiceStatus", '2026-01-02', '2026-01-03', '2026-01-02', '2026-01-02', '2026-01-02', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-01-02' AND stay."checkOutDate" >= '2026-01-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260101-0042')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-02'::text || ' - ' || '2026-01-03'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-02', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #43: Natasya Uska Maharani | B | 2026-01-05 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260105-0043', stay.id, 'PAID'::"InvoiceStatus", '2026-01-06', '2026-01-05', '2026-01-06', '2026-01-06', '2026-01-06', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3374137107020004'
    AND stay."checkInDate" <= '2026-01-06' AND stay."checkOutDate" >= '2026-01-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260105-0043')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-06'::text || ' - ' || '2026-01-05'::text, 1, 1600000, 1600000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-01-06', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #44: Shinta Larista | A | 2026-06-26 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260626-0044', stay.id, 'PAID'::"InvoiceStatus", '2026-06-26', '2026-07-26', '2026-06-27', '2026-06-27', '2026-06-27', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3574036206990003'
    AND stay."checkInDate" <= '2026-06-27' AND stay."checkOutDate" >= '2026-06-27'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260626-0044')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-26'::text || ' - ' || '2026-07-26'::text, 1, 1700000, 1700000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-27', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #45: Gabriel Excelly Pranajaya | M | 2026-07-16 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260716-0045', stay.id, 'PAID'::"InvoiceStatus", '2026-07-03', '2026-08-03', '2026-07-17', '2026-07-17', '2026-07-17', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-07-17' AND stay."checkOutDate" >= '2026-07-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260716-0045')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-03'::text || ' - ' || '2026-08-03'::text, 1, 1072500, 1072500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 61 kWh', 1, 77500, 77500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-17', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #46: Welly Tanoto | H | 2026-07-16 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260716-0046', stay.id, 'PAID'::"InvoiceStatus", '2026-07-10', '2026-08-10', '2026-07-17', '2026-07-17', '2026-07-17', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-07-17' AND stay."checkOutDate" >= '2026-07-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260716-0046')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-10'::text || ' - ' || '2026-08-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-17', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #47: Patrick Wilfred | F2 | 2026-07-16 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260716-0047', stay.id, 'PAID'::"InvoiceStatus", '2026-07-08', '2026-08-08', '2026-07-17', '2026-07-17', '2026-07-17', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275020504910019'
    AND stay."checkInDate" <= '2026-07-17' AND stay."checkOutDate" >= '2026-07-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260716-0047')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-08'::text || ' - ' || '2026-08-08'::text, 1, 1430000, 1430000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 79 kWh', 1, 120000, 120000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-17', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #48: Yofi Nurkolifah | G | 2026-02-01 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0048', stay.id, 'PAID'::"InvoiceStatus", '2026-01-01', '2026-03-01', '2026-02-02', '2026-02-02', '2026-02-02', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0048')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-01'::text || ' - ' || '2026-03-01'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #49: Lovandra | J | 2026-02-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0049', stay.id, 'PAID'::"InvoiceStatus", '2026-02-02', '2026-01-28', '2026-02-02', '2026-02-02', '2026-02-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0049')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-02'::text || ' - ' || '2026-01-28'::text, 1, 1430000, 1430000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 70000, 70000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #50: Gabriel Excelly Pranajaya | M | 2026-02-01 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0050', stay.id, 'PAID'::"InvoiceStatus", '2026-01-03', '2026-03-03', '2026-02-02', '2026-02-02', '2026-02-02', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0050')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-03'::text || ' - ' || '2026-03-03'::text, 1, 1152500, 1152500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 49 kWh', 1, 47500, 47500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #51: Ade Chandra | D | 2026-02-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0051', stay.id, 'PAID'::"InvoiceStatus", '2026-02-02', '2026-01-24', '2026-02-02', '2026-02-02', '2026-02-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0051')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-02'::text || ' - ' || '2026-01-24'::text, 1, 1465000, 1465000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5388 kWh', 1, 35000, 35000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #52: Natasya Uska Maharani | B | 2026-02-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260203-0052', stay.id, 'PAID'::"InvoiceStatus", '2026-02-04', '2026-03-05', '2026-02-04', '2026-02-04', '2026-02-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3374137107020004'
    AND stay."checkInDate" <= '2026-02-04' AND stay."checkOutDate" >= '2026-02-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260203-0052')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-04'::text || ' - ' || '2026-03-05'::text, 1, 1600000, 1600000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #53: Meliana Tamara | K | 2026-06-26 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260626-0053', stay.id, 'PAID'::"InvoiceStatus", '2026-07-10', '2026-08-10', '2026-06-27', '2026-06-27', '2026-06-27', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-06-27' AND stay."checkOutDate" >= '2026-06-27'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260626-0053')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-10'::text || ' - ' || '2026-08-10'::text, 1, 1115000, 1115000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 8641 kWh', 1, 385000, 385000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-27', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #54: Miko Rakatama Adhi Winarto | C | 2026-07-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260702-0054', stay.id, 'PAID'::"InvoiceStatus", '2026-06-28', '2026-07-28', '2026-07-03', '2026-07-03', '2026-07-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471051708970006'
    AND stay."checkInDate" <= '2026-07-03' AND stay."checkOutDate" >= '2026-07-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260702-0054')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-28'::text || ' - ' || '2026-07-28'::text, 1, 1222500, 1222500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 8178 kWh', 1, 327500, 327500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #55: Yofi Nurkolifah | G | 2026-07-02 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260702-0055', stay.id, 'PAID'::"InvoiceStatus", '2026-07-01', '2026-08-01', '2026-07-03', '2026-07-03', '2026-07-03', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-07-03' AND stay."checkOutDate" >= '2026-07-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260702-0055')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-01'::text || ' - ' || '2026-08-01'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-03', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #56: Destarika Hasan | L | 2026-07-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260702-0056', stay.id, 'PAID'::"InvoiceStatus", '2026-07-01', '2026-08-01', '2026-07-03', '2026-07-03', '2026-07-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-07-03' AND stay."checkOutDate" >= '2026-07-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260702-0056')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-07-01'::text || ' - ' || '2026-08-01'::text, 1, 1437500, 1437500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5697 kWh', 1, 162500, 162500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #57: Meliana Tamara | K | 2026-02-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0057', stay.id, 'PAID'::"InvoiceStatus", '2026-01-10', '2026-03-01', '2026-02-02', '2026-02-02', '2026-02-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0057')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-10'::text || ' - ' || '2026-03-01'::text, 1, 1067500, 1067500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7718 kWh', 1, 432500, 432500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #58: Destarika Hasan | L | 2026-02-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260201-0058', stay.id, 'PAID'::"InvoiceStatus", '2026-01-01', '2026-03-01', '2026-02-02', '2026-02-02', '2026-02-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-02-02' AND stay."checkOutDate" >= '2026-02-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260201-0058')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-01'::text || ' - ' || '2026-03-01'::text, 1, 1435000, 1435000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5198 kWh', 1, 115000, 115000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #59: Dini | B | 2026-06-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0059', stay.id, 'PAID'::"InvoiceStatus", '2026-06-01', '2026-07-01', '2026-06-02', '2026-06-02', '2026-06-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0059')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-01'::text || ' - ' || '2026-07-01'::text, 1, 1285000, 1285000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 100 kWh', 1, 175000, 175000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 40000, 40000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #60: Lovandra | J | 2026-06-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0060', stay.id, 'PAID'::"InvoiceStatus", '2026-05-30', '2026-06-30', '2026-06-02', '2026-06-02', '2026-06-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0060')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-30'::text || ' - ' || '2026-06-30'::text, 1, 1260000, 1260000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3812 kWh', 1, 190000, 190000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #61: Gabriel Excelly Pranajaya | M | 2026-06-01 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0061', stay.id, 'PAID'::"InvoiceStatus", '2026-06-03', '2026-07-03', '2026-06-02', '2026-06-02', '2026-06-02', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0061')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-03'::text || ' - ' || '2026-07-03'::text, 1, 1102500, 1102500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 69 kWh', 1, 97500, 97500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #62: Destarika Hasan | L | 2026-06-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0062', stay.id, 'PAID'::"InvoiceStatus", '2026-06-01', '2026-07-01', '2026-06-02', '2026-06-02', '2026-06-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0062')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-01'::text || ' - ' || '2026-07-01'::text, 1, 1427500, 1427500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5602 kWh', 1, 172500, 172500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #63: Lovandra | J | 2026-07-02 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260702-0063', stay.id, 'PAID'::"InvoiceStatus", '2026-06-30', '2026-07-30', '2026-07-03', '2026-07-03', '2026-07-03', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-07-03' AND stay."checkOutDate" >= '2026-07-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260702-0063')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-30'::text || ' - ' || '2026-07-30'::text, 1, 1322500, 1322500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3893 kWh', 1, 127500, 127500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-07-03', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #64: Echa Qurniatunnafiah | F2 | 2026-02-20 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260220-0064', stay.id, 'PAID'::"InvoiceStatus", '2026-02-21', '2026-03-10', '2026-02-21', '2026-02-21', '2026-02-21', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3502016607060004'
    AND stay."checkInDate" <= '2026-02-21' AND stay."checkOutDate" >= '2026-02-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260220-0064')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-21'::text || ' - ' || '2026-03-10'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-21', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #65: Muhammad Alzidan Putra | A | 2026-02-20 | Rp1.400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260220-0065', stay.id, 'PAID'::"InvoiceStatus", '2026-02-21', '2026-03-05', '2026-02-21', '2026-02-21', '2026-02-21', 1400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3312252710070001'
    AND stay."checkInDate" <= '2026-02-21' AND stay."checkOutDate" >= '2026-02-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260220-0065')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-21'::text || ' - ' || '2026-03-05'::text, 1, 1350000, 1350000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-21', 1400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1400000);

-- Invoice #66: Ade Chandra | D | 2026-06-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0066', stay.id, 'PAID'::"InvoiceStatus", '2026-05-24', '2026-06-24', '2026-06-02', '2026-06-02', '2026-06-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0066')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-24'::text || ' - ' || '2026-06-24'::text, 1, 1435000, 1435000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5577 kWh', 1, 65000, 65000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #67: Miko Rakatama Adhi Winarto | C | 2026-06-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0067', stay.id, 'PAID'::"InvoiceStatus", '2026-05-28', '2026-06-28', '2026-06-02', '2026-06-02', '2026-06-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471051708970006'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0067')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-05-28'::text || ' - ' || '2026-06-28'::text, 1, 1197500, 1197500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 8017 kWh', 1, 402500, 402500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #68: Meliana Tamara | K | 2026-06-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260601-0068', stay.id, 'PAID'::"InvoiceStatus", '2026-06-10', '2026-07-10', '2026-06-02', '2026-06-02', '2026-06-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-06-02' AND stay."checkOutDate" >= '2026-06-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260601-0068')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-06-10'::text || ' - ' || '2026-07-10'::text, 1, 1105000, 1105000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 8457 kWh', 1, 395000, 395000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-06-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #69: Meliana Tamara | K | 2026-02-27 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260227-0069', stay.id, 'PAID'::"InvoiceStatus", '2026-03-10', '2026-04-10', '2026-02-28', '2026-02-28', '2026-02-28', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2026-02-28' AND stay."checkOutDate" >= '2026-02-28'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260227-0069')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-10'::text || ' - ' || '2026-04-10'::text, 1, 1217500, 1217500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7901 kWh', 1, 382500, 382500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-28', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #70: Ade Chandra | D | 2026-02-20 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260220-0070', stay.id, 'PAID'::"InvoiceStatus", '2026-02-21', '2026-03-24', '2026-02-21', '2026-02-21', '2026-02-21', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2026-02-21' AND stay."checkOutDate" >= '2026-02-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260220-0070')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-21'::text || ' - ' || '2026-03-24'::text, 1, 1480000, 1480000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5426 kWh', 1, 20000, 20000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-21', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #71: Miko Rakatama Adhi Winarto | C | 2026-05-07 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260507-0071', stay.id, 'PAID'::"InvoiceStatus", '2026-04-28', '2026-05-28', '2026-05-08', '2026-05-08', '2026-05-08', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471051708970006'
    AND stay."checkInDate" <= '2026-05-08' AND stay."checkOutDate" >= '2026-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260507-0071')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-04-28'::text || ' - ' || '2026-05-28'::text, 1, 1310000, 1310000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7826 kWh', 1, 290000, 290000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-05-08', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #72: Welly Tanoto | H | 2026-02-20 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260220-0072', stay.id, 'PAID'::"InvoiceStatus", '2026-02-21', '2026-03-10', '2026-02-21', '2026-02-21', '2026-02-21', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2026-02-21' AND stay."checkOutDate" >= '2026-02-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260220-0072')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-21'::text || ' - ' || '2026-03-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-21', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #73: Yoga Aprilian | B | 2026-02-20 | Rp230.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260220-0073', stay.id, 'PAID'::"InvoiceStatus", '2026-02-21', '2026-02-21', '2026-02-21', '2026-02-21', '2026-02-21', 230000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3522210411030001'
    AND stay."checkInDate" <= '2026-02-21' AND stay."checkOutDate" >= '2026-02-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260220-0073')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-21'::text || ' - ' || '2026-02-21'::text, 1, 230000, 230000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-21', 230000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 230000);

-- Invoice #74: Destarika Hasan | L | 2026-03-05 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0074', stay.id, 'PAID'::"InvoiceStatus", '2026-03-01', '2026-04-01', '2026-03-06', '2026-03-06', '2026-03-06', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0074')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-01'::text || ' - ' || '2026-04-01'::text, 1, 1485000, 1485000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5274 kWh', 1, 115000, 115000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #75: Yofi Nurkolifah | G | 2026-03-05 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0075', stay.id, 'PAID'::"InvoiceStatus", '2026-03-01', '2026-04-01', '2026-03-06', '2026-03-06', '2026-03-06', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0075')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-01'::text || ' - ' || '2026-04-01'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #76: YAN ATAURAHMAN | B | 2026-03-05 | Rp200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0076', stay.id, 'PAID'::"InvoiceStatus", '2026-03-06', '2026-03-06', '2026-03-06', '2026-03-06', '2026-03-06', 200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471042201780003'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0076')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-06'::text || ' - ' || '2026-03-06'::text, 1, 200000, 200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 200000);

-- Invoice #77: Theo Wijaya | I | 2026-03-05 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0077', stay.id, 'PAID'::"InvoiceStatus", '2026-01-05', '2026-03-06', '2026-03-06', '2026-03-06', '2026-03-06', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0077')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-05'::text || ' - ' || '2026-03-06'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #78: YAN ATAURAHMAN | B | 2026-02-27 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260227-0078', stay.id, 'PAID'::"InvoiceStatus", '2026-02-28', '2026-03-24', '2026-02-28', '2026-02-28', '2026-02-28', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '6471042201780003'
    AND stay."checkInDate" <= '2026-02-28' AND stay."checkOutDate" >= '2026-02-28'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260227-0078')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-02-28'::text || ' - ' || '2026-03-24'::text, 1, 1600000, 1600000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-02-28', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #79: Dini | C | 2026-03-05 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0079', stay.id, 'PAID'::"InvoiceStatus", '2026-01-01', '2026-03-06', '2026-03-06', '2026-03-06', '2026-03-06', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0079')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-01'::text || ' - ' || '2026-03-06'::text, 1, 1352500, 1352500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 69 kWh', 1, 97500, 97500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #80: Lovandra | J | 2026-03-05 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0080', stay.id, 'PAID'::"InvoiceStatus", '2026-01-28', '2026-03-30', '2026-03-06', '2026-03-06', '2026-03-06', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175070312930003'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0080')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-01-28'::text || ' - ' || '2026-03-30'::text, 1, 1297500, 1297500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3569 kWh', 1, 152500, 152500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #81: Gabriel Excelly Pranajaya | M | 2026-03-05 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20260305-0081', stay.id, 'PAID'::"InvoiceStatus", '2026-03-03', '2026-04-03', '2026-03-06', '2026-03-06', '2026-03-06', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2026-03-06' AND stay."checkOutDate" >= '2026-03-06'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20260305-0081')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2026-03-03'::text || ' - ' || '2026-04-03'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2026-03-06', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #82: Ruth Angeline Carolee | J | 2025-09-04 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250904-0082', stay.id, 'PAID'::"InvoiceStatus", '2025-09-07', '2025-10-07', '2025-09-05', '2025-09-05', '2025-09-05', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175056912980001'
    AND stay."checkInDate" <= '2025-09-05' AND stay."checkOutDate" >= '2025-09-05'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250904-0082')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-07'::text || ' - ' || '2025-10-07'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-05', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #83: Meliana Tamara | K | 2025-09-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250903-0083', stay.id, 'PAID'::"InvoiceStatus", '2025-09-10', '2025-10-10', '2025-09-04', '2025-09-04', '2025-09-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-09-04' AND stay."checkOutDate" >= '2025-09-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250903-0083')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-10'::text || ' - ' || '2025-10-10'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #84: Destarika Hasan | L | 2025-09-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250903-0084', stay.id, 'PAID'::"InvoiceStatus", '2025-09-01', '2025-10-01', '2025-09-04', '2025-09-04', '2025-09-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-09-04' AND stay."checkOutDate" >= '2025-09-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250903-0084')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-01'::text || ' - ' || '2025-10-01'::text, 1, 1447500, 1447500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4666 kWh', 1, 152500, 152500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #85: Gabriel Excelly Pranajaya | M | 2025-09-03 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250903-0085', stay.id, 'PAID'::"InvoiceStatus", '2025-09-03', '2025-10-03', '2025-09-04', '2025-09-04', '2025-09-04', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-09-04' AND stay."checkOutDate" >= '2025-09-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250903-0085')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-03'::text || ' - ' || '2025-10-03'::text, 1, 1097500, 1097500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 71 kWh', 1, 102500, 102500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-04', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #86: Theo Wijaya | I | 2025-10-31 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251031-0086', stay.id, 'PAID'::"InvoiceStatus", '2025-09-05', '2025-10-05', '2025-11-01', '2025-11-01', '2025-11-01', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-11-01' AND stay."checkOutDate" >= '2025-11-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251031-0086')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-05'::text || ' - ' || '2025-10-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-01', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #87: Ade Chandra | D | 2025-09-25 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250925-0087', stay.id, 'PAID'::"InvoiceStatus", '2025-09-24', '2025-10-24', '2025-09-26', '2025-09-26', '2025-09-26', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2025-09-26' AND stay."checkOutDate" >= '2025-09-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250925-0087')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-24'::text || ' - ' || '2025-10-24'::text, 1, 1482500, 1482500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5203 kWh', 1, 17500, 17500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-26', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #88: Ishaq | F1 | 2025-09-25 | Rp150.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250925-0088', stay.id, 'PAID'::"InvoiceStatus", '2025-09-26', '2025-09-27', '2025-09-26', '2025-09-26', '2025-09-26', 150000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '7322111909990005'
    AND stay."checkInDate" <= '2025-09-26' AND stay."checkOutDate" >= '2025-09-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250925-0088')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-26'::text || ' - ' || '2025-09-27'::text, 1, 150000, 150000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-26', 150000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 150000);

-- Invoice #89: Margareth - Ika Supartika | F1 | 2025-09-06 | Rp650.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250906-0089', stay.id, 'PAID'::"InvoiceStatus", '2025-09-09', '2025-09-23', '2025-09-07', '2025-09-07', '2025-09-07', 650000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3201375704950003'
    AND stay."checkInDate" <= '2025-09-07' AND stay."checkOutDate" >= '2025-09-07'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250906-0089')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-09'::text || ' - ' || '2025-09-23'::text, 1, 650000, 650000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-07', 650000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 650000);

-- Invoice #90: Yofi Nurkolifah | G | 2025-09-18 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250918-0090', stay.id, 'PAID'::"InvoiceStatus", '2025-09-19', '2025-10-19', '2025-09-19', '2025-09-19', '2025-09-19', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2025-09-19' AND stay."checkOutDate" >= '2025-09-19'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250918-0090')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-19'::text || ' - ' || '2025-10-19'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-19', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #91: Welly Tanoto | H | 2025-09-18 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250918-0091', stay.id, 'PAID'::"InvoiceStatus", '2025-09-10', '2025-10-10', '2025-09-19', '2025-09-19', '2025-09-19', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-09-19' AND stay."checkOutDate" >= '2025-09-19'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250918-0091')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-10'::text || ' - ' || '2025-10-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-19', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #92: Gabriel Excelly Pranajaya | M | 2025-09-30 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250930-0092', stay.id, 'PAID'::"InvoiceStatus", '2025-10-03', '2025-11-03', '2025-10-01', '2025-10-01', '2025-10-01', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-10-01' AND stay."checkOutDate" >= '2025-10-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250930-0092')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-03'::text || ' - ' || '2025-11-03'::text, 1, 1112500, 1112500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 65 kWh', 1, 87500, 87500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-01', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #93: Canon Daiyumi Aprian Domeng | A | 2025-09-25 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250925-0093', stay.id, 'PAID'::"InvoiceStatus", '2025-09-22', '2025-09-29', '2025-09-26', '2025-09-26', '2025-09-26', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '9109010704010004'
    AND stay."checkInDate" <= '2025-09-26' AND stay."checkOutDate" >= '2025-09-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250925-0093')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-22'::text || ' - ' || '2025-09-29'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-26', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #94: Sianly | A | 2025-09-06 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250906-0094', stay.id, 'PAID'::"InvoiceStatus", '2025-09-10', '2025-09-22', '2025-09-07', '2025-09-07', '2025-09-07', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173065206830006'
    AND stay."checkInDate" <= '2025-09-07' AND stay."checkOutDate" >= '2025-09-07'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250906-0094')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-10'::text || ' - ' || '2025-09-22'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-07', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #95: Pertiwi Lintang Kalas Wungu | B | 2025-09-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250903-0095', stay.id, 'PAID'::"InvoiceStatus", '2025-09-03', '2025-10-03', '2025-09-04', '2025-09-04', '2025-09-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-09-04' AND stay."checkOutDate" >= '2025-09-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250903-0095')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-03'::text || ' - ' || '2025-10-03'::text, 1, 1375000, 1375000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5626 kWh', 1, 225000, 225000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #96: Dini | C | 2025-09-30 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250930-0096', stay.id, 'PAID'::"InvoiceStatus", '2025-08-01', '2025-09-01', '2025-10-01', '2025-10-01', '2025-10-01', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-10-01' AND stay."checkOutDate" >= '2025-10-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250930-0096')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-01'::text || ' - ' || '2025-09-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-01', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #97: Juli Hendrawan | J | 2025-10-04 | Rp400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251004-0097', stay.id, 'PAID'::"InvoiceStatus", '2025-10-05', '2025-10-07', '2025-10-05', '2025-10-05', '2025-10-05', 400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3202402502820001'
    AND stay."checkInDate" <= '2025-10-05' AND stay."checkOutDate" >= '2025-10-05'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251004-0097')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-05'::text || ' - ' || '2025-10-07'::text, 1, 400000, 400000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-05', 400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 400000);

-- Invoice #98: Imam Wahyudi | J | 2025-10-02 | Rp150.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251002-0098', stay.id, 'PAID'::"InvoiceStatus", '2025-10-02', '2025-10-03', '2025-10-03', '2025-10-03', '2025-10-03', 150000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3506211007880001'
    AND stay."checkInDate" <= '2025-10-03' AND stay."checkOutDate" >= '2025-10-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251002-0098')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-02'::text || ' - ' || '2025-10-03'::text, 1, 150000, 150000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-03', 150000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 150000);

-- Invoice #99: Yevy Eko Nurcahyo | J | 2025-10-02 | Rp360.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251002-0099', stay.id, 'PAID'::"InvoiceStatus", '2025-10-03', '2025-10-05', '2025-10-03', '2025-10-03', '2025-10-03', 360000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3505210805900001'
    AND stay."checkInDate" <= '2025-10-03' AND stay."checkOutDate" >= '2025-10-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251002-0099')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-03'::text || ' - ' || '2025-10-05'::text, 1, 360000, 360000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-03', 360000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 360000);

-- Invoice #100: Meliana Tamara | K | 2025-10-25 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251025-0100', stay.id, 'PAID'::"InvoiceStatus", '2025-10-10', '2025-11-10', '2025-10-26', '2025-10-26', '2025-10-26', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-10-26' AND stay."checkOutDate" >= '2025-10-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251025-0100')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-10'::text || ' - ' || '2025-11-10'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-26', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #101: Destarika Hasan | L | 2025-10-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251002-0101', stay.id, 'PAID'::"InvoiceStatus", '2025-10-01', '2025-11-01', '2025-10-03', '2025-10-03', '2025-10-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-10-03' AND stay."checkOutDate" >= '2025-10-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251002-0101')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-01'::text || ' - ' || '2025-11-01'::text, 1, 1340000, 1340000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4800 kWh', 1, 260000, 260000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #102: Echa Qurniatunnafiah | F2 | 2025-10-10 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251010-0102', stay.id, 'PAID'::"InvoiceStatus", '2025-10-10', '2025-11-10', '2025-10-11', '2025-10-11', '2025-10-11', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3502016607060004'
    AND stay."checkInDate" <= '2025-10-11' AND stay."checkOutDate" >= '2025-10-11'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251010-0102')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-10'::text || ' - ' || '2025-11-10'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-11', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #103: Welly Tanoto | H | 2025-10-25 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251025-0103', stay.id, 'PAID'::"InvoiceStatus", '2025-10-10', '2025-11-10', '2025-10-26', '2025-10-26', '2025-10-26', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-10-26' AND stay."checkOutDate" >= '2025-10-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251025-0103')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-10'::text || ' - ' || '2025-11-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-26', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #104: Dhio Andralian Alfariski | J | 2025-10-10 | Rp180.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251010-0104', stay.id, 'PAID'::"InvoiceStatus", '2025-10-11', '2025-10-12', '2025-10-11', '2025-10-11', '2025-10-11', 180000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3503010104000005'
    AND stay."checkInDate" <= '2025-10-11' AND stay."checkOutDate" >= '2025-10-11'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251010-0104')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-11'::text || ' - ' || '2025-10-12'::text, 1, 180000, 180000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-11', 180000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 180000);

-- Invoice #105: Wiyadi | J | 2025-10-14 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251014-0105', stay.id, 'PAID'::"InvoiceStatus", '2025-10-14', '2025-11-14', '2025-10-15', '2025-10-15', '2025-10-15', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3171020401820003'
    AND stay."checkInDate" <= '2025-10-15' AND stay."checkOutDate" >= '2025-10-15'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251014-0105')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-14'::text || ' - ' || '2025-11-14'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-15', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #106: Pertiwi Lintang Kalas Wungu | B | 2025-10-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251001-0106', stay.id, 'PAID'::"InvoiceStatus", '2025-10-03', '2025-11-03', '2025-10-02', '2025-10-02', '2025-10-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-10-02' AND stay."checkOutDate" >= '2025-10-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251001-0106')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-03'::text || ' - ' || '2025-11-03'::text, 1, 1360000, 1360000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5752 kWh', 1, 240000, 240000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #107: Dini | C | 2025-11-02 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251102-0107', stay.id, 'PAID'::"InvoiceStatus", '2025-09-01', '2025-10-01', '2025-11-03', '2025-11-03', '2025-11-03', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-11-03' AND stay."checkOutDate" >= '2025-11-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251102-0107')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-09-01'::text || ' - ' || '2025-10-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-03', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #108: Ade Chandra | D | 2025-10-31 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251031-0108', stay.id, 'PAID'::"InvoiceStatus", '2025-10-24', '2025-11-24', '2025-11-01', '2025-11-01', '2025-11-01', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2025-11-01' AND stay."checkOutDate" >= '2025-11-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251031-0108')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-24'::text || ' - ' || '2025-11-24'::text, 1, 1462500, 1462500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5248 kWh', 1, 37500, 37500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-01', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #109: Bunga Allo Novalia | F1 | 2025-10-08 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251008-0109', stay.id, 'PAID'::"InvoiceStatus", '2025-10-04', '2025-11-04', '2025-10-09', '2025-10-09', '2025-10-09', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3271016808840018'
    AND stay."checkInDate" <= '2025-10-09' AND stay."checkOutDate" >= '2025-10-09'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251008-0109')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-04'::text || ' - ' || '2025-11-04'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-09', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #110: Viviana Arwanto | A | 2025-08-12 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250812-0110', stay.id, 'PAID'::"InvoiceStatus", '2025-08-08', '2025-09-08', '2025-08-13', '2025-08-13', '2025-08-13', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3577036311980002'
    AND stay."checkInDate" <= '2025-08-13' AND stay."checkOutDate" >= '2025-08-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250812-0110')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-08'::text || ' - ' || '2025-09-08'::text, 1, 1447500, 1447500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 10449 kWh', 1, 252500, 252500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-13', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #111: Juli Hendrawan | A | 2025-10-04 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251004-0111', stay.id, 'PAID'::"InvoiceStatus", '2025-10-05', '2025-10-09', '2025-10-05', '2025-10-05', '2025-10-05', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3202402502820001'
    AND stay."checkInDate" <= '2025-10-05' AND stay."checkOutDate" >= '2025-10-05'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251004-0111')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-05'::text || ' - ' || '2025-10-09'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-05', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #112: Ponadi | A | 2025-09-30 | Rp250.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250930-0112', stay.id, 'PAID'::"InvoiceStatus", '2025-10-01', '2025-10-02', '2025-10-01', '2025-10-01', '2025-10-01', 250000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3307072303810004'
    AND stay."checkInDate" <= '2025-10-01' AND stay."checkOutDate" >= '2025-10-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250930-0112')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-01'::text || ' - ' || '2025-10-02'::text, 1, 250000, 250000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-01', 250000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 250000);

-- Invoice #113: Yofi Nurkolifah | G | 2025-08-12 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250812-0113', stay.id, 'PAID'::"InvoiceStatus", '2025-08-19', '2025-09-19', '2025-08-13', '2025-08-13', '2025-08-13', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2025-08-13' AND stay."checkOutDate" >= '2025-08-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250812-0113')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-19'::text || ' - ' || '2025-09-19'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-13', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #114: INDUNG TRI HARIARTO | G | 2025-08-08 | Rp120.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250808-0114', stay.id, 'PAID'::"InvoiceStatus", '2025-08-09', '2025-08-10', '2025-08-09', '2025-08-09', '2025-08-09', 120000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3311042711950002'
    AND stay."checkInDate" <= '2025-08-09' AND stay."checkOutDate" >= '2025-08-09'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250808-0114')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-09'::text || ' - ' || '2025-08-10'::text, 1, 120000, 120000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-09', 120000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 120000);

-- Invoice #115: Mufsona | F1 | 2025-08-14 | Rp2.400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250814-0115', stay.id, 'PAID'::"InvoiceStatus", '2025-08-15', '2025-08-29', '2025-08-15', '2025-08-15', '2025-08-15', 2400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3515174101920004'
    AND stay."checkInDate" <= '2025-08-15' AND stay."checkOutDate" >= '2025-08-15'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250814-0115')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-15'::text || ' - ' || '2025-08-29'::text, 1, 2400000, 2400000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-15', 2400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 2400000);

-- Invoice #116: Muhamad Fariz Al-Hafiz | G | 2025-08-12 | Rp300.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250812-0116', stay.id, 'PAID'::"InvoiceStatus", '2025-08-12', '2025-08-14', '2025-08-13', '2025-08-13', '2025-08-13', 300000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3175050409030006'
    AND stay."checkInDate" <= '2025-08-13' AND stay."checkOutDate" >= '2025-08-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250812-0116')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-12'::text || ' - ' || '2025-08-14'::text, 1, 300000, 300000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-13', 300000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 300000);

-- Invoice #117: Welly Tanoto | H | 2025-08-12 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250812-0117', stay.id, 'PAID'::"InvoiceStatus", '2025-08-10', '2025-09-10', '2025-08-13', '2025-08-13', '2025-08-13', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-08-13' AND stay."checkOutDate" >= '2025-08-13'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250812-0117')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-10'::text || ' - ' || '2025-09-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-13', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #118: Mufsona | F1 | 2025-08-25 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250825-0118', stay.id, 'PAID'::"InvoiceStatus", '2025-08-29', '2025-09-07', '2025-08-26', '2025-08-26', '2025-08-26', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3515174101920004'
    AND stay."checkInDate" <= '2025-08-26' AND stay."checkOutDate" >= '2025-08-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250825-0118')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-29'::text || ' - ' || '2025-09-07'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-26', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #119: Ade Chandra | D | 2025-08-21 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250821-0119', stay.id, 'PAID'::"InvoiceStatus", '2025-08-24', '2025-09-24', '2025-08-22', '2025-08-22', '2025-08-22', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2025-08-22' AND stay."checkOutDate" >= '2025-08-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250821-0119')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-24'::text || ' - ' || '2025-09-24'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-22', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #120: Dini | C | 2025-08-28 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250828-0120', stay.id, 'PAID'::"InvoiceStatus", '2025-12-01', '2025-08-29', '2025-08-29', '2025-08-29', '2025-08-29', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-08-29' AND stay."checkOutDate" >= '2025-08-29'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250828-0120')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-01'::text || ' - ' || '2025-08-29'::text, 1, 1395000, 1395000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7129 kWh', 1, 55000, 55000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-29', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #121: Pertiwi Lintang Kalas Wungu | B | 2025-07-31 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250731-0121', stay.id, 'PAID'::"InvoiceStatus", '2025-08-03', '2025-09-03', '2025-08-01', '2025-08-01', '2025-08-01', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-08-01' AND stay."checkOutDate" >= '2025-08-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250731-0121')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-03'::text || ' - ' || '2025-09-03'::text, 1, 1460000, 1460000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5506 kWh', 1, 140000, 140000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-01', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #122: Thea & Felix | J | 2025-07-31 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250731-0122', stay.id, 'PAID'::"InvoiceStatus", '2025-08-02', '2025-09-02', '2025-08-01', '2025-08-01', '2025-08-01', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3404120906990009'
    AND stay."checkInDate" <= '2025-08-01' AND stay."checkOutDate" >= '2025-08-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250731-0122')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-02'::text || ' - ' || '2025-09-02'::text, 1, 1472500, 1472500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3178 kWh', 1, 27500, 27500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-01', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #123: Imam Wahyudi | J | 2025-08-26 | Rp500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250826-0123', stay.id, 'PAID'::"InvoiceStatus", '2025-08-27', '2025-08-29', '2025-08-27', '2025-08-27', '2025-08-27', 500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3506211007880001'
    AND stay."checkInDate" <= '2025-08-27' AND stay."checkOutDate" >= '2025-08-27'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250826-0123')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-27'::text || ' - ' || '2025-08-29'::text, 1, 500000, 500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-27', 500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 500000);

-- Invoice #124: Imam Wahyudi | J | 2025-08-28 | Rp500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250828-0124', stay.id, 'PAID'::"InvoiceStatus", '2025-08-29', '2025-08-31', '2025-08-29', '2025-08-29', '2025-08-29', 500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3506211007880001'
    AND stay."checkInDate" <= '2025-08-29' AND stay."checkOutDate" >= '2025-08-29'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250828-0124')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-29'::text || ' - ' || '2025-08-31'::text, 1, 500000, 500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-29', 500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 500000);

-- Invoice #125: Imam Wahyudi | J | 2025-09-03 | Rp250.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250903-0125', stay.id, 'PAID'::"InvoiceStatus", '2025-08-31', '2025-09-01', '2025-09-04', '2025-09-04', '2025-09-04', 250000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3506211007880001'
    AND stay."checkInDate" <= '2025-09-04' AND stay."checkOutDate" >= '2025-09-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250903-0125')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-31'::text || ' - ' || '2025-09-01'::text, 1, 250000, 250000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-04', 250000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 250000);

-- Invoice #126: Theo Wijaya | I | 2025-09-25 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250925-0126', stay.id, 'PAID'::"InvoiceStatus", '2025-08-05', '2025-09-05', '2025-09-26', '2025-09-26', '2025-09-26', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-09-26' AND stay."checkOutDate" >= '2025-09-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250925-0126')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-05'::text || ' - ' || '2025-09-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-09-26', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #127: Dini | C | 2025-12-02 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0127', stay.id, 'PAID'::"InvoiceStatus", '2025-11-01', '2025-12-01', '2025-12-03', '2025-12-03', '2025-12-03', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0127')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-01'::text || ' - ' || '2025-12-01'::text, 1, 1392500, 1392500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 45 kWh', 1, 37500, 37500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 20000, 20000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #128: Meliana Tamara | K | 2025-07-29 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250729-0128', stay.id, 'PAID'::"InvoiceStatus", '2025-08-10', '2025-09-10', '2025-07-30', '2025-07-30', '2025-07-30', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-07-30' AND stay."checkOutDate" >= '2025-07-30'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250729-0128')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-10'::text || ' - ' || '2025-09-10'::text, 1, 1107500, 1107500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 6555 kWh', 1, 392500, 392500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-30', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #129: Destarika Hasan | L | 2025-08-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250803-0129', stay.id, 'PAID'::"InvoiceStatus", '2025-08-01', '2025-09-01', '2025-08-04', '2025-08-04', '2025-08-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-08-04' AND stay."checkOutDate" >= '2025-08-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250803-0129')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-01'::text || ' - ' || '2025-09-01'::text, 1, 1462500, 1462500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4575 kWh', 1, 137500, 137500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #130: Gabriel Excelly Pranajaya | M | 2025-07-31 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250731-0130', stay.id, 'PAID'::"InvoiceStatus", '2025-08-03', '2025-09-03', '2025-08-01', '2025-08-01', '2025-08-01', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-08-01' AND stay."checkOutDate" >= '2025-08-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250731-0130')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-08-03'::text || ' - ' || '2025-09-03'::text, 1, 1110000, 1110000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 66 kWh', 1, 90000, 90000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-01', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #131: Sakura Naeila Naikesyah | F3 | 2025-12-16 | Rp120.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251216-0131', stay.id, 'PAID'::"InvoiceStatus", '2025-12-06', '2025-12-07', '2025-12-17', '2025-12-17', '2025-12-17', 120000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F3'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275067010050004'
    AND stay."checkInDate" <= '2025-12-17' AND stay."checkOutDate" >= '2025-12-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251216-0131')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-06'::text || ' - ' || '2025-12-07'::text, 1, 120000, 120000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-17', 120000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 120000);

-- Invoice #132: Echa Qurniatunnafiah | F2 | 2025-12-16 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251216-0132', stay.id, 'PAID'::"InvoiceStatus", '2025-12-17', '2025-12-17', '2025-12-17', '2025-12-17', '2025-12-17', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3502016607060004'
    AND stay."checkInDate" <= '2025-12-17' AND stay."checkOutDate" >= '2025-12-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251216-0132')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-17'::text || ' - ' || '2025-12-17'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-17', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #133: Bunga Allo Novalia | F1 | 2025-12-02 | Rp250.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0133', stay.id, 'PAID'::"InvoiceStatus", '2025-12-04', '2025-12-11', '2025-12-03', '2025-12-03', '2025-12-03', 250000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3271016808840018'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0133')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-04'::text || ' - ' || '2025-12-11'::text, 1, 250000, 250000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 250000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 250000);

-- Invoice #134: Ade Chandra | D | 2025-12-30 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251230-0134', stay.id, 'PAID'::"InvoiceStatus", '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2025-12-31' AND stay."checkOutDate" >= '2025-12-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251230-0134')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-31'::text || ' - ' || '2025-12-31'::text, 1, 1457500, 1457500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5344 kWh', 1, 42500, 42500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-31', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #135: Destarika Hasan | L | 2025-12-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0135', stay.id, 'PAID'::"InvoiceStatus", '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0135')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-03'::text || ' - ' || '2025-12-03'::text, 1, 1480000, 1480000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5048 kWh', 1, 120000, 120000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #136: Meliana Tamara | K | 2025-12-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0136', stay.id, 'PAID'::"InvoiceStatus", '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0136')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-03'::text || ' - ' || '2025-12-03'::text, 1, 1117500, 1117500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7329 kWh', 1, 382500, 382500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #137: Theo Wijaya | I | 2025-12-30 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251230-0137', stay.id, 'PAID'::"InvoiceStatus", '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', '2025-12-31', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-12-31' AND stay."checkOutDate" >= '2025-12-31'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251230-0137')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-31'::text || ' - ' || '2025-12-31'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-31', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #138: Welly Tanoto | H | 2025-12-16 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251216-0138', stay.id, 'PAID'::"InvoiceStatus", '2025-12-17', '2025-12-17', '2025-12-17', '2025-12-17', '2025-12-17', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-12-17' AND stay."checkOutDate" >= '2025-12-17'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251216-0138')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-17'::text || ' - ' || '2025-12-17'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-17', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #139: Yofi Nurkolifah | G | 2025-12-02 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0139', stay.id, 'PAID'::"InvoiceStatus", '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3519122204030003'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0139')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-03'::text || ' - ' || '2025-12-03'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #140: Thea & Laurentius Andrian | J | 2025-07-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0140', stay.id, 'PAID'::"InvoiceStatus", '2025-07-02', '2025-08-02', '2025-07-02', '2025-07-02', '2025-07-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3404120906990009'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0140')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-02'::text || ' - ' || '2025-08-02'::text, 1, 1497500, 1497500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3137 kWh', 1, 2500, 2500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #141: Meliana Tamara | K | 2025-07-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0141', stay.id, 'PAID'::"InvoiceStatus", '2025-07-10', '2025-08-10', '2025-07-02', '2025-07-02', '2025-07-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0141')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-10'::text || ' - ' || '2025-08-10'::text, 1, 1210000, 1210000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 6368 kWh', 1, 290000, 290000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #142: Destarika Hasan | L | 2025-07-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0142', stay.id, 'PAID'::"InvoiceStatus", '2025-07-01', '2025-08-01', '2025-07-02', '2025-07-02', '2025-07-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0142')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-01'::text || ' - ' || '2025-08-01'::text, 1, 1297500, 1297500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4490 kWh', 1, 252500, 252500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #143: Gabriel Excelly Pranajaya | M | 2025-12-02 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251202-0143', stay.id, 'PAID'::"InvoiceStatus", '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', '2025-12-03', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-12-03' AND stay."checkOutDate" >= '2025-12-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251202-0143')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-12-03'::text || ' - ' || '2025-12-03'::text, 1, 1140000, 1140000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 54 kWh', 1, 60000, 60000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-12-03', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #144: Gabriel Excelly Pranajaya | M | 2025-07-01 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0144', stay.id, 'PAID'::"InvoiceStatus", '2025-07-03', '2025-08-03', '2025-07-02', '2025-07-02', '2025-07-02', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0144')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-03'::text || ' - ' || '2025-08-03'::text, 1, 1167500, 1167500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 43 kWh', 1, 32500, 32500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #145: Dini | C | 2025-07-31 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250731-0145', stay.id, 'PAID'::"InvoiceStatus", '2025-07-01', '2025-08-01', '2025-08-01', '2025-08-01', '2025-08-01', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-08-01' AND stay."checkOutDate" >= '2025-08-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250731-0145')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-01'::text || ' - ' || '2025-08-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-01', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #146: Ahmad Adiwitoko | G | 2025-07-01 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0146', stay.id, 'PAID'::"InvoiceStatus", '2025-07-06', '2025-08-06', '2025-07-02', '2025-07-02', '2025-07-02', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3320150308880001'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0146')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-06'::text || ' - ' || '2025-08-06'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #147: Welly Tanoto | H | 2025-07-11 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250711-0147', stay.id, 'PAID'::"InvoiceStatus", '2025-07-10', '2025-08-10', '2025-07-12', '2025-07-12', '2025-07-12', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-07-12' AND stay."checkOutDate" >= '2025-07-12'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250711-0147')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-10'::text || ' - ' || '2025-08-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-12', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #148: Theo Wijaya | I | 2025-08-03 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250803-0148', stay.id, 'PAID'::"InvoiceStatus", '2025-07-05', '2025-08-05', '2025-08-04', '2025-08-04', '2025-08-04', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-08-04' AND stay."checkOutDate" >= '2025-08-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250803-0148')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-05'::text || ' - ' || '2025-08-05'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-08-04', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #149: Pertiwi Lintang Kalas Wungu | B | 2025-06-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0149', stay.id, 'PAID'::"InvoiceStatus", '2025-06-03', '2025-07-03', '2025-06-04', '2025-06-04', '2025-06-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0149')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-03'::text || ' - ' || '2025-07-03'::text, 1, 1430000, 1430000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5324 kWh', 1, 170000, 170000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #150: Viviana Arwanto | A | 2025-06-08 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250608-0150', stay.id, 'PAID'::"InvoiceStatus", '2025-06-08', '2025-07-08', '2025-06-09', '2025-06-09', '2025-06-09', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3577036311980002'
    AND stay."checkInDate" <= '2025-06-09' AND stay."checkOutDate" >= '2025-06-09'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250608-0150')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-08'::text || ' - ' || '2025-07-08'::text, 1, 1700000, 1700000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-09', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #151: Ireane Cahyadi | A | 2025-06-03 | Rp400.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0151', stay.id, 'PAID'::"InvoiceStatus", '2025-06-08', '2025-06-10', '2025-06-04', '2025-06-04', '2025-06-04', 400000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3273115711750010'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0151')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-08'::text || ' - ' || '2025-06-10'::text, 1, 400000, 400000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 400000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 400000);

-- Invoice #152: Viviana Arwanto | A | 2025-07-11 | Rp1.700.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250711-0152', stay.id, 'PAID'::"InvoiceStatus", '2025-07-08', '2025-08-08', '2025-07-12', '2025-07-12', '2025-07-12', 1700000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3577036311980002'
    AND stay."checkInDate" <= '2025-07-12' AND stay."checkOutDate" >= '2025-07-12'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250711-0152')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-08'::text || ' - ' || '2025-08-08'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 10318 kWh', 1, 200000, 200000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-12', 1700000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1700000);

-- Invoice #153: Pertiwi Lintang Kalas Wungu | B | 2025-07-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250701-0153', stay.id, 'PAID'::"InvoiceStatus", '2025-07-03', '2025-08-03', '2025-07-02', '2025-07-02', '2025-07-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-07-02' AND stay."checkOutDate" >= '2025-07-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250701-0153')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-07-03'::text || ' - ' || '2025-08-03'::text, 1, 1435000, 1435000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5420 kWh', 1, 165000, 165000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #154: Theo Wijaya | I | 2025-06-23 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250623-0154', stay.id, 'PAID'::"InvoiceStatus", '2025-06-05', '2025-07-05', '2025-06-24', '2025-06-24', '2025-06-24', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-06-24' AND stay."checkOutDate" >= '2025-06-24'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250623-0154')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-05'::text || ' - ' || '2025-07-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-24', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #155: Welly Tanoto | H | 2025-06-08 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250608-0155', stay.id, 'PAID'::"InvoiceStatus", '2025-06-10', '2025-07-10', '2025-06-09', '2025-06-09', '2025-06-09', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-06-09' AND stay."checkOutDate" >= '2025-06-09'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250608-0155')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-10'::text || ' - ' || '2025-07-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-09', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #156: Ahmad Rosaid | G | 2025-06-03 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0156', stay.id, 'PAID'::"InvoiceStatus", '2025-06-06', '2025-07-06', '2025-06-04', '2025-06-04', '2025-06-04', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3320072803840005'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0156')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-06'::text || ' - ' || '2025-07-06'::text, 1, 800000, 800000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #157: Muhammad Efendi | D | 2025-06-23 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250623-0157', stay.id, 'PAID'::"InvoiceStatus", '2025-06-18', '2025-07-18', '2025-06-24', '2025-06-24', '2025-06-24', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3316041812950001'
    AND stay."checkInDate" <= '2025-06-24' AND stay."checkOutDate" >= '2025-06-24'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250623-0157')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-18'::text || ' - ' || '2025-07-18'::text, 1, 1500000, 1500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-24', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #158: Dini | C | 2025-07-11 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250711-0158', stay.id, 'PAID'::"InvoiceStatus", '2025-06-01', '2025-07-01', '2025-07-12', '2025-07-12', '2025-07-12', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-07-12' AND stay."checkOutDate" >= '2025-07-12'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250711-0158')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-01'::text || ' - ' || '2025-07-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-07-12', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #159: Trisha Larasati Putri | A | 2025-05-01 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0159', stay.id, 'PAID'::"InvoiceStatus", '2025-05-07', '2025-05-21', '2025-05-02', '2025-05-02', '2025-05-02', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'A'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3671105209040002'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0159')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-07'::text || ' - ' || '2025-05-21'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #160: Meliana Tamara | K | 2025-06-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0160', stay.id, 'PAID'::"InvoiceStatus", '2025-06-10', '2025-07-10', '2025-06-04', '2025-06-04', '2025-06-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0160')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-10'::text || ' - ' || '2025-07-10'::text, 1, 1180000, 1180000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 6222 kWh', 1, 420000, 420000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #161: Destarika Hasan | L | 2025-06-03 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0161', stay.id, 'PAID'::"InvoiceStatus", '2025-06-01', '2025-07-01', '2025-06-04', '2025-06-04', '2025-06-04', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0161')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-01'::text || ' - ' || '2025-07-01'::text, 1, 1417500, 1417500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4359 kWh', 1, 182500, 182500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #162: Thea & Laurentius Andrian | J | 2025-06-03 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0162', stay.id, 'PAID'::"InvoiceStatus", '2025-06-02', '2025-07-02', '2025-06-04', '2025-06-04', '2025-06-04', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3404120906990009'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0162')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-02'::text || ' - ' || '2025-07-02'::text, 1, 1475000, 1475000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3106 kWh', 1, 25000, 25000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #163: Gabriel Excelly Pranajaya | M | 2025-06-03 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250603-0163', stay.id, 'PAID'::"InvoiceStatus", '2025-06-03', '2025-07-03', '2025-06-04', '2025-06-04', '2025-06-04', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-06-04' AND stay."checkOutDate" >= '2025-06-04'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250603-0163')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-06-03'::text || ' - ' || '2025-07-03'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-04', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #164: Agus Winarso | D | 2025-05-07 | Rp1.300.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250507-0164', stay.id, 'PAID'::"InvoiceStatus", '2025-05-07', '2025-05-21', '2025-05-08', '2025-05-08', '2025-05-08', 1300000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3324040508870006'
    AND stay."checkInDate" <= '2025-05-08' AND stay."checkOutDate" >= '2025-05-08'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250507-0164')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-07'::text || ' - ' || '2025-05-21'::text, 1, 1300000, 1300000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-08', 1300000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1300000);

-- Invoice #165: Agus Winarso | D | 2025-05-20 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250520-0165', stay.id, 'PAID'::"InvoiceStatus", '2025-05-21', '2025-06-11', '2025-05-21', '2025-05-21', '2025-05-21', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3324040508870006'
    AND stay."checkInDate" <= '2025-05-21' AND stay."checkOutDate" >= '2025-05-21'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250520-0165')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-21'::text || ' - ' || '2025-06-11'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-21', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #166: Dini | C | 2025-06-08 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250608-0166', stay.id, 'PAID'::"InvoiceStatus", '2025-05-01', '2025-06-01', '2025-06-09', '2025-06-09', '2025-06-09', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-06-09' AND stay."checkOutDate" >= '2025-06-09'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250608-0166')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-01'::text || ' - ' || '2025-06-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-06-09', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #167: Gabriel Excelly Pranajaya | M | 2025-05-01 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0167', stay.id, 'PAID'::"InvoiceStatus", '2025-05-03', '2025-06-03', '2025-05-02', '2025-05-02', '2025-05-02', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0167')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-03'::text || ' - ' || '2025-06-03'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #168: Pertiwi Lintang Kalas Wungu | B | 2025-05-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0168', stay.id, 'PAID'::"InvoiceStatus", '2025-05-03', '2025-06-03', '2025-05-02', '2025-05-02', '2025-05-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'B'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578166902960003'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0168')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-03'::text || ' - ' || '2025-06-03'::text, 1, 1395000, 1395000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5226 kWh', 1, 205000, 205000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #169: Welly Tanoto | H | 2025-05-01 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0169', stay.id, 'PAID'::"InvoiceStatus", '2025-05-10', '2025-06-10', '2025-05-02', '2025-05-02', '2025-05-02', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0169')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-10'::text || ' - ' || '2025-06-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #170: Theo Wijaya | I | 2025-05-01 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0170', stay.id, 'PAID'::"InvoiceStatus", '2025-05-05', '2025-06-05', '2025-05-02', '2025-05-02', '2025-05-02', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'I'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3571021308860003'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0170')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-05'::text || ' - ' || '2025-06-05'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #171: Thea & Laurentius Andrian | J | 2025-05-01 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0171', stay.id, 'PAID'::"InvoiceStatus", '2025-05-02', '2025-06-02', '2025-05-02', '2025-05-02', '2025-05-02', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3404120906990009'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0171')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-02'::text || ' - ' || '2025-06-02'::text, 1, 1467500, 1467500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 3066 kWh', 1, 32500, 32500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #172: Meliana Tamara | K | 2025-05-06 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250506-0172', stay.id, 'PAID'::"InvoiceStatus", '2025-05-10', '2025-06-10', '2025-05-07', '2025-05-07', '2025-05-07', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-05-07' AND stay."checkOutDate" >= '2025-05-07'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250506-0172')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-10'::text || ' - ' || '2025-06-10'::text, 1, 1002500, 1002500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 6024 kWh', 1, 497500, 497500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-07', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #173: Destarika Hasan | L | 2025-05-01 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250501-0173', stay.id, 'PAID'::"InvoiceStatus", '2025-05-01', '2025-06-01', '2025-05-02', '2025-05-02', '2025-05-02', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-05-02' AND stay."checkOutDate" >= '2025-05-02'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250501-0173')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-01'::text || ' - ' || '2025-06-01'::text, 1, 1392500, 1392500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4256 kWh', 1, 207500, 207500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-02', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #174: Ahmad Rosaid | G | 2025-05-06 | Rp950.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250506-0174', stay.id, 'PAID'::"InvoiceStatus", '2025-05-06', '2025-06-06', '2025-05-07', '2025-05-07', '2025-05-07', 950000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3320072803840005'
    AND stay."checkInDate" <= '2025-05-07' AND stay."checkOutDate" >= '2025-05-07'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250506-0174')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-05-06'::text || ' - ' || '2025-06-06'::text, 1, 950000, 950000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-05-07', 950000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 950000);

-- Invoice #175: Ade Chandra | D | 2025-11-21 | Rp1.500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251121-0175', stay.id, 'PAID'::"InvoiceStatus", '2025-11-24', '2025-12-24', '2025-11-22', '2025-11-22', '2025-11-22', 1500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'D'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3173052309720009'
    AND stay."checkInDate" <= '2025-11-22' AND stay."checkOutDate" >= '2025-11-22'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251121-0175')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-24'::text || ' - ' || '2025-12-24'::text, 1, 1452500, 1452500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 5297 kWh', 1, 47500, 47500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-22', 1500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1500000);

-- Invoice #176: Dini | C | 2025-11-13 | Rp1.100.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251113-0176', stay.id, 'PAID'::"InvoiceStatus", '2025-10-01', '2025-11-01', '2025-11-14', '2025-11-14', '2025-11-14', 1100000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-11-14' AND stay."checkOutDate" >= '2025-11-14'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251113-0176')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-10-01'::text || ' - ' || '2025-11-01'::text, 1, 1100000, 1100000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-14', 1100000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1100000);

-- Invoice #177: Dini | C | 2025-09-30 | Rp1.450.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20250930-0177', stay.id, 'PAID'::"InvoiceStatus", '2024-11-01', '2024-12-01', '2025-10-01', '2025-10-01', '2025-10-01', 1450000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'C'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3275085012800021'
    AND stay."checkInDate" <= '2025-10-01' AND stay."checkOutDate" >= '2025-10-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20250930-0177')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2024-11-01'::text || ' - ' || '2024-12-01'::text, 1, 1399935, 1399935, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik ', 1, 65, 65, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-01', 1450000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1450000);

-- Invoice #178: Welly Tanoto | H | 2025-11-09 | Rp800.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251109-0178', stay.id, 'PAID'::"InvoiceStatus", '2025-11-10', '2025-12-10', '2025-11-10', '2025-11-10', '2025-11-10', 800000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'H'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578070811730004'
    AND stay."checkInDate" <= '2025-11-10' AND stay."checkOutDate" >= '2025-11-10'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251109-0178')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-10'::text || ' - ' || '2025-12-10'::text, 1, 750000, 750000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-10', 800000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 800000);

-- Invoice #179: Suryo Baskoro | G | 2025-11-18 | Rp500.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251118-0179', stay.id, 'PAID'::"InvoiceStatus", '2025-11-18', '2025-12-02', '2025-11-19', '2025-11-19', '2025-11-19', 500000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'G'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3318062111950001'
    AND stay."checkInDate" <= '2025-11-19' AND stay."checkOutDate" >= '2025-11-19'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251118-0179')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-18'::text || ' - ' || '2025-12-02'::text, 1, 500000, 500000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-19', 500000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 500000);

-- Invoice #180: Echa Qurniatunnafiah | F2 | 2025-11-09 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251109-0180', stay.id, 'PAID'::"InvoiceStatus", '2025-11-10', '2025-12-10', '2025-11-10', '2025-11-10', '2025-11-10', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F2'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3502016607060004'
    AND stay."checkInDate" <= '2025-11-10' AND stay."checkOutDate" >= '2025-11-10'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251109-0180')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-10'::text || ' - ' || '2025-12-10'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-10', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #181: Bunga Allo Novalia | F1 | 2025-10-31 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251031-0181', stay.id, 'PAID'::"InvoiceStatus", '2025-11-04', '2025-12-04', '2025-11-01', '2025-11-01', '2025-11-01', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F1'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3271016808840018'
    AND stay."checkInDate" <= '2025-11-01' AND stay."checkOutDate" >= '2025-11-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251031-0181')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-04'::text || ' - ' || '2025-12-04'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-01', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #182: Nunuk Istiyowati | F3 | 2025-11-13 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251113-0182', stay.id, 'PAID'::"InvoiceStatus", '2025-11-11', '2025-11-25', '2025-11-14', '2025-11-14', '2025-11-14', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'F3'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578295707870001'
    AND stay."checkInDate" <= '2025-11-14' AND stay."checkOutDate" >= '2025-11-14'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251113-0182')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-11'::text || ' - ' || '2025-11-25'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-14', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);

-- Invoice #183: Gabriel Excelly Pranajaya | M | 2025-10-31 | Rp1.200.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251031-0183', stay.id, 'PAID'::"InvoiceStatus", '2025-11-03', '2025-12-03', '2025-11-01', '2025-11-01', '2025-11-01', 1200000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'M'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3511115908030001'
    AND stay."checkInDate" <= '2025-11-01' AND stay."checkOutDate" >= '2025-11-01'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251031-0183')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-03'::text || ' - ' || '2025-12-03'::text, 1, 1107500, 1107500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 67 kWh', 1, 92500, 92500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-01', 1200000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1200000);

-- Invoice #184: Destarika Hasan | L | 2025-11-02 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251102-0184', stay.id, 'PAID'::"InvoiceStatus", '2025-11-01', '2025-12-01', '2025-11-03', '2025-11-03', '2025-11-03', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'L'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '1671065812020008'
    AND stay."checkInDate" <= '2025-11-03' AND stay."checkOutDate" >= '2025-11-03'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251102-0184')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-01'::text || ' - ' || '2025-12-01'::text, 1, 1200000, 1200000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 4970 kWh', 1, 350000, 350000, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 50000, 50000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-03', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #185: Meliana Tamara | K | 2025-10-25 | Rp1.600.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251025-0185', stay.id, 'PAID'::"InvoiceStatus", '2025-11-10', '2025-12-10', '2025-10-26', '2025-10-26', '2025-10-26', 1600000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'K'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3578125102000002'
    AND stay."checkInDate" <= '2025-10-26' AND stay."checkOutDate" >= '2025-10-26'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251025-0185')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-10'::text || ' - ' || '2025-12-10'::text, 1, 1077500, 1077500, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik 7146 kWh', 1, 422500, 422500, 2
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, 100000, 100000, 3
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-10-26', 1600000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1600000);

-- Invoice #186: Saferi Putra Samudra | J | 2025-11-18 | Rp1.000.000
WITH inv_ins AS (
  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")
  SELECT 'HIST-20251118-0186', stay.id, 'PAID'::"InvoiceStatus", '2025-11-18', '2025-12-18', '2025-11-19', '2025-11-19', '2025-11-19', 1000000, NOW(), NOW()
  FROM "Tenant" tenant
  JOIN "Room" room ON room.code = 'J'
  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id
  WHERE tenant."identityNumber" = '3514212109050001'
    AND stay."checkInDate" <= '2025-11-19' AND stay."checkOutDate" >= '2025-11-19'
    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = 'HIST-20251118-0186')
  ORDER BY stay."checkInDate" DESC LIMIT 1
  RETURNING id
)
INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")
SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || '2025-11-18'::text || ' - ' || '2025-12-18'::text, 1, 1000000, 1000000, 1
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");
INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")
SELECT inv_ins.id, '2025-11-19', 1000000, 'CASH'::"PaymentMethod", NOW(), NOW()
FROM inv_ins
WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = 1000000);


-- ============================================================================
-- D. PENGELUARAN OPERASIONAL BULANAN (Mei-Des 2025)
-- ============================================================================

-- Expense #1: Mei 2025 | Wifi / Indihome | Rp272.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome - Indihome Mei', 272500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-05-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 272500
    AND ex.description = 'Wifi / Indihome - Indihome Mei'
);

-- Expense #2: Mei 2025 | Listrik / Token A | Rp1.603.250
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A - Tgl 3/m', 1603250, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-05-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 1603250
    AND ex.description = 'Listrik / Token A - Tgl 3/m'
);

-- Expense #3: Mei 2025 | Listrik / Token A | Rp1.003.250
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A - Tgl 26/mei', 1003250, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-05-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 1003250
    AND ex.description = 'Listrik / Token A - Tgl 26/mei'
);

-- Expense #4: Juni 2025 | Wifi / Indihome | Rp262.150
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome - Indihome Juni', 262150, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 262150
    AND ex.description = 'Wifi / Indihome - Indihome Juni'
);

-- Expense #5: Juni 2025 | Listrik / Token A | Rp489.663
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A', 489663, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 489663
    AND ex.description = 'Listrik / Token A'
);

-- Expense #6: Juni 2025 | Cuci AC / Kebersihan | Rp250.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'CLEANING'::"ExpenseCategory", 'Cuci AC / Kebersihan - Estimasi dari catatan (10 25003)', 250000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex.category = 'CLEANING'::"ExpenseCategory"
    AND ex."amountRupiah" = 250000
    AND ex.description = 'Cuci AC / Kebersihan - Estimasi dari catatan (10 25003)'
);

-- Expense #7: Juli 2025 | Wifi / Indihome | Rp257.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome - Indihome Juli', 257500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 257500
    AND ex.description = 'Wifi / Indihome - Indihome Juli'
);

-- Expense #8: Juli 2025 | Listrik / Token A | Rp1.003.507
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A', 1003507, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 1003507
    AND ex.description = 'Listrik / Token A'
);

-- Expense #9: Juli 2025 | Listrik / Token B | Rp502.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token B - 18 Juli', 502500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 502500
    AND ex.description = 'Listrik / Token B - 18 Juli'
);

-- Expense #10: Agustus 2025 | Wifi / Indihome | Rp262.153
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome - Indihome Agustus', 262153, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-08-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 262153
    AND ex.description = 'Wifi / Indihome - Indihome Agustus'
);

-- Expense #11: Agustus 2025 | Listrik / Token A | Rp981.040
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A', 981040, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-08-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 981040
    AND ex.description = 'Listrik / Token A'
);

-- Expense #12: Agustus 2025 | Listrik / Token B | Rp984.995
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token B', 984995, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-08-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 984995
    AND ex.description = 'Listrik / Token B'
);

-- Expense #13: September 2025 | Cuci AC / Kebersihan | Rp350.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-09-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'CLEANING'::"ExpenseCategory", 'Cuci AC / Kebersihan', 350000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-09-01'
    AND ex.category = 'CLEANING'::"ExpenseCategory"
    AND ex."amountRupiah" = 350000
    AND ex.description = 'Cuci AC / Kebersihan'
);

-- Expense #14: September 2025 | Wifi / Indihome | Rp360.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-09-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome', 360000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-09-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 360000
    AND ex.description = 'Wifi / Indihome'
);

-- Expense #15: Oktober 2025 | Listrik / Token A | Rp1.292.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A', 1292500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-10-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 1292500
    AND ex.description = 'Listrik / Token A'
);

-- Expense #16: Oktober 2025 | Air PDAM | Rp1.003.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'WATER'::"ExpenseCategory", 'Air PDAM - Catatan ke-1', 1003500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-10-01'
    AND ex.category = 'WATER'::"ExpenseCategory"
    AND ex."amountRupiah" = 1003500
    AND ex.description = 'Air PDAM - Catatan ke-1'
);

-- Expense #17: Oktober 2025 | Air PDAM | Rp994.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'WATER'::"ExpenseCategory", 'Air PDAM - Catatan ke-2', 994000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-10-01'
    AND ex.category = 'WATER'::"ExpenseCategory"
    AND ex."amountRupiah" = 994000
    AND ex.description = 'Air PDAM - Catatan ke-2'
);

-- Expense #18: Oktober 2025 | Renovasi Kecil | Rp925.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Renovasi Kecil', 925000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-10-01'
    AND ex.category = 'MAINTENANCE'::"ExpenseCategory"
    AND ex."amountRupiah" = 925000
    AND ex.description = 'Renovasi Kecil'
);

-- Expense #19: Oktober 2025 | Cuci AC / Kebersihan | Rp270.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'CLEANING'::"ExpenseCategory", 'Cuci AC / Kebersihan - A 270', 270000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-10-01'
    AND ex.category = 'CLEANING'::"ExpenseCategory"
    AND ex."amountRupiah" = 270000
    AND ex.description = 'Cuci AC / Kebersihan - A 270'
);

-- Expense #20: November 2025 | Listrik / Token A | Rp997.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-11-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'ELECTRICITY'::"ExpenseCategory", 'Listrik / Token A', 997500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-11-01'
    AND ex.category = 'ELECTRICITY'::"ExpenseCategory"
    AND ex."amountRupiah" = 997500
    AND ex.description = 'Listrik / Token A'
);

-- Expense #21: November 2025 | Air PDAM | Rp997.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-11-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'WATER'::"ExpenseCategory", 'Air PDAM', 997000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-11-01'
    AND ex.category = 'WATER'::"ExpenseCategory"
    AND ex."amountRupiah" = 997000
    AND ex.description = 'Air PDAM'
);

-- Expense #22: November 2025 | Renovasi Kecil | Rp200.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-11-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Renovasi Kecil', 200000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-11-01'
    AND ex.category = 'MAINTENANCE'::"ExpenseCategory"
    AND ex."amountRupiah" = 200000
    AND ex.description = 'Renovasi Kecil'
);

-- Expense #23: Desember 2025 | Renovasi Kecil | Rp1.000.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Renovasi Kecil', 1000000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-12-01'
    AND ex.category = 'MAINTENANCE'::"ExpenseCategory"
    AND ex."amountRupiah" = 1000000
    AND ex.description = 'Renovasi Kecil'
);

-- Expense #24: Desember 2025 | Cuci AC / Kebersihan | Rp200.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'CLEANING'::"ExpenseCategory", 'Cuci AC / Kebersihan', 200000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-12-01'
    AND ex.category = 'CLEANING'::"ExpenseCategory"
    AND ex."amountRupiah" = 200000
    AND ex.description = 'Cuci AC / Kebersihan'
);

-- Expense #25: Desember 2025 | Wifi / Indihome | Rp200.900
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'INTERNET'::"ExpenseCategory", 'Wifi / Indihome', 200900, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-12-01'
    AND ex.category = 'INTERNET'::"ExpenseCategory"
    AND ex."amountRupiah" = 200900
    AND ex.description = 'Wifi / Indihome'
);


-- ============================================================================
-- E. PENGELUARAN DETAIL TAHUNAN (2021-2025)
-- ============================================================================

-- Yearly Expense #1: 2021-Februari | Kuas, Lem Beton, dll | Rp136.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Kuas, Lem Beton, dll [Renovasi & Material Bangunan]', 136000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 136000
    AND ex.description = 'Kuas, Lem Beton, dll [Renovasi & Material Bangunan]'
);

-- Yearly Expense #2: 2021-Februari | Mega Hardware Dak | Rp510.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Hardware Dak [Renovasi & Material Bangunan]', 510000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 510000
    AND ex.description = 'Mega Hardware Dak [Renovasi & Material Bangunan]'
);

-- Yearly Expense #3: 2021-Februari | Borongan | Rp1.300.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan [Renovasi & Material Bangunan]', 1300000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 1300000
    AND ex.description = 'Borongan [Renovasi & Material Bangunan]'
);

-- Yearly Expense #4: 2021-Februari | Matabor drill | Rp32.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Matabor drill [Renovasi & Material Bangunan]', 32500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 32500
    AND ex.description = 'Matabor drill [Renovasi & Material Bangunan]'
);

-- Yearly Expense #5: 2021-Februari | Mega Hardware Mezz | Rp504.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Hardware Mezz [Renovasi & Material Bangunan]', 504000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 504000
    AND ex.description = 'Mega Hardware Mezz [Renovasi & Material Bangunan]'
);

-- Yearly Expense #6: 2021-Februari | Bahan Mezanin | Rp1.224.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Bahan Mezanin [Renovasi & Material Bangunan]', 1224500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 1224500
    AND ex.description = 'Bahan Mezanin [Renovasi & Material Bangunan]'
);

-- Yearly Expense #7: 2021-Februari | Borongan Mezzanin | Rp800.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan Mezzanin [Renovasi & Material Bangunan]', 800000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 800000
    AND ex.description = 'Borongan Mezzanin [Renovasi & Material Bangunan]'
);

-- Yearly Expense #8: 2021-Februari | UD Semeru | Rp453.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'UD Semeru [Renovasi & Material Bangunan]', 453500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-02-01'
    AND ex."amountRupiah" = 453500
    AND ex.description = 'UD Semeru [Renovasi & Material Bangunan]'
);

-- Yearly Expense #9: 2021-Maret | Repair Kamar I | Rp350.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Repair Kamar I [Operasional & Maintenance]', 350000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 350000
    AND ex.description = 'Repair Kamar I [Operasional & Maintenance]'
);

-- Yearly Expense #10: 2021-Maret | Mbak Mei | Rp100.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mbak Mei [Operasional & Maintenance]', 100000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 100000
    AND ex.description = 'Mbak Mei [Operasional & Maintenance]'
);

-- Yearly Expense #11: 2021-Maret | Kipas Angin 12" | Rp211.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Kipas Angin 12" [Elektronik & Perabot Kos]', 211000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 211000
    AND ex.description = 'Kipas Angin 12" [Elektronik & Perabot Kos]'
);

-- Yearly Expense #12: 2021-Maret | CCTV Bardi 2 Buah | Rp682.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'CCTV Bardi 2 Buah [Elektronik & Perabot Kos]', 682000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 682000
    AND ex.description = 'CCTV Bardi 2 Buah [Elektronik & Perabot Kos]'
);

-- Yearly Expense #13: 2021-Maret | Sprei 3 | Rp288.400
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Sprei 3 [Elektronik & Perabot Kos]', 288400, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 288400
    AND ex.description = 'Sprei 3 [Elektronik & Perabot Kos]'
);

-- Yearly Expense #14: 2021-Maret | Kenmaster Box (Mobil) | Rp890.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Kenmaster Box (Mobil) [Renovasi & Material Bangunan]', 890000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 890000
    AND ex.description = 'Kenmaster Box (Mobil) [Renovasi & Material Bangunan]'
);

-- Yearly Expense #15: 2021-Maret | Lampu Neon + Kabel + Pasang | Rp206.500
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Lampu Neon + Kabel + Pasang [Renovasi & Material Bangunan]', 206500, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 206500
    AND ex.description = 'Lampu Neon + Kabel + Pasang [Renovasi & Material Bangunan]'
);

-- Yearly Expense #16: 2021-Maret | SSD WD Blue 500GB | Rp899.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'OTHER'::"ExpenseCategory", 'SSD WD Blue 500GB [Pribadi & Konsumsi]', 899000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 899000
    AND ex.description = 'SSD WD Blue 500GB [Pribadi & Konsumsi]'
);

-- Yearly Expense #17: 2021-Maret | Box Elektro | Rp185.900
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Box Elektro [Renovasi & Material Bangunan]', 185900, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 185900
    AND ex.description = 'Box Elektro [Renovasi & Material Bangunan]'
);

-- Yearly Expense #18: 2021-Maret | Bahan I Kamar L 18Mar21 | Rp1.363.252
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Bahan I Kamar L 18Mar21 [Renovasi & Material Bangunan]', 1363252, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 1363252
    AND ex.description = 'Bahan I Kamar L 18Mar21 [Renovasi & Material Bangunan]'
);

-- Yearly Expense #19: 2021-Maret | Mega Besi, Bata Ringan, dll | Rp2.260.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Besi, Bata Ringan, dll [Renovasi & Material Bangunan]', 2260000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 2260000
    AND ex.description = 'Mega Besi, Bata Ringan, dll [Renovasi & Material Bangunan]'
);

-- Yearly Expense #20: 2021-Maret | Mega Pasir Semen | Rp990.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Pasir Semen [Renovasi & Material Bangunan]', 990000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 990000
    AND ex.description = 'Mega Pasir Semen [Renovasi & Material Bangunan]'
);

-- Yearly Expense #21: 2021-Maret | Depo 1 kramik pintu listrik | Rp2.473.157
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Depo 1 kramik pintu listrik [Renovasi & Material Bangunan]', 2473157, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 2473157
    AND ex.description = 'Depo 1 kramik pintu listrik [Renovasi & Material Bangunan]'
);

-- Yearly Expense #22: 2021-Maret | Borongan Tahap 1 | Rp1.700.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan Tahap 1 [Renovasi & Material Bangunan]', 1700000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-03-01'
    AND ex."amountRupiah" = 1700000
    AND ex.description = 'Borongan Tahap 1 [Renovasi & Material Bangunan]'
);

-- Yearly Expense #23: 2021-April | Shell | Rp211.600
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Shell [Operasional & Maintenance]', 211600, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 211600
    AND ex.description = 'Shell [Operasional & Maintenance]'
);

-- Yearly Expense #24: 2021-April | Tinta Print | Rp93.490
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Tinta Print [Operasional & Maintenance]', 93490, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 93490
    AND ex.description = 'Tinta Print [Operasional & Maintenance]'
);

-- Yearly Expense #25: 2021-April | Mega Hardware Pasir | Rp4.934.780
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Hardware Pasir [Renovasi & Material Bangunan]', 4934780, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 4934780
    AND ex.description = 'Mega Hardware Pasir [Renovasi & Material Bangunan]'
);

-- Yearly Expense #26: 2021-April | Mega Hardware Pasir + Ban Arko | Rp725.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega Hardware Pasir + Ban Arko [Renovasi & Material Bangunan]', 725000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 725000
    AND ex.description = 'Mega Hardware Pasir + Ban Arko [Renovasi & Material Bangunan]'
);

-- Yearly Expense #27: 2021-April | Kasur Busa | Rp990.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Kasur Busa [Elektronik & Perabot Kos]', 990000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 990000
    AND ex.description = 'Kasur Busa [Elektronik & Perabot Kos]'
);

-- Yearly Expense #28: 2021-April | Borongan tahap II | Rp1.700.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan tahap II [Renovasi & Material Bangunan]', 1700000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 1700000
    AND ex.description = 'Borongan tahap II [Renovasi & Material Bangunan]'
);

-- Yearly Expense #29: 2021-April | Borongan tahap III + Kas Bon 300 | Rp2.000.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan tahap III + Kas Bon 300 [Renovasi & Material Bangunan]', 2000000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 2000000
    AND ex.description = 'Borongan tahap III + Kas Bon 300 [Renovasi & Material Bangunan]'
);

-- Yearly Expense #30: 2021-April | Mega 16 April Cat,Pipa,Lem | Rp900.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mega 16 April Cat,Pipa,Lem [Renovasi & Material Bangunan]', 900000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 900000
    AND ex.description = 'Mega 16 April Cat,Pipa,Lem [Renovasi & Material Bangunan]'
);

-- Yearly Expense #31: 2021-April | Borongan tahap IV | Rp1.100.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Borongan tahap IV [Renovasi & Material Bangunan]', 1100000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 1100000
    AND ex.description = 'Borongan tahap IV [Renovasi & Material Bangunan]'
);

-- Yearly Expense #32: 2021-April | Lemari Miami kmr B | Rp242.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Lemari Miami kmr B [Elektronik & Perabot Kos]', 242000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-04-01'
    AND ex."amountRupiah" = 242000
    AND ex.description = 'Lemari Miami kmr B [Elektronik & Perabot Kos]'
);

-- Yearly Expense #33: 2021-Mei | AC Samsung | Rp2.699.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'AC Samsung [Elektronik & Perabot Kos]', 2699000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-05-01'
    AND ex."amountRupiah" = 2699000
    AND ex.description = 'AC Samsung [Elektronik & Perabot Kos]'
);

-- Yearly Expense #34: 2021-Mei | Kasur Comforta | Rp2.000.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Kasur Comforta [Elektronik & Perabot Kos]', 2000000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-05-01'
    AND ex."amountRupiah" = 2000000
    AND ex.description = 'Kasur Comforta [Elektronik & Perabot Kos]'
);

-- Yearly Expense #35: 2021-Mei | Tambahan Biaya Pasang | Rp215.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-05-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Tambahan Biaya Pasang [Renovasi & Material Bangunan]', 215000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-05-01'
    AND ex."amountRupiah" = 215000
    AND ex.description = 'Tambahan Biaya Pasang [Renovasi & Material Bangunan]'
);

-- Yearly Expense #36: 2021-Juni | Pindah AC Kmr L | Rp550.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Pindah AC Kmr L [Operasional & Maintenance]', 550000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-06-01'
    AND ex."amountRupiah" = 550000
    AND ex.description = 'Pindah AC Kmr L [Operasional & Maintenance]'
);

-- Yearly Expense #37: 2021-Agustus | Mesin Cuci Topload | Rp1.879.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Mesin Cuci Topload [Elektronik & Perabot Kos]', 1879000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-08-01'
    AND ex."amountRupiah" = 1879000
    AND ex.description = 'Mesin Cuci Topload [Elektronik & Perabot Kos]'
);

-- Yearly Expense #38: 2021-Agustus | TV Animax | Rp743.700
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'TV Animax [Elektronik & Perabot Kos]', 743700, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-08-01'
    AND ex."amountRupiah" = 743700
    AND ex.description = 'TV Animax [Elektronik & Perabot Kos]'
);

-- Yearly Expense #39: 2021-Oktober | Accu Solana 100Ah | Rp2.250.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Accu Solana 100Ah [Renovasi & Material Bangunan]', 2250000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-10-01'
    AND ex."amountRupiah" = 2250000
    AND ex.description = 'Accu Solana 100Ah [Renovasi & Material Bangunan]'
);

-- Yearly Expense #40: 2021-November | Laptop Huawei | Rp7.409.050
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-11-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'OTHER'::"ExpenseCategory", 'Laptop Huawei [Pribadi & Konsumsi]', 7409050, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-11-01'
    AND ex."amountRupiah" = 7409050
    AND ex.description = 'Laptop Huawei [Pribadi & Konsumsi]'
);

-- Yearly Expense #41: 2021-Desember | AC Midea Portable | Rp3.648.040
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'AC Midea Portable [Elektronik & Perabot Kos]', 3648040, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-12-01'
    AND ex."amountRupiah" = 3648040
    AND ex.description = 'AC Midea Portable [Elektronik & Perabot Kos]'
);

-- Yearly Expense #42: 2021-Desember | Proyek Bio Tank Dll | Rp9.695.097
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2021-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Proyek Bio Tank Dll [Renovasi & Material Bangunan]', 9695097, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2021-12-01'
    AND ex."amountRupiah" = 9695097
    AND ex.description = 'Proyek Bio Tank Dll [Renovasi & Material Bangunan]'
);

-- Yearly Expense #43: 2022-Januari | Kabel Lan | Rp70.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-01-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Kabel Lan [Operasional & Maintenance]', 70000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-01-01'
    AND ex."amountRupiah" = 70000
    AND ex.description = 'Kabel Lan [Operasional & Maintenance]'
);

-- Yearly Expense #44: 2022-Januari | Rovega Lemari 4 Biji | Rp800.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-01-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Rovega Lemari 4 Biji [Elektronik & Perabot Kos]', 800000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-01-01'
    AND ex."amountRupiah" = 800000
    AND ex.description = 'Rovega Lemari 4 Biji [Elektronik & Perabot Kos]'
);

-- Yearly Expense #45: 2022-Februari | Asteel Pasang Kramik | Rp140.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-02-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Asteel Pasang Kramik [Renovasi & Material Bangunan]', 140000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-02-01'
    AND ex."amountRupiah" = 140000
    AND ex.description = 'Asteel Pasang Kramik [Renovasi & Material Bangunan]'
);

-- Yearly Expense #46: 2022-Maret | Bardi CCTV 2 Biji | Rp806.400
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-03-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Bardi CCTV 2 Biji [Elektronik & Perabot Kos]', 806400, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-03-01'
    AND ex."amountRupiah" = 806400
    AND ex.description = 'Bardi CCTV 2 Biji [Elektronik & Perabot Kos]'
);

-- Yearly Expense #47: 2022-Juni | Huawei Matepad | Rp4.800.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'OTHER'::"ExpenseCategory", 'Huawei Matepad [Pribadi & Konsumsi]', 4800000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-06-01'
    AND ex."amountRupiah" = 4800000
    AND ex.description = 'Huawei Matepad [Pribadi & Konsumsi]'
);

-- Yearly Expense #48: 2022-Juli | AC LG | Rp2.479.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'AC LG [Elektronik & Perabot Kos]', 2479000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-07-01'
    AND ex."amountRupiah" = 2479000
    AND ex.description = 'AC LG [Elektronik & Perabot Kos]'
);

-- Yearly Expense #49: 2022-September | Huawei Watch D | Rp5.379.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-09-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'OTHER'::"ExpenseCategory", 'Huawei Watch D [Pribadi & Konsumsi]', 5379000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-09-01'
    AND ex."amountRupiah" = 5379000
    AND ex.description = 'Huawei Watch D [Pribadi & Konsumsi]'
);

-- Yearly Expense #50: 2022-Desember | Sparepart Kost Depo (Kran, dll) | Rp3.547.937
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2022-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Sparepart Kost Depo (Kran, dll) [Renovasi & Material Bangunan]', 3547937, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2022-12-01'
    AND ex."amountRupiah" = 3547937
    AND ex.description = 'Sparepart Kost Depo (Kran, dll) [Renovasi & Material Bangunan]'
);

-- Yearly Expense #51: 2023-Juli | PDAM | Rp1.758.100
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2023-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'PDAM [Operasional & Maintenance]', 1758100, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2023-07-01'
    AND ex."amountRupiah" = 1758100
    AND ex.description = 'PDAM [Operasional & Maintenance]'
);

-- Yearly Expense #52: 2023-Oktober | AC Aqua hartono | Rp3.154.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2023-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'AC Aqua hartono [Elektronik & Perabot Kos]', 3154000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2023-10-01'
    AND ex."amountRupiah" = 3154000
    AND ex.description = 'AC Aqua hartono [Elektronik & Perabot Kos]'
);

-- Yearly Expense #53: 2024-Januari | Arduino Beginner Kit | Rp821.800
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2024-01-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'OTHER'::"ExpenseCategory", 'Arduino Beginner Kit [Pribadi & Konsumsi]', 821800, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2024-01-01'
    AND ex."amountRupiah" = 821800
    AND ex.description = 'Arduino Beginner Kit [Pribadi & Konsumsi]'
);

-- Yearly Expense #54: 2024-April | Tinta HP shopee | Rp336.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2024-04-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Tinta HP shopee [Operasional & Maintenance]', 336000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2024-04-01'
    AND ex."amountRupiah" = 336000
    AND ex.description = 'Tinta HP shopee [Operasional & Maintenance]'
);

-- Yearly Expense #55: 2024-Juli | Mas Dji service kmr | Rp260.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2024-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Mas Dji service kmr [Operasional & Maintenance]', 260000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2024-07-01'
    AND ex."amountRupiah" = 260000
    AND ex.description = 'Mas Dji service kmr [Operasional & Maintenance]'
);

-- Yearly Expense #56: 2024-Oktober | Tang Arus tekiro | Rp323.917
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2024-10-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Tang Arus tekiro [Renovasi & Material Bangunan]', 323917, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2024-10-01'
    AND ex."amountRupiah" = 323917
    AND ex.description = 'Tang Arus tekiro [Renovasi & Material Bangunan]'
);

-- Yearly Expense #57: 2025-Januari | ID web host | Rp769.080
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-01-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'ID web host [Operasional & Maintenance]', 769080, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-01-01'
    AND ex."amountRupiah" = 769080
    AND ex.description = 'ID web host [Operasional & Maintenance]'
);

-- Yearly Expense #58: 2025-Juni | Gaji Tukang tps print | Rp4.755.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Gaji Tukang tps print [Renovasi & Material Bangunan]', 4755000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex."amountRupiah" = 4755000
    AND ex.description = 'Gaji Tukang tps print [Renovasi & Material Bangunan]'
);

-- Yearly Expense #59: 2025-Juni | Printer HP Tank | Rp2.046.900
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Printer HP Tank [Elektronik & Perabot Kos]', 2046900, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex."amountRupiah" = 2046900
    AND ex.description = 'Printer HP Tank [Elektronik & Perabot Kos]'
);

-- Yearly Expense #60: 2025-Juni | TUYA MCB KwhMeter | Rp710.948
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'TUYA MCB KwhMeter [Renovasi & Material Bangunan]', 710948, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex."amountRupiah" = 710948
    AND ex.description = 'TUYA MCB KwhMeter [Renovasi & Material Bangunan]'
);

-- Yearly Expense #61: 2025-Juni | Biotank+Pelampung | Rp222.650
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-06-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Biotank+Pelampung [Renovasi & Material Bangunan]', 222650, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-06-01'
    AND ex."amountRupiah" = 222650
    AND ex.description = 'Biotank+Pelampung [Renovasi & Material Bangunan]'
);

-- Yearly Expense #62: 2025-Juli | Gaji Tukang | Rp12.195.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Gaji Tukang [Renovasi & Material Bangunan]', 12195000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex."amountRupiah" = 12195000
    AND ex.description = 'Gaji Tukang [Renovasi & Material Bangunan]'
);

-- Yearly Expense #63: 2025-Juli | Groden kapsul | Rp317.394
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'Groden kapsul [Elektronik & Perabot Kos]', 317394, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex."amountRupiah" = 317394
    AND ex.description = 'Groden kapsul [Elektronik & Perabot Kos]'
);

-- Yearly Expense #64: 2025-Juli | Vinyl Lantai | Rp342.671
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-07-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Vinyl Lantai [Renovasi & Material Bangunan]', 342671, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-07-01'
    AND ex."amountRupiah" = 342671
    AND ex.description = 'Vinyl Lantai [Renovasi & Material Bangunan]'
);

-- Yearly Expense #65: 2025-Agustus | Gaji Tukang | Rp3.945.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Gaji Tukang [Renovasi & Material Bangunan]', 3945000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-08-01'
    AND ex."amountRupiah" = 3945000
    AND ex.description = 'Gaji Tukang [Renovasi & Material Bangunan]'
);

-- Yearly Expense #66: 2025-Agustus | Rekap 11 Agust 25 | Rp5.901.842
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-08-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'MAINTENANCE'::"ExpenseCategory", 'Rekap 11 Agust 25 [Renovasi & Material Bangunan]', 5901842, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-08-01'
    AND ex."amountRupiah" = 5901842
    AND ex.description = 'Rekap 11 Agust 25 [Renovasi & Material Bangunan]'
);

-- Yearly Expense #67: 2025-Desember | AC Midea 8 Des 2025 | Rp2.399.000
INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")
SELECT '2025-12-01', 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", 'SUPPLIES'::"ExpenseCategory", 'AC Midea 8 Des 2025 [Elektronik & Perabot Kos]', 2399000, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Expense" ex
  WHERE ex."expenseDate" = '2025-12-01'
    AND ex."amountRupiah" = 2399000
    AND ex.description = 'AC Midea 8 Des 2025 [Elektronik & Perabot Kos]'
);


-- ============================================================================
-- VERIFIKASI — Query pengecekan hasil import
-- ============================================================================

-- Hitung total data yang berhasil diimport
SELECT 'Tenant Historis' AS bagian, COUNT(*) AS jumlah FROM "Tenant" WHERE "isActive" = false
UNION ALL
SELECT 'Stay INACTIVE', COUNT(*) FROM "Stay" WHERE status = 'INACTIVE'
UNION ALL
SELECT 'Invoice Historis', COUNT(*) FROM "Invoice" WHERE "invoiceNumber" LIKE 'HIST-%'
UNION ALL
SELECT 'Invoice Payment', COUNT(*) FROM "InvoicePayment" ip JOIN "Invoice" inv ON inv.id = ip."invoiceId" WHERE inv."invoiceNumber" LIKE 'HIST-%'
UNION ALL
SELECT 'Expense 2025', COUNT(*) FROM "Expense" WHERE "expenseDate" >= '2025-05-01' AND "expenseDate" < '2026-01-01'
UNION ALL
SELECT 'Expense Tahunan', COUNT(*) FROM "Expense" WHERE "expenseDate" < '2025-05-01'
ORDER BY bagian;

COMMIT;
