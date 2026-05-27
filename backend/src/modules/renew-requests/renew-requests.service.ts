import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { StaysService } from '../stays/stays.service';
import { RenewStayDto } from '../stays/dto/stay.dto';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
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

    const existingPending = await this.prisma.renewRequest.findFirst({
      where: { stayId: dto.stayId, status: RenewRequestStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException('Masih ada permintaan perpanjangan yang menunggu persetujuan');
    }

    const request = await this.prisma.renewRequest.create({
      data: {
        stayId: dto.stayId,
        tenantId: actor.tenantId!,
        requestedTerm: dto.requestedTerm,
        requestedCheckOutDate: dto.requestedCheckOutDate ? new Date(dto.requestedCheckOutDate) : undefined,
        requestNotes: dto.requestNotes,
      },
    });

    return request;
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
      if (request.status !== RenewRequestStatus.PENDING) {
        throw new ConflictException('Permintaan perpanjangan sudah diproses sebelumnya');
      }

      const finalPlannedCheckOutDate = dto.plannedCheckOutDate
        ?? (request.requestedCheckOutDate ? request.requestedCheckOutDate.toISOString() : undefined);

      const renewDto: RenewStayDto = {
        pricingTerm: request.requestedTerm as PricingTerm,
        plannedCheckOutDate: finalPlannedCheckOutDate,
        agreedRentAmountRupiah: dto.agreedRentAmountRupiah,
        electricityReadingValue: dto.electricityReadingValue,
        waterReadingValue: dto.waterReadingValue,
        meterReadingAt: dto.meterReadingAt,
      };

      const renewResult = await this.staysService.renewStayInTransaction(tx, request.stayId, renewDto, actor);

      const updated = await tx.renewRequest.update({
        where: { id },
        data: {
          status: RenewRequestStatus.APPROVED,
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
    if (request.status !== RenewRequestStatus.PENDING) {
      throw new ConflictException('Permintaan perpanjangan sudah diproses sebelumnya');
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