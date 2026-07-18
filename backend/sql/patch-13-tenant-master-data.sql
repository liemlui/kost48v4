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

BEGIN;

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

COMMIT;
