import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { StaysService } from '../stays/stays.service';
import { CompleteStayDto } from '../stays/dto/stay.dto';
import { CreateCheckoutRequestDto } from './dto/create-checkout-request.dto';
import { ApproveCheckoutRequestDto } from './dto/approve-checkout-request.dto';
import { RejectCheckoutRequestDto } from './dto/reject-checkout-request.dto';
import {
  StayStatus,
  CheckoutRequestStatus,
  UserRole,
} from '../../common/enums/app.enums';

@Injectable()
export class CheckoutRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staysService: StaysService,
  ) {}

  /** Tenant creates a checkout request for their active stay. */
  async createRequest(dto: CreateCheckoutRequestDto, actor: CurrentUserPayload) {
    if (actor.role !== UserRole.TENANT) {
      throw new ForbiddenException(
        'Hanya tenant yang dapat mengajukan permintaan checkout',
      );
    }

    const stay = await this.prisma.stay.findUnique({
      where: { id: dto.stayId },
    });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException(
        'Stay tidak aktif, tidak dapat mengajukan checkout',
      );
    }

    if (stay.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Anda bukan pemilik stay ini');
    }

    const existingPending = await this.prisma.checkoutRequest.findFirst({
      where: { stayId: dto.stayId, status: CheckoutRequestStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException(
        'Masih ada permintaan checkout yang menunggu persetujuan',
      );
    }

    // Normalize requestedCheckOutDate to Date at start of day (Jakarta time)
    const requestedDate = new Date(dto.requestedCheckOutDate);
    if (isNaN(requestedDate.getTime())) {
      throw new BadRequestException('Format tanggal checkout tidak valid');
    }
    requestedDate.setHours(0, 0, 0, 0);

    // Validate H+1 (at least tomorrow)
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (requestedDate < tomorrow) {
      throw new BadRequestException(
        'Tanggal checkout yang diajukan harus minimal H+1 dari hari ini',
      );
    }

    const request = await this.prisma.checkoutRequest.create({
      data: {
        stayId: dto.stayId,
        requestedCheckOutDate: requestedDate,
        checkoutReason: dto.checkoutReason,
        requestNotes: dto.requestNotes ?? null,
      },
    });

    return request;
  }

  /** Admin/owner approves a pending checkout request and executes the checkout. */
  async approveRequest(
    id: number,
    dto: ApproveCheckoutRequestDto,
    actor: CurrentUserPayload,
  ) {
    const request = await this.prisma.checkoutRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Permintaan checkout tidak ditemukan');
    if (request.status !== CheckoutRequestStatus.PENDING) {
      throw new ConflictException(
        'Permintaan checkout sudah diproses sebelumnya',
      );
    }

    // Execute the actual checkout via staysService.complete
    const actualCheckOutDate =
      dto.actualCheckOutDate ?? new Date().toISOString();
    const completeDto: CompleteStayDto = {
      actualCheckOutDate,
      checkoutReason:
        dto.checkoutReason ??
        request.requestNotes ??
        'Checkout via permintaan tenant',
      notes: dto.reviewNotes ?? undefined,
    };

    const result = await this.staysService.complete(
      request.stayId,
      completeDto,
      actor,
    );

    const updated = await this.prisma.checkoutRequest.update({
      where: { id },
      data: {
        status: CheckoutRequestStatus.APPROVED,
        reviewNotes: dto.reviewNotes ?? null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    return { request: updated, stay: result };
  }

  /** Admin/owner rejects a pending checkout request. */
  async rejectRequest(
    id: number,
    dto: RejectCheckoutRequestDto,
    actor: CurrentUserPayload,
  ) {
    const request = await this.prisma.checkoutRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException('Permintaan checkout tidak ditemukan');
    if (request.status !== CheckoutRequestStatus.PENDING) {
      throw new ConflictException(
        'Permintaan checkout sudah diproses sebelumnya',
      );
    }

    const updated = await this.prisma.checkoutRequest.update({
      where: { id },
      data: {
        status: CheckoutRequestStatus.REJECTED,
        reviewNotes: dto.reviewNotes,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    return updated;
  }

  /** Admin/owner list all checkout requests with optional status filter. */
  async findAll(status?: CheckoutRequestStatus) {
    const where = status ? { status } : {};
    return this.prisma.checkoutRequest.findMany({
      where,
      include: {
        stay: {
          select: {
            id: true,
            tenant: { select: { fullName: true, phone: true } },
            room: { select: { code: true } },
          },
        },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tenant gets their own checkout requests. */
  async findMine(actor: CurrentUserPayload) {
    if (!actor.tenantId)
      throw new ForbiddenException(
        'Hanya tenant yang dapat melihat permintaan',
      );

    return this.prisma.checkoutRequest.findMany({
      where: { stay: { tenantId: actor.tenantId } },
      include: {
        stay: { select: { id: true, room: { select: { code: true } } } },
        reviewedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}