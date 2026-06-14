
-- CreateEnum
CREATE TYPE "PeerReportStatus" AS ENUM ('PENDING_REVIEW', 'ACKNOWLEDGED', 'IMPROVED', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'JOINED', 'REWARDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "PeerBehaviorReport" (
    "id" SERIAL NOT NULL,
    "reporterTenantId" INTEGER NOT NULL,
    "reporteeTenantId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PeerReportStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderatedById" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "improvedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerBehaviorReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantReferral" (
    "id" SERIAL NOT NULL,
    "referrerTenantId" INTEGER NOT NULL,
    "referredTenantId" INTEGER,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_reporteeTenantId_status_idx" ON "PeerBehaviorReport"("reporteeTenantId", "status");

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_reporterTenantId_idx" ON "PeerBehaviorReport"("reporterTenantId");

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_status_idx" ON "PeerBehaviorReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantReferral_referredTenantId_key" ON "TenantReferral"("referredTenantId");

-- CreateIndex
CREATE INDEX "TenantReferral_referrerTenantId_idx" ON "TenantReferral"("referrerTenantId");

-- CreateIndex
CREATE INDEX "TenantReferral_status_idx" ON "TenantReferral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_referralCode_key" ON "Tenant"("referralCode");

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_reporterTenantId_fkey" FOREIGN KEY ("reporterTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_reporteeTenantId_fkey" FOREIGN KEY ("reporteeTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReferral" ADD CONSTRAINT "TenantReferral_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReferral" ADD CONSTRAINT "TenantReferral_referredTenantId_fkey" FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

