import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { InvoiceStatus, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTO_OPS_DEADLINES } from '../../common/business/auto-ops.constants';

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export interface BookingExpiryCandidate {
  stayId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  expiresAt: Date;
  hoursRemaining: number;
  messagePreview: string;
}

export interface InvoiceDueCandidate {
  invoiceId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  invoiceNumber: string | null;
  amountRupiah: number;
  dueDate: Date;
  daysRemaining: number;
  messagePreview: string;
}

export interface InvoiceOverdueCandidate {
  invoiceId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  invoiceNumber: string | null;
  amountRupiah: number;
  dueDate: Date;
  daysOverdue: number;
  messagePreview: string;
}

export interface CheckoutCandidate {
  stayId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  plannedCheckOutDate: Date;
  daysRemaining: number;
  messagePreview: string;
}

export interface AllPreviewsResponse {
  bookingExpiry: BookingExpiryCandidate[];
  invoiceDue: InvoiceDueCandidate[];
  invoiceOverdue: InvoiceOverdueCandidate[];
  checkout: CheckoutCandidate[];
}

// ──────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────

@Injectable()
export class ReminderPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  // ── A. Booking expiry ──────────────────────────

  async getBookingExpiryPreview(): Promise<BookingExpiryCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      stayId: number;
      tenantId: number;
      tenantName: string;
      phone: string | null;
      roomCode: string | null;
      expiresAt: Date;
    }>>(Prisma.sql`
      SELECT
        s.id AS "stayId",
        t.id AS "tenantId",
        t."fullName" AS "tenantName",
        t.phone,
        r.code AS "roomCode",
        s."expiresAt"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
        AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
        AND s."expiresAt" IS NOT NULL
        AND s."expiresAt" > NOW()
        AND s."expiresAt" <= NOW() + (${AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS} * INTERVAL '1 hour')
      ORDER BY s."expiresAt" ASC
      LIMIT 100
    `);

    return rows.map((r) => ({
      stayId: r.stayId,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      phone: r.phone,
      roomCode: r.roomCode,
      expiresAt: r.expiresAt,
      hoursRemaining: this.hoursBetween(new Date(), r.expiresAt),
      messagePreview: `Halo ${r.tenantName}, pemesanan kamar ${r.roomCode ?? '-'} akan kedaluwarsa dalam ${AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS} jam. Pemesanan belum mengunci kamar sampai pembayaran disetujui.`,
    }));
  }

  // ── B. Invoice due ─────────────────────────────

  async getInvoiceDuePreview(): Promise<InvoiceDueCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      invoiceId: number;
      tenantId: number;
      tenantName: string;
      phone: string | null;
      roomCode: string | null;
      invoiceNumber: string | null;
      amountRupiah: number;
      dueDate: Date;
    }>>(Prisma.sql`
      SELECT
        i.id AS "invoiceId",
        t.id AS "tenantId",
        t."fullName" AS "tenantName",
        t.phone,
        r.code AS "roomCode",
        i."invoiceNumber",
        i."totalAmountRupiah" AS "amountRupiah",
        i."dueDate"
      FROM "Invoice" i
      INNER JOIN "Stay" s ON s.id = i."stayId"
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE i.status IN (CAST(${InvoiceStatus.ISSUED} AS "InvoiceStatus"), CAST(${InvoiceStatus.PARTIAL} AS "InvoiceStatus"))
        AND i."dueDate" IS NOT NULL
        AND i."dueDate" >= CURRENT_DATE
        AND i."dueDate" <= CURRENT_DATE + INTERVAL '1 day'
      ORDER BY i."dueDate" ASC, i.id ASC
      LIMIT 150
    `);

    return rows.map((r) => ({
      invoiceId: r.invoiceId,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      phone: r.phone,
      roomCode: r.roomCode,
      invoiceNumber: r.invoiceNumber,
      amountRupiah: r.amountRupiah,
      dueDate: r.dueDate,
      daysRemaining: this.daysBetween(new Date(), r.dueDate),
      messagePreview: `Halo ${r.tenantName}, tagihan ${r.invoiceNumber ?? '-'} untuk kamar ${r.roomCode ?? '-'} akan jatuh tempo pada ${this.formatDate(r.dueDate)}. Mohon bayar dan unggah bukti dalam satu langkah. Tidak ada sistem hutang.`,
    }));
  }

  // ── C. Invoice overdue ─────────────────────────

  async getInvoiceOverduePreview(): Promise<InvoiceOverdueCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      invoiceId: number;
      tenantId: number;
      tenantName: string;
      phone: string | null;
      roomCode: string | null;
      invoiceNumber: string | null;
      amountRupiah: number;
      dueDate: Date;
    }>>(Prisma.sql`
      SELECT
        i.id AS "invoiceId",
        t.id AS "tenantId",
        t."fullName" AS "tenantName",
        t.phone,
        r.code AS "roomCode",
        i."invoiceNumber",
        i."totalAmountRupiah" AS "amountRupiah",
        i."dueDate"
      FROM "Invoice" i
      INNER JOIN "Stay" s ON s.id = i."stayId"
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE i.status IN (CAST(${InvoiceStatus.ISSUED} AS "InvoiceStatus"), CAST(${InvoiceStatus.PARTIAL} AS "InvoiceStatus"))
        AND i."dueDate" IS NOT NULL
        AND i."dueDate" < CURRENT_DATE
      ORDER BY i."dueDate" ASC, i.id ASC
      LIMIT 150
    `);

    return rows.map((r) => ({
      invoiceId: r.invoiceId,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      phone: r.phone,
      roomCode: r.roomCode,
      invoiceNumber: r.invoiceNumber,
      amountRupiah: r.amountRupiah,
      dueDate: r.dueDate,
      daysOverdue: this.daysBetween(r.dueDate, new Date()),
      messagePreview: `Halo ${r.tenantName}, tagihan ${r.invoiceNumber ?? '-'} untuk kamar ${r.roomCode ?? '-'} sudah melewati jatuh tempo pada ${this.formatDate(r.dueDate)}. Mohon segera lakukan pembayaran untuk menghindari denda.`,
    }));
  }

  // ── D. Checkout reminder ───────────────────────

  async getCheckoutPreview(): Promise<CheckoutCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{
      stayId: number;
      tenantId: number;
      tenantName: string;
      phone: string | null;
      roomCode: string | null;
      plannedCheckOutDate: Date;
    }>>(Prisma.sql`
      SELECT
        s.id AS "stayId",
        t.id AS "tenantId",
        t."fullName" AS "tenantName",
        t.phone,
        r.code AS "roomCode",
        s."plannedCheckOutDate"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
        AND s."plannedCheckOutDate" IS NOT NULL
        AND s."plannedCheckOutDate" >= CURRENT_DATE
        AND s."plannedCheckOutDate" <= CURRENT_DATE + (${AUTO_OPS_DEADLINES.RENEW_REMINDER_DAYS} * INTERVAL '1 day')
      ORDER BY s."plannedCheckOutDate" ASC, s.id ASC
      LIMIT 150
    `);

    return rows.map((r) => ({
      stayId: r.stayId,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      phone: r.phone,
      roomCode: r.roomCode,
      plannedCheckOutDate: r.plannedCheckOutDate,
      daysRemaining: this.daysBetween(new Date(), r.plannedCheckOutDate),
      messagePreview: `Halo ${r.tenantName}, masa sewa kamar ${r.roomCode ?? '-'} mencapai tanggal renew/keluar pada ${this.formatDate(r.plannedCheckOutDate)}. Jika ingin memperpanjang, ajukan segera. Setelah masa sewa habis dan belum dibayar, kamar dapat ditawarkan kembali.`,
    }));
  }

  // ── All previews ───────────────────────────────

  async getAllPreviews(): Promise<AllPreviewsResponse> {
    const [bookingExpiry, invoiceDue, invoiceOverdue, checkout] = await Promise.all([
      this.getBookingExpiryPreview(),
      this.getInvoiceDuePreview(),
      this.getInvoiceOverduePreview(),
      this.getCheckoutPreview(),
    ]);

    return { bookingExpiry, invoiceDue, invoiceOverdue, checkout };
  }

  // ── Helpers ────────────────────────────────────

  private hoursBetween(from: Date, to: Date): number {
    const diffMs = to.getTime() - from.getTime();
    return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
  }

  private daysBetween(from: Date, to: Date): number {
    const fromNorm = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const toNorm = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
    return Math.max(0, Math.round((toNorm - fromNorm) / (1000 * 60 * 60 * 24)));
  }

  private formatDate(value: Date): string {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
