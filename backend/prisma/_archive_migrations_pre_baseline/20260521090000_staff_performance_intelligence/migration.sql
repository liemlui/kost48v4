-- V5.17-A Staff Accountability Intelligence
-- Adds staff performance events, audits, tenant reviews, and optional tenant tickets for general field reports.
-- No DB reset. No payment/lifecycle/finance mutation.

CREATE TYPE "StaffWorkSourceType" AS ENUM ('ROUTINE', 'TICKET', 'METER', 'ROOM_CHECK', 'STOCK_REPORT', 'INVENTORY_REPORT', 'TENANT_REVIEW', 'MANUAL_AUDIT');
CREATE TYPE "StaffAuditResult" AS ENUM ('PASS', 'NEEDS_FIX', 'FAILED', 'NOT_DONE');
CREATE TYPE "StaffReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');
CREATE TYPE "StaffPerformanceEventType" AS ENUM ('ROUTINE_DONE', 'ROUTINE_NEED_HELP', 'TICKET_DONE', 'METER_RECORDED', 'STOCK_REPORTED', 'AUDIT_PASS', 'AUDIT_NEEDS_FIX', 'AUDIT_FAILED', 'TENANT_REVIEW_HIGH', 'TENANT_REVIEW_LOW', 'MISSING_PROOF', 'MANUAL_ADJUSTMENT');

ALTER TABLE "Ticket" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_tenantId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StaffWorkAudit" (
  "id" SERIAL PRIMARY KEY,
  "staffId" INTEGER NOT NULL,
  "sourceType" "StaffWorkSourceType" NOT NULL,
  "sourceId" INTEGER,
  "auditedById" INTEGER NOT NULL,
  "result" "StaffAuditResult" NOT NULL,
  "scoreDelta" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "photoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffWorkAudit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffWorkAudit_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "StaffPerformanceEvent" (
  "id" SERIAL PRIMARY KEY,
  "staffId" INTEGER NOT NULL,
  "sourceType" "StaffWorkSourceType" NOT NULL,
  "sourceId" INTEGER,
  "eventType" "StaffPerformanceEventType" NOT NULL,
  "scoreDelta" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffPerformanceEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StaffReview" (
  "id" SERIAL PRIMARY KEY,
  "staffId" INTEGER NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "ticketId" INTEGER,
  "routineCompletionId" INTEGER,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" "StaffReviewStatus" NOT NULL DEFAULT 'VISIBLE',
  "moderatedById" INTEGER,
  "moderatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffReview_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffReview_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StaffReview_tenantId_ticketId_key" ON "StaffReview"("tenantId", "ticketId");
CREATE INDEX "StaffWorkAudit_staffId_createdAt_idx" ON "StaffWorkAudit"("staffId", "createdAt");
CREATE INDEX "StaffWorkAudit_sourceType_sourceId_idx" ON "StaffWorkAudit"("sourceType", "sourceId");
CREATE INDEX "StaffWorkAudit_result_idx" ON "StaffWorkAudit"("result");
CREATE INDEX "StaffWorkAudit_auditedById_idx" ON "StaffWorkAudit"("auditedById");
CREATE INDEX "StaffPerformanceEvent_staffId_createdAt_idx" ON "StaffPerformanceEvent"("staffId", "createdAt");
CREATE INDEX "StaffPerformanceEvent_sourceType_sourceId_idx" ON "StaffPerformanceEvent"("sourceType", "sourceId");
CREATE INDEX "StaffPerformanceEvent_eventType_idx" ON "StaffPerformanceEvent"("eventType");
CREATE INDEX "StaffReview_staffId_createdAt_idx" ON "StaffReview"("staffId", "createdAt");
CREATE INDEX "StaffReview_tenantId_createdAt_idx" ON "StaffReview"("tenantId", "createdAt");
CREATE INDEX "StaffReview_ticketId_idx" ON "StaffReview"("ticketId");
CREATE INDEX "StaffReview_status_idx" ON "StaffReview"("status");
