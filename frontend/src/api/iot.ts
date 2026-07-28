import client from './client';
import type { ApiEnvelope } from '../types';

export type IotProvider = 'TUYA' | 'KOST48_ESP32';
export type IotDeviceType = 'ELECTRICITY_METER' | 'WATER_FLOW_METER';
export type IotReadingQuality = 'GOOD' | 'SUSPECT' | 'REJECTED';

export const iotQueryKeys = {
  all: ['iot'] as const,
  overview: ['iot', 'overview'] as const,
  tenantUtility: (roomId?: number | null) => ['iot', 'tenant-utility', roomId ?? null] as const,
  tenantUtilityRoot: ['iot', 'tenant-utility'] as const,
  tenantTimeline: (roomId?: number | null) => ['iot', 'tenant-electricity-timeline', roomId ?? null] as const,
};

export type IotTelemetryValue = {
  id: string;
  metric: string;
  value: number | string | null;
  unit?: string | null;
  observedAt: string;
  quality: IotReadingQuality;
  reason?: string | null;
  ingestMessageId?: string;
  messageId?: string;
  receivedAt?: string;
};

export type IotDevice = {
  id: number;
  deviceCode: string;
  displayName?: string | null;
  provider: IotProvider;
  deviceType: IotDeviceType;
  roomId?: number | null;
  room?: { id: number; code: string; name?: string | null } | null;
  externalDeviceId?: string | null;
  productId?: string | null;
  enabled: boolean;
  online?: boolean | null;
  lastSeenAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  firmwareVersion?: string | null;
  credentialProvisioned: boolean;
  credentialVersion: number;
  latestTelemetry: IotTelemetryValue[];
};

export type IotOverview = {
  /** Dikirim backend baru; client lama tetap memakai fallback 30 menit. */
  staleAfterMinutes?: number;
  configuration: {
    tuya: {
      configured: boolean;
      clientIdPresent: boolean;
      secretPresent: boolean;
      baseUrlValid: boolean;
      region?: string | null;
    };
    esp32CredentialVaultConfigured: boolean;
    waterIngestPath: string;
    billingIsolation: boolean;
  };
  summary: {
    total: number;
    enabled: number;
    online: number;
    stale: number;
    tuya: number;
    water: number;
  };
  devices: IotDevice[];
};

export type CreateIotDevicePayload = {
  deviceCode: string;
  displayName?: string;
  provider: IotProvider;
  deviceType: IotDeviceType;
  roomId?: number;
  externalDeviceId?: string;
  productId?: string;
  enabled?: boolean;
};

export type TuyaProbeResult = {
  connected: boolean;
  device: { name?: string; category?: string; model?: string; online?: boolean };
  metricCount: number;
  metrics: Array<{ metric: string; valueDecimal?: number; valueText?: string; unit?: string; quality: IotReadingQuality }>;
  observedAt: string;
};

export type DeviceSecretResult = {
  deviceCode: string;
  deviceSecret: string;
  credentialVersion: number;
  warning: string;
};

export type TenantUtilityStatus = 'NO_DEVICE' | 'NOT_CONNECTED' | 'OFFLINE' | 'STALE' | 'NO_FLOW' | 'ONLINE';

export type TenantUtilityDevice = {
  utilityType: 'ELECTRICITY' | 'WATER';
  status: TenantUtilityStatus;
  statusMessage: string;
  lastSeenAt: string | null;
  observedAt: string | null;
  total: number | null;
  unit: string;
  flowRateLpm: number | null;
  quality: IotReadingQuality | null;
  /** Live wattage — hanya untuk ELECTRICITY (null untuk WATER) */
  powerW: number | null;
  /** Live voltage — hanya untuk ELECTRICITY (null untuk WATER) */
  voltageV: number | null;
  /** Live current — hanya untuk ELECTRICITY (null untuk WATER) */
  currentA: number | null;
};

