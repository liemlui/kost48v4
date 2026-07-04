// FILE: renew-requests.service.ts — proses perpanjangan sewa tenant: request → approve/reject
import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { StaysRenewalService } from '../stays/stays-renewal.service';
import { RenewStayDto } from '../stays/dto/stay.dto';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
import { DecideRenewRequestDto } from './dto/decide-renew-request.dto';
import { ConfirmDownPaymentDto } from './dto/confirm-down-payment.dto';
import { CheckoutRequestStatus, StayStatus, RenewRequestStatus, UserRole, InvoiceStatus, PricingTerm } from '../../common/enums/app.enums';
import { roundRupiah } from '../../common/business/money.helper';
import { ACTIVE_CHECKOUT_STATUSES, ACTIVE_RENEW_STATUSES, isActiveRenewRequestStatus } from '../../common/business/lifecycle-guards.helper';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { calculateRentByPricingTerm, PRICING_MULTIPLIERS } from '../tenant-bookings/pricing.helper';

@Injectable()
export class RenewRequestsService {
  private readonly logger = new Logger(RenewRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly staysRenewal: StaysRenewalService,
    private readonly audit: AuditLogService,
    private readonly appNotification: AppNotificationService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** F2-1 R3: awal hari ini dalam WIB (UTC+7) sbg UTC-midnight, utk bandingkan @db.Date deadline. */
  private static wibStartOfToday(): Date {
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  }

  /** Tenant creates a renew request for their active stay. */
  async createRequest(dto: CreateRenewRequestDto, actor: CurrentUserPayload) {
    if (actor.role !== UserRole.TENANT) {
      throw new ForbiddenException('Hanya tenant yang dapat mengajukan permintaan perpanjangan');
    }

    const stay = await this.prisma.stay.findUnique({ where: { id: dto.stayId } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== StayStatus.ACTIVE) throw new ConflictException('Stay tidak aktif, tidak dapat mengajukan perpanjangan');

    if (stay.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Anda bukan pemilik stay ini');
    }

    // Cross-block: cannot create renew request if a checkout request is PENDING
    // W-04: menggunakan helper domain ACTIVE_CHECKOUT_STATUSES
    const pendingCheckout = await this.prisma.checkoutRequest.findFirst({
      where: { stayId: dto.stayId, status: { in: ACTIVE_CHECKOUT_STATUSES } },
    });
    if (pendingCheckout) {
      throw new ConflictException(
        'Tidak dapat mengajukan perpanjangan karena ada permintaan checkout yang menunggu persetujuan',
      );
    }

    const openInvoices = await this.prisma.invoice.findMany({
      where: { stayId: dto.stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } },
      select: { id: true, invoiceNumber: true, status: true },
      orderBy: { id: 'asc' },
    });
    if (openInvoices.length > 0) {
      const refs = openInvoices
        .map((invoice) => `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} belum dibayar`)
        .join(', ');
      throw new ConflictException(`Selesaikan tagihan aktif sebelum mengajukan perpanjangan: ${refs}`);
    }

    const existingActive = await this.prisma.renewRequest.findFirst({
      where: {
        stayId: dto.stayId,
        status: { in: ACTIVE_RENEW_STATUSES },
      },
    });
    if (existingActive) {
      throw new ConflictException('Masih ada permintaan perpanjangan yang sedang berjalan');
    }

    // F2-1: DP 30% perpanjangan = 30% × sewa SAAT INI (rent-loyalty D-16: tak naik saat renew).
    const renewalRentRupiah = stay.agreedRentAmountRupiah ?? 0;
    const downPaymentAmountRupiah = roundRupiah((renewalRentRupiah * 30) / 100);

    const request = await this.prisma.renewRequest.create({
      data: {
        stayId: dto.stayId,
        tenantId: actor.tenantId!,
        requestedTerm: dto.requestedTerm,
        requestedCheckOutDate: dto.requestedCheckOutDate ? new Date(dto.requestedCheckOutDate) : undefined,
        requestNotes: dto.requestNotes,
        // F2-1 state machine: mulai dari keputusan tenant (perpanjang atau tidak).
        status: RenewRequestStatus.PENDING_DECISION,
        downPaymentAmountRupiah,
        downPaymentDueDate: stay.plannedCheckOutDate ?? undefined, // hari-H = batas prioritas tenant lama
        // F4-11: prabayar fleksibel (jumlah bulan + penanda early). F4-13a: review tenant.
        prepaidMonths: dto.prepaidMonths ?? undefined,
        isEarly: stay.plannedCheckOutDate ? new Date() < new Date(stay.plannedCheckOutDate) : false,
        tenantReview: dto.tenantReview ?? undefined,
        tenantReviewAt: dto.tenantReview ? new Date() : undefined,
      },
    });

    // F4-13a: poin review saat perpanjang (best-effort, idempotent per renewRequestId).
    if (dto.tenantReview && actor.tenantId) {
      await this.loyalty.earnSafe(actor.tenantId, 'VALIDATED_REPORT', `RENEWAL_REVIEW:${request.id}`, {
        note: 'Review/masukan saat perpanjangan',
        createdById: actor.id,
      });
    }

    const ctx = await this.loadStayNotifContext(stay.id);
    await this.notifyAdminsRenew(
      request.id,
      '🔁 Permintaan perpanjangan baru',
      `${ctx.tenantName} mengajukan perpanjangan ${ctx.roomLabel}. Menunggu keputusan tenant (YA/TIDAK). DP 30% = Rp ${downPaymentAmountRupiah.toLocaleString('id-ID')}.`,
    );

    return request;
  }

  /**
   * F2-1: tenant menjawab prompt perpanjangan (YA/TIDAK).
   * YA → AWAITING_DP (prioritas tenant lama s/d hari-H, tunggu DP 30%).
   * TIDAK → REJECTED_BY_TENANT (kamar dibuka publik mulai tanggal checkout — room-publication inc.2b).
   */

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Tenant Decision & DP Confirmation
  // ═══════════════════════════════════════════════════════════

  async decideByTenant(id: number, dto: DecideRenewRequestDto, actor: CurrentUserPayload) {
    if (actor.role !== UserRole.TENANT) {
      throw new ForbiddenException('Hanya tenant yang dapat menjawab prompt perpanjangan');
    }
    const request = await this.prisma.renewRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
    if (request.tenantId !== actor.tenantId) throw new ForbiddenException('Anda bukan pemilik permintaan ini');
    if (request.status !== RenewRequestStatus.PENDING_DECISION) {
      throw new ConflictException('Permintaan perpanjangan ini sudah melewati tahap keputusan');
    }

    // TIDAK → REJECTED_BY_TENANT (kamar ikut flow checkout normal — keputusan owner #2 inc.2b).
    if (dto.decision !== 'YA') {
      const rejected = await this.prisma.$transaction(async (tx) => {
        const upd = await tx.renewRequest.update({
          where: { id },
          data: { status: RenewRequestStatus.REJECTED_BY_TENANT, requestNotes: dto.notes ?? request.requestNotes },
        });
        await this.audit.log({ actorUserId: actor.id, action: 'RENEW_DECIDE_NO', entityType: 'RenewRequest', entityId: String(id), oldData: request, newData: upd });
        return upd;
      });
      const ctxNo = await this.loadStayNotifContext(request.stayId);
      await this.notifyAdminsRenew(
        rejected.id,
        '🚪 Tenant tidak memperpanjang',
        `${ctxNo.tenantName} memutuskan TIDAK memperpanjang ${ctxNo.roomLabel}. Kamar akan dibuka via flow checkout normal saat masa sewa berakhir.`,
      );
      return rejected;
    }

    // YA → terbitkan invoice DP 30% TERPISAH (inc.2b) + status AWAITING_DP. DP dibayar penuh via bukti.
    const dpAmount = request.downPaymentAmountRupiah ?? 0;
    if (!(dpAmount > 0)) throw new ConflictException('Nominal DP perpanjangan belum tersedia');
    const { updated, dpInvoice } = await this.prisma.$transaction(async (tx) => {
      const inv = await this.staysRenewal.issueRenewalDownPaymentInvoiceTx(tx, request.stayId, dpAmount, actor);
      const upd = await tx.renewRequest.update({
        where: { id },
        data: { status: RenewRequestStatus.AWAITING_DP, downPaymentInvoiceId: inv.id, requestNotes: dto.notes ?? request.requestNotes },
      });
      return { updated: upd, dpInvoice: inv };
    });
    await this.audit.log({ actorUserId: actor.id, action: 'RENEW_DECIDE_YES', entityType: 'RenewRequest', entityId: String(id), oldData: request, newData: updated });
    await this.notifyTenantRenew(
      request.stayId,
      updated.id,
      '💳 Bayar DP perpanjangan',
      `Perpanjangan disetujui dari sisi Anda. Silakan bayar DP 30% sebesar Rp ${dpAmount.toLocaleString('id-ID')} (invoice ${dpInvoice.invoiceNumber}) sebelum hari-H untuk mengamankan kamar.`,
    );
    return { ...updated, downPaymentInvoice: { id: dpInvoice.id, invoiceNumber: dpInvoice.invoiceNumber, totalAmountRupiah: dpInvoice.totalAmountRupiah } };
  }

  /**
   * F2-1: admin verifikasi DP 30% perpanjangan sudah masuk (≤ hari-H) → DP_SECURED.
   * Kamar aman untuk tenant lama; pelunasan paling lambat H+7 dari DP (settlementDueDate).
   * (Pembatalan booking baru belum-bayar + jurnal DP = inc.2b.)
   */
  async confirmDownPayment(id: number, dto: ConfirmDownPaymentDto, actor: CurrentUserPayload) {
    const request = await this.prisma.renewRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
    if (request.status !== RenewRequestStatus.AWAITING_DP) {
      throw new ConflictException('DP hanya dapat dikonfirmasi saat status menunggu DP (AWAITING_DP)');
    }
    // inc.2b: DP wajib LUNAS via invoice terpisah (bukti pembayaran sudah di-approve → status PAID).
    if (!request.downPaymentInvoiceId) {
      throw new ConflictException('Invoice DP belum diterbitkan untuk permintaan ini.');
    }
    const dpInvoice = await this.prisma.invoice.findUnique({
      where: { id: request.downPaymentInvoiceId },
      select: { status: true, paidAt: true },
    });
    if (!dpInvoice || dpInvoice.status !== InvoiceStatus.PAID || !dpInvoice.paidAt) {
      throw new ConflictException('DP belum lunas. Setujui dulu bukti pembayaran DP (invoice harus PAID) sebelum mengamankan kamar.');
    }
    // F2-1 R3: gate deadline di command service (tak hanya andalkan sweeper). DP hanya boleh
    // diamankan ≤ hari-H (downPaymentDueDate, WIB). Lewat hari-H → tolak (prioritas hangus).
    if (request.downPaymentDueDate && new Date(dpInvoice.paidAt).getTime() > new Date(request.downPaymentDueDate).getTime()) {
      throw new ConflictException('Hari-H (batas prioritas) sudah lewat; DP tak dapat diamankan lagi. Prioritas perpanjangan hangus — ajukan ulang bila kamar masih tersedia.');
    }
    const paidAt = new Date(dpInvoice.paidAt);
    const settlementDueDate = new Date(paidAt);
    settlementDueDate.setUTCDate(settlementDueDate.getUTCDate() + 7); // pelunasan maks H+7 dari DP (R2)

    const updated = await this.prisma.renewRequest.update({
      where: { id },
      data: {
        status: RenewRequestStatus.DP_SECURED,
        downPaymentPaidAt: paidAt,
        settlementDueDate,
        reviewNotes: dto.notes ?? request.reviewNotes,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'RENEW_DP_SECURED',
      entityType: 'RenewRequest',
      entityId: String(id),
      oldData: request,
      newData: updated,
    });
    await this.notifyTenantRenew(
      request.stayId,
      updated.id,
      '✅ DP diterima — kamar aman',
      `DP perpanjangan Anda sudah diterima dan kamar aman untuk Anda. Lunasi sisa pembayaran paling lambat ${settlementDueDate.toISOString().slice(0, 10)} (H+7) agar perpanjangan final.`,
    );
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Approve/Reject & Query Methods
  // ═══════════════════════════════════════════════════════════

  async approveRequest(id: number, dto: ApproveRenewRequestDto, actor: CurrentUserPayload) {
    const result = await this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "RenewRequest" WHERE id = ${id} FOR UPDATE
      `;
      if (lockedRows.length === 0) {
        throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
      }

      const request = await tx.renewRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
      if (request.status !== RenewRequestStatus.DP_SECURED) {
        throw new ConflictException('Pelunasan perpanjangan hanya dapat diproses setelah DP diamankan (status DP_SECURED).');
      }
      // F2-1 R3: gate deadline di command service. Pelunasan/approve maks ≤ H+7 (settlementDueDate, WIB).
      // Lewat H+7 → tolak (seharusnya FORFEITED via sweeper; admin proses forced checkout manual).
      if (!request.settlementInvoiceId && request.settlementDueDate && RenewRequestsService.wibStartOfToday().getTime() > new Date(request.settlementDueDate).getTime()) {
        throw new ConflictException('Batas pelunasan (H+7) sudah lewat. Perpanjangan gagal — proses sebagai FORFEITED (forced checkout + settle deposit manual).');
      }

      // F2-1 rent-loyalty (D-16): harga sewa renewal = sewa SAAT INI (tak naik). Abaikan kenaikan via dto.
      const currentStay = await tx.stay.findUnique({ where: { id: request.stayId }, select: { agreedRentAmountRupiah: true, pricingTerm: true } });
      if (!currentStay) throw new NotFoundException('Stay tidak ditemukan');

      // AL-FIX-3: re-multiply sewa kalau term berubah (mis. MONTHLY→YEARLY)
      const renewalRent = (() => {
        if (!request.requestedTerm || request.requestedTerm === currentStay.pricingTerm) {
          return currentStay.agreedRentAmountRupiah ?? dto.agreedRentAmountRupiah ?? 0;
        }
        const oldMult = PRICING_MULTIPLIERS[currentStay.pricingTerm as keyof typeof PRICING_MULTIPLIERS] ?? 1;
        if (oldMult <= 0) return currentStay.agreedRentAmountRupiah ?? 0;
        const monthlyRate = Math.round(currentStay.agreedRentAmountRupiah / oldMult);
        return calculateRentByPricingTerm(monthlyRate, request.requestedTerm as PricingTerm);
      })();

      const finalPlannedCheckOutDate = dto.plannedCheckOutDate
        ?? (request.requestedCheckOutDate ? request.requestedCheckOutDate.toISOString() : undefined);

      const renewDto: RenewStayDto = {
        pricingTerm: request.requestedTerm as PricingTerm,
        plannedCheckOutDate: finalPlannedCheckOutDate,
        agreedRentAmountRupiah: renewalRent,
        // inc.2b: DP 30% sudah ditagih invoice terpisah & lunas → kurangi rent-line invoice pelunasan.
        priorDownPaymentRupiah: request.downPaymentAmountRupiah ?? 0,
        electricityReadingValue: dto.electricityReadingValue,
        waterReadingValue: dto.waterReadingValue,
        meterReadingAt: dto.meterReadingAt,
      };

      if (!request.settlementInvoiceId) {
        const prepared = await this.staysRenewal.prepareRenewalSettlementInTransaction(
          tx,
          request.stayId,
          renewDto,
          actor,
          request.settlementDueDate,
        );
        const updated = await tx.renewRequest.update({
          where: { id },
          data: {
            settlementInvoiceId: prepared.invoice.id,
            requestedCheckOutDate: prepared.plannedStayUpdate.plannedCheckOutDate,
            reviewNotes: dto.reviewNotes ?? request.reviewNotes,
            reviewedById: actor.id,
            reviewedAt: new Date(),
          },
        });
        return {
          phase: 'SETTLEMENT_ISSUED' as const,
          request: updated,
          invoice: prepared.invoice,
          meterSummary: prepared.meterSummary,
        };
      }

      const settlementInvoice = await tx.invoice.findUnique({
        where: { id: request.settlementInvoiceId },
        select: { id: true, status: true, paidAt: true },
      });
      if (!settlementInvoice || settlementInvoice.status !== InvoiceStatus.PAID || !settlementInvoice.paidAt) {
        throw new ConflictException('Invoice pelunasan belum PAID. Verifikasi pembayaran penuh sebelum finalisasi.');
      }
      if (
        request.settlementDueDate
        && new Date(settlementInvoice.paidAt).getTime() > new Date(request.settlementDueDate).getTime()
      ) {
        throw new ConflictException('Pelunasan dibayar setelah batas H+7. Perpanjangan harus diproses sebagai FORFEITED.');
      }

      const renewResult = await this.staysRenewal.finalizePreparedRenewalInTransaction(
        tx,
        {
          stayId: request.stayId,
          settlementInvoiceId: settlementInvoice.id,
          pricingTerm: request.requestedTerm as PricingTerm,
          agreedRentAmountRupiah: renewalRent,
        },
        actor,
      );

      const updated = await tx.renewRequest.update({
        where: { id },
        data: {
          status: RenewRequestStatus.COMPLETED,
          requestedCheckOutDate: finalPlannedCheckOutDate ? new Date(finalPlannedCheckOutDate) : request.requestedCheckOutDate,
          reviewNotes: dto.reviewNotes ?? null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });

      return { phase: 'COMPLETED' as const, request: updated, ...renewResult };
    });

    if (result.phase === 'SETTLEMENT_ISSUED') {
      await this.audit.log({
        actorUserId: actor.id,
        action: 'PREPARE_RENEW_SETTLEMENT',
        entityType: 'RenewRequest',
        entityId: String(result.request.id),
        newData: result.request,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: String(result.invoice.id),
        newData: result.invoice,
      });
      await this.notifyTenantRenew(
        result.request.stayId,
        result.request.id,
        'Tagihan pelunasan perpanjangan terbit',
        `Invoice ${result.invoice.invoiceNumber} sudah terbit. Bayar penuh sebelum ${result.request.settlementDueDate?.toISOString().slice(0, 10) ?? 'batas H+7'}, lalu admin akan memfinalkan perpanjangan.`,
      );
      return result;
    }

    await this.audit.log({
      actorUserId: actor.id,
      action: 'APPROVE',
      entityType: 'RenewRequest',
      entityId: String(result.request.id),
      newData: result.request,
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'RENEW',
      entityType: 'Stay',
      entityId: String(result.stay.id),
      oldData: result.oldStay,
      newData: result.stay,
    });
    const outStr = result.stay.plannedCheckOutDate
      ? new Date(result.stay.plannedCheckOutDate).toISOString().slice(0, 10)
      : '-';
    await this.notifyTenantRenew(
      result.request.stayId,
      result.request.id,
      '🎉 Perpanjangan disetujui',
      `Pelunasan telah diverifikasi. Masa sewa Anda kini berlaku sampai ${outStr}.`,
    );

    // F4-9: poin loyalitas perpanjangan (best-effort, idempotent per renewRequestId, di luar tx).
    const stayForPoints = await this.prisma.stay.findUnique({
      where: { id: result.request.stayId },
      select: { tenantId: true },
    });
    if (stayForPoints) {
      await this.loyalty.earnSafe(stayForPoints.tenantId, 'RENEWAL', String(result.request.id), {
        note: `Perpanjangan kontrak #${result.request.id} selesai`,
        createdById: actor.id,
      });
    }

    return { phase: result.phase, request: result.request, stay: result.stay, invoice: result.invoice };
  }

