-- V5.16-B Staff Field Report + Admin Confirmation Queue
-- Additive migration only. No data reset.

CREATE TYPE "ReportedCondition" AS ENUM ('DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'NEEDS_REPLACEMENT', 'NEEDS_CLEANING', 'LOW_STOCK', 'OUT_OF_STOCK', 'PENDING_CHECK');
CREATE TYPE "AdminDecision" AS ENUM ('APPROVE', 'REJECT', 'NEEDS_MORE_INFO');
CREATE TYPE "StaffFieldReportStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'DONE', 'CLOSED');

ALTER TABLE "Ticket"
ADD COLUMN "linkedRoomItemId" INTEGER,
ADD COLUMN "linkedInventoryItemId" INTEGER,
ADD COLUMN "finalRoomItemStatus" "RoomItemStatus",
ADD COLUMN "finalInventoryItemStatus" "InventoryItemStatus",
ADD COLUMN "finalAdminNote" TEXT;

CREATE TABLE "StaffFieldReport" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER,
    "roomId" INTEGER,
    "roomItemId" INTEGER,
    "inventoryItemId" INTEGER,
    "reportedByStaffId" INTEGER NOT NULL,
    "reportedCondition" "ReportedCondition" NOT NULL,
    "conditionNotes" TEXT,
    "photoUrl" TEXT,
    "photoFileKey" TEXT,
    "photoOriginalFilename" TEXT,
    "photoMimeType" TEXT,
    "photoFileSizeBytes" INTEGER,
    "requestsReplacement" BOOLEAN NOT NULL DEFAULT false,
    "requestedInventoryItemId" INTEGER,
    "requestedQty" DECIMAL(12,2),
    "adminReviewedById" INTEGER,
    "adminDecision" "AdminDecision",
    "adminNotes" TEXT,
    "relatedMovementId" INTEGER,
    "status" "StaffFieldReportStatus" NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffFieldReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_linkedRoomItemId_idx" ON "Ticket"("linkedRoomItemId");
CREATE INDEX "Ticket_linkedInventoryItemId_idx" ON "Ticket"("linkedInventoryItemId");
CREATE INDEX "StaffFieldReport_ticketId_idx" ON "StaffFieldReport"("ticketId");
CREATE INDEX "StaffFieldReport_roomId_idx" ON "StaffFieldReport"("roomId");
CREATE INDEX "StaffFieldReport_roomItemId_idx" ON "StaffFieldReport"("roomItemId");
CREATE INDEX "StaffFieldReport_inventoryItemId_idx" ON "StaffFieldReport"("inventoryItemId");
CREATE INDEX "StaffFieldReport_requestedInventoryItemId_idx" ON "StaffFieldReport"("requestedInventoryItemId");
CREATE INDEX "StaffFieldReport_reportedByStaffId_idx" ON "StaffFieldReport"("reportedByStaffId");
CREATE INDEX "StaffFieldReport_adminReviewedById_idx" ON "StaffFieldReport"("adminReviewedById");
CREATE INDEX "StaffFieldReport_status_createdAt_idx" ON "StaffFieldReport"("status", "createdAt");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_linkedRoomItemId_fkey" FOREIGN KEY ("linkedRoomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_linkedInventoryItemId_fkey" FOREIGN KEY ("linkedInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_roomItemId_fkey" FOREIGN KEY ("roomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_requestedInventoryItemId_fkey" FOREIGN KEY ("requestedInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_reportedByStaffId_fkey" FOREIGN KEY ("reportedByStaffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_relatedMovementId_fkey" FOREIGN KEY ("relatedMovementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