export type TenantRoomUtilityTelemetry = {
  room: { code: string; name: string | null } | null;
  refreshedAt: string;
  staleAfterMinutes: number;
  billingNotice: string;
  cycle: {
    start: string;
    end: string;
    allowanceMonths: number;
    source: 'IOT_TELEMETRY' | 'METER_READING' | 'NONE';
    electricity: {
      usageKwh: number | null;
      freeKwh: number;
      chargeableKwh: number | null;
      tariffRupiah: number;
      estimatedChargeRupiah: number | null;
      billingReady: boolean;
      resetDetected: boolean;
    };
    meter: {
      baselineKwh: number | null;
      baselineAt: string | null;
      latestKwh: number | null;
      latestAt: string | null;
      usageKwh: number | null;
    };
    telemetry: {
      baselineKwh: number | null;
      baselineAt: string | null;
      latestKwh: number | null;
      latestAt: string | null;
      usageKwh: number | null;
      quality: IotReadingQuality | null;
    };
  };
  electricity: TenantUtilityDevice;
  water: TenantUtilityDevice;
};

export type TenantElectricityTimeline = {
  start: string;
  end: string;
  source: 'IOT_TELEMETRY' | 'NONE';
  baselineAvailable: boolean;
  resetDetected: boolean;
  points: Array<{
    /** Jakarta calendar date, one final sensor reading per day. */
    date: string;
    observedAt: string;
    /** Cumulative usage from the active paid lease-period baseline. */
    totalUsageKwh: number;
    quality: IotReadingQuality;
  }>;
};

export async function getIotOverview(): Promise<IotOverview> {
  const response = await client.get<ApiEnvelope<IotOverview>>('/iot/overview');
  return response.data.data;
}

export async function getMyRoomUtilityTelemetry(): Promise<TenantRoomUtilityTelemetry> {
  const response = await client.get<ApiEnvelope<TenantRoomUtilityTelemetry>>('/iot/tenant/my-room');
  return response.data.data;
}

export async function getMyRoomElectricityTimeline(): Promise<TenantElectricityTimeline> {
  const response = await client.get<ApiEnvelope<TenantElectricityTimeline>>('/iot/tenant/electricity-timeline');
  return response.data.data;
}

export async function refreshMyRoomMeter(): Promise<{ synced: number; total: number; failed: number; message?: string }> {
  const response = await client.post<ApiEnvelope<{ synced: number; total: number; failed: number; message?: string }>>('/iot/tenant/refresh');
  return response.data.data;
}

export async function getIotDeviceTelemetry(
  id: number,
  params: { metric?: string; from?: string; to?: string; limit?: number } = {},
): Promise<IotTelemetryValue[]> {
  const response = await client.get<ApiEnvelope<IotTelemetryValue[]>>(`/iot/devices/${id}/telemetry`, { params });
  return response.data.data;
}

export async function createIotDevice(payload: CreateIotDevicePayload): Promise<IotDevice> {
  const response = await client.post<ApiEnvelope<IotDevice>>('/iot/devices', payload);
  return response.data.data;
}

export async function updateIotDevice(id: number, payload: Partial<Pick<IotDevice, 'displayName' | 'roomId' | 'externalDeviceId' | 'productId' | 'enabled'>>): Promise<IotDevice> {
  const response = await client.patch<ApiEnvelope<IotDevice>>(`/iot/devices/${id}`, payload);
  return response.data.data;
}

export async function probeTuya(externalDeviceId: string): Promise<TuyaProbeResult> {
  const response = await client.post<ApiEnvelope<TuyaProbeResult>>('/iot/tuya/probe', { externalDeviceId });
  return response.data.data;
}

export async function syncTuyaDevice(id: number) {
  const response = await client.post<ApiEnvelope<{ duplicate: boolean; telemetryCount: number; observedAt: string }>>(`/iot/devices/${id}/sync`, {});
  return response.data.data;
}

export async function backfillIotDeviceHistory(id: number, days = 7) {
  const response = await client.post<ApiEnvelope<{
    deviceId: number;
    dpCode: string;
    daysBack: number;
    totalLogs: number;
    stored: number;
    pageCount: number;
    truncated: boolean;
  }>>(`/iot/devices/${id}/backfill`, {}, { params: { days }, timeout: 60_000 });
  return response.data.data;
}

export async function syncAllTuya() {
  const response = await client.post<ApiEnvelope<{ total: number; succeeded: number; failed: number }>>('/iot/tuya/sync-all', {}, { timeout: 60_000 });
  return response.data.data;
}

export async function rotateIotDeviceSecret(id: number): Promise<DeviceSecretResult> {
  const response = await client.post<ApiEnvelope<DeviceSecretResult>>(`/iot/devices/${id}/rotate-secret`, {});
  return response.data.data;
}
