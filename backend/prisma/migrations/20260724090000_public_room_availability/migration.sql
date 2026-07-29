-- Public availability is a marketing override only. It deliberately does not
-- touch Room.status, which remains the source of truth for stays and billing.
CREATE TYPE "PublicRoomAvailabilityStatus" AS ENUM ('AVAILABLE', 'FULL', 'HIDDEN');

CREATE TABLE "PublicRoomAvailability" (
  "roomId" INTEGER NOT NULL,
  "status" "PublicRoomAvailabilityStatus" NOT NULL DEFAULT 'FULL',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicRoomAvailability_pkey" PRIMARY KEY ("roomId")
);

CREATE INDEX "PublicRoomAvailability_status_idx" ON "PublicRoomAvailability"("status");

ALTER TABLE "PublicRoomAvailability"
  ADD CONSTRAINT "PublicRoomAvailability_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
