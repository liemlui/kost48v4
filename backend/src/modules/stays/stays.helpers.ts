import { Prisma } from 'src/generated/prisma';

export function normalizeStayForResponse<T extends Record<string, any>>(stay: T): T & { cancelReason: string | null } {
  return {
    ...stay,
    cancelReason:
      stay.status === 'CANCELLED'
        ? ((stay as any).cancelReason ?? (stay as any).checkoutReason ?? null)
        : ((stay as any).cancelReason ?? null),
  };
}

export function buildUtilitySuggestion(input: {
  lineType: 'ELECTRICITY' | 'WATER';
  description: string;
  unit: string;
  unitPriceRupiah: number;
  latestReadings: Array<{ readingValue: Prisma.Decimal; readingAt: Date }>;
  source: string;
  sortOrder: number;
}) {
  if (input.unitPriceRupiah <= 0 || input.latestReadings.length < 2) return null;
  const [latest, previous] = input.latestReadings;
  const usage = latest.readingValue.minus(previous.readingValue);
  if (usage.lte(0)) return null;
  const usageNumber = usage.toNumber();
  return {
    lineType: input.lineType,
    utilityType: input.lineType,
    description: input.description,
    qty: usage.toFixed(3),
    unit: input.unit,
    unitPriceRupiah: input.unitPriceRupiah,
    lineAmountRupiah: Math.round(usageNumber * input.unitPriceRupiah),
    sortOrder: input.sortOrder,
    source: input.source,
    meterPeriod: {
      previousReadingAt: previous.readingAt,
      latestReadingAt: latest.readingAt,
    },
  };
}

export function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

export function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

export function resolveRent(room: any, pricingTerm: string) {
  if (pricingTerm === 'DAILY') return room.dailyRateRupiah ?? 0;
  if (pricingTerm === 'WEEKLY') return room.weeklyRateRupiah ?? 0;
  if (pricingTerm === 'BIWEEKLY') return room.biWeeklyRateRupiah ?? 0;
  return room.monthlyRateRupiah;
}

export function mapPricingTermToUnit(pricingTerm: string): string {
  switch (pricingTerm) {
    case 'DAILY': return 'hari';
    case 'WEEKLY': return 'minggu';
    case 'BIWEEKLY': return '2 minggu';
    case 'MONTHLY': return 'bulan';
    case 'SMESTERLY': return 'semester';
    case 'YEARLY': return 'tahun';
    default: return 'bulan';
  }
}

export function calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
  if (plannedCheckOutDate) return plannedCheckOutDate;
  const result = new Date(checkInDate);
  switch (pricingTerm) {
    case 'DAILY': result.setDate(result.getDate() + 1); break;
    case 'WEEKLY': result.setDate(result.getDate() + 7); break;
    case 'BIWEEKLY': result.setDate(result.getDate() + 14); break;
    case 'MONTHLY': result.setMonth(result.getMonth() + 1); break;
    case 'SMESTERLY': result.setMonth(result.getMonth() + 6); break;
    case 'YEARLY': result.setFullYear(result.getFullYear() + 1); break;
    default: result.setMonth(result.getMonth() + 1);
  }
  return result;
}

export function calculateDueDate(periodEnd: Date): Date {
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + 3);
  return dueDate;
}
