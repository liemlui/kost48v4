// FILE: booking-sweep.service.ts — auto-sweep booking: expired, no-show, batalkan otomatis
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { InvoiceLineType, InvoiceStatus, PaymentSubmissionStatus, RoomStatus, StayStatus } from '../../../common/enums/app.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { AppNotificationService } from '../../notifications/app-notification.service';
import { DepositLedgerService } from '../../deposit-ledger/deposit-ledger.service';
import { releaseRoomAfterBookingCancelTx } from '../../../common/utils/room-booking.util';
import { AUTO_OPS_DEADLINES } from '../../../common/business/auto-ops.constants';

@Injectable()
export class BookingSweepService {
  private readonly logger = new Logger(BookingSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly appNotification: AppNotificationService,
    private readonly depositLedger: DepositLedgerService,
  ) {}

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
        // F2-17 (E3): notif tenant booking kedaluwarsa (belum bayar) — best-effort, DI LUAR tx.
        await this.notifyTenantStayCancelled(
          booking.id,
          'Booking kedaluwarsa karena pembayaran tidak diterima dalam batas waktu.',
        ).catch((err) =>
          this.logger.warn(`Notif booking-expiry gagal (stay #${booking.id}): ${err instanceof Error ? err.message : String(err)}`),
        );
      } catch (err) {
        // Audit M-22: satu stay gagal tidak boleh menghentikan job & job berikutnya.
        this.logger.warn(`AutoOps booking-expiry gagal untuk stay #${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { expiredStayIds, heldForPaymentReview };
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
  async cancelEndedUnpaidStay(
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
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ status: string; roomId: number; tenantId: number; promotedAt: Date | null; depositPaid: number; depositAmount: number; dpPaid: number }>
      >(Prisma.sql`
        SELECT s.status, s."roomId", s."tenantId",
               s."initialMetersPromotedAt" AS "promotedAt",
               COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaid",
               COALESCE(s."depositAmountRupiah", 0) AS "depositAmount",
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
      // H3: Auto-reject PENDING_REVIEW submissions instead of skipping —
      // mencegah submission stuck selamanya saat sweeper vs admin race.
      // APPROVED submission tetap block (uang sudah masuk = keputusan manusia).
      const pendingReviewSubmissions = params.forfeitDownPayment
        ? await tx.paymentSubmission.findMany({
            where: { stayId, status: PaymentSubmissionStatus.PENDING_REVIEW },
            select: { id: true },
          })
        : [];
      if (pendingReviewSubmissions.length > 0) {
        await tx.paymentSubmission.updateMany({
          where: { stayId, status: PaymentSubmissionStatus.PENDING_REVIEW },
          data: {
            status: PaymentSubmissionStatus.REJECTED,
            reviewNotes: 'Dibatalkan sistem: batas waktu pembayaran terlewati. Hubungi admin untuk refund.',
          },
        });
      }
      // APPROVED submission — jangan auto-cancel, biar keputusan manusia
      const approvedSubmission = await tx.paymentSubmission.findFirst({
        where: { stayId, status: PaymentSubmissionStatus.APPROVED },
        select: { id: true },
      });
      if (approvedSubmission) return false;

      const blockedInvoiceStatuses = params.forfeitDownPayment
        ? [InvoiceStatus.PAID]
        : [InvoiceStatus.PAID, InvoiceStatus.PARTIAL];
      // H4: di mode forfeit, hanya invoice SEWA yang PAID yang memblokir forfeit.
      // WiFi/invoice non-sewa tidak relevan — tenant masih belum bayar sewa.
      const paidInvoice = params.forfeitDownPayment
        ? await tx.invoice.findFirst({
            where: { stayId, status: InvoiceStatus.PAID, lines: { some: { lineType: InvoiceLineType.RENT } } },
            select: { id: true },
          })
        : await tx.invoice.findFirst({
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
      // Audit M-24: constraint DB menuntut FORFEITED => deduction = depositAmount.
      // Deposit terbayar parsial (data legacy) dibiarkan HELD untuk diproses manual.
      const canForfeitDeposit = paid > 0 && Number(current.depositAmount ?? 0) === paid;
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.CANCELLED,
          checkoutReason: params.checkoutReason,
          ...(canForfeitDeposit
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
      if (canForfeitDeposit) {
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
        await releaseRoomAfterBookingCancelTx(tx, current.roomId);
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

    // F2-17 (E3): notif tenant booking/stay dibatalkan sweeper — best-effort, DI LUAR tx
    // (kegagalan notif tak boleh me-rollback pembatalan; tak menotif bila tx gagal).
    if (cancelled) {
      await this.notifyTenantStayCancelled(stayId, params.checkoutReason).catch((err) =>
        this.logger.warn(`Notif booking-dibatalkan gagal (stay #${stayId}): ${err instanceof Error ? err.message : String(err)}`),
      );
    }
    return cancelled;
  }

  /**
   * F2-17 (E3): beri tahu tenant bahwa booking/stay-nya dibatalkan otomatis oleh sistem.
   * Dipanggil DI LUAR transaksi pembatalan (best-effort). Stay sudah CANCELLED tetapi
   * baris-nya tetap ada (tenantId/roomId masih bisa dibaca untuk menyusun pesan).
   */
  async notifyTenantStayCancelled(stayId: number, reason: string) {
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
      select: {
        tenant: { select: { user: { select: { id: true } } } },
        room: { select: { code: true, name: true } },
      },
    });
    const tenantUserId = stay?.tenant?.user?.id;
    if (!tenantUserId) return; // tenant tanpa akun portal → dilewati (tercatat di pemanggil bila perlu)
    const roomLabel = stay?.room?.code
      ? `${stay.room.code}${stay.room.name ? ` - ${stay.room.name}` : ''}`
      : `kamar (stay #${stayId})`;
    await this.appNotification.create({
      recipientUserId: tenantUserId,
      title: '⚠️ Booking dibatalkan otomatis',
      body: `Booking/sewa Anda untuk ${roomLabel} dibatalkan oleh sistem. Alasan: ${reason} Bila ini keliru atau Anda ingin memesan kembali, silakan hubungi admin atau ajukan booking baru.`,
      linkTo: '/portal/stay',
      entityType: 'Stay',
      entityId: String(stayId),
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

  expiredBookingWhere(hasPendingReview: boolean): Prisma.StayWhereInput {
    return {
      status: StayStatus.ACTIVE,
      room: { status: { notIn: [RoomStatus.OCCUPIED, RoomStatus.INACTIVE] } },
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

  async expireBookingTx(stayId: number, roomId: number, actorUserId: number | null, source: string) {
    await this.prisma.$transaction(async (tx) => {
      // Lock + re-cek: pastikan stay masih ACTIVE, room masih RESERVED, tidak promoted
      const rows = await tx.$queryRaw<Array<{ status: string; roomStatus: string; promotedAt: Date | null }>>(Prisma.sql`
        SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
        FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
        WHERE s.id = ${stayId} FOR UPDATE OF s, r`);
      const cur = rows[0];
      if (!cur || cur.status !== 'ACTIVE' || cur.roomStatus === 'OCCUPIED' || cur.promotedAt) {
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
        data: { status: PaymentSubmissionStatus.REJECTED },
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

      // V-04: booking unpaid tidak mengunci room (status AVAILABLE), skip release
      if (cur.roomStatus !== 'AVAILABLE') {
        await releaseRoomAfterBookingCancelTx(tx, roomId);
      }
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
