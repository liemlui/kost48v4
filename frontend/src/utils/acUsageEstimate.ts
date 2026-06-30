/**
 * Estimasi berapa jam AC/hari yang setara dengan kuota listrik gratis bulanan.
 *
 * Semua kamar kos memakai AC ½ PK (~380W, keputusan owner). Kuota gratis default 30 kWh/bln.
 * Estimasi = (kuota kWh / 30 hari) / daya kW.
 *
 * CAVEAT: kuota mencakup SELURUH listrik kamar (lampu, charger, dll), jadi angka ini
 * adalah batas atas bila listrik dipakai untuk AC saja.
 */

// AC ½ PK ~ 380W (selaras backend room-facility-spec & seed backfill).
export const AC_HALF_PK_WATT = 380;
const DAYS_PER_MONTH = 30;

export function estimateAcHoursPerDay(
  freeKwhPerMonth: number,
  acWatt: number = AC_HALF_PK_WATT,
): number {
  const kw = Math.max(0.001, acWatt / 1000);
  const dailyKwh = Math.max(0, freeKwhPerMonth) / DAYS_PER_MONTH;
  return dailyKwh / kw;
}

/** Teks ringkas, mis. "30 kWh ≈ ~2,6 jam AC/hari (½ PK)". */
export function formatAcHoursEstimate(
  freeKwhPerMonth: number,
  acWatt: number = AC_HALF_PK_WATT,
): string {
  const hours = estimateAcHoursPerDay(freeKwhPerMonth, acWatt);
  const rounded = hours.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  return `${freeKwhPerMonth} kWh ≈ ~${rounded} jam AC/hari (½ PK)`;
}
