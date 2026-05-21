-- V5.16-G1 Staff Routine Checklist + KPI
-- Adds configurable routine checklist templates, assignments, and completions.
-- No destructive data reset. No lifecycle/payment/finance mutation.

CREATE TYPE "StaffRoutineFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "StaffRoutineAreaType" AS ENUM ('GENERAL', 'BATHROOM', 'ROOM', 'INVENTORY', 'METER', 'SECURITY', 'CLEANING');
CREATE TYPE "StaffRoutineStatus" AS ENUM ('DONE', 'NEED_HELP', 'MISSED', 'SKIPPED');

CREATE TABLE "StaffRoutineTemplate" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "frequency" "StaffRoutineFrequency" NOT NULL DEFAULT 'DAILY',
  "areaType" "StaffRoutineAreaType" NOT NULL DEFAULT 'GENERAL',
  "dayOfWeek" INTEGER,
  "dayOfMonth" INTEGER,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresNote" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffRoutineTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "StaffRoutineAssignment" (
  "id" SERIAL PRIMARY KEY,
  "templateId" INTEGER NOT NULL,
  "staffUserId" INTEGER,
  "roomId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffRoutineAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StaffRoutineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffRoutineAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffRoutineAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "StaffRoutineCompletion" (
  "id" SERIAL PRIMARY KEY,
  "templateId" INTEGER NOT NULL,
  "assignmentId" INTEGER,
  "staffUserId" INTEGER NOT NULL,
  "roomId" INTEGER,
  "dueDate" DATE NOT NULL,
  "status" "StaffRoutineStatus" NOT NULL DEFAULT 'DONE',
  "completedAt" TIMESTAMP(3),
  "note" TEXT,
  "photoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffRoutineCompletion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StaffRoutineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffRoutineCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "StaffRoutineAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StaffRoutineCompletion_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffRoutineCompletion_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "StaffRoutineTemplate_frequency_idx" ON "StaffRoutineTemplate"("frequency");
CREATE INDEX "StaffRoutineTemplate_areaType_idx" ON "StaffRoutineTemplate"("areaType");
CREATE INDEX "StaffRoutineTemplate_isActive_sortOrder_idx" ON "StaffRoutineTemplate"("isActive", "sortOrder");
CREATE INDEX "StaffRoutineAssignment_templateId_idx" ON "StaffRoutineAssignment"("templateId");
CREATE INDEX "StaffRoutineAssignment_staffUserId_idx" ON "StaffRoutineAssignment"("staffUserId");
CREATE INDEX "StaffRoutineAssignment_roomId_idx" ON "StaffRoutineAssignment"("roomId");
CREATE INDEX "StaffRoutineAssignment_isActive_idx" ON "StaffRoutineAssignment"("isActive");
CREATE UNIQUE INDEX "StaffRoutineCompletion_unique_work" ON "StaffRoutineCompletion"("templateId", "assignmentId", "staffUserId", "roomId", "dueDate");
CREATE INDEX "StaffRoutineCompletion_staffUserId_dueDate_idx" ON "StaffRoutineCompletion"("staffUserId", "dueDate");
CREATE INDEX "StaffRoutineCompletion_status_idx" ON "StaffRoutineCompletion"("status");
CREATE INDEX "StaffRoutineCompletion_roomId_idx" ON "StaffRoutineCompletion"("roomId");

INSERT INTO "StaffRoutineTemplate" ("title", "description", "frequency", "areaType", "requiresPhoto", "requiresNote", "sortOrder") VALUES
('Sapu ruang umum', 'Bersihkan debu dan sampah kecil di area umum.', 'DAILY', 'CLEANING', false, false, 10),
('Pel ruang umum', 'Pel area umum supaya penghuni nyaman.', 'DAILY', 'CLEANING', false, false, 20),
('Buang sampah', 'Kosongkan tempat sampah area umum.', 'DAILY', 'GENERAL', false, false, 30),
('Cek kamar mandi umum', 'Cek lantai, kran, lampu, bau, dan saluran air.', 'DAILY', 'BATHROOM', false, false, 40),
('Cek lampu area umum', 'Pastikan lampu lorong dan area depan menyala normal.', 'DAILY', 'SECURITY', false, false, 50),
('Bersihkan kamar mandi lebih dalam', 'Bersihkan kerak dan saluran air kamar mandi umum.', 'WEEKLY', 'BATHROOM', true, false, 110),
('Cek stok alat bersih-bersih', 'Cek sapu, pel, cairan pembersih, lampu, dan alat kecil.', 'WEEKLY', 'INVENTORY', false, false, 120),
('Cek area parkir dan depan kos', 'Cek kebersihan, lampu, keamanan, dan barang tertinggal.', 'WEEKLY', 'GENERAL', false, false, 130),
('Audit kondisi kamar bulanan', 'Cek barang kamar, lampu, AC/kipas, kasur, lemari, dan foto kondisi kamar bila perlu.', 'MONTHLY', 'ROOM', true, true, 210),
('Cek meter kamar bulanan', 'Pastikan meter listrik/air kamar terbaca dan tidak ada angka aneh.', 'MONTHLY', 'METER', true, false, 220);
