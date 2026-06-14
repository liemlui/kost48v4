
-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "fulfillmentTaskCategory" TEXT,
ADD COLUMN     "fulfillmentTaskTitle" TEXT;

-- AlterTable
ALTER TABLE "RenewRequest" ADD COLUMN     "isEarly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prepaidMonths" INTEGER,
ADD COLUMN     "tenantReview" TEXT,
ADD COLUMN     "tenantReviewAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "acCleanIntervalDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "acLastCleanedAt" TIMESTAMP(3),
ADD COLUMN     "acWattage" INTEGER,
ADD COLUMN     "hasAc" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tipBank" TEXT,
ADD COLUMN     "tipDana" TEXT,
ADD COLUMN     "tipGopay" TEXT,
ADD COLUMN     "tipOvo" TEXT;

