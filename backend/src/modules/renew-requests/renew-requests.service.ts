import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { StaysService } from '../stays/stays.service';
import { RenewStayDto } from '../stays/dto/stay.dto';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
import { DecideRenewRequestDto } from './dto/decide-renew-request.dto';
import { ConfirmDownPaymentDto } from './dto/confirm-down-payment.dto';
import { CheckoutRequestStatus, StayStatus, RenewRequestStatus, UserRole, InvoiceStatus, PricingTerm } from '../../common/enums/app.enums';

@Injectable()
export class RenewRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staysService: StaysService,
    private readonly audit: AuditLogService,
  ) {}

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
    const pendingCheckout = await this.prisma.checkoutRequest.findFirst({
      where: { stayId: dto.stayId, status: CheckoutRequestStatus.PENDING },
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
        status: { in: [RenewRequestStatus.PENDING, RenewRequestStatus.PENDING_DECISION, RenewRequestStatus.AWAITING_DP, RenewRequestStatus.DP_SECURED] },
      },
    });
    if (existingActive) {
      throw new ConflictException('Masih ada permintaan perpanjangan yang sedang berjalan');
    }

    // F2-1: DP 30% perpanjangan = 30% × sewa SAAT INI (rent-loyalty D-16: tak naik saat renew).
    const renewalRentRupiah = stay.agreedRentAmountRupiah ?? 0;
    const downPaymentAmountRupiah = Math.round((renewalRentRupiah * 30) / 100);

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
      },
    });

    return request;
  }

  /**
   * F2-1: tenant menjawab prompt perpanjangan (YA/TIDAK).
   * YA → AWAITING_DP (prioritas tenant lama s/d hari-H, tunggu DP 30%).
   * TIDAK → REJECTED_BY_TENANT (kamar dibuka publik mulai tanggal checkout — room-publication inc.2b).
   */
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

    const nextStatus = dto.decision === 'YA' ? RenewRequestStatus.AWAITING_DP : RenewRequestStatus.REJECTED_BY_TENANT;
    const updated = await this.prisma.renewRequest.update({
      where: { id },
      data: { status: nextStatus, requestNotes: dto.notes ?? request.requestNotes },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: dto.decision === 'YA' ? 'RENEW_DECIDE_YES' : 'RENEW_DECIDE_NO',
      entityType: 'RenewRequest',
      entityId: String(id),
      oldData: request,
      newData: updated,
    });
    return updated;
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
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
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
    return updated;
  }

  /** Admin/owner approves a pending renew request and executes the renewal. */
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

      // F2-1 rent-loyalty (D-16): harga sewa renewal = sewa SAAT INI (tak naik). Abaikan kenaikan via dto.
      const currentStay = await tx.stay.findUnique({ where: { id: request.stayId }, select: { agreedRentAmountRupiah: true } });

      const finalPlannedCheckOutDate = dto.plannedCheckOutDate
        ?? (request.requestedCheckOutDate ? request.requestedCheckOutDate.toISOString() : undefined);

      const renewDto: RenewStayDto = {
        pricingTerm: request.requestedTerm as PricingTerm,
        plannedCheckOutDate: finalPlannedCheckOutDate,
        agreedRentAmountRupiah: currentStay?.agreedRentAmountRupiah ?? dto.agreedRentAmountRupiah,
        electricityReadingValue: dto.electricityReadingValue,
        waterReadingValue: dto.waterReadingValue,
        meterReadingAt: dto.meterReadingAt,
      };

      const renewResult = await this.staysService.renewStayInTransaction(tx, request.stayId, renewDto, actor);

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

      return { request: updated, ...renewResult };
    });

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
    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: String(result.invoice.id),
      newData: result.invoice,
    });

    return { request: result.request, stay: result.stay, invoice: result.invoice, meterSummary: result.meterSummary };
  }

  /** Admin/owner rejects a pending renew request. */
  async rejectRequest(id: number, dto: RejectRenewRequestDto, actor: CurrentUserPayload) {
    const request = await this.prisma.renewRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
    const rejectable = [RenewRequestStatus.PENDING, RenewRequestStatus.PENDING_DECISION, RenewRequestStatus.AWAITING_DP, RenewRequestStatus.DP_SECURED];
    if (!rejectable.includes(request.status as RenewRequestStatus)) {
      throw new ConflictException('Permintaan perpanjangan sudah final dan tidak dapat ditolak.');
    }

    const updated = await this.prisma.renewRequest.update({
      where: { id },
      data: {
        status: RenewRequestStatus.REJECTED,
        reviewNotes: dto.reviewNotes,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    return updated;
  }

  /** Admin/owner list all renew requests with optional status filter. */
  async findAll(status?: RenewRequestStatus) {
    const where = status ? { status } : {};
    return this.prisma.renewRequest.findMany({
      where,
      include: {
        stay: { select: { id: true, agreedRentAmountRupiah: true, tenant: { select: { fullName: true, phone: true } }, room: { select: { code: true } } } },
        tenant: { select: { fullName: true } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tenant gets their own renew requests. */
  async findMine(actor: CurrentUserPayload) {
    if (!actor.tenantId) throw new ForbiddenException('Hanya tenant yang dapat melihat permintaan');

    return this.prisma.renewRequest.findMany({
      where: { tenantId: actor.tenantId },
      include: {
        stay: { select: { id: true, room: { select: { code: true } } } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}