-- V5.27-B7 Period Close + Retained Earnings Foundation
-- Additive-only accounting close metadata. No lifecycle/payment/stay tables are modified.

ALTER TYPE "JournalSourceType" ADD VALUE IF NOT EXISTS 'DEPRECIATION';
ALTER TYPE "JournalSourceType" ADD VALUE IF NOT EXISTS 'CLOSING_ENTRY';

ALTER TABLE "AccountingPeriod"
  ADD COLUMN IF NOT EXISTS "closedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "closingJournalEntryId" INTEGER,
  ADD COLUMN IF NOT EXISTS "closingNote" TEXT,
  ADD COLUMN IF NOT EXISTS "closeBasis" TEXT,
  ADD COLUMN IF NOT EXISTS "closeVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "AccountingPeriod_closedById_idx" ON "AccountingPeriod"("closedById");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_closingJournalEntryId_idx" ON "AccountingPeriod"("closingJournalEntryId");
