import { Prisma } from '../../generated/prisma';
import { PricingTerm, UserRole } from '../../common/enums/app.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm } from './pricing.helper';
import { addDays, startOfDay } from '../../common/utils/date.util';
import { AUTO_OPS_DEADLINES, hoursFromNow, hoursAfter } from '../../common/business/auto-ops.constants';

export interface RoomPricingSnapshot {
  id: number;
  code: string;
  name: string | null;
  floor: string | null;
  status: string;
  isActive: boolean;
  dailyRateRupiah: number | null;
  weeklyRateRupiah: number | null;
  biWeeklyRateRupiah: number | null;
  monthlyRateRupiah: number;
  defaultDepositRupiah: number;
  electricityTariffPerKwhRupiah: number;
  waterTariffPerM3Rupiah: number;
  notes: string | null;
}

export interface BookingRow {
  id: number;
  tenantId: number;
  roomId: number;
  status: string;
  pricingTerm: string;
  agreedRentAmountRupiah: number;
  checkInDate: Date;
  plannedCheckOutDate: Date | null;
  expiresAt: Date | null;
  depositAmountRupiah: number;
  depositPaidAmountRupiah?: number | null;
  depositPaymentStatus?: string | null;
  downPaymentAmountRupiah?: number | null;
  downPaymentPaidRupiah?: number | null;
  electricityTariffPerKwhRupiah: number;
  waterTariffPerM3Rupiah: number;
  bookingSource: string | null;
  stayPurpose: string | null;
  notes: string | null;
  cancelReason?: string | null;
  createdById: number | null;
  createdAt: Date;
  updatedAt: Date;
  tenantFullName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  roomCode: string;
  roomName: string | null;
  roomFloor: string | null;
  roomStatus: string;
  invoiceCount?: number;
  latestInvoiceId?: number | null;
  latestInvoiceNumber?: string | null;
  latestInvoiceStatus?: string | null;
  invoiceTotalAmountRupiah?: number | null;
  invoicePaidAmountRupiah?: number | null;
  invoiceRemainingAmountRupiah?: number | null;
}

export interface ApprovalBookingSnapshot {
  stayId: number;
  tenantId: number;
  roomId: number;
  stayStatus: string;
  pricingTerm: string;
  agreedRentAmountRupiah: number;
  checkInDate: Date;
  plannedCheckOutDate: Date | null;
  expiresAt: Date | null;
  bookingSource: string | null;
  roomCode: string;
  roomStatus: string;
  roomIsActive: boolean;
  tenantIsActive: boolean;
}

export async function lockApprovalBookingTx(tx: Prisma.TransactionClient, stayId: number) {
  const rows = await tx.$queryRaw<ApprovalBookingSnapshot[]>(Prisma.sql`
    SELECT
      s.id AS "stayId", s."tenantId", s."roomId", s.status AS "stayStatus",
      s."pricingTerm", s."agreedRentAmountRupiah", s."checkInDate",
      s."plannedCheckOutDate", s."expiresAt", s."bookingSource",
      r.code AS "roomCode", r.status AS "roomStatus", r."isActive" AS "roomIsActive",
      t."isActive" AS "tenantIsActive"
    FROM "Stay" s
    INNER JOIN "Room" r ON r.id = s."roomId"
    INNER JOIN "Tenant" t ON t.id = s."tenantId"
    WHERE s.id = ${stayId}
    FOR UPDATE OF s, r
  `);
  return rows[0] ?? null;
}

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
    depositPaidAmountRupiah: row.depositPaidAmountRupiah ?? 0,
    depositPaymentStatus: row.depositPaymentStatus ?? 'UNPAID',
    downPaymentAmountRupiah: row.downPaymentAmountRupiah ?? 0,
    downPaymentPaidRupiah: row.downPaymentPaidRupiah ?? 0,
    electricityTariffPerKwhRupiah: row.electricityTariffPerKwhRupiah,
    waterTariffPerM3Rupiah: row.waterTariffPerM3Rupiah,
    bookingSource: row.bookingSource,
    stayPurpose: row.stayPurpose,
    notes: row.notes,
    cancelReason: row.cancelReason ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tenant: { id: row.tenantId, fullName: row.tenantFullName, phone: row.tenantPhone, email: row.tenantEmail },
    room: { id: row.roomId, code: row.roomCode, name: row.roomName, floor: row.roomFloor, status: row.roomStatus },
    invoiceCount: Number(row.invoiceCount ?? 0),
    latestInvoiceId: row.latestInvoiceId ?? null,
    latestInvoiceNumber: row.latestInvoiceNumber ?? null,
    latestInvoiceStatus: row.latestInvoiceStatus ?? null,
    invoiceTotalAmountRupiah: row.invoiceTotalAmountRupiah ?? null,
    invoicePaidAmountRupiah: row.invoicePaidAmountRupiah ?? null,
    invoiceRemainingAmountRupiah: row.invoiceRemainingAmountRupiah ?? null,
  };
}

