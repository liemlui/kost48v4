import client from './client';
import type { OwnerDashboard } from './finance';
import type { AccountingReadiness } from './accounting-types';

export interface MeterDueSummary {
  occupied: number;
  recorded: number;
  due: number;
}

export interface OwnerDashboardAggregate {
  dashboard: OwnerDashboard;
  readiness: AccountingReadiness;
  meterDue: MeterDueSummary;
}

export async function fetchOwnerDashboardAggregate(
  year?: number,
  month?: number,
  trendMonths?: number,
): Promise<OwnerDashboardAggregate> {
  const res = await client.get<{ data: OwnerDashboardAggregate }>('/owner/dashboard/aggregate', {
    params: { year, month, trendMonths },
  });
  return res.data.data;
}
