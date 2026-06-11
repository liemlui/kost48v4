import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { InvoiceStatus, PaymentSubmissionStatus, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { AUTO_OPS_DEADLINES } from '../../common/business/auto-ops.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPeriodCloseService } from '../accounting/accounting-period-close.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';

type AutoOpsRunResult = {
  expiredBookings: number;
  heldForPaymentReview: number;
  releasedRooms: number;
  expiredStayIds: number[];
  releasedRoomIds: number[];
  accountingAutoClose?: unknown;
};

@Injectable()
export class AutoOpsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoOpsService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPeriodCloseService: AccountingPeriodCloseService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  private static parseEnabled(): boolean {
    const raw = String(process.env.AUTO_OPS_ENABLED ?? 'true').trim().toLowerCase();
    return ['true', '1', 'yes', 'y', 'on'].includes(raw);
  }

  onModuleInit() {
    const enabled = AutoOpsService.parseEnabled();
    if (!enabled) return;
    const intervalMs = Math.max(60_000, AUTO_OPS_DEADLINES.AUTO_OPS_INTERVAL_MINUTES * 60_000);
    this.timer = setInterval(() => {
      this.runAll({ actorUserId: null, source: 'AUTO_OPS_INTERVAL' }).catch((error) => {
        this.logger.warn(`AutoOps skipped/failed: ${error?.message ?? error}`);
      });
    }, intervalMs);
    this.logger.log(`AutoOps aktif setiap ${Math.round(intervalMs / 60000)} menit`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async status() {
    const now = new Date();
    const [expiredCandidates, heldForPaymentReview, orphanReservedRooms] = await Promise.all([
      this.prisma.stay.count({
        where: this.expiredBookingWhere(false),
      }),
      this.prisma.stay.count({
        where: this.expiredBookingWhere(true),
      }),
      this.prisma.room.count({
        where: {
          status: RoomStatus.RESERVED,
          stays: { none: { status: StayStatus.ACTIVE } },
        },
      }),
    ]);

    const accountingAutoClosePolicy = await this.accountingPeriodCloseService.autoClosePolicy(now);

    return {
      enabled: AutoOpsService.parseEnabled(),
      now,
      intervalMinutes: AUTO_OPS_DEADLINES.AUTO_OPS_INTERVAL_MINUTES,
      deadlines: AUTO_OPS_DEADLINES,
      expiredCandidates,
      heldForPaymentReview,
      orphanReservedRooms,
      accountingAutoClosePolicy,
      policy: 'First paid wins. Booking saja belum mengunci kamar; pembayaran valid dan kamar siap huni yang menentukan prioritas. Accounting auto-close menutup bulan lalu hanya jika readiness aman.',
    };
  }

  async runAll(options: { actorUserId?: number | null; source?: string } = {}): Promise<AutoOpsRunResult> {
    if (this.running) {
      return { expiredBookings: 0, heldForPaymentReview: 0, releasedRooms: 0, expiredStayIds: [], releasedRoomIds: [], accountingAutoClose: { skipped: true, skippedReason: 'AUTO_OPS_ALREADY_RUNNING' } };
    }
    this.running = true;
    try {
      const [bookingResult, roomResult, noonResult, overstayResult, autoCancelResult, accountingAutoClose] = await Promise.all([
        this.runBookingExpiry(options),
        this.runRoomHealer(options),
        this.runRoomReleaseAtNoon(options),
        this.runOverstayEnforcement(options),
        this.runPostCheckoutAutoCancel(options),
        this.runAccountingAutoClose(options),
      ]);
      return {
        expiredBookings: bookingResult.expiredStayIds.length,
        heldForPaymentReview: bookingResult.heldForPaymentReview,
        releasedRooms: roomResult.releasedRoomIds.length + noonResult.releasedRoomIds.length,
        expiredStayIds: bookingResult.expiredStayIds,
        releasedRoomIds: [...roomResult.releasedRoomIds, ...noonResult.releasedRoomIds],
        accountingAutoClose,
      };
    } finally {
      this.running = false;
    }
  }


  async runAccountingAutoClose(options: { actorUserId?: number | null; source?: string } = {}) {
    try {
      return await this.accountingPeriodCloseService.autoCloseMonthly({
        actorUserId: options.actorUserId ?? null,
        source: options.source ?? 'AUTO_OPS_INTERVAL',
      });
    } catch (error: any) {
      return {
        closed: false,
        skipped: true,
        skippedReason: error?.message ?? 'Accounting auto-close skipped',
        source: options.source ?? 'AUTO_OPS_INTERVAL',
      };
    }
  }

  async runBookingExpiry(options: { actorUserId?: number | null; source?: string } = {}) {
    const heldForPaymentReview = await this.prisma.stay.count({ where: this.expiredBookingWhere(true) });
    const expiredBookings = await this.prisma.stay.findMany({
      where: this.expiredBookingWhere(false),
      select: { id: true, roomId: true, expiresAt: true },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });

    const expiredStayIds: number[] = [];
    for (const booking of expiredBookings) {
      await this.expireBookingTx(booking.id, booking.roomId, options.actorUserId ?? null, options.source ?? 'AUTO_OPS_BOOKING_EXPIRY');
      expiredStayIds.push(booking.id);
    }

    return { expiredStayIds, heldForPaymentReview };
  }

  /** 
   * Room release pk 12:00 H-day (G5=A batas keras).
   * Setiap run cek apakah sekarang >= pk 12:00 WIB (pk 05:00 UTC).
   * Stay yang plannedCheckOutDate <= today dan belum promoted (tidak diperpanjang) dilepas ke AVAILABLE.
   */
  async runRoomReleaseAtNoon(options: { actorUserId?: number | null; source?: string } = {}) {
    const now = new Date();
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (jakartaHour < 12) {
      return { releasedRoomIds: [] as number[] };
    }

    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const staysToRelease = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        plannedCheckOutDate: { not: null, lte: today },
        initialMetersPromotedAt: null,
      },
      select: { id: true, roomId: true, tenantId: true },
    });

    const releasedRoomIds: number[] = [];
    for (const stay of staysToRelease) {
      await this.prisma.$transaction(async (tx) => {
        await tx.stay.update({
          where: { id: stay.id },
          data: {
            status: StayStatus.CANCELLED,
            checkoutReason: 'Otomatis dilepas: pk 12:00 H-day, kontrak berakhir. Tenant tidak diperpanjang.',
            initialElectricityKwhPending: null,
            initialWaterM3Pending: null,
            initialMetersRecordedAt: null,
            initialMetersRecordedById: null,
          },
        });
        await tx.room.update({
          where: { id: stay.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: options.actorUserId ?? null,
            action: 'AUTO_RELEASE_ROOM_NOON',
            entityType: 'Stay',
            entityId: String(stay.id),
            meta: { roomId: stay.roomId, tenantId: stay.tenantId, source: options.source ?? 'AUTO_OPS_NOON_RELEASE' } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      releasedRoomIds.push(stay.roomId);
    }

    return { releasedRoomIds };
  }

  /**
   * Overstay enforcement (G1=B): jika tenant lama belum checkout dan sudah ada tenant baru
   * yang DP/lunas di kamar tersebut, auto-create tiket EVICT_OVERSTAY untuk staf.
   * Cek: room OCCUPIED oleh stay lama, dan ada stay baru RESERVED/APPROVED di room sama.
   */
  async runOverstayEnforcement(options: { actorUserId?: number | null; source?: string } = {}) {
    const rooms = await this.prisma.room.findMany({
      where: { status: RoomStatus.OCCUPIED },
      select: {
        id: true,
        stays: {
          where: { status: StayStatus.ACTIVE, initialMetersPromotedAt: { not: null } },
          select: { id: true, tenantId: true, roomId: true },
          take: 1,
        },
      },
    });

    const evictedRoomIds: number[] = [];
    for (const room of rooms) {
      const currentStay = room.stays[0];
      if (!currentStay) continue;

      const newTenantBooked = await this.prisma.stay.findFirst({
        where: {
          roomId: room.id,
          status: StayStatus.ACTIVE,
          id: { not: currentStay.id },
          paymentSubmissions: {
            some: { status: PaymentSubmissionStatus.APPROVED },
          },
        },
        select: { id: true },
      });
      if (!newTenantBooked) continue;

      const existingTicket = await this.prisma.ticket.findFirst({
        where: { roomId: room.id, category: 'EVICT_OVERSTAY', status: { notIn: ['DONE', 'CLOSED', 'CANCELLED'] } },
        select: { id: true },
      });
      if (existingTicket) continue;

      const staffAssignee = await this.prisma.user.findFirst({
        where: { role: 'STAFF' as any, isActive: true },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      await this.prisma.$transaction(async (tx) => {
        const baseTic = `TIC-${new Date().getFullYear()}-EV-${currentStay.id}`;
        let ticketNumber = baseTic;
        let suffix = 1;
        while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
          suffix += 1;
          ticketNumber = `${baseTic}-${suffix}`;
        }

        await tx.ticket.create({
          data: {
            ticketNumber,
            tenantId: currentStay.tenantId,
            roomId: room.id,
            stayId: currentStay.id,
            title: `Penggusuran tenant overstay - Kamar ${room.id}`,
            description: [
              `Tenant gagal checkout tepat waktu dan kamar sudah dibooking tenant baru yang sudah DP/lunas.`,
              `Tenant lama stay #${currentStay.id} wajib dikeluarkan.`,
              `Tindakan staf: cek kamar, bantu pindahkan barang, ganti kunci, laporkan kondisi kamar.`,
            ].join('\n'),
            category: 'EVICT_OVERSTAY',
            assignedToId: staffAssignee?.id ?? null,
            status: 'OPEN' as any,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: options.actorUserId ?? null,
            action: 'AUTO_CREATE_EVICT_TICKET',
            entityType: 'Room',
            entityId: String(room.id),
            meta: { stayId: currentStay.id, source: options.source ?? 'AUTO_OPS_OVERSTAY' } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      evictedRoomIds.push(room.id);
    }

    return { evictedRoomIds };
  }

  /** 
   * Auto-cancel H+1 + DP forfeit (G3=A, G2=A):
   * Stay yang sudah lewat plannedCheckOutDate > 1 hari, masih RESERVED (belum promoted / tidak lunas),
   * dibatalkan otomatis. DP yang sudah dibayar di-forfeit (depositStatus = FORFEITED).
   */
  async runPostCheckoutAutoCancel(options: { actorUserId?: number | null; source?: string } = {}) {
    const hPlus1 = new Date();
    hPlus1.setUTCHours(0, 0, 0, 0);
    hPlus1.setUTCDate(hPlus1.getUTCDate() - 1);

    const expiredStays = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        plannedCheckOutDate: { not: null, lte: hPlus1 },
        initialMetersPromotedAt: null,
        paymentSubmissions: {
          none: { status: PaymentSubmissionStatus.APPROVED },
        },
      },
      select: { id: true, roomId: true, tenantId: true, depositPaidAmountRupiah: true, depositAmountRupiah: true },
    });

    const cancelledStayIds: number[] = [];
    for (const stay of expiredStays) {
      await this.prisma.$transaction(async (tx) => {
        const paid = stay.depositPaidAmountRupiah ?? 0;

        await tx.stay.update({
          where: { id: stay.id },
          data: {
            status: StayStatus.CANCELLED,
            checkoutReason: 'Gagal kontrak: tidak melunasi hingga H+1. DP hangus sesuai kebijakan.',
            depositStatus: paid > 0 ? 'FORFEITED' : 'HELD',
            depositDeductionRupiah: paid,
            initialElectricityKwhPending: null,
            initialWaterM3Pending: null,
            initialMetersRecordedAt: null,
            initialMetersRecordedById: null,
          },
        });

        await tx.room.update({
          where: { id: stay.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: options.actorUserId ?? null,
            action: 'AUTO_CANCEL_HPLUS1_NO_PAYMENT',
            entityType: 'Stay',
            entityId: String(stay.id),
            meta: {
              roomId: stay.roomId,
              depositForfeited: paid,
              source: options.source ?? 'AUTO_OPS_HPLUS1_CANCEL',
            } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      cancelledStayIds.push(stay.id);
    }

    return { cancelledStayIds };
  }

  async runRoomHealer(options: { actorUserId?: number | null; source?: string } = {}) {
    const rooms = await this.prisma.room.findMany({
      where: {
        status: RoomStatus.RESERVED,
        stays: { none: { status: StayStatus.ACTIVE } },
      },
      select: { id: true },
      take: 100,
    });

    const releasedRoomIds: number[] = [];
    for (const room of rooms) {
      await this.prisma.$transaction(async (tx) => {
        await tx.room.update({ where: { id: room.id }, data: { status: RoomStatus.AVAILABLE } });
        await tx.auditLog.create({
          data: {
            actorUserId: options.actorUserId ?? null,
            action: 'AUTO_RELEASE_ORPHAN_RESERVED_ROOM',
            entityType: 'Room',
            entityId: String(room.id),
            meta: { source: options.source ?? 'AUTO_OPS_ROOM_HEALER' } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      releasedRoomIds.push(room.id);
    }

    return { releasedRoomIds };
  }

  private expiredBookingWhere(hasPendingReview: boolean): Prisma.StayWhereInput {
    return {
      status: StayStatus.ACTIVE,
      room: { status: RoomStatus.RESERVED },
      initialMetersPromotedAt: null,
      expiresAt: { not: null, lt: new Date() },
      paymentSubmissions: hasPendingReview
        ? { some: { status: PaymentSubmissionStatus.PENDING_REVIEW } }
        : {
            none: {
              status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] },
            },
          },
    };
  }

  private async expireBookingTx(stayId: number, roomId: number, actorUserId: number | null, source: string) {
    await this.prisma.$transaction(async (tx) => {
      const invoicesToReverse = await tx.invoice.findMany({
        where: {
          stayId,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any },
        },
        select: { id: true, invoiceNumber: true },
      });

      await tx.invoice.updateMany({
        where: {
          stayId,
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any },
        },
        data: {
          status: InvoiceStatus.CANCELLED as any,
          cancelReason: 'Otomatis dibatalkan: batas pembayaran/booking 3 jam terlewati tanpa bukti pembayaran valid.',
        },
      });

      for (const invoice of invoicesToReverse) {
        const postedInvoiceJournal = await tx.journalEntry.findFirst({
          where: {
            sourceType: 'INVOICE' as any,
            sourceId: String(invoice.id),
            status: 'POSTED' as any,
          },
          select: { id: true },
          orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
        });
        if (!postedInvoiceJournal) continue;

        const reversalResult = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, invoice.id, actorUserId);
        if (reversalResult?.skipped) {
          throw new ConflictException(
            `AutoOps gagal membatalkan booking karena reversal accounting tagihan ${invoice.invoiceNumber ?? invoice.id} tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}`,
          );
        }
      }

      await tx.paymentSubmission.updateMany({
        where: { stayId, status: PaymentSubmissionStatus.PENDING_REVIEW },
        data: { status: PaymentSubmissionStatus.EXPIRED },
      });

      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.CANCELLED as any,
          checkoutReason: 'Otomatis dibatalkan: batas booking/pembayaran 3 jam terlewati. Prioritas kamar mengikuti pembayaran valid pertama.',
          initialElectricityKwhPending: null,
          initialWaterM3Pending: null,
          initialMetersRecordedAt: null,
          initialMetersRecordedById: null,
        },
      });

      await tx.room.update({ where: { id: roomId }, data: { status: RoomStatus.AVAILABLE as any } });
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'AUTO_CANCEL_EXPIRED_BOOKING_FAST_SLA',
          entityType: 'Stay',
          entityId: String(stayId),
          meta: {
            roomId,
            source,
            slaHours: AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS,
            policy: 'booking_not_locking_room_first_paid_priority',
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }
}
