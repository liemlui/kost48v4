-- V5.18-D Staff Inventory Status Update
-- Staff may update field condition/status; Owner/Admin still controls official stock quantity/master data.
CREATE TYPE "InventoryItemStatus" AS ENUM ('GOOD', 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK');

ALTER TABLE "InventoryItem"
ADD COLUMN "status" "InventoryItemStatus" NOT NULL DEFAULT 'GOOD';

CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");
