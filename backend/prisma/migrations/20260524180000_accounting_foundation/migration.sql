-- V5.23-B1/B2 Accounting Foundation Readiness
-- Additive-only: no payment/stay/checkout/renew/booking lifecycle tables are modified.

CREATE TYPE "AccountingAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE');
CREATE TYPE "AccountingNormalBalance" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');
CREATE TYPE "CashAccountType" AS ENUM ('CASH', 'BANK', 'QRIS', 'EWALLET', 'OTHER');
CREATE TYPE "OpeningBalanceBatchStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'OPENING_BALANCE', 'SYSTEM_PLACEHOLDER', 'INVOICE', 'INVOICE_PAYMENT', 'PAYMENT_SUBMISSION', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'INVENTORY', 'ADJUSTMENT');

CREATE TABLE "ChartOfAccount" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "type" "AccountingAccountType" NOT NULL,
  "normalBalance" "AccountingNormalBalance" NOT NULL,
  "description" TEXT,
  "parentId" INTEGER,
  "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CashAccount" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "accountType" "CashAccountType" NOT NULL DEFAULT 'BANK',
  "chartOfAccountId" INTEGER NOT NULL,
  "bankName" TEXT,
  "accountNumberMasked" TEXT,
  "holderName" TEXT,
  "openingBalanceRupiah" INTEGER NOT NULL DEFAULT 0,
  "currentBalanceRupiah" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AccountingPeriod" (
  "id" SERIAL PRIMARY KEY,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingPeriod_year_month_key" UNIQUE ("year", "month")
);

CREATE TABLE "OpeningBalanceBatch" (
  "id" SERIAL PRIMARY KEY,
  "batchNumber" TEXT NOT NULL UNIQUE,
  "accountingPeriodId" INTEGER,
  "cutoverDate" DATE NOT NULL,
  "status" "OpeningBalanceBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "totalDebitRupiah" INTEGER NOT NULL DEFAULT 0,
  "totalCreditRupiah" INTEGER NOT NULL DEFAULT 0,
  "createdById" INTEGER,
  "postedById" INTEGER,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OpeningBalanceLine" (
  "id" SERIAL PRIMARY KEY,
  "batchId" INTEGER NOT NULL,
  "chartOfAccountId" INTEGER NOT NULL,
  "description" TEXT,
  "debitRupiah" INTEGER NOT NULL DEFAULT 0,
  "creditRupiah" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JournalEntry" (
  "id" SERIAL PRIMARY KEY,
  "entryNumber" TEXT NOT NULL UNIQUE,
  "entryDate" DATE NOT NULL,
  "accountingPeriodId" INTEGER,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceType" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "memo" TEXT,
  "totalDebitRupiah" INTEGER NOT NULL DEFAULT 0,
  "totalCreditRupiah" INTEGER NOT NULL DEFAULT 0,
  "isBalanced" BOOLEAN NOT NULL DEFAULT false,
  "createdById" INTEGER,
  "postedById" INTEGER,
  "postedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JournalLine" (
  "id" SERIAL PRIMARY KEY,
  "journalEntryId" INTEGER NOT NULL,
  "chartOfAccountId" INTEGER NOT NULL,
  "cashAccountId" INTEGER,
  "description" TEXT,
  "debitRupiah" INTEGER NOT NULL DEFAULT 0,
  "creditRupiah" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OpeningBalanceBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ChartOfAccount_type_idx" ON "ChartOfAccount"("type");
CREATE INDEX "ChartOfAccount_normalBalance_idx" ON "ChartOfAccount"("normalBalance");
CREATE INDEX "ChartOfAccount_parentId_idx" ON "ChartOfAccount"("parentId");
CREATE INDEX "ChartOfAccount_isActive_idx" ON "ChartOfAccount"("isActive");
CREATE INDEX "CashAccount_accountType_idx" ON "CashAccount"("accountType");
CREATE INDEX "CashAccount_chartOfAccountId_idx" ON "CashAccount"("chartOfAccountId");
CREATE INDEX "CashAccount_isActive_idx" ON "CashAccount"("isActive");
CREATE INDEX "CashAccount_isDefault_idx" ON "CashAccount"("isDefault");
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");
CREATE INDEX "AccountingPeriod_startDate_endDate_idx" ON "AccountingPeriod"("startDate", "endDate");
CREATE INDEX "OpeningBalanceBatch_accountingPeriodId_idx" ON "OpeningBalanceBatch"("accountingPeriodId");
CREATE INDEX "OpeningBalanceBatch_cutoverDate_idx" ON "OpeningBalanceBatch"("cutoverDate");
CREATE INDEX "OpeningBalanceBatch_status_idx" ON "OpeningBalanceBatch"("status");
CREATE INDEX "OpeningBalanceLine_batchId_idx" ON "OpeningBalanceLine"("batchId");
CREATE INDEX "OpeningBalanceLine_chartOfAccountId_idx" ON "OpeningBalanceLine"("chartOfAccountId");
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");
CREATE INDEX "JournalEntry_accountingPeriodId_idx" ON "JournalEntry"("accountingPeriodId");
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");
CREATE INDEX "JournalLine_chartOfAccountId_idx" ON "JournalLine"("chartOfAccountId");
CREATE INDEX "JournalLine_cashAccountId_idx" ON "JournalLine"("cashAccountId");