export async function findBookingByIdTx(tx: Prisma.TransactionClient, bookingId: number, tenantId: number) {
  const rows = await tx.$queryRaw<BookingRow[]>(Prisma.sql`
    SELECT
      s.id, s."tenantId", s."roomId", s.status, s."pricingTerm",
      s."agreedRentAmountRupiah", s."checkInDate", s."plannedCheckOutDate",
      s."expiresAt", s."depositAmountRupiah",
      COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaidAmountRupiah",
      COALESCE(CAST(s."depositPaymentStatus" AS text), 'UNPAID') AS "depositPaymentStatus",
      COALESCE(s."downPaymentAmountRupiah", 0) AS "downPaymentAmountRupiah",
      COALESCE(s."downPaymentPaidRupiah", 0) AS "downPaymentPaidRupiah",
      s."electricityTariffPerKwhRupiah", s."waterTariffPerM3Rupiah",
      s."bookingSource", s."stayPurpose", s.notes, s."cancelReason",
      s."createdById", s."createdAt", s."updatedAt",
      t."fullName" AS "tenantFullName",
      t.phone AS "tenantPhone",
      t.email AS "tenantEmail",
      r.code AS "roomCode",
      r.name AS "roomName",
      r.floor AS "roomFloor",
      r.status AS "roomStatus"
    FROM "Stay" s
    INNER JOIN "Tenant" t ON t.id = s."tenantId"
    INNER JOIN "Room" r ON r.id = s."roomId"
    WHERE s.id = ${bookingId} AND s."tenantId" = ${tenantId}
    LIMIT 1
  `);
  if (rows.length === 0) return null;
  return mapBookingRow(rows[0]);
}

export function resolveRentFromSnapshot(room: RoomPricingSnapshot, pricingTerm: PricingTerm): number {
  const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
  if (!monthlyRate || monthlyRate <= 0) return 0;
  return calculateRentByPricingTerm(monthlyRate, pricingTerm);
}

export function mapPricingTermToUnit(pricingTerm: string): string {
  switch (pricingTerm) {
    case PricingTerm.DAILY: return 'hari';
    case PricingTerm.WEEKLY: return 'minggu';
    case PricingTerm.BIWEEKLY: return '2 minggu';
    case PricingTerm.MONTHLY: return 'bulan';
    case PricingTerm.SMESTERLY: return 'semester';
    case PricingTerm.YEARLY: return 'tahun';
    default: return 'bulan';
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

export function calculatePeriodEndFromBooking(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
  if (plannedCheckOutDate) return startOfDay(plannedCheckOutDate);
  const result = startOfDay(checkInDate);
  switch (pricingTerm) {
    case PricingTerm.DAILY: return addDays(result, 1);
    case PricingTerm.WEEKLY: return addDays(result, 7);
    case PricingTerm.BIWEEKLY: return addDays(result, 14);
    case PricingTerm.MONTHLY: return addCalendarMonthsClamped(result, 1);
    case PricingTerm.SMESTERLY: return addCalendarMonthsClamped(result, 6);
    case PricingTerm.YEARLY: return addCalendarMonthsClamped(result, 12);
    default: return addCalendarMonthsClamped(result, 1);
  }
}

export function calculateDueDateFromBooking(_periodEnd: Date): Date {
  return hoursAfter(new Date(), AUTO_OPS_DEADLINES.INVOICE_DUE_AFTER_HOURS);
}

export function calculateBookingExpiry(_checkInDate: Date): Date {
  return hoursFromNow(AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS);
}

export async function resolveTenantPortalUser(prisma: PrismaService, tenantId: number): Promise<number | null> {
  const user = await prisma.user.findFirst({
    where: { role: UserRole.TENANT, tenantId, isActive: true },
    select: { id: true },
  });
  return user?.id ?? null;
}
