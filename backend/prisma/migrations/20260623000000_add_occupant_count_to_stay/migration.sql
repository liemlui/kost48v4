-- AlterTable: jumlah penghuni per stay; kelebihan di atas batas gratis → +20% sewa per orang
ALTER TABLE "Stay" ADD COLUMN "occupantCount" INTEGER NOT NULL DEFAULT 1;
