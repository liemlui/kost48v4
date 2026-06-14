-- F3-14/F3-15/F3-17/F3-19: kolom & enum ADDITIVE (semua nullable / ber-default)
-- → zero-risk untuk baris existing. Disetujui owner 2026-06-14
-- (docs/_PROPOSAL_SCHEMA_F3.md). Trigger carve-out deposit ada di sql/bootstrap.sql.

-- F3-15: status barang tenant yang ditinggal pasca-checkout
CREATE TYPE "BelongingsStatus" AS ENUM ('PENDING', 'CLAIMED', 'ABANDONED');

-- F3-17: foto KTP terproteksi + jejak verifikasi + hapus PDP (Tenant)
ALTER TABLE "Tenant"
ADD COLUMN "ktpImageUrl" TEXT,
ADD COLUMN "ktpImageFileKey" TEXT,
ADD COLUMN "ktpImageOriginalFilename" TEXT,
ADD COLUMN "ktpImageMimeType" TEXT,
ADD COLUMN "ktpImageFileSizeBytes" INTEGER,
ADD COLUMN "ktpVerifiedAt" TIMESTAMP(3),
ADD COLUMN "ktpVerifiedById" INTEGER,
ADD COLUMN "ktpDeletedAt" TIMESTAMP(3);

-- F3-14/F3-16: forced-checkout (fled) + F3-15: belongings (Stay)
ALTER TABLE "Stay"
ADD COLUMN "fledMarkedAt" TIMESTAMP(3),
ADD COLUMN "fledMarkedById" INTEGER,
ADD COLUMN "fledReason" TEXT,
ADD COLUMN "belongingsStatus" "BelongingsStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "belongingsDeadline" TIMESTAMP(3),
ADD COLUMN "belongingsResolvedAt" TIMESTAMP(3);

-- F3-19: SLA tiket (Ticket)
ALTER TABLE "Ticket"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "dueAt" TIMESTAMP(3),
ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "escalatedAt" TIMESTAMP(3);

-- Indexes
CREATE INDEX "Stay_belongingsStatus_belongingsDeadline_idx" ON "Stay"("belongingsStatus", "belongingsDeadline");
CREATE INDEX "Ticket_dueAt_idx" ON "Ticket"("dueAt");
CREATE INDEX "Ticket_status_dueAt_idx" ON "Ticket"("status", "dueAt");

-- Foreign keys (onDelete: SetNull, onUpdate: Cascade)
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_fledMarkedById_fkey" FOREIGN KEY ("fledMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ktpVerifiedById_fkey" FOREIGN KEY ("ktpVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
