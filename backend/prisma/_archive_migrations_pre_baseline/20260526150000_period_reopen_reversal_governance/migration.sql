-- V5.28-B8 Closed Period Governance + Reopen/Reversal Foundation
-- Additive-only migration. No data reset.

ALTER TYPE "JournalSourceType" ADD VALUE IF NOT EXISTS 'CLOSING_REVERSAL';

ALTER TABLE "AccountingPeriod"
  ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reopenedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "reopenJournalEntryId" INTEGER,
  ADD COLUMN IF NOT EXISTS "reopenReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reopenVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "AccountingPeriod_reopenedById_idx" ON "AccountingPeriod"("reopenedById");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_reopenJournalEntryId_idx" ON "AccountingPeriod"("reopenJournalEntryId");
