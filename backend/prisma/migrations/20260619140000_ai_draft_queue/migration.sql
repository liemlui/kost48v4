-- G9 (S-6): antrean draft AI lintas sesi. Additive; tidak mengubah tabel lain.

-- CreateEnum
CREATE TYPE "AiDraftStatus" AS ENUM ('DRAFT', 'APPLIED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AiDraft" (
    "id" SERIAL NOT NULL,
    "feature" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" "AiDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" TEXT NOT NULL,
    "model" TEXT,
    "snapshotHash" TEXT,
    "promptHash" TEXT,
    "confidence" DOUBLE PRECISION,
    "resultJson" JSONB NOT NULL,
    "usageJson" JSONB,
    "createdById" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiDraft_feature_status_idx" ON "AiDraft"("feature", "status");

-- CreateIndex
CREATE INDEX "AiDraft_targetType_targetId_idx" ON "AiDraft"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiDraft_createdAt_idx" ON "AiDraft"("createdAt");
