-- ============================================================
-- PATCH: Recalc semua invoice total + verifikasi data
-- Tanggal : 2026-07-20
-- Tujuan  : Perbaiki totalAmountRupiah yang mungkin mismatch
--           dengan sum line items (termasuk DISCOUNT)
-- Cara    : psql "<DATABASE_URL>" -f sql/patches/fix-invoice-totals.sql
-- ============================================================

-- ═══ 1. Recalc semua invoice yang punya lines ═══
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM "Invoice" LOOP
    PERFORM recalc_invoice_total(r.id);
  END LOOP;
END;
$$;

-- ═══ 2. Verifikasi: cek invoice dengan totalAmountRupiah = 0 tapi punya lines ═══
SELECT '⚠️ INVOICE TOTAL = 0 (punya lines)' AS peringatan, i.id, i."totalAmountRupiah", i.status,
  (SELECT COUNT(*) FROM "InvoiceLine" il WHERE il."invoiceId" = i.id) AS jumlah_lines,
  (SELECT SUM(il."lineAmountRupiah")::int FROM "InvoiceLine" il WHERE il."invoiceId" = i.id) AS sum_lines
FROM "Invoice" i
WHERE i."totalAmountRupiah" = 0
  AND EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = i.id);

-- ═══ 3. Verifikasi: cek mismatch antara totalAmountRupiah vs sum lines ═══
SELECT '🔴 MISMATCH TOTAL' AS peringatan,
  i.id,
  i."totalAmountRupiah" AS total_db,
  COALESCE((
    SELECT SUM(
      CASE WHEN il."lineType" = 'DISCOUNT' THEN -il."lineAmountRupiah"
           ELSE il."lineAmountRupiah" END
    )::int
    FROM "InvoiceLine" il WHERE il."invoiceId" = i.id
  ), 0) AS total_recalc,
  i.status,
  i."issuedAt"
FROM "Invoice" i
WHERE i."totalAmountRupiah" != COALESCE((
    SELECT SUM(
      CASE WHEN il."lineType" = 'DISCOUNT' THEN -il."lineAmountRupiah"
           ELSE il."lineAmountRupiah" END
    )::int
    FROM "InvoiceLine" il WHERE il."invoiceId" = i.id
  ), 0);

-- ═══ 4. Ringkasan setelah perbaikan ═══
SELECT '✅ Total invoice setelah recalc' AS info,
  COUNT(*) AS jumlah_invoice,
  SUM("totalAmountRupiah") AS total_semua,
  MIN("totalAmountRupiah") AS min_total,
  MAX("totalAmountRupiah") AS max_total
FROM "Invoice"
WHERE "totalAmountRupiah" > 0;
