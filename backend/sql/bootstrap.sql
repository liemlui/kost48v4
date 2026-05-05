BEGIN;

-- =========================================================
-- WEBKOST48 V3 - MINIMAL BOOTSTRAP SQL
-- Jalankan SETELAH Prisma migrate
-- Tujuan:
-- - partial unique index active stay
-- - no overpayment
-- - invoice total auto-managed
-- - invoice line hanya bisa diubah saat DRAFT
-- - deposit processing guard
-- - meter reading monotonic
-- - inventory qtyOnHand tidak boleh negatif
-- - check constraints penting
-- =========================================================

-- =========================================================
-- DROP old triggers / functions / constraints / indexes
-- =========================================================

DROP TRIGGER IF EXISTS invoice_payment_no_overpay_trg ON "InvoicePayment";
DROP TRIGGER IF EXISTS invoice_line_amount_sync_trg ON "InvoiceLine";
DROP TRIGGER IF EXISTS invoice_total_manual_guard_trg ON "Invoice";
DROP TRIGGER IF EXISTS invoice_line_recalc_total_trg ON "InvoiceLine";
DROP TRIGGER IF EXISTS invoice_line_draft_only_trg ON "InvoiceLine";
DROP TRIGGER IF EXISTS stay_deposit_processing_guard_trg ON "Stay";
DROP TRIGGER IF EXISTS meter_reading_monotonic_trg ON "MeterReading";
DROP TRIGGER IF EXISTS inventory_movement_sync_qty_trg ON "InventoryMovement";

DROP FUNCTION IF EXISTS validate_invoice_payment_not_overpaid();
DROP FUNCTION IF EXISTS sync_invoice_line_amount();
DROP FUNCTION IF EXISTS recalc_invoice_total(integer);
DROP FUNCTION IF EXISTS trg_recalc_invoice_total();
DROP FUNCTION IF EXISTS prevent_manual_invoice_total_mutation();
DROP FUNCTION IF EXISTS prevent_non_draft_invoice_line_mutation();
DROP FUNCTION IF EXISTS guard_stay_deposit_processing();
DROP FUNCTION IF EXISTS meter_reading_monotonic();
DROP FUNCTION IF EXISTS apply_inventory_qty_delta(integer, numeric);
DROP FUNCTION IF EXISTS sync_inventory_qty_from_movement();

DROP INDEX IF EXISTS stay_one_active_per_tenant_uidx;
DROP INDEX IF EXISTS stay_one_active_per_room_uidx;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS user_tenant_role_consistency_chk;
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS room_rate_non_negative_chk;
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS room_rate_active_check;
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_date_consistency_chk;
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_amount_non_negative_chk;
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_deposit_amount_consistency_chk;
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_deposit_status_consistency_chk;
ALTER TABLE "MeterReading" DROP CONSTRAINT IF EXISTS meter_reading_non_negative_chk;
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS invoice_period_chk;
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS invoice_total_non_negative_chk;
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS invoice_status_consistency_chk;
ALTER TABLE "InvoiceLine" DROP CONSTRAINT IF EXISTS invoice_line_non_negative_chk;
ALTER TABLE "InvoicePayment" DROP CONSTRAINT IF EXISTS invoice_payment_non_negative_chk;
ALTER TABLE "Announcement" DROP CONSTRAINT IF EXISTS announcement_window_chk;
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS inventory_item_qty_non_negative_chk;
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS inventory_movement_qty_positive_chk;
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS inventory_movement_room_consistency_chk;
ALTER TABLE "RoomItem" DROP CONSTRAINT IF EXISTS room_item_qty_positive_chk;
ALTER TABLE "WifiSale" DROP CONSTRAINT IF EXISTS wifi_sale_price_non_negative_chk;
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS expense_amount_non_negative_chk;

-- =========================================================
-- PARTIAL UNIQUE INDEXES
-- =========================================================

CREATE UNIQUE INDEX stay_one_active_per_tenant_uidx
ON "Stay" ("tenantId")
WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX stay_one_active_per_room_uidx
ON "Stay" ("roomId")
WHERE status = 'ACTIVE';

-- =========================================================
-- CHECK CONSTRAINTS
-- =========================================================

ALTER TABLE "User"
ADD CONSTRAINT user_tenant_role_consistency_chk
CHECK (
  (
    role = 'TENANT'
    AND "tenantId" IS NOT NULL
  )
  OR
  (
    role <> 'TENANT'
    AND "tenantId" IS NULL
  )
);

