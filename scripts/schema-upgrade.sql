-- ============================================================================
-- SCHEMA UPGRADE — tambah kolom & tabel yang kurang
-- Jalankan: psql -d "postgresql://kost48s1_lurin:..." -f scripts/schema-upgrade.sql
-- ============================================================================

-- 1. Tambah kolom hasAc ke Room
ALTER TABLE "Room" ADD COLUMN "hasAc" BOOLEAN NOT NULL DEFAULT false;

-- 2. Tambah kolom acWattage ke Room
ALTER TABLE "Room" ADD COLUMN "acWattage" INTEGER;

-- 3. Tambah kolom acCleanIntervalDays ke Room
ALTER TABLE "Room" ADD COLUMN "acCleanIntervalDays" INTEGER NOT NULL DEFAULT 90;

-- 4. Tambah kolom acUsageHoursPerDay ke Room
ALTER TABLE "Room" ADD COLUMN "acUsageHoursPerDay" DOUBLE PRECISION;

-- 5. Buat enum RoomSize kalau belum ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoomSize') THEN
        CREATE TYPE "RoomSize" AS ENUM ('STANDARD', 'LARGE');
    END IF;
END
$$;

-- 6. Tambah kolom roomSize ke Room
ALTER TABLE "Room" ADD COLUMN "roomSize" "RoomSize";

-- 7. Buat tabel OperationalSetting
CREATE TABLE IF NOT EXISTS "OperationalSetting" (
    id INTEGER NOT NULL DEFAULT 1,
    "freeElectricityKwhPerMonth" INTEGER NOT NULL DEFAULT 30,
    "electricityTariffPerKwhRupiah" INTEGER NOT NULL DEFAULT 2500,
    "waterMeteringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "waterTariffPerM3Rupiah" INTEGER NOT NULL DEFAULT 0,
    "freeWaterM3PerMonth" INTEGER NOT NULL DEFAULT 0,
    "wifiRupiah" INTEGER NOT NULL DEFAULT 50000,
    "galonRupiah" INTEGER NOT NULL DEFAULT 20000,
    "petDepositRupiah" INTEGER NOT NULL DEFAULT 100000,
    "extraOccupantFeePercent" INTEGER NOT NULL DEFAULT 20,
    "deepseekModel" TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
    "deepseekFinanceModel" TEXT NOT NULL DEFAULT 'deepseek-v4-pro',
    "deepseekBaseUrl" TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
    "deepseekApiKey" TEXT NOT NULL DEFAULT '',
    "aiFeaturesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiManualOnly" BOOLEAN NOT NULL DEFAULT true,
    "aiOwnerAdminOnly" BOOLEAN NOT NULL DEFAULT true,
    "aiDailyRequestLimit" INTEGER NOT NULL DEFAULT 50,
    "aiMaxInputChars" INTEGER NOT NULL DEFAULT 12000,
    "aiMaxOutputTokens" INTEGER NOT NULL DEFAULT 1400,
    "aiFinanceMaxOutputTokens" INTEGER NOT NULL DEFAULT 2200,
    "aiLogUsage" BOOLEAN NOT NULL DEFAULT true,
    "aiDraftRetentionDays" INTEGER NOT NULL DEFAULT 60,
    "tenantLoyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adminWhatsappNumber" TEXT NOT NULL DEFAULT '6285648887628',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedById" INTEGER,
    CONSTRAINT "OperationalSetting_pkey" PRIMARY KEY (id)
);

-- 8. Buat tabel AdditionalService
CREATE TABLE IF NOT EXISTS "AdditionalService" (
    id SERIAL NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    "priceRupiah" INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdditionalService_pkey" PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS "AdditionalService_isActive_idx" ON "AdditionalService"("isActive");
CREATE INDEX IF NOT EXISTS "AdditionalService_sortOrder_idx" ON "AdditionalService"("sortOrder");

-- ============================================================================
-- SELESAI
-- ============================================================================
