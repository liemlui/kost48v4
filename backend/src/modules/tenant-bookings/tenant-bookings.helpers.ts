import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { BookingRow, RoomPayload } from './tenant-bookings.types';

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
  return Number((room as any).monthlyRateRupiah ?? 0);
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

export function calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
  if (plannedCheckOutDate) return plannedCheckOutDate;
  const result = new Date(checkInDate);
  switch (pricingTerm) {
    case PricingTerm.DAILY:
      result.setDate(result.getDate() + 1); break;
    case PricingTerm.WEEKLY:
      result.setDate(result.getDate() + 7); break;
    case PricingTerm.BIWEEKLY:
      result.setDate(result.getDate() + 14); break;
    case PricingTerm.MONTHLY:
      result.setMonth(result.getMonth() + 1); break;
    case PricingTerm.SMESTERLY:
      result.setMonth(result.getMonth() + 6); break;
    case PricingTerm.YEARLY:
      result.setFullYear(result.getFullYear() + 1); break;
    default:
      result.setMonth(result.getMonth() + 1);
  }
  return result;
}

export function calculateDueDate(periodEnd: Date): Date {
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + 3);
  return dueDate;
}

export function calculateBookingExpiry(checkInDate: Date) {
  const today = startOfDay(new Date());
  const hMinusTen = addDays(checkInDate, -10);
  const hMinusOne = addDays(checkInDate, -1);
  const sameDayEnd = endOfDay(today);
  if (hMinusTen > today) return endOfDay(hMinusTen);
  if (hMinusOne > today) return endOfDay(hMinusOne);
  return sameDayEnd;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
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
