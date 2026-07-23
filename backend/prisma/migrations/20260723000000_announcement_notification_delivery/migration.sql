-- P2: kategori notifikasi eksplisit dan outbox pengumuman terjadwal.
-- Additive: data AppNotification lama menjadi SYSTEM melalui default database.

CREATE TYPE "NotificationCategory" AS ENUM ('FINANCE', 'OPERATIONS', 'SYSTEM');

ALTER TABLE "Announcement"
  ADD COLUMN "dispatchedAt" TIMESTAMP(3);

ALTER TABLE "AppNotification"
  ADD COLUMN "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM';

-- Pertahankan kategori yang berguna untuk riwayat notifikasi. Event baru
-- selalu mengirim category eksplisit atau memakai resolver di service.
UPDATE "AppNotification"
SET "category" = CASE
  WHEN upper(regexp_replace(coalesce("entityType", ''), '[^a-zA-Z0-9]', '', 'g')) IN (
    'INVOICE', 'PAYMENT', 'PAYMENTSUBMISSION', 'DEPOSIT', 'LOYALTY', 'ACCOUNTING'
  ) THEN 'FINANCE'::"NotificationCategory"
  WHEN upper(regexp_replace(coalesce("entityType", ''), '[^a-zA-Z0-9]', '', 'g')) IN (
    'ANNOUNCEMENT', 'BOOKING', 'STAY', 'RENEWREQUEST', 'CHECKOUTREQUEST',
    'TICKET', 'TICKETSLA', 'ROOM', 'ROOMTRANSFER', 'SERVICEINTEREST',
    'BELONGINGSABANDONED', 'STAFFFIELDREPORT'
  ) THEN 'OPERATIONS'::"NotificationCategory"
  ELSE 'SYSTEM'::"NotificationCategory"
END;

CREATE INDEX "AppNotification_category_idx" ON "AppNotification"("category");
