import client from './client';
import type { ApiEnvelope, InventoryItem, Room, Ticket } from '../types';

export interface StaffRoutineSummary {
  total: number;
  completed: number;
  inProgress: number;
  needHelp: number;
  remaining: number;
  completionPercent: number;
}

export interface StaffDashboardAggregate {
  rooms: { items: Room[] };
  tickets: { items: Ticket[] };
  inventoryItems: { items: InventoryItem[] };
  routineSummary: StaffRoutineSummary;
  meterPendingCount: number;
}

export async function fetchStaffDashboardAggregate(): Promise<StaffDashboardAggregate> {
  const res = await client.get<ApiEnvelope<StaffDashboardAggregate>>(
    '/staff/dashboard/aggregate',
  );
  return res.data.data;
}
