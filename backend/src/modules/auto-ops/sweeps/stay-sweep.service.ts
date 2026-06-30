import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { InvoiceStatus, PaymentSubmissionStatus, RoomStatus, StayStatus } from '../../../common/enums/app.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { AppNotificationService } from '../../notifications/app-notification.service';
import { DepositLedgerService } from '../../deposit-ledger/deposit-ledger.service';
import { releaseRoomAfterBookingCancelTx } from '../../../common/utils/room-booking.util';
import { pickRoundRobinStaffTx } from '../../../common/utils/staff-assignment.util';
import { BookingSweepService } from './booking-sweep.service';

@Injectable()
export class StaySweepService {
  private readonly logger = new Logger(StaySweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly appNotification: AppNotificationService,
    private readonly depositLedger: DepositLedgerService,
    private readonly bookingSweep: BookingSweepService,
  ) {}

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
        const cancelled = await this.bookingSweep.cancelEndedUnpaidStay(stay.id, {
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

  async forceCheckoutOverstay(
    stayId: number,
    options: { actorUserId?: number | null; source?: string },
    cutoffDate: Date,
  ): Promise<boolean> {
    // B-07 (D-03): tagihan DRAFT (belum diterbitkan, tanpa jurnal) TIDAK boleh
    // memblokir forced checkout — DRAFT yang terlupakan dulu bikin overstay tak
    // pernah auto-checkout + alert merah tiap hari. Hanya ISSUED/PARTIAL yang blokir.
    const openInvoices = await this.prisma.invoice.findMany({
      where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] as any } },
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
      // DRAFT dikecualikan (sama dgn blocker pra-tx B-07).
      const freshOpenInvoice = await tx.invoice.findFirst({
        where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] as any } },
        select: { id: true },
      });
      if (freshOpenInvoice) return null;

      // B-07 (D-03): batalkan tagihan DRAFT yang tersisa (tanpa jurnal → aman, tak
      // perlu reversal) agar tidak menggantung sebagai "hantu" setelah checkout.
      await tx.invoice.updateMany({
        where: { stayId, status: InvoiceStatus.DRAFT as any },
        data: {
          status: InvoiceStatus.CANCELLED as any,
          cancelReason: 'Auto-cancel DRAFT saat forced checkout overstay (D-03).',
        },
      });

      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: 'COMPLETED' as any,
          actualCheckOutDate: new Date(),
          checkoutReason:
            'Forced checkout otomatis: kontrak berakhir dan tenant tidak memperpanjang/checkout hingga H+1 pk 12:00 WIB meski sudah diberi pengingat berkala.',
          // F3-15: tenant overstay sering meninggalkan barang → mulai jam 30 hari.
          belongingsDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
          const staffAssignee = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
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
              assignedToId: staffAssignee ?? null,
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
          linkTo: '/portal/stay',
          entityType: 'Stay',
          entityId: String(stayId),
        });
      }
    } catch (err) {
      this.logger.warn(`Notifikasi forced checkout gagal (stay #${stayId}): ${err instanceof Error ? err.message : String(err)}`);
    }

    return true;
  }

  async notifyAdminsForcedCheckoutBlocked(
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

      const staffAssignee = await pickRoundRobinStaffTx(this.prisma); // F5-3: round-robin tiket sistem

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
            assignedToId: staffAssignee ?? null,
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
        const cancelled = await this.bookingSweep.cancelEndedUnpaidStay(stay.id, {
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
        await releaseRoomAfterBookingCancelTx(tx, room.id);
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
}
