-- F4-1 Unearned Revenue (PSAK 72) — migration ADDITIVE (zero-risk untuk baris existing).
-- Jadwal pengakuan pendapatan sewa panjang; deferral ke COA 2200 (sudah ada), recognize bertahap.

-- CreateTable
CREATE TABLE "RentRecognitionSchedule" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "scheduledAmountRupiah" INTEGER NOT NULL,
    "recognizedAt" TIMESTAMP(3),
    "journalEntryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentRecognitionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentRecognitionSchedule_stayId_idx" ON "RentRecognitionSchedule"("stayId");

-- CreateIndex
CREATE INDEX "RentRecognitionSchedule_recognizedAt_idx" ON "RentRecognitionSchedule"("recognizedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentRecognitionSchedule_stayId_periodIndex_key" ON "RentRecognitionSchedule"("stayId", "periodIndex");

-- AddForeignKey
ALTER TABLE "RentRecognitionSchedule" ADD CONSTRAINT "RentRecognitionSchedule_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentRecognitionSchedule" ADD CONSTRAINT "RentRecognitionSchedule_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
