-- PUB-LAYANAN-MINAT (additive, owner-approved 2026-06-18): tenant menyatakan minat
-- atas layanan tambahan → admin proses (hubungi/selesai).

-- CreateEnum
CREATE TYPE "ServiceInterestStatus" AS ENUM ('PENDING', 'CONTACTED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "ServiceInterest" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "status" "ServiceInterestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceInterest_serviceId_idx" ON "ServiceInterest"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceInterest_tenantId_idx" ON "ServiceInterest"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceInterest_status_idx" ON "ServiceInterest"("status");

-- AddForeignKey
ALTER TABLE "ServiceInterest" ADD CONSTRAINT "ServiceInterest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AdditionalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInterest" ADD CONSTRAINT "ServiceInterest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
