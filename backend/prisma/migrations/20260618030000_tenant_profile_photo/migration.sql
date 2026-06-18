-- PUB-FOTO-PROFIL-KTP: foto profil/avatar tenant (default diturunkan dari foto KTP pertama).

-- CreateEnum
CREATE TYPE "ProfilePhotoSource" AS ENUM ('KTP_AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Tenant"
  ADD COLUMN "profilePhotoUrl" TEXT,
  ADD COLUMN "profilePhotoFileKey" TEXT,
  ADD COLUMN "profilePhotoMimeType" TEXT,
  ADD COLUMN "profilePhotoFileSizeBytes" INTEGER,
  ADD COLUMN "profilePhotoSource" "ProfilePhotoSource",
  ADD COLUMN "profilePhotoUpdatedAt" TIMESTAMP(3);
