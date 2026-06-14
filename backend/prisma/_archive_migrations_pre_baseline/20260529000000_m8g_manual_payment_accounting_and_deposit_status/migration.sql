-- M8G: align settled partial deposit status with application behavior.
-- No Prisma model change: this only updates the CHECK constraint semantics.

UPDATE "Stay"
SET "depositStatus" = 'PARTIALLY_REFUNDED'
WHERE "depositStatus" = 'REFUNDED'
  AND "depositDeductionRupiah" > 0
  AND "depositRefundedRupiah" > 0
  AND "depositDeductionRupiah" + "depositRefundedRupiah" = "depositAmountRupiah";

ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_deposit_status_consistency_chk;

ALTER TABLE "Stay"
ADD CONSTRAINT stay_deposit_status_consistency_chk
CHECK (
  (
    "depositStatus" = 'HELD'
    AND "depositDeductionRupiah" = 0
    AND "depositRefundedRupiah" = 0
    AND "depositRefundedAt" IS NULL
  )
  OR
  (
    "depositStatus" = 'PARTIALLY_REFUNDED'
    AND "depositDeductionRupiah" > 0
    AND "depositRefundedRupiah" > 0
    AND "depositRefundedAt" IS NOT NULL
    AND "depositDeductionRupiah" + "depositRefundedRupiah" = "depositAmountRupiah"
  )
  OR
  (
    "depositStatus" = 'REFUNDED'
    AND "depositDeductionRupiah" = 0
    AND "depositRefundedRupiah" = "depositAmountRupiah"
    AND "depositRefundedAt" IS NOT NULL
  )
  OR
  (
    "depositStatus" = 'FORFEITED'
    AND "depositRefundedRupiah" = 0
    AND "depositRefundedAt" IS NULL
    AND "depositDeductionRupiah" = "depositAmountRupiah"
  )
) NOT VALID;
