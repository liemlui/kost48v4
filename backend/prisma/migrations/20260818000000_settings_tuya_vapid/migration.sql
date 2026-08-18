-- Owner-settable Tuya IoT Cloud + Web Push VAPID di OperationalSetting.
-- API key ini sebelumnya hanya bisa lewat env; kini bisa diisi via UI Owner
-- (kosong = fallback env). Kolom bersifat additive & non-breaking.
ALTER TABLE "OperationalSetting"
  ADD COLUMN "tuyaAccessKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tuyaSecretKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tuyaApiBase" TEXT NOT NULL DEFAULT 'https://openapi.tuyaus.com',
  ADD COLUMN "vapidPublicKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "vapidPrivateKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "vapidSubject" TEXT NOT NULL DEFAULT 'mailto:admin@kost48.local';
