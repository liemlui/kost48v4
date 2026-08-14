import { createResource, listResource } from './resources';
import { MeterReading, PaginatedResponse } from '../types';

export async function getMeterReadingsByRoom(roomId: number | string, params?: { from?: string; to?: string; utilityType?: string; limit?: number }) {
  const response = await listResource<MeterReading>('/meter-readings', { roomId, ...params });
  return response.items ?? [];
}

export async function createMeterReading(payload: {
  roomId: number;
  utilityType: string;
  readingAt: string;
  readingValue: string | number;
  note?: string;
}) {
  return createResource<MeterReading>('/meter-readings', payload as unknown as Record<string, unknown>);
}

// M-2: catat siklus meter (listrik+air) + auto-generate invoice (OWNER/ADMIN).
export type MeterCycleResult = {
  readings: { electricity: MeterReading; water: MeterReading | null };
  invoice: { id: number; invoiceNumber: string; totalAmountRupiah: number; status: string } | null;
  summary: {
    elecUsage: number;
    elecChargeable: number;
    waterUsage: number;
    waterChargeable: number;
    electricityCycle?: { start: string; end: string; allowanceMonths: number; freeKwh: number };
  };
  message?: string;
};

export async function recordMeterCycle(payload: {
  roomId: number;
  readingAt: string;
  electricityReadingValue?: string;
  /** true = baca counter Tuya kumulatif (add_ele) on-demand, tanpa mengetik manual */
  autoElectricity?: boolean;
  waterReadingValue?: string;
  note?: string;
}) {
  return createResource<MeterCycleResult>('/meter-readings/cycle', payload as unknown as Record<string, unknown>);
}
