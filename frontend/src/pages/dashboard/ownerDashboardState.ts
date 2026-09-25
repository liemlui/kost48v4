// FILE: ownerDashboardState.ts — state KPI & deteksi periode kosong untuk Dashboard Owner.
// AO-20 sisa (13 Sep 2026): KPI selalu menampilkan angka nyata; fakta usia data / aktivitas
// hidup di fungsi pur (unit-testable), bukan string ad hoc di dalam page.
import type { OwnerDashboard } from '../../api/finance';
import type { MeterDueSummary } from '../../api/ownerDashboard';

// Dashboard refetch interval = 60 s (tanstack staleTime/refetchInterval). Data lebih lama
// dari 2.5× interval => tab/background paused of refetch gagal; tandai stale (belum muat aman).
// dataUpdatedAt dari TanStack Query = epoch ms (number).
export const OWNER_KPI_STALE_MS = 150_000;

export type OwnerPrioritySourceFailure = 'kamar' | 'IoT';

export function ownerPrioritySourceFailures(
  roomsError: boolean,
  iotError: boolean,
): OwnerPrioritySourceFailure[] {
  const failures: OwnerPrioritySourceFailure[] = [];
  if (roomsError) failures.push('kamar');
  if (iotError) failures.push('IoT');
  return failures;
}

export function ownerPriorityScopeLabel(type: string): 'Saat ini' | 'Periode terpilih' {
  return type === 'meter-due' ? 'Periode terpilih' : 'Saat ini';
}

export function ownerPeriodHeadline(headline: string): string {
  return headline.replace(/\s*Ada \d+ hal yang perlu ditindaklanjuti\.\s*$/, '').trim();
}

export function ownerDashboardIsStale(dataUpdatedAt: number | undefined, nowMs: number = Date.now()): boolean {
  if (!dataUpdatedAt) return false;
  return nowMs - dataUpdatedAt > OWNER_KPI_STALE_MS;
}

// Pendapatan KPI = pembayar + WiFi bulan ini (sumber backend). Kedua sumanda >= 0,
// sehingga revenue 0 ⟺ benar-benar belum ada pembayar/WiFi dicatat bulan ini.
// Nol bisnis valid — bukan error dan bukan placeholder.
export function ownerRevenueIsSilentZero(revenueRupiah: number, dataUpdatedAt: number | undefined, nowMs: number = Date.now()): boolean {
  return revenueRupiah === 0 && !ownerDashboardIsStale(dataUpdatedAt, nowMs);
}

// Periode tanpa aktivitas yang dapat dibuktikan dari agregat owner dashboard:
//  revenue 0 (→ no payments, no WiFi) ∧ netCashFlow 0 (→ expenses 0)
//  ∧ netProfit 0 (→ invoices 0 karena netProfit = inv + wifi − expense)
//  ∧ occupancy 0 ∧ signals kosong ∧ meter recorded 0 ∧ tren flat.
// Tidak mengganti nilai: kondisi no-data vs nol valid digalau lewat banner.
export function ownerPeriodHasNoActivity(dashboard: OwnerDashboard | undefined, meterDue: MeterDueSummary | undefined): boolean {
  if (!dashboard) return false;
  const kpi = dashboard.kpi;
  if (kpi.totalRevenueRupiah !== 0 || kpi.netProfitRupiah !== 0 || kpi.netCashFlowRupiah !== 0 || kpi.occupancyRatePercent !== 0) return false;
  if (dashboard.signals.length > 0) return false;
  if (meterDue && (meterDue.recorded ?? 0) !== 0) return false;
  const flat = (months: OwnerDashboard['trendMonths'] | undefined) =>
    !months || months.every((m) => m.revenue === 0 && m.expense === 0 && m.netProfit === 0);
  return flat(dashboard.trendMonths) && flat(dashboard.trend6Months);
}
