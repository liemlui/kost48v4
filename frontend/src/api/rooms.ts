import client from './client';

export { uploadRoomImage } from './mediaUploads';

export type AcMaintenanceStatus = 'NEVER' | 'OVERDUE' | 'SOON' | 'OK';

export type AcMaintenanceItem = {
  id: number;
  code: string;
  name?: string | null;
  floor?: string | null;
  acWattage?: number | null;
  acUsageHoursPerDay?: number | null;
  acLastCleanedAt?: string | null;
  acCleanIntervalDays: number;
  nextDueAt?: string | null;
  status: AcMaintenanceStatus;
  due: boolean;
  reason: 'NEVER' | 'INTERVAL' | 'KWH' | null;
  daysSinceClean: number;
  estimatedKwh: number;
  kwhPerDay: number;
  openTicketId?: number | null;
};

export type AcMaintenanceOverview = {
  items: AcMaintenanceItem[];
  summary: { total: number; overdue: number; soon: number };
};

export async function getAcMaintenance() {
  const res = await client.get<{ data: AcMaintenanceOverview }>('/rooms/ac-maintenance');
  return res.data.data;
}

export async function recordAcCleaning(roomId: number) {
  const res = await client.patch<{ data: unknown }>(`/rooms/${roomId}/ac-clean`, {});
  return res.data.data;
}