  /** Admin/owner rejects a pending renew request. */
  async rejectRequest(id: number, dto: RejectRenewRequestDto, actor: CurrentUserPayload) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RenewRequest" WHERE id = ${id} FOR UPDATE`;
      const request = await tx.renewRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
      const rejectable = [
        RenewRequestStatus.PENDING,
        RenewRequestStatus.PENDING_DECISION,
        RenewRequestStatus.AWAITING_DP,
      ];
      if (!rejectable.includes(request.status as RenewRequestStatus)) {
        throw new ConflictException(
          'Renewal yang DP-nya sudah diamankan tidak dapat ditolak. Selesaikan pelunasan atau proses forfeit/refund sesuai kondisi pembayaran.',
        );
      }

      if (request.status === RenewRequestStatus.AWAITING_DP && request.downPaymentInvoiceId) {
        await this.staysRenewal.cancelUnpaidRenewalInvoiceInTransaction(
          tx,
          request.downPaymentInvoiceId,
          actor.id,
          `Permintaan renewal #${request.id} ditolak: ${dto.reviewNotes}`,
        );
      }

      const updated = await tx.renewRequest.update({
        where: { id },
        data: {
          status: RenewRequestStatus.REJECTED,
          reviewNotes: dto.reviewNotes,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });
      return { request, updated };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'RENEW_REJECT',
      entityType: 'RenewRequest',
      entityId: String(id),
      oldData: result.request,
      newData: result.updated,
    });

    await this.notifyTenantRenew(
      result.request.stayId,
      result.updated.id,
      '❌ Perpanjangan ditolak',
      dto.reviewNotes
        ? `Permintaan perpanjangan Anda ditolak. Catatan: ${dto.reviewNotes}`
        : 'Permintaan perpanjangan Anda ditolak. Silakan hubungi admin untuk informasi lebih lanjut.',
    );

    return result.updated;
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Query & Notification Helpers
  // ═══════════════════════════════════════════════════════════

  async findAll(status?: RenewRequestStatus, page = 1, limit = 20) {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 20)));
    const skip = (safePage - 1) * safeLimit;
    const where = status ? { status } : {};
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.renewRequest.findMany({
        where,
        include: {
          stay: { select: { id: true, agreedRentAmountRupiah: true, tenant: { select: { fullName: true, phone: true } }, room: { select: { code: true } } } },
          tenant: { select: { fullName: true } },
          reviewedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.renewRequest.count({ where }),
    ]);
    const hydrated = await this.attachInvoiceSnapshots(items);
    return {
      items: hydrated,
      meta: {
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / safeLimit)),
        page: safePage,
        limit: safeLimit,
      },
    };
  }

  /** Tenant gets their own renew requests. */
  async findMine(actor: CurrentUserPayload) {
    if (!actor.tenantId) throw new ForbiddenException('Hanya tenant yang dapat melihat permintaan');

    const items = await this.prisma.renewRequest.findMany({
      where: { tenantId: actor.tenantId },
      include: {
        stay: { select: { id: true, room: { select: { code: true } } } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachInvoiceSnapshots(items);
  }

  private async attachInvoiceSnapshots<T extends {
    downPaymentInvoiceId?: number | null;
    settlementInvoiceId?: number | null;
  }>(items: T[]) {
    const invoiceIds = Array.from(new Set(
      items.flatMap((item) => [item.downPaymentInvoiceId, item.settlementInvoiceId])
        .filter((value): value is number => typeof value === 'number'),
    ));
    const invoices = invoiceIds.length
      ? await this.prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmountRupiah: true,
            dueDate: true,
            paidAt: true,
          },
        })
      : [];
    const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    return items.map((item) => ({
      ...item,
      downPaymentInvoice: item.downPaymentInvoiceId ? byId.get(item.downPaymentInvoiceId) ?? null : null,
      settlementInvoice: item.settlementInvoiceId ? byId.get(item.settlementInvoiceId) ?? null : null,
    }));
  }

  // ── F2-1 inc.4: notifikasi in-app siklus renewal (best-effort, tak menggagalkan transaksi) ──

  private async loadStayNotifContext(stayId: number) {
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
      select: {
        tenant: { select: { fullName: true, user: { select: { id: true } } } },
        room: { select: { code: true, name: true } },
      },
    });
    const roomLabel = stay?.room?.code
      ? `${stay.room.code}${stay.room.name ? ` - ${stay.room.name}` : ''}`
      : `kamar (stay #${stayId})`;
    return { tenantUserId: stay?.tenant?.user?.id ?? null, tenantName: stay?.tenant?.fullName ?? 'Tenant', roomLabel };
  }

  private async notifyTenantRenew(stayId: number, requestId: number, title: string, body: string) {
    try {
      const ctx = await this.loadStayNotifContext(stayId);
      if (!ctx.tenantUserId) {
        this.logger.warn(`Notif renew dilewati: user portal tenant stay #${stayId} tidak ditemukan`);
        return;
      }
      await this.appNotification.create({
        recipientUserId: ctx.tenantUserId,
        title,
        body,
        linkTo: '/portal/stay',
        entityType: 'RenewRequest',
        entityId: String(requestId),
      });
    } catch (err) {
      this.logger.warn(`Notif renew tenant gagal (req #${requestId}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async notifyAdminsRenew(requestId: number, title: string, body: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.OWNER, UserRole.ADMIN] }, isActive: true },
        select: { id: true },
      });
      await Promise.allSettled(
        admins.map((admin) =>
          this.appNotification.create({
            recipientUserId: admin.id,
            title,
            body,
            linkTo: '/stays',
            entityType: 'RenewRequest',
            entityId: String(requestId),
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(`Notif renew admin gagal (req #${requestId}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
