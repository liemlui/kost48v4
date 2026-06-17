-- PUB-ROOM-CATEGORY (additive, owner-approved 2026-06-17): kategori & tipe kamar
-- untuk katalog publik (badge + filter). Default STANDARD/REGULAR agar baris lama aman.

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('ECONOMY', 'STANDARD', 'DELUXE');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('REGULAR', 'MEZZANINE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "category" "RoomCategory" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "roomType" "RoomType" NOT NULL DEFAULT 'REGULAR';
