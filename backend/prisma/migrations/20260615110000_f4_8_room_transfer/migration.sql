
-- CreateTable
CREATE TABLE "RoomTransfer" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "fromRoomId" INTEGER NOT NULL,
    "toRoomId" INTEGER NOT NULL,
    "transferDate" DATE NOT NULL,
    "reason" TEXT,
    "rentBeforeRupiah" INTEGER NOT NULL,
    "rentAfterRupiah" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomTransfer_stayId_idx" ON "RoomTransfer"("stayId");

-- CreateIndex
CREATE INDEX "RoomTransfer_fromRoomId_idx" ON "RoomTransfer"("fromRoomId");

-- CreateIndex
CREATE INDEX "RoomTransfer_toRoomId_idx" ON "RoomTransfer"("toRoomId");

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_fromRoomId_fkey" FOREIGN KEY ("fromRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_toRoomId_fkey" FOREIGN KEY ("toRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

