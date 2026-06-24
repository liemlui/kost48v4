-- Additive migration: konstanta layanan tambahan (owner-settable) + flag hewan peliharaan per stay
-- Semua kolom memiliki DEFAULT → aman dijalankan di database yang sudah ada data.

-- OperationalSetting: 4 konstanta baru
ALTER TABLE "OperationalSetting" ADD COLUMN IF NOT EXISTS "wifiRupiah"              INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE "OperationalSetting" ADD COLUMN IF NOT EXISTS "galonRupiah"             INTEGER NOT NULL DEFAULT 20000;
ALTER TABLE "OperationalSetting" ADD COLUMN IF NOT EXISTS "petDepositRupiah"        INTEGER NOT NULL DEFAULT 100000;
ALTER TABLE "OperationalSetting" ADD COLUMN IF NOT EXISTS "extraOccupantFeePercent" INTEGER NOT NULL DEFAULT 20;

-- Stay: flag hewan peliharaan
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "hasPet" BOOLEAN NOT NULL DEFAULT false;
