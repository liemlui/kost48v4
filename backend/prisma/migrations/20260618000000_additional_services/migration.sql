-- PUB-LAYANAN-TAMBAHAN (additive, owner-approved 2026-06-18): daftar layanan
-- tambahan (galon/TV/WiFi/dll) + tarif, dikelola owner & tampil di portal tenant.

-- CreateTable
CREATE TABLE "AdditionalService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceRupiah" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalService_isActive_idx" ON "AdditionalService"("isActive");

-- CreateIndex
CREATE INDEX "AdditionalService_sortOrder_idx" ON "AdditionalService"("sortOrder");
