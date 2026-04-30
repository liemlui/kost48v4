import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { StaysService } from '../stays/stays.service';
import { RenewStayDto } from '../stays/dto/stay.dto';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
import { StayStatus, RenewRequestStatus, UserRole } from '../../common/enums/app.enums';

@Injectable()
export class RenewRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staysService: StaysService,
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
        requestNotes: dto.requestNotes,
      },
    });

    return request;
  }

  /** Admin/owner approves a pending renew request and executes the renewal. */
  async approveRequest(id: number, dto: ApproveRenewRequestDto, actor: CurrentUserPayload) {
    const request = await this.prisma.renewRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Permintaan perpanjangan tidak ditemukan');
    if (request.status !== RenewRequestStatus.PENDING) {
      throw new ConflictException('Permintaan perpanjangan sudah diproses sebelumnya');
    }

    // Build RenewStayDto from the request. Admin can set the final plannedCheckOutDate via the existing stay DTO.
    // We pass through to staysService.renewStay which handles the invoice + stay extension in a transaction.
    const renewDto: RenewStayDto = {
      plannedCheckOutDate: request.requestedCheckOutDate
        ? request.requestedCheckOutDate.toISOString()
        : undefined,
    };

    const result = await this.staysService.renewStay(request.stayId, renewDto, actor);

    const updated = await this.prisma.renewRequest.update({
      where: { id },
      data: {
        status: RenewRequestStatus.APPROVED,
        reviewNotes: dto.reviewNotes ?? null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    return { request: updated, stay: result.stay, invoice: result.invoice };
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
        stay: { select: { id: true, tenant: { select: { fullName: true, phone: true } }, room: { select: { code: true } } } },
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