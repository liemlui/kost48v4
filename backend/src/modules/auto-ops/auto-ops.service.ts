import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { InvoiceStatus, PaymentSubmissionStatus, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { AUTO_OPS_DEADLINES } from '../../common/business/auto-ops.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPeriodCloseService } from '../accounting/accounting-period-close.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { DepositLedgerService } from '../deposit-ledger/deposit-ledger.service';

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
    private readonly appNotification: AppNotificationService,
    private readonly depositLedger: DepositLedgerService,
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
      // Sequential (audit A4): job-job ini menyentuh tabel Stay/Room yang sama;
      // paralel menimbulkan race double-cancel dengan hasil DP/jaminan berbeda.
      const bookingResult = await this.runBookingExpiry(options);
      await this.runContractEndReminders(options);
      const dpForfeitResult = await this.runDownPaymentForfeit(options);
      void dpForfeitResult;
      await this.runOverstayForcedCheckout(options);
      const autoCancelResult = await this.runPostCheckoutAutoCancel(options);
      const noonResult = await this.runRoomReleaseAtNoon(options);
      const roomResult = await this.runRoomHealer(options);
      const overstayResult = await this.runOverstayEnforcement(options);
      const accountingAutoClose = await this.runAccountingAutoClose(options);
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
      try {
        await this.expireBookingTx(booking.id, booking.roomId, options.actorUserId ?? null, options.source ?? 'AUTO_OPS_BOOKING_EXPIRY');
        expiredStayIds.push(booking.id);
      } catch (err) {
        // Audit M-22: satu stay gagal tidak boleh menghentikan job & job berikutnya.
        this.logger.warn(`AutoOps booking-expiry gagal untuk stay #${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
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
        paymentSubmissions: {
          none: { status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] } },
        },
      },
      select: { id: true, roomId: true },
      take: 100,
    });

    const releasedRoomIds: number[] = [];
    for (const stay of staysToRelease) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_NOON_RELEASE',
          action: 'AUTO_RELEASE_ROOM_NOON',
          checkoutReason: 'Otomatis dilepas: pk 12:00 H-day, kontrak berakhir. Tenant tidak diperpanjang.',
        });
        if (cancelled) releasedRoomIds.push(stay.roomId);
      } catch (err) {
        this.logger.warn(`AutoOps noon-release gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { releasedRoomIds };
  }

  /**
   * Satu pintu pembatalan stay yang kontraknya berakhir tanpa pembayaran valid (audit A4).
   * Dipakai noon-release dan H+1 auto-cancel agar kebijakan identik:
   * lock FOR UPDATE + re-cek status, skip bila ada submission PENDING/APPROVED
   * atau invoice PAID/PARTIAL (uang sudah masuk = wajib keputusan manusia),
   * batalkan invoice DRAFT/ISSUED (dengan reversal jurnal POSTED),
   * forfeit dana DP/jaminan yang sudah dibayar sesuai kebijakan G2=A,
   * dan lepas kamar hanya jika tidak ada stay ACTIVE lain.
   */
  private async cancelEndedUnpaidStay(
    stayId: number,
    params: {
      actorUserId: number | null;
      source: string;
      action: string;
      checkoutReason: string;
      /**
       * Mode DP hangus (A18/G2=A): izinkan stay ber-submission APPROVED dan
       * invoice PARTIAL (DP sudah masuk), batalkan invoice-nya, dan hanguskan
       * DP terbayar dengan jurnal forfeit. Mode normal melewati stay seperti itu.
       */
      forfeitDownPayment?: boolean;
    },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ status: string; roomId: number; tenantId: number; promotedAt: Date | null; depositPaid: number; dpPaid: number }>
      >(Prisma.sql`
        SELECT s.status, s."roomId", s."tenantId",
               s."initialMetersPromotedAt" AS "promotedAt",
               COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaid",
               COALESCE(s."downPaymentPaidRupiah", 0) AS "dpPaid"
        FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
        WHERE s.id = ${stayId}
        FOR UPDATE OF s, r`);
      const current = rows[0];
      if (!current || current.status !== 'ACTIVE' || current.promotedAt) {
        return false;
      }

      const blockedSubmissionStatuses = params.forfeitDownPayment
        ? [PaymentSubmissionStatus.PENDING_REVIEW]
        : [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED];
      const activeSubmission = await tx.paymentSubmission.findFirst({
        where: { stayId, status: { in: blockedSubmissionStatuses as any } },
        select: { id: true },
      });
      if (activeSubmission) return false;

      const blockedInvoiceStatuses = params.forfeitDownPayment
        ? [InvoiceStatus.PAID]
        : [InvoiceStatus.PAID, InvoiceStatus.PARTIAL];
      const paidInvoice = await tx.invoice.findFirst({
        where: { stayId, status: { in: blockedInvoiceStatuses as any } },
        select: { id: true },
      });
      if (paidInvoice) return false;

      const reversibleStatuses = params.forfeitDownPayment
        ? [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL]
        : [InvoiceStatus.ISSUED];
      const invoicesToReverse = await tx.invoice.findMany({
        where: { stayId, status: { in: reversibleStatuses as any } },
        select: { id: true, invoiceNumber: true },
      });

      await tx.invoice.updateMany({
        where: { stayId, status: { in: [InvoiceStatus.DRAFT, ...reversibleStatuses] as any } },
        data: {
          status: InvoiceStatus.CANCELLED as any,
          cancelReason: params.checkoutReason,
        },
      });

      for (const invoice of invoicesToReverse) {
        const postedInvoiceJournal = await tx.journalEntry.findFirst({
          where: { sourceType: 'INVOICE' as any, sourceId: String(invoice.id), status: 'POSTED' as any },
          select: { id: true },
          orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
        });
        if (!postedInvoiceJournal) continue;
        const reversalResult = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, invoice.id, params.actorUserId);
        if (reversalResult?.skipped) {
          throw new ConflictException(
            `AutoOps gagal membatalkan stay karena reversal accounting tagihan ${invoice.invoiceNumber ?? invoice.id} tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}`,
          );
        }
      }

      // DP hangus (uang muka, non-refundable) — jurnal forfeit wajib sukses
      // bila pembayaran DP-nya terjurnal (pola A8); skip benign diizinkan.
      const dpForfeited = params.forfeitDownPayment ? current.dpPaid : 0;
      if (dpForfeited > 0) {
        const forfeitResult = await this.accountingPosting.postDownPaymentForfeitTx(
          tx,
          stayId,
          dpForfeited,
          params.actorUserId,
        );
        if (forfeitResult?.skipped && !(forfeitResult as any)?.journalEntry && !(forfeitResult as any)?.benign) {
          throw new ConflictException(
            `AutoOps gagal menghanguskan DP stay #${stayId}: jurnal forfeit tidak berhasil (${(forfeitResult as any)?.reason ?? 'alasan tidak diketahui'}).`,
          );
        }
      }

      // Legacy: deposit jaminan yang sempat terbayar (data pra-A18) tetap
      // di-forfeit seperti kebijakan lama.
      const paid = current.depositPaid;
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.CANCELLED,
          checkoutReason: params.checkoutReason,
          ...(paid > 0
            ? { depositStatus: 'FORFEITED' as any, depositDeductionRupiah: paid }
            : {}),
          ...(dpForfeited > 0 ? { downPaymentForfeitedAt: new Date() } : {}),
          initialElectricityKwhPending: null,
          initialWaterM3Pending: null,
          initialMetersRecordedAt: null,
          initialMetersRecordedById: null,
        },
      });

      // Pass C: forfeit deposit jaminan legacy juga dicatat di ledger agar
      // reconciliationLite tidak mendeteksi selisih (FORFEIT entry idempotent).
      if (paid > 0) {
        await this.depositLedger.recordDepositSettlementTx(tx, {
          stayId,
          actorUserId: params.actorUserId,
          note: params.checkoutReason,
          metadata: { source: params.source, action: params.action },
        });
      }

      const otherActive = await tx.stay.count({
        where: { roomId: current.roomId, status: StayStatus.ACTIVE, id: { not: stayId } },
      });
      if (otherActive === 0) {
        await this.releaseRoomAfterBookingCancelTx(tx, current.roomId);
      }

      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          entityType: 'Stay',
          entityId: String(stayId),
          meta: {
            roomId: current.roomId,
            tenantId: current.tenantId,
            depositForfeited: paid,
            downPaymentForfeited: dpForfeited,
            source: params.source,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return true;
    });
  }

  /**
   * A18 + G2=A: DP hangus bila pelunasan (sisa sewa + deposit jaminan) tidak
   * masuk hingga H+1 pukul 12:00 WIB setelah tanggal check-in. Hanya menyasar
   * stay yang DP-nya sudah dibayar tetapi belum promoted; booking tanpa DP
   * ditangani sweeper expiry 3 jam.
   */
  async runDownPaymentForfeit(options: { actorUserId?: number | null; source?: string } = {}) {
    const now = new Date();
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (jakartaHour < 12) {
      return { forfeitedStayIds: [] as number[] };
    }

    const yesterday = new Date(now);
    yesterday.setUTCHours(0, 0, 0, 0);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const candidates = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: null,
        checkInDate: { lte: yesterday },
        downPaymentPaidRupiah: { gt: 0 },
        paymentSubmissions: {
          none: { status: PaymentSubmissionStatus.PENDING_REVIEW },
        },
      },
      select: { id: true },
      take: 100,
    });

    const forfeitedStayIds: number[] = [];
    for (const stay of candidates) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_DP_FORFEIT',
          action: 'AUTO_CANCEL_DP_FORFEIT_HPLUS1',
          checkoutReason:
            'Gagal kontrak: pelunasan sisa sewa + deposit jaminan tidak masuk hingga H+1 pk 12:00 setelah check-in. DP hangus sesuai kebijakan.',
          forfeitDownPayment: true,
        });
        if (cancelled) forfeitedStayIds.push(stay.id);
      } catch (err) {
        this.logger.warn(`AutoOps DP-forfeit gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { forfeitedStayIds };
  }

  /**
   * Pengingat kontrak berakhir (keputusan owner: H-7, H-3, H-1, H-day).
   * Notifikasi in-app ke tenant promoted yang plannedCheckOutDate-nya mendekat,
   * dedupe per stay per gelombang lewat judul notifikasi.
   */
  async runContractEndReminders(options: { actorUserId?: number | null; source?: string } = {}) {
    void options;
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    const todayWib = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
    const horizon = new Date(todayWib);
    horizon.setUTCDate(horizon.getUTCDate() + 7);

    const stays = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: { not: null },
        plannedCheckOutDate: { not: null, gte: todayWib, lte: horizon },
      },
      select: {
        id: true,
        tenantId: true,
        plannedCheckOutDate: true,
        room: { select: { code: true, name: true } },
      },
      take: 200,
    });

    const REMINDER_DAYS = [7, 3, 1, 0];
    let sent = 0;
    for (const stay of stays) {
      const planned = new Date(stay.plannedCheckOutDate as Date);
      planned.setUTCHours(0, 0, 0, 0);
      const daysLeft = Math.round((planned.getTime() - todayWib.getTime()) / 86_400_000);
      if (!REMINDER_DAYS.includes(daysLeft)) continue;

      const tenantUser = await this.prisma.user.findFirst({
        where: { tenantId: stay.tenantId, role: 'TENANT' as any, isActive: true },
        select: { id: true },
      });
      if (!tenantUser) continue;

      const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${stay.id}`;
      const title =
        daysLeft === 0
          ? `⏰ Kontrak ${roomLabel} berakhir HARI INI`
          : `⏰ Kontrak ${roomLabel} berakhir ${daysLeft} hari lagi`;

      const existing = await (this.prisma as any).appNotification.findFirst({
        where: {
          recipientUserId: tenantUser.id,
          entityType: 'Stay',
          entityId: String(stay.id),
          title,
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.appNotification.create({
        recipientUserId: tenantUser.id,
        title,
        body:
          daysLeft === 0
            ? `Kontrak sewa kamar ${roomLabel} berakhir hari ini. Segera ajukan perpanjangan atau checkout sebelum pk 12:00 WIB. Jika tidak ada tindakan hingga besok pk 12:00, sistem akan melakukan checkout otomatis dan barang Anda dikeluarkan oleh staf.`
            : `Kontrak sewa kamar ${roomLabel} berakhir ${daysLeft} hari lagi (${planned.toISOString().slice(0, 10)}). Silakan ajukan perpanjangan lewat portal, atau ajukan checkout. Tanpa tindakan, kamar dilepas otomatis pk 12:00 di hari berakhirnya kontrak.`,
        linkTo: '/portal/my-stay',
        entityType: 'Stay',
        entityId: String(stay.id),
      });
      sent += 1;
    }

    return { remindersSent: sent };
  }

  /**
   * Forced checkout overstay H+1 pk 12:00 WIB (keputusan owner): tenant yang
   * mengabaikan semua pengingat sampai H+1 di-checkout otomatis.
   * - Masih ada tagihan belum lunas → TIDAK auto-checkout (uang harus diputuskan
   *   manusia); admin/owner dapat notifikasi merah (dedupe harian).
   * - Sukses: stay COMPLETED, kamar → MAINTENANCE + allowBookingWhileCleaning
   *   (kotor tapi sudah bisa dipesan), tiket CHECKOUT_INSPECTION utk staf,
   *   biaya overstay dipotong dari deposit jaminan saat settlement (manual).
   */
  async runOverstayForcedCheckout(options: { actorUserId?: number | null; source?: string } = {}) {
    const now = new Date();
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (jakartaHour < 12) {
      return { forcedCheckoutStayIds: [] as number[] };
    }

    const yesterday = new Date(now);
    yesterday.setUTCHours(0, 0, 0, 0);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const candidates = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: { not: null },
        plannedCheckOutDate: { not: null, lte: yesterday },
      },
      select: { id: true },
      take: 50,
    });

    const forcedCheckoutStayIds: number[] = [];
    for (const candidate of candidates) {
      try {
        const done = await this.forceCheckoutOverstay(candidate.id, options, yesterday);
        if (done) forcedCheckoutStayIds.push(candidate.id);
      } catch (err) {
        this.logger.warn(`AutoOps forced-checkout gagal untuk stay #${candidate.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { forcedCheckoutStayIds };
  }

  private async forceCheckoutOverstay(
    stayId: number,
    options: { actorUserId?: number | null; source?: string },
    cutoffDate: Date,
  ): Promise<boolean> {
    // Tagihan terbuka = blokir auto-checkout, eskalasi ke admin/owner (di luar tx; tidak ada mutasi).
    const openInvoices = await this.prisma.invoice.findMany({
      where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] as any } },
      select: { id: true, invoiceNumber: true, status: true },
    });
    if (openInvoices.length > 0) {
      await this.notifyAdminsForcedCheckoutBlocked(stayId, openInvoices);
      return false;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ status: string; roomId: number; tenantId: number; promotedAt: Date | null; plannedCheckOutDate: Date | null }>
      >(Prisma.sql`
        SELECT s.status, s."roomId", s."tenantId",
               s."initialMetersPromotedAt" AS "promotedAt",
               s."plannedCheckOutDate"
        FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
        WHERE s.id = ${stayId}
        FOR UPDATE OF s, r`);
      const current = rows[0];
      if (
        !current ||
        current.status !== 'ACTIVE' ||
        !current.promotedAt ||
        !current.plannedCheckOutDate ||
        new Date(current.plannedCheckOutDate) > cutoffDate
      ) {
        return null;
      }

      // Re-cek tagihan dalam tx (race: pembayaran/invoice baru sesaat sebelum lock).
      const freshOpenInvoice = await tx.invoice.findFirst({
        where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] as any } },
        select: { id: true },
      });
      if (freshOpenInvoice) return null;

      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: 'COMPLETED' as any,
          actualCheckOutDate: new Date(),
          checkoutReason:
            'Forced checkout otomatis: kontrak berakhir dan tenant tidak memperpanjang/checkout hingga H+1 pk 12:00 WIB meski sudah diberi pengingat berkala.',
        },
      });

      const otherActive = await tx.stay.count({
        where: { roomId: current.roomId, status: StayStatus.ACTIVE, id: { not: stayId } },
      });

      if (otherActive === 0) {
        await tx.room.update({
          where: { id: current.roomId },
          data: { status: RoomStatus.MAINTENANCE, allowBookingWhileCleaning: true },
        });

        const existingInspection = await tx.ticket.findFirst({
          where: { stayId, roomId: current.roomId, category: 'CHECKOUT_INSPECTION' },
          select: { id: true },
        });
        if (!existingInspection) {
          const staffAssignee = await tx.user.findFirst({
            where: { role: 'STAFF' as any, isActive: true },
            orderBy: { id: 'asc' },
            select: { id: true },
          });
          const room = await tx.room.findUnique({ where: { id: current.roomId }, select: { code: true, name: true } });
          const roomLabel = room?.code || room?.name || `Kamar #${current.roomId}`;
          const baseTicketNumber = `TIC-${new Date().getFullYear()}-CHK-${stayId}`;
          let ticketNumber = baseTicketNumber;
          let suffix = 1;
          while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
            suffix += 1;
            ticketNumber = `${baseTicketNumber}-${suffix}`;
          }
          await tx.ticket.create({
            data: {
              ticketNumber,
              tenantId: current.tenantId,
              roomId: current.roomId,
              stayId,
              title: `Bersihkan kamar bekas overstay - ${roomLabel}`,
              description: [
                `Kamar ${roomLabel} di-checkout paksa otomatis karena tenant overstay (H+1 lewat pk 12:00).`,
                'Tindakan staf: keluarkan dan amankan barang tenant, bersihkan kamar, cek inventaris & kerusakan, foto kondisi akhir.',
                'Kamar SUDAH bisa dipesan calon tenant baru selama pembersihan; aktivasi penghuni baru menunggu tiket ini ditutup.',
                'Admin: biaya overstay/pembersihan dipotong dari deposit jaminan tenant lama saat settlement (Proses Deposit).',
              ].join('\n'),
              category: 'CHECKOUT_INSPECTION',
              assignedToId: staffAssignee?.id ?? null,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: options.actorUserId ?? null,
          action: 'AUTO_FORCED_CHECKOUT_OVERSTAY',
          entityType: 'Stay',
          entityId: String(stayId),
          meta: {
            roomId: current.roomId,
            tenantId: current.tenantId,
            plannedCheckOutDate: current.plannedCheckOutDate,
            source: options.source ?? 'AUTO_OPS_FORCED_CHECKOUT',
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return { tenantId: current.tenantId, roomId: current.roomId };
    });

    if (!result) return false;

    // Notifikasi tenant di luar tx (agar tidak terkirim bila tx rollback).
    try {
      const tenantUser = await this.prisma.user.findFirst({
        where: { tenantId: result.tenantId, role: 'TENANT' as any, isActive: true },
        select: { id: true },
      });
      if (tenantUser) {
        await this.appNotification.create({
          recipientUserId: tenantUser.id,
          title: '🚪 Anda telah di-checkout otomatis (overstay)',
          body: 'Kontrak sewa Anda berakhir dan tidak ada perpanjangan/checkout hingga H+1 pk 12:00 WIB. Sistem melakukan checkout otomatis; barang Anda diamankan staf. Deposit jaminan diproses setelah pemeriksaan kamar (biaya overstay/pembersihan dapat dipotong). Hubungi pengelola untuk pengambilan barang.',
          linkTo: '/portal/my-stay',
          entityType: 'Stay',
          entityId: String(stayId),
        });
      }
    } catch (err) {
      this.logger.warn(`Notifikasi forced checkout gagal (stay #${stayId}): ${err instanceof Error ? err.message : String(err)}`);
    }

    return true;
  }

  private async notifyAdminsForcedCheckoutBlocked(
    stayId: number,
    openInvoices: Array<{ id: number; invoiceNumber: string | null; status: string }>,
  ) {
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    const todayWib = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
    const title = `🚨 Overstay stay #${stayId} tidak bisa di-checkout otomatis`;
    const invoiceRefs = openInvoices
      .map((invoice) => `${invoice.invoiceNumber ?? `#${invoice.id}`} (${invoice.status})`)
      .join(', ');

    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      const existing = await (this.prisma as any).appNotification.findFirst({
        where: {
          recipientUserId: admin.id,
          entityType: 'Stay',
          entityId: String(stayId),
          title,
          createdAt: { gte: todayWib },
        },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await this.appNotification.create({
          recipientUserId: admin.id,
          title,
          body: `Tenant overstay (H+1 lewat) masih punya tagihan aktif: ${invoiceRefs}. Sistem tidak berani checkout otomatis selama ada uang yang harus diputuskan. Selesaikan/batalkan tagihan lalu jalankan checkout final, atau tunggu sweep berikutnya.`,
          linkTo: '/stays',
          entityType: 'Stay',
          entityId: String(stayId),
        });
      } catch (err) {
        this.logger.warn(`Notifikasi admin overstay-blocked gagal (stay #${stayId}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /**
   * Overstay enforcement (A5, keputusan owner 2026-06-11): tenant aktif (sudah
   * promoted/huni) yang kontraknya berakhir (plannedCheckOutDate <= hari ini)
   * dan belum checkout final → auto-create tiket EVICT_OVERSTAY untuk staf
   * setelah pukul 12:00 WIB H-day, tanpa perlu ada tenant baru.
   * (Definisi lama mensyaratkan tenant baru yang sudah bayar di kamar OCCUPIED —
   * kondisi itu tidak mungkin terbentuk karena booking di kamar OCCUPIED diblokir.)
   */
  async runOverstayEnforcement(options: { actorUserId?: number | null; source?: string } = {}) {
    const now = new Date();
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (jakartaHour < 12) {
      return { evictedRoomIds: [] as number[] };
    }

    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const overstays = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: { not: null },
        plannedCheckOutDate: { not: null, lte: today },
      },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        plannedCheckOutDate: true,
        room: { select: { code: true, name: true } },
      },
      take: 100,
    });

    const evictedRoomIds: number[] = [];
    for (const stay of overstays) {
      const existingTicket = await this.prisma.ticket.findFirst({
        where: { roomId: stay.roomId, category: 'EVICT_OVERSTAY', status: { notIn: ['DONE', 'CLOSED', 'CANCELLED'] } },
        select: { id: true },
      });
      if (existingTicket) continue;

      const staffAssignee = await this.prisma.user.findFirst({
        where: { role: 'STAFF' as any, isActive: true },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${stay.roomId}`;
      await this.prisma.$transaction(async (tx) => {
        const baseTic = `TIC-${new Date().getFullYear()}-EV-${stay.id}`;
        let ticketNumber = baseTic;
        let suffix = 1;
        while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
          suffix += 1;
          ticketNumber = `${baseTic}-${suffix}`;
        }

        await tx.ticket.create({
          data: {
            ticketNumber,
            tenantId: stay.tenantId,
            roomId: stay.roomId,
            stayId: stay.id,
            title: `Tenant overstay - ${roomLabel}`,
            description: [
              `Kontrak sewa stay #${stay.id} berakhir ${stay.plannedCheckOutDate?.toISOString().slice(0, 10) ?? '-'} dan tenant belum checkout final hingga lewat pk 12:00 WIB.`,
              `Tindakan staf: hubungi/temui tenant, pastikan proses checkout atau perpanjangan, bantu pindahkan barang bila perlu, laporkan kondisi kamar.`,
              `Admin: jika tenant memperpanjang, proses renewal; jika keluar, jalankan checkout final.`,
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
            entityId: String(stay.roomId),
            meta: {
              stayId: stay.id,
              plannedCheckOutDate: stay.plannedCheckOutDate,
              source: options.source ?? 'AUTO_OPS_OVERSTAY',
            } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      evictedRoomIds.push(stay.roomId);
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
          none: { status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] } },
        },
      },
      select: { id: true },
      take: 100,
    });

    const cancelledStayIds: number[] = [];
    for (const stay of expiredStays) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_HPLUS1_CANCEL',
          action: 'AUTO_CANCEL_HPLUS1_NO_PAYMENT',
          checkoutReason: 'Gagal kontrak: tidak melunasi hingga H+1. DP hangus sesuai kebijakan.',
        });
        if (cancelled) cancelledStayIds.push(stay.id);
      } catch (err) {
        this.logger.warn(`AutoOps H+1 auto-cancel gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
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
        await this.releaseRoomAfterBookingCancelTx(tx, room.id);
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


  /**
   * Lepas kamar setelah booking batal: bila masih ada tiket pembersihan/inspeksi
   * terbuka (kamar kotor bekas overstay), kembalikan ke MAINTENANCE (tetap bisa
   * dipesan via allowBookingWhileCleaning) — bukan AVAILABLE, agar check-in
   * manual tidak masuk kamar kotor.
   */
  private async releaseRoomAfterBookingCancelTx(tx: Prisma.TransactionClient, roomId: number) {
    const openCleaning = await tx.ticket.findFirst({
      where: { roomId, category: 'CHECKOUT_INSPECTION' as any, status: { notIn: ['CLOSED', 'CANCELLED'] as any } },
      select: { id: true },
    });
    await tx.room.update({
      where: { id: roomId },
      data: openCleaning ? { status: RoomStatus.MAINTENANCE } : { status: RoomStatus.AVAILABLE },
    });
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
      // Lock + re-cek: pastikan stay masih ACTIVE, room masih RESERVED, tidak promoted
      const rows = await tx.$queryRaw<Array<{ status: string; roomStatus: string; promotedAt: Date | null }>>(Prisma.sql`
        SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
        FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
        WHERE s.id = ${stayId} FOR UPDATE OF s, r`);
      const cur = rows[0];
      if (!cur || cur.status !== 'ACTIVE' || cur.roomStatus !== 'RESERVED' || cur.promotedAt) {
        return; // sudah berubah status — skip cancel
      }
      // Re-cek submission: pastikan tidak ada APPROVED baru
      const freshSubmission = await tx.paymentSubmission.findFirst({
        where: { stayId, status: { in: ['PENDING_REVIEW', 'APPROVED'] as any } },
        select: { id: true },
      });
      if (freshSubmission) return;

      // Uang sudah masuk (mis. pembayaran manual) = jangan pernah auto-cancel;
      // wajib keputusan manusia lewat pembatalan stay (audit A1/A4).
      const paidInvoice = await tx.invoice.findFirst({
        where: { stayId, status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] as any } },
        select: { id: true },
      });
      if (paidInvoice) return;

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

      await this.releaseRoomAfterBookingCancelTx(tx, roomId);
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
