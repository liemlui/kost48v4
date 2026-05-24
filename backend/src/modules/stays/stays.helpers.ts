import { Prisma } from '../../generated/prisma';
import { AUTO_OPS_DEADLINES, hoursAfter } from '../../common/business/auto-ops.constants';
import { calculateRentByPricingTerm } from '../tenant-bookings/pricing.helper';

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

  const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
  if (pricingTerm === 'SMESTERLY' || pricingTerm === 'YEARLY') {
    return calculateRentByPricingTerm(monthlyRate, pricingTerm as any);
  }

  return monthlyRate;
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

export function addCalendarMonthsClamped(value: Date, months: number): Date {
  const day = value.getDate();
  const result = new Date(value);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return startOfDay(result);
}

export function calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
  // Business rule: periodStart is inclusive, periodEnd/plannedCheckOutDate is exclusive.
  // Example: 1 Sep + 3 months => 1 Dec. 31 Jan + 1 month => 28/29 Feb.
  if (plannedCheckOutDate) return startOfDay(plannedCheckOutDate);
  const result = startOfDay(checkInDate);
  switch (pricingTerm) {
    case 'DAILY': return addDays(result, 1);
    case 'WEEKLY': return addDays(result, 7);
    case 'BIWEEKLY': return addDays(result, 14);
    case 'MONTHLY': return addCalendarMonthsClamped(result, 1);
    case 'SMESTERLY': return addCalendarMonthsClamped(result, 6);
    case 'YEARLY': return addCalendarMonthsClamped(result, 12);
    default: return addCalendarMonthsClamped(result, 1);
  }
}

export function calculateDueDate(_periodEnd: Date): Date {
  // KOST48 no-debt rule: invoice is due from issue/create time, not from the rental period end.
  // Keep the period argument for legacy call sites, but do not make long terms payable months/years later.
  return hoursAfter(new Date(), AUTO_OPS_DEADLINES.INVOICE_DUE_AFTER_HOURS);
}
