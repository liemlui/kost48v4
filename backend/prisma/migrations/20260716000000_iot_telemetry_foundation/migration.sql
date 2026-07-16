-- M15-IOT: Tuya electricity telemetry + ESP32 water ingest foundation.
-- Telemetry is intentionally isolated from the billing MeterReading table.
CREATE TYPE "IotProvider" AS ENUM ('TUYA', 'KOST48_ESP32');
CREATE TYPE "IotDeviceType" AS ENUM ('ELECTRICITY_METER', 'WATER_FLOW_METER');
CREATE TYPE "IotReadingQuality" AS ENUM ('GOOD', 'SUSPECT', 'REJECTED');

CREATE TABLE "IotDevice" (
    "id" SERIAL NOT NULL,
    "deviceCode" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(120),
    "provider" "IotProvider" NOT NULL,
    "deviceType" "IotDeviceType" NOT NULL,
    "roomId" INTEGER,
    "externalDeviceId" VARCHAR(128),
    "productId" VARCHAR(128),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "online" BOOLEAN,
    "lastSeenAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "firmwareVersion" VARCHAR(80),
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "credentialCiphertext" TEXT,
    "credentialVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IotDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IotIngestMessage" (
    "id" BIGSERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "messageId" VARCHAR(160) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" BIGINT,
    "providerTimestamp" BIGINT,
    "rawPayload" JSONB,
    "diagnostics" JSONB,

    CONSTRAINT "IotIngestMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IotTelemetry" (
    "id" BIGSERIAL NOT NULL,
    "ingestMessageId" BIGINT NOT NULL,
    "metric" VARCHAR(100) NOT NULL,
    "valueDecimal" DECIMAL(18,6),
    "valueText" TEXT,
    "unit" VARCHAR(24),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "quality" "IotReadingQuality" NOT NULL DEFAULT 'GOOD',
    "reason" TEXT,

    CONSTRAINT "IotTelemetry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IotDevice_deviceCode_key" ON "IotDevice"("deviceCode");
CREATE UNIQUE INDEX "IotDevice_provider_externalDeviceId_key" ON "IotDevice"("provider", "externalDeviceId");
CREATE INDEX "IotDevice_provider_enabled_idx" ON "IotDevice"("provider", "enabled");
CREATE INDEX "IotDevice_deviceType_enabled_idx" ON "IotDevice"("deviceType", "enabled");
CREATE INDEX "IotDevice_roomId_idx" ON "IotDevice"("roomId");
CREATE INDEX "IotDevice_lastSeenAt_idx" ON "IotDevice"("lastSeenAt");

CREATE UNIQUE INDEX "IotIngestMessage_deviceId_messageId_key" ON "IotIngestMessage"("deviceId", "messageId");
CREATE INDEX "IotIngestMessage_deviceId_observedAt_idx" ON "IotIngestMessage"("deviceId", "observedAt");
CREATE INDEX "IotIngestMessage_receivedAt_idx" ON "IotIngestMessage"("receivedAt");

CREATE UNIQUE INDEX "IotTelemetry_ingestMessageId_metric_key" ON "IotTelemetry"("ingestMessageId", "metric");
CREATE INDEX "IotTelemetry_metric_observedAt_idx" ON "IotTelemetry"("metric", "observedAt");
CREATE INDEX "IotTelemetry_quality_observedAt_idx" ON "IotTelemetry"("quality", "observedAt");

ALTER TABLE "IotDevice"
  ADD CONSTRAINT "IotDevice_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IotIngestMessage"
  ADD CONSTRAINT "IotIngestMessage_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "IotDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IotTelemetry"
  ADD CONSTRAINT "IotTelemetry_ingestMessageId_fkey"
  FOREIGN KEY ("ingestMessageId") REFERENCES "IotIngestMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
