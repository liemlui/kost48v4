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

BEGIN;

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

COMMIT;
