import { createResource, listResource } from './resources';
import { MeterReading, PaginatedResponse } from '../types';

export async function getMeterReadingsByRoom(roomId: number | string) {
  const response = await listResource<MeterReading>('/meter-readings', { roomId });
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
