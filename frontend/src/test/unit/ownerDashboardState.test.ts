// FILE: ownerDashboardState.test.ts — unit test deteksi state KPI Dashboard Owner (AO-20).
import { describe, expect, it } from 'vitest';
import {
  OWNER_KPI_STALE_MS,
  ownerDashboardIsStale,
  ownerPeriodHasNoActivity,
  ownerPrioritySourceFailures,
  ownerRevenueIsSilentZero,
} from '../../pages/dashboard/ownerDashboardState';
import type { OwnerDashboard } from '../../api/finance';

const NOW = Date.parse('2026-09-13T12:00:00+07:00');

function dashboard(over: Partial<OwnerDashboard> = {}): OwnerDashboard {
  return {
    year: 2026, month: 9, grade: 'SEHAT', score: 100, headline: 'test',
    kpi: {
      totalRevenueRupiah: 0, totalRevenuePrevMonthRupiah: 0, totalRevenueChangePercent: 0,
      netProfitRupiah: 0, netProfitPrevMonthRupiah: 0, netProfitChangePercent: 0, netProfitMarginPercent: 0,
      occupancyRatePercent: 0, occupancyRatePrevMonthPercent: null, occupancyRateChangePercent: null,
      netCashFlowRupiah: 0, netCashFlowPrevMonthRupiah: 0, netCashFlowChangePercent: 0,
    },
    signals: [],
    trendMonths: [],
    trend6Months: [],
    generatedAt: new Date(NOW).toISOString(),
    ...over,
  };
}

describe('ownerDashboardIsStale', () => {
  it('fresh data not stale', () => expect(ownerDashboardIsStale(NOW, NOW)).toBe(false));
  it('older than threshold is stale', () => expect(ownerDashboardIsStale(NOW - OWNER_KPI_STALE_MS - 1, NOW)).toBe(true));
  it('boundary (== threshold) is not stale', () => expect(ownerDashboardIsStale(NOW - OWNER_KPI_STALE_MS, NOW)).toBe(false));
  it('undefined or zero is not stale', () => {
    expect(ownerDashboardIsStale(undefined, NOW)).toBe(false);
    expect(ownerDashboardIsStale(0, NOW)).toBe(false);
  });
});

describe('ownerPrioritySourceFailures', () => {
  it('returns no failures when all supplementary sources succeed', () => {
    expect(ownerPrioritySourceFailures(false, false)).toEqual([]);
  });

  it('identifies each failed supplementary source', () => {
    expect(ownerPrioritySourceFailures(true, false)).toEqual(['kamar']);
    expect(ownerPrioritySourceFailures(false, true)).toEqual(['IoT']);
    expect(ownerPrioritySourceFailures(true, true)).toEqual(['kamar', 'IoT']);
  });
});

describe('ownerRevenueIsSilentZero', () => {
  it('Rp 0 fresh -> silent zero valid', () => expect(ownerRevenueIsSilentZero(0, NOW, NOW)).toBe(true));
  it('Rp 0 stale -> not silent (stale note wins)', () => expect(ownerRevenueIsSilentZero(0, NOW - OWNER_KPI_STALE_MS - 1, NOW)).toBe(false));
  it('positive value is never silent zero', () => expect(ownerRevenueIsSilentZero(500000, NOW, NOW)).toBe(false));
});

describe('ownerPeriodHasNoActivity', () => {
  it('undefined dashboard -> false', () => expect(ownerPeriodHasNoActivity(undefined, undefined)).toBe(false));
  it('empty period -> true', () => expect(ownerPeriodHasNoActivity(dashboard(), undefined)).toBe(true));
  it('revenue present -> false', () => expect(ownerPeriodHasNoActivity(dashboard({ kpi: { ...dashboard().kpi, totalRevenueRupiah: 1 } }), undefined)).toBe(false));
  it('occupancy present -> false', () => expect(ownerPeriodHasNoActivity(dashboard({ kpi: { ...dashboard().kpi, occupancyRatePercent: 30 } }), undefined)).toBe(false));
  it('signal present -> false', () => expect(ownerPeriodHasNoActivity(dashboard({ signals: [{ type: 'overdue', count: 1, route: '/invoices' }] }), undefined)).toBe(false));
  it('meter recorded -> false', () => expect(ownerPeriodHasNoActivity(dashboard(), { occupied: 1, recorded: 1, due: 0 })).toBe(false));
  it('trend with value -> false', () => expect(ownerPeriodHasNoActivity(dashboard({ trendMonths: [{ year: 2026, month: 9, revenue: 100, expense: 0, netProfit: 100 }] }), undefined)).toBe(false));
});
