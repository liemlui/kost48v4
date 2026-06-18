-- STF-GUDANG-2: mapping fasilitas → item gudang (additive, owner-approved 2026-06-18)
-- Menambahkan kolom inventoryItemId ke RoomFacility agar pemetaan eksak,
-- tidak lagi mengandalkan fuzzy-name-matching.

-- AddColumn
ALTER TABLE "RoomFacility" ADD COLUMN "inventoryItemId" INTEGER;

-- CreateIndex
CREATE INDEX "RoomFacility_inventoryItemId_idx" ON "RoomFacility"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
