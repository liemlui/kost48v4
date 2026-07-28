import type { MeterReading, MeterRow } from '../types';
import { toDateKeyWib } from './dateTime';

export function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Bangun baris meter per-tanggal + hitung selisih pemakaian (usage) dari catatan sebelumnya.
export function buildMeterRows(readings: MeterReading[]): MeterRow[] {
  const sorted = readings
    .filter((reading) => Boolean(toDateKeyWib(reading.readingAt)))
    .sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime());
  const grouped = new Map<string, MeterRow>();
  sorted.forEach((reading) => {
    const dateKey = toDateKeyWib(reading.readingAt);
    const row = grouped.get(dateKey) ?? { dateKey, readingAt: reading.readingAt };
    if (String(reading.utilityType).toUpperCase() === 'ELECTRICITY') row.electricityKwh = numeric(reading.readingValue);
    if (String(reading.utilityType).toUpperCase() === 'WATER') row.waterM3 = numeric(reading.readingValue);
    grouped.set(dateKey, row);
  });
  const rows = Array.from(grouped.values()).sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime());
  let prevElectricity: number | null = null;
  let prevWater: number | null = null;
  return rows.map((row, index) => {
    const next = { ...row };
    if (typeof next.electricityKwh === 'number') {
      next.usageElectricityKwh = index === 0 || prevElectricity === null ? 0 : next.electricityKwh - prevElectricity;
      prevElectricity = next.electricityKwh;
    }
    if (typeof next.waterM3 === 'number') {
      next.usageWaterM3 = index === 0 || prevWater === null ? 0 : next.waterM3 - prevWater;
      prevWater = next.waterM3;
    }
    return next;
  });
}

// Pisahkan catatan: sejak penghuni masuk vs sebelum masuk (catatan kamar lama).
export function categorizeReadings(readings: MeterReading[], checkInDate?: string) {
  if (!checkInDate) return { sinceCheckIn: readings, beforeCheckIn: [] as MeterReading[] };
  const checkInKey = toDateKeyWib(checkInDate);
  if (!checkInKey) return { sinceCheckIn: readings, beforeCheckIn: [] as MeterReading[] };
  const sinceCheckIn: MeterReading[] = [];
  const beforeCheckIn: MeterReading[] = [];
  readings.forEach((reading) => {
    const readingKey = toDateKeyWib(reading.readingAt);
    (readingKey && readingKey >= checkInKey ? sinceCheckIn : beforeCheckIn).push(reading);
  });
  return { sinceCheckIn, beforeCheckIn };
}

export type UtilityUsageSummary = {
  rows: MeterRow[];
  totalElectricityKwh: number;
  totalWaterM3: number;
  latestRow: MeterRow | null;
  hasNegative: boolean;
};

export function summarizeUsageSinceCheckIn(readings: MeterReading[], checkInDate?: string): UtilityUsageSummary {
  const { sinceCheckIn } = categorizeReadings(readings, checkInDate);
  const rows = buildMeterRows(sinceCheckIn);
  const totals = rows.reduce(
    (acc, r) => ({ e: acc.e + (r.usageElectricityKwh || 0), w: acc.w + (r.usageWaterM3 || 0) }),
    { e: 0, w: 0 },
  );
  return {
    rows,
    totalElectricityKwh: totals.e,
    totalWaterM3: totals.w,
    latestRow: rows.length ? rows[rows.length - 1] : null,
    hasNegative: rows.some((r) => numeric(r.usageElectricityKwh) < 0 || numeric(r.usageWaterM3) < 0),
  };
}

// Estimasi biaya untuk satu nilai pemakaian (usage), cocok dgn logika MeterCycleModal.
export function estimateUtilityCost(params: {
  electricityUsageKwh: number;
  waterUsageM3: number;
  electricityTariff: number;
  waterTariff: number;
  freeKwh: number;
  waterEnabled: boolean;
}) {
  const chargeableKwh = Math.max(0, params.electricityUsageKwh - params.freeKwh);
  const electricity = chargeableKwh * params.electricityTariff;
  const water = params.waterEnabled ? Math.max(0, params.waterUsageM3) * params.waterTariff : 0;
  return { chargeableKwh, electricity, water, total: electricity + water };
}
