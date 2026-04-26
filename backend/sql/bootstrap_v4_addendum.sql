BEGIN;

-- =========================================================
-- WEBKOST48 V3 - V4 ADDENDUM
-- Jalankan SETELAH:
-- 1) schema sinkron
-- 2) bootstrap.sql utama selesai
-- Fokus:
-- - deposit payment split guard
-- - payment submission target consistency
-- - target lookup indexes
-- - unique pending submission per target
-- =========================================================

-- ---------------------------------------------------------
-- Stay: guard untuk pembayaran deposit awal (booking activation flow)
-- Catatan:
-- - ini TIDAK mengganti lifecycle refund/forfeit deposit existing
-- - ini hanya menambah pagar untuk deposit awal pada booking/stay
-- ---------------------------------------------------------

ALTER TABLE "Stay"
DROP CONSTRAINT IF EXISTS stay_deposit_payment_amount_chk;

ALTER TABLE "Stay"
ADD CONSTRAINT stay_deposit_payment_amount_chk
CHECK (
  "depositPaidAmountRupiah" >= 0
  AND "depositPaidAmountRupiah" <= "depositAmountRupiah"
);

ALTER TABLE "Stay"
DROP CONSTRAINT IF EXISTS stay_deposit_payment_status_consistency_chk;

ALTER TABLE "Stay"
ADD CONSTRAINT stay_deposit_payment_status_consistency_chk
CHECK (
  (
    "depositPaymentStatus" = 'UNPAID'
    AND "depositPaidAmountRupiah" = 0
  )
  OR
  (
    "depositPaymentStatus" = 'PARTIAL'
    AND "depositPaidAmountRupiah" > 0
    AND "depositPaidAmountRupiah" < "depositAmountRupiah"
  )
  OR
  (
    "depositPaymentStatus" = 'PAID'
    AND "depositPaidAmountRupiah" = "depositAmountRupiah"
  )
);

-- ---------------------------------------------------------
-- PaymentSubmission: target consistency
-- targetType = INVOICE  -> invoiceId wajib ada
-- targetType = DEPOSIT  -> invoiceId boleh null, targetId wajib ada
--
-- Catatan:
-- - targetId pada DEPOSIT diasumsikan menunjuk stay/booking target
-- - addendum ini hanya menjaga bentuk data minimum
-- ---------------------------------------------------------

ALTER TABLE "PaymentSubmission"
DROP CONSTRAINT IF EXISTS payment_submission_target_consistency_chk;

ALTER TABLE "PaymentSubmission"
ADD CONSTRAINT payment_submission_target_consistency_chk
CHECK (
  (
    "targetType" = 'INVOICE'
    AND "invoiceId" IS NOT NULL
    AND "targetId" IS NOT NULL
  )
  OR
  (
    "targetType" = 'DEPOSIT'
    AND "targetId" IS NOT NULL
  )
);

-- ---------------------------------------------------------
-- PaymentSubmission: target lookup indexes
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS payment_submission_target_idx
ON "PaymentSubmission" ("targetType", "targetId");

-- ---------------------------------------------------------
-- PaymentSubmission: hanya satu submission PENDING_REVIEW
-- untuk satu target aktif pada satu waktu
-- ---------------------------------------------------------

DROP INDEX IF EXISTS payment_submission_one_pending_per_target_uidx;

CREATE UNIQUE INDEX payment_submission_one_pending_per_target_uidx
ON "PaymentSubmission" ("targetType", "targetId")
WHERE status = 'PENDING_REVIEW';

COMMIT;