CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

ALTER TABLE "Expense"
ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN "recurringKey" TEXT;

CREATE UNIQUE INDEX "Expense_recurringKey_key" ON "Expense"("recurringKey");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
