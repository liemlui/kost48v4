-- S-09: status KTP eksplisit. Aditif & nullable agar tenant tanpa KTP
-- tidak otomatis berstatus PENDING. Backfill dari kolom lama.
DO $$ BEGIN
  CREATE TYPE "KtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ktpStatus" "KtpStatus";
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ktpRejectedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ktpRejectionReason" TEXT;

UPDATE "Tenant"
SET "ktpStatus" = 'VERIFIED'
WHERE "ktpVerifiedAt" IS NOT NULL AND "ktpStatus" IS NULL;

UPDATE "Tenant"
SET "ktpStatus" = 'PENDING'
WHERE "ktpImageFileKey" IS NOT NULL AND "ktpVerifiedAt" IS NULL AND "ktpStatus" IS NULL;