ALTER TABLE "Room"
ADD CONSTRAINT room_rate_non_negative_chk
CHECK (
  "monthlyRateRupiah" >= 0
  AND ("dailyRateRupiah" IS NULL OR "dailyRateRupiah" >= 0)
  AND ("weeklyRateRupiah" IS NULL OR "weeklyRateRupiah" >= 0)
  AND ("biWeeklyRateRupiah" IS NULL OR "biWeeklyRateRupiah" >= 0)
  AND "defaultDepositRupiah" >= 0
  AND "electricityTariffPerKwhRupiah" >= 0
  AND "waterTariffPerM3Rupiah" >= 0
),
ADD CONSTRAINT room_rate_active_check
CHECK (
  NOT "isActive" OR "monthlyRateRupiah" > 0
);

ALTER TABLE "Stay"
ADD CONSTRAINT stay_date_consistency_chk
CHECK (
  ("plannedCheckOutDate" IS NULL OR "plannedCheckOutDate" >= "checkInDate")
  AND ("actualCheckOutDate" IS NULL OR "actualCheckOutDate" >= "checkInDate")
),
ADD CONSTRAINT stay_amount_non_negative_chk
CHECK (
  "agreedRentAmountRupiah" >= 0
  AND "depositAmountRupiah" >= 0
  AND "depositDeductionRupiah" >= 0
  AND "depositRefundedRupiah" >= 0
  AND "electricityTariffPerKwhRupiah" >= 0
  AND "waterTariffPerM3Rupiah" >= 0
),
ADD CONSTRAINT stay_deposit_amount_consistency_chk
CHECK (
  "depositDeductionRupiah" + "depositRefundedRupiah" <= "depositAmountRupiah"
  AND (
    ("depositRefundedRupiah" = 0 AND "depositRefundedAt" IS NULL)
    OR
    ("depositRefundedRupiah" > 0 AND "depositRefundedAt" IS NOT NULL)
  )
),
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
    AND "depositRefundedRupiah" > 0
    AND "depositRefundedAt" IS NOT NULL
    AND "depositDeductionRupiah" + "depositRefundedRupiah" < "depositAmountRupiah"
  )
  OR
  (
    "depositStatus" = 'REFUNDED'
    AND "depositRefundedRupiah" > 0
    AND "depositRefundedAt" IS NOT NULL
    AND "depositDeductionRupiah" + "depositRefundedRupiah" = "depositAmountRupiah"
  )
  OR
  (
    "depositStatus" = 'FORFEITED'
    AND "depositRefundedRupiah" = 0
    AND "depositRefundedAt" IS NULL
    AND "depositDeductionRupiah" = "depositAmountRupiah"
  )
);

ALTER TABLE "MeterReading"
ADD CONSTRAINT meter_reading_non_negative_chk
CHECK ("readingValue" >= 0);

ALTER TABLE "Invoice"
ADD CONSTRAINT invoice_period_chk
CHECK ("periodEnd" >= "periodStart"),
ADD CONSTRAINT invoice_total_non_negative_chk
CHECK ("totalAmountRupiah" >= 0),
ADD CONSTRAINT invoice_status_consistency_chk
CHECK (
  (
    status = 'DRAFT'
    AND "issuedAt" IS NULL
    AND "paidAt" IS NULL
    AND "cancelReason" IS NULL
  )
  OR
  (
    status = 'ISSUED'
    AND "issuedAt" IS NOT NULL
    AND "paidAt" IS NULL
  )
  OR
  (
    status = 'PARTIAL'
    AND "issuedAt" IS NOT NULL
    AND "paidAt" IS NULL
  )
  OR
  (
    status = 'PAID'
    AND "issuedAt" IS NOT NULL
    AND "paidAt" IS NOT NULL
  )
  OR
  (
    status = 'CANCELLED'
    AND "paidAt" IS NULL
    AND "cancelReason" IS NOT NULL
  )
);

ALTER TABLE "InvoiceLine"
ADD CONSTRAINT invoice_line_non_negative_chk
CHECK (
  qty > 0
  AND "unitPriceRupiah" >= 0
  AND "lineAmountRupiah" >= 0
);

ALTER TABLE "InvoicePayment"
ADD CONSTRAINT invoice_payment_non_negative_chk
CHECK ("amountRupiah" > 0);

