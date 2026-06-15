-- S-5 (additive): AUD-3 jam-pakai AC per kamar (estimasi kWh hibrid) + AUD-5 penanda tiket dikerjakan vendor luar.

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "acUsageHoursPerDay" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "handledByVendor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendorNote" TEXT;
