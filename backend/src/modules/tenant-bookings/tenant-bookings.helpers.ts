import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { BookingRow, RoomPayload } from './tenant-bookings.types';
import { AUTO_OPS_DEADLINES, hoursFromNow, hoursAfter } from '../../common/business/auto-ops.constants';
import { calculateRentByPricingTerm } from './pricing.helper';

export function mapBookingRow(row: BookingRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    roomId: row.roomId,
    status: row.status,
    pricingTerm: row.pricingTerm,
    agreedRentAmountRupiah: row.agreedRentAmountRupiah,
    checkInDate: row.checkInDate,
    plannedCheckOutDate: row.plannedCheckOutDate,
    expiresAt: row.expiresAt,
    depositAmountRupiah: row.depositAmountRupiah,
    electricityTariffPerKwhRupiah: row.electricityTariffPerKwhRupiah,
    waterTariffPerM3Rupiah: row.waterTariffPerM3Rupiah,
    bookingSource: row.bookingSource,
    stayPurpose: row.stayPurpose,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tenant: {
      id: row.tenantId,
      fullName: row.tenantFullName,
      phone: row.tenantPhone,
      email: row.tenantEmail,
    },
    room: {
      id: row.roomId,
      code: row.roomCode,
      name: row.roomName,
      floor: row.roomFloor,
      status: row.roomStatus,
    },
    invoiceCount: Number(row.invoiceCount ?? 0),
    latestInvoiceId: row.latestInvoiceId ?? null,
    latestInvoiceNumber: row.latestInvoiceNumber ?? null,
    latestInvoiceStatus: row.latestInvoiceStatus ?? null,
  };
}

export function buildPricingAvailabilityWhere(pricingTerm?: PricingTerm): Prisma.RoomWhereInput {
  switch (pricingTerm) {
    case PricingTerm.DAILY:
      return { dailyRateRupiah: { gt: 0 } };
    case PricingTerm.WEEKLY:
      return { weeklyRateRupiah: { gt: 0 } };
    case PricingTerm.BIWEEKLY:
      return { biWeeklyRateRupiah: { gt: 0 } };
    case PricingTerm.MONTHLY:
    case PricingTerm.SMESTERLY:
    case PricingTerm.YEARLY:
      return { monthlyRateRupiah: { gt: 0 } };
    default:
      return {};
  }
}

export function getAvailablePricingTerms(room: RoomPayload) {
  const terms: PricingTerm[] = [];
  if ((room as any).dailyRateRupiah && (room as any).dailyRateRupiah > 0) terms.push(PricingTerm.DAILY);
  if ((room as any).weeklyRateRupiah && (room as any).weeklyRateRupiah > 0) terms.push(PricingTerm.WEEKLY);
  if ((room as any).biWeeklyRateRupiah && (room as any).biWeeklyRateRupiah > 0) terms.push(PricingTerm.BIWEEKLY);
  if ((room as any).monthlyRateRupiah && (room as any).monthlyRateRupiah > 0) {
    terms.push(PricingTerm.MONTHLY, PricingTerm.SMESTERLY, PricingTerm.YEARLY);
  }
  return terms;
}

export function resolveRent(room: RoomPayload, pricingTerm: PricingTerm): number {
  if (pricingTerm === PricingTerm.DAILY) return Number((room as any).dailyRateRupiah ?? 0);
  if (pricingTerm === PricingTerm.WEEKLY) return Number((room as any).weeklyRateRupiah ?? 0);
  if (pricingTerm === PricingTerm.BIWEEKLY) return Number((room as any).biWeeklyRateRupiah ?? 0);

  const monthlyRate = Number((room as any).monthlyRateRupiah ?? 0);
  if (pricingTerm === PricingTerm.SMESTERLY || pricingTerm === PricingTerm.YEARLY) {
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
  }

  return monthlyRate;
}

export function mapPricingTermToUnit(pricingTerm: string): string {
  switch (pricingTerm) {
    case PricingTerm.DAILY:
      return 'hari';
    case PricingTerm.WEEKLY:
      return 'minggu';
    case PricingTerm.BIWEEKLY:
      return '2 minggu';
    case PricingTerm.MONTHLY:
      return 'bulan';
    case PricingTerm.SMESTERLY:
      return 'semester';
    case PricingTerm.YEARLY:
      return 'tahun';
    default:
      return 'bulan';
  }
}

export function addCalendarMonthsClamped(value: Date, months: number): Date {
  const normalized = startOfDay(value);
  const day = normalized.getUTCDate();
  const targetYear = normalized.getUTCFullYear();
  const targetMonth = normalized.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDayOfTargetMonth)));
}

export function calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
  // Business rule: periodStart is inclusive, periodEnd/plannedCheckOutDate is exclusive.
  // Example: 1 Sep + 3 months => 1 Dec. 31 Jan + 1 month => 28/29 Feb.
  if (plannedCheckOutDate) return startOfDay(plannedCheckOutDate);
  const result = startOfDay(checkInDate);
  switch (pricingTerm) {
    case PricingTerm.DAILY:
      return addDays(result, 1);
    case PricingTerm.WEEKLY:
      return addDays(result, 7);
    case PricingTerm.BIWEEKLY:
      return addDays(result, 14);
    case PricingTerm.MONTHLY:
      return addCalendarMonthsClamped(result, 1);
    case PricingTerm.SMESTERLY:
      return addCalendarMonthsClamped(result, 6);
    case PricingTerm.YEARLY:
      return addCalendarMonthsClamped(result, 12);
    default:
      return addCalendarMonthsClamped(result, 1);
  }
}

export function calculateDueDate(_periodEnd: Date): Date {
  // KOST48 no-debt rule: invoice is due from issue/create time, not from the rental period end.
  return hoursAfter(new Date(), AUTO_OPS_DEADLINES.INVOICE_DUE_AFTER_HOURS);
}

export function calculateBookingExpiry(_checkInDate: Date) {
  return hoursFromNow(AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS);
}

export function addDays(date: Date, days: number) {
  const next = startOfDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfDay(next);
}

export function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function parseDateOnly(value: string, message: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(message);
  }
  return startOfDay(parsed);
}

export function isBookingSchemaDriftError(error: unknown) {
  const message = String((error as any)?.message ?? '').toLowerCase();
  const code = String((error as any)?.code ?? (error as any)?.meta?.code ?? '').toUpperCase();

  return (
    code === 'P2010'
    || message.includes('expiresat')
    || message.includes('roomstatus')
    || message.includes('enum roomstatus')
    || message.includes('invalid input value for enum')
    || message.includes('column') && message.includes('does not exist')
    || message.includes('type') && message.includes('does not exist')
  );
}