ALTER TABLE "Announcement"
ADD CONSTRAINT announcement_window_chk
CHECK ("expiresAt" IS NULL OR "startsAt" IS NULL OR "expiresAt" >= "startsAt");

ALTER TABLE "InventoryItem"
ADD CONSTRAINT inventory_item_qty_non_negative_chk
CHECK ("qtyOnHand" >= 0 AND "minQty" >= 0);

ALTER TABLE "InventoryMovement"
ADD CONSTRAINT inventory_movement_qty_positive_chk
CHECK (qty > 0),
ADD CONSTRAINT inventory_movement_room_consistency_chk
CHECK (
  (
    "movementType" IN ('IN', 'OUT')
    AND "roomId" IS NULL
  )
  OR
  (
    "movementType" IN ('ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM')
    AND "roomId" IS NOT NULL
  )
);

ALTER TABLE "RoomItem"
ADD CONSTRAINT room_item_qty_positive_chk
CHECK (qty > 0);

ALTER TABLE "WifiSale"
ADD CONSTRAINT wifi_sale_price_non_negative_chk
CHECK ("soldPriceRupiah" >= 0);

ALTER TABLE "Expense"
ADD CONSTRAINT expense_amount_non_negative_chk
CHECK ("amountRupiah" >= 0);

-- =========================================================
-- InvoicePayment: no overpayment
-- =========================================================

CREATE OR REPLACE FUNCTION validate_invoice_payment_not_overpaid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_amount int;
  v_already_paid int;
  v_status       "InvoiceStatus";
BEGIN
  SELECT "totalAmountRupiah", status
  INTO v_total_amount, v_status
  FROM "Invoice"
  WHERE id = NEW."invoiceId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoiceId tidak valid';
  END IF;

  IF v_status IN ('CANCELLED') THEN
    RAISE EXCEPTION 'Tidak dapat menambahkan pembayaran ke invoice berstatus CANCELLED';
  END IF;

  SELECT COALESCE(SUM("amountRupiah"), 0)::int
  INTO v_already_paid
  FROM "InvoicePayment"
  WHERE "invoiceId" = NEW."invoiceId"
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_already_paid + NEW."amountRupiah" > v_total_amount THEN
    RAISE EXCEPTION
      'Pembayaran melebihi total invoice. Sudah dibayar: %, pembayaran baru: %, total invoice: %',
      v_already_paid, NEW."amountRupiah", v_total_amount;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_payment_no_overpay_trg
BEFORE INSERT OR UPDATE OF "invoiceId", "amountRupiah" ON "InvoicePayment"
FOR EACH ROW EXECUTE FUNCTION validate_invoice_payment_not_overpaid();

-- =========================================================
-- InvoiceLine: auto-compute lineAmountRupiah = qty * unitPrice
-- =========================================================

CREATE OR REPLACE FUNCTION sync_invoice_line_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."lineAmountRupiah" := ROUND((NEW.qty::numeric) * NEW."unitPriceRupiah")::int;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_line_amount_sync_trg
BEFORE INSERT OR UPDATE OF qty, "unitPriceRupiah", "lineAmountRupiah" ON "InvoiceLine"
FOR EACH ROW EXECUTE FUNCTION sync_invoice_line_amount();

-- =========================================================
-- Invoice: auto-recalculate totalAmountRupiah
-- =========================================================

