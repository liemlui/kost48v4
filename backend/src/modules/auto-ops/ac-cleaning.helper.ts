/**
 * F5-4 (AUD-3 / D-22.3): penjadwalan cuci AC HIBRID.
 * Basis = interval HARI; PLUS pemicu dini berbasis estimasi kWh (watt × jam-pakai/hari).
 * Tiket dibuat bila SALAH SATU terpenuhi (interval lewat ATAU kWh estimasi tinggi).
 *
 * Murni (tanpa I/O) agar mudah diuji.
 */

// Default wajar bila data kamar kosong (AC 1/2 PK ~ 380–450W; pemakaian ~8 jam/hari).
// Kebijakan properti: seluruh kamar memakai AC ½ PK. Estimasi perawatan tidak
// boleh berubah karena nilai lama yang pernah tersimpan per kamar.
export const AC_HALF_PK_WATTAGE = 380;
export const AC_DEFAULT_WATTAGE = AC_HALF_PK_WATTAGE;
export const AC_DEFAULT_USAGE_HOURS_PER_DAY = 8;
// Ambang kWh untuk pemicu dini (default; override via env AC_CLEAN_KWH_THRESHOLD).
export const AC_DEFAULT_KWH_THRESHOLD = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AcRoomInput = {
  acLastCleanedAt: Date | string | null | undefined;
  acCleanIntervalDays: number;
  acWattage: number | null | undefined;
  acUsageHoursPerDay: number | null | undefined;
};

export type AcCleaningEvaluation = {
  due: boolean;
  reason: 'NEVER' | 'INTERVAL' | 'KWH' | null;
  daysSinceClean: number;
  estimatedKwh: number;
  kwhPerDay: number;
};

export function estimateKwhPerDay(wattage: number, usageHoursPerDay: number): number {
  return (Math.max(0, wattage) * Math.max(0, usageHoursPerDay)) / 1000;
}

export function evaluateAcCleaning(
  room: AcRoomInput,
  now: Date,
  options: { kwhThreshold?: number } = {},
): AcCleaningEvaluation {
  const wattage = AC_HALF_PK_WATTAGE;
  const usageHours = room.acUsageHoursPerDay ?? AC_DEFAULT_USAGE_HOURS_PER_DAY;
  const kwhPerDay = estimateKwhPerDay(wattage, usageHours);
  const kwhThreshold = options.kwhThreshold ?? AC_DEFAULT_KWH_THRESHOLD;

  if (!room.acLastCleanedAt) {
    return { due: true, reason: 'NEVER', daysSinceClean: 0, estimatedKwh: 0, kwhPerDay };
  }

  const last = new Date(room.acLastCleanedAt).getTime();
  const daysSinceClean = Math.max(0, (now.getTime() - last) / MS_PER_DAY);
  const estimatedKwh = kwhPerDay * daysSinceClean;

  const intervalDays = Math.max(1, room.acCleanIntervalDays);
  if (daysSinceClean >= intervalDays) {
    return { due: true, reason: 'INTERVAL', daysSinceClean, estimatedKwh, kwhPerDay };
  }
  // Pemicu dini: kWh estimasi sudah tinggi walau interval belum lewat.
  if (kwhThreshold > 0 && estimatedKwh >= kwhThreshold) {
    return { due: true, reason: 'KWH', daysSinceClean, estimatedKwh, kwhPerDay };
  }
  return { due: false, reason: null, daysSinceClean, estimatedKwh, kwhPerDay };
}
