// F1-4 (F-02/F-18) — helper rasio keuangan PURE & teruji.
// Diekstrak dari accounting-reports.service.ts (financialRatios) agar bisa diuji
// zero-dependency (lihat backend/test/unit/financial-ratios.helper.test.js).
//
// Prefix COA aktual (constants/default-coa.ts):
//   Kas/Bank 1000/1010/1020 → '10' · Piutang/AR 1100 → '11' · Inventory 1200 → '12'
//   Fixed Asset 1500/1590 → '15' · Liabilities 2000(deposit)/2100/2200/2300 → '20'..'23'

export interface RatioLine {
  type: string;
  code: string | number;
  balanceRupiah: number;
}

/** Kas & bank: prefix '10' (BUKAN '11' = piutang) — fix F-18. */
export const CASH_PREFIXES = ['10'];
/** Persediaan: COA 1200 → prefix '12' (kode lama '14' tak pernah cocok). */
export const INVENTORY_PREFIXES = ['12'];
/** Kewajiban lancar: 2000(deposit)/2100/2200/2300 — '21' saja melewatkan deposit. */
export const CURRENT_LIABILITY_PREFIXES = ['20', '21', '22', '23'];

export function sumLinesByPrefix(lines: RatioLine[], type: string, prefixes: string[]): number {
  return lines
    .filter((l) => l.type === type && prefixes.some((p) => String(l.code).startsWith(p)))
    .reduce((sum, l) => sum + Number(l.balanceRupiah ?? 0), 0);
}

/**
 * Expense ratio dalam PERSEN, 2 desimal. Fix F-02: versi lama
 * `expenseRupiah ?? 0 / totalRevenue` salah presedensi (`/` mengikat lebih kuat dari `??`)
 * → praktis = expenseRupiah, lalu ×100 (jadi ratusan juta persen / "1e8").
 * Benar: (expense / revenue) × 100.
 */
export function expenseRatioPercent(expenseRupiah: number, totalRevenue: number): number {
  if (!(totalRevenue > 0)) return 0;
  return Math.round(((expenseRupiah ?? 0) / totalRevenue) * 10000) / 100;
}

/**
 * F1-4/F1-6 (F-04): occupancy % = stay promoted (huni) / kamar operable, 2 desimal.
 * operable = total kamar isActive − (MAINTENANCE + INACTIVE). operable 0 → 0 (bukan Infinity).
 * Konsisten dengan finance.service occupancySummary.
 */
export function occupancyRatePercent(occupiedPromoted: number, operableRooms: number): number {
  if (!(operableRooms > 0)) return 0;
  return Math.round((occupiedPromoted / operableRooms) * 10000) / 100;
}