CREATE OR REPLACE FUNCTION recalc_invoice_total(p_invoice_id int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.allow_invoice_total_recalc', 'on', true);

  UPDATE "Invoice" i
  SET "totalAmountRupiah" =
    COALESCE((
      SELECT SUM(
        CASE
          WHEN "lineType" = 'DISCOUNT' THEN -"lineAmountRupiah"
          ELSE "lineAmountRupiah"
        END
      )::int
      FROM "InvoiceLine"
      WHERE "invoiceId" = p_invoice_id
    ), 0)
  WHERE i.id = p_invoice_id;

  PERFORM set_config('app.allow_invoice_total_recalc', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalc_invoice_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_invoice_id int;
  v_new_invoice_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalc_invoice_total(NEW."invoiceId");
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalc_invoice_total(OLD."invoiceId");
    RETURN OLD;
  ELSE
    v_old_invoice_id := OLD."invoiceId";
    v_new_invoice_id := NEW."invoiceId";

    PERFORM recalc_invoice_total(v_old_invoice_id);

    IF v_new_invoice_id IS DISTINCT FROM v_old_invoice_id THEN
      PERFORM recalc_invoice_total(v_new_invoice_id);
    END IF;

    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_manual_invoice_total_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."totalAmountRupiah" IS DISTINCT FROM OLD."totalAmountRupiah"
     AND COALESCE(current_setting('app.allow_invoice_total_recalc', true), 'off') <> 'on'
  THEN
    RAISE EXCEPTION 'Invoice.totalAmountRupiah dikelola otomatis dari InvoiceLine';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_total_manual_guard_trg
BEFORE UPDATE OF "totalAmountRupiah" ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION prevent_manual_invoice_total_mutation();

CREATE TRIGGER invoice_line_recalc_total_trg
AFTER INSERT OR UPDATE OR DELETE ON "InvoiceLine"
FOR EACH ROW EXECUTE FUNCTION trg_recalc_invoice_total();

-- =========================================================
-- InvoiceLine: hanya bisa diubah saat invoice DRAFT
-- =========================================================

CREATE OR REPLACE FUNCTION prevent_non_draft_invoice_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id int;
  v_status     "InvoiceStatus";
BEGIN
  v_invoice_id := COALESCE(NEW."invoiceId", OLD."invoiceId");

  SELECT status INTO v_status
  FROM "Invoice"
  WHERE id = v_invoice_id;

  IF v_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Detail invoice hanya boleh diubah saat status DRAFT';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER invoice_line_draft_only_trg
BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceLine"
FOR EACH ROW EXECUTE FUNCTION prevent_non_draft_invoice_line_mutation();

-- =========================================================
-- Stay deposit processing guard
-- Refund / forfeit hanya setelah stay selesai/cancelled
-- dan tidak ada invoice ISSUED/PARTIAL untuk stay tsb
-- =========================================================

CREATE OR REPLACE FUNCTION guard_stay_deposit_processing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_open_invoices int;
BEGIN
  IF OLD."depositStatus" = NEW."depositStatus" THEN
    RETURN NEW;
  END IF;

  IF NEW."depositStatus" NOT IN ('PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED') THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Deposit hanya dapat diproses setelah stay selesai atau dibatalkan';
  END IF;

  SELECT COUNT(*) INTO v_open_invoices
  FROM "Invoice"
  WHERE "stayId" = NEW.id
    AND status IN ('ISSUED', 'PARTIAL');

  IF v_open_invoices > 0 THEN
    RAISE EXCEPTION
      'Deposit tidak dapat diproses karena masih ada % invoice terbuka',
      v_open_invoices;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER stay_deposit_processing_guard_trg
BEFORE UPDATE ON "Stay"
FOR EACH ROW EXECUTE FUNCTION guard_stay_deposit_processing();

-- =========================================================
-- MeterReading monotonic per room + utility
-- =========================================================

CREATE OR REPLACE FUNCTION meter_reading_monotonic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev numeric;
  v_next numeric;
BEGIN
  SELECT "readingValue" INTO v_prev
  FROM "MeterReading"
  WHERE "roomId" = NEW."roomId"
    AND "utilityType" = NEW."utilityType"
    AND ("readingAt", id) < (NEW."readingAt", COALESCE(NEW.id, 2147483647))
    AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ORDER BY "readingAt" DESC, id DESC
  LIMIT 1;

  SELECT "readingValue" INTO v_next
  FROM "MeterReading"
  WHERE "roomId" = NEW."roomId"
    AND "utilityType" = NEW."utilityType"
    AND ("readingAt", id) > (NEW."readingAt", COALESCE(NEW.id, 0))
    AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ORDER BY "readingAt" ASC, id ASC
  LIMIT 1;

  IF v_prev IS NOT NULL AND NEW."readingValue" < v_prev THEN
    RAISE EXCEPTION 'Nilai meter tidak boleh lebih kecil dari pembacaan sebelumnya';
  END IF;

  IF v_next IS NOT NULL AND NEW."readingValue" > v_next THEN
    RAISE EXCEPTION 'Nilai meter tidak boleh lebih besar dari pembacaan berikutnya';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER meter_reading_monotonic_trg
BEFORE INSERT OR UPDATE ON "MeterReading"
FOR EACH ROW EXECUTE FUNCTION meter_reading_monotonic();

-- =========================================================
-- InventoryItem.qtyOnHand sync dari InventoryMovement
-- NOTE:
-- Untuk v3, movementType ADJUSTMENT tidak dipakai dulu.
-- Gunakan IN/OUT + note untuk penyesuaian stok.
-- =========================================================

CREATE OR REPLACE FUNCTION apply_inventory_qty_delta(
  p_item_id int,
  p_delta numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_qty numeric;
BEGIN
  UPDATE "InventoryItem"
  SET
    "qtyOnHand" = "qtyOnHand" + p_delta,
    "updatedAt" = NOW()
  WHERE id = p_item_id
  RETURNING "qtyOnHand" INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'itemId inventory tidak valid';
  END IF;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stok inventory tidak boleh negatif untuk itemId %', p_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sync_inventory_qty_from_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_delta numeric;
  v_new_delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."movementType" = 'ADJUSTMENT' THEN
      RAISE EXCEPTION 'MovementType ADJUSTMENT belum didukung pada bootstrap v3. Gunakan IN atau OUT';
    END IF;

    v_new_delta := CASE
      WHEN NEW."movementType" IN ('IN', 'RETURN_FROM_ROOM') THEN NEW.qty
      WHEN NEW."movementType" IN ('OUT', 'ASSIGN_TO_ROOM') THEN -NEW.qty
      ELSE 0
    END;

    PERFORM apply_inventory_qty_delta(NEW."itemId", v_new_delta);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."movementType" = 'ADJUSTMENT' OR NEW."movementType" = 'ADJUSTMENT' THEN
      RAISE EXCEPTION 'MovementType ADJUSTMENT belum didukung pada bootstrap v3. Gunakan IN atau OUT';
    END IF;

    v_old_delta := CASE
      WHEN OLD."movementType" IN ('IN', 'RETURN_FROM_ROOM') THEN OLD.qty
      WHEN OLD."movementType" IN ('OUT', 'ASSIGN_TO_ROOM') THEN -OLD.qty
      ELSE 0
    END;

    v_new_delta := CASE
      WHEN NEW."movementType" IN ('IN', 'RETURN_FROM_ROOM') THEN NEW.qty
      WHEN NEW."movementType" IN ('OUT', 'ASSIGN_TO_ROOM') THEN -NEW.qty
      ELSE 0
    END;

    PERFORM apply_inventory_qty_delta(OLD."itemId", -v_old_delta);
    PERFORM apply_inventory_qty_delta(NEW."itemId", v_new_delta);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD."movementType" = 'ADJUSTMENT' THEN
      RAISE EXCEPTION 'MovementType ADJUSTMENT belum didukung pada bootstrap v3. Gunakan IN atau OUT';
    END IF;

    v_old_delta := CASE
      WHEN OLD."movementType" IN ('IN', 'RETURN_FROM_ROOM') THEN OLD.qty
      WHEN OLD."movementType" IN ('OUT', 'ASSIGN_TO_ROOM') THEN -OLD.qty
      ELSE 0
    END;

    PERFORM apply_inventory_qty_delta(OLD."itemId", -v_old_delta);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER inventory_movement_sync_qty_trg
AFTER INSERT OR UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION sync_inventory_qty_from_movement();

-- ============================================================
-- V4 ADDENDUM CONSOLIDATED
-- Source: backend/sql/bootstrap_v4_addendum.sql
-- ============================================================

-- Stay: guard untuk pembayaran deposit awal (booking activation flow)
-- Catatan:
-- - ini TIDAK mengganti lifecycle refund/forfeit deposit existing
-- - ini hanya menambah pagar untuk deposit awal pada booking/stay

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

-- PaymentSubmission: target consistency
-- targetType = INVOICE  -> invoiceId wajib ada
-- targetType = DEPOSIT  -> invoiceId boleh null, targetId wajib ada
--
-- Catatan:
-- - targetId pada DEPOSIT diasumsikan menunjuk stay/booking target
-- - addendum ini hanya menjaga bentuk data minimum

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

-- PaymentSubmission: target lookup indexes

CREATE INDEX IF NOT EXISTS payment_submission_target_idx
ON "PaymentSubmission" ("targetType", "targetId");

-- PaymentSubmission: hanya satu submission PENDING_REVIEW
-- untuk satu target aktif pada satu waktu

DROP INDEX IF EXISTS payment_submission_one_pending_per_target_uidx;

CREATE UNIQUE INDEX payment_submission_one_pending_per_target_uidx
ON "PaymentSubmission" ("targetType", "targetId")
WHERE status = 'PENDING_REVIEW';

COMMIT;
