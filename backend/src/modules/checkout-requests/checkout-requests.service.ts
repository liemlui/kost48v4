import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { CreateCheckoutRequestDto } from './dto/create-checkout-request.dto';
import { ApproveCheckoutRequestDto } from './dto/approve-checkout-request.dto';
import { RejectCheckoutRequestDto } from './dto/reject-checkout-request.dto';
import {
  StayStatus,
  CheckoutRequestStatus,
  RenewRequestStatus,
  UserRole,
  InvoiceStatus,
} from '../../common/enums/app.enums';

@Injectable()
export class CheckoutRequestsService {
  private readonly logger = new Logger(CheckoutRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotificationService: AppNotificationService,
  ) {}

  private async assertNoOpenInvoices(stayId: number, messagePrefix: string, db: PrismaService | any = this.prisma) {
    const openInvoices = await db.invoice.findMany({
      where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } },
      select: { id: true, invoiceNumber: true, status: true },
      orderBy: { id: 'asc' },
    });
    if (openInvoices.length > 0) {
      const refs = openInvoices
        .map((invoice) => `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} belum dibayar`)
        .join(', ');
      throw new ConflictException(`${messagePrefix}: ${refs}`);
    }
  }

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

    // Cross-block: cannot create checkout request if a renew request is PENDING
    const pendingRenew = await this.prisma.renewRequest.findFirst({
      where: { stayId: dto.stayId, status: RenewRequestStatus.PENDING },
    });
    if (pendingRenew) {
      throw new ConflictException(
        'Tidak dapat mengajukan checkout karena ada permintaan perpanjangan yang menunggu persetujuan',
      );
    }

    // Normalize requestedCheckOutDate to UTC start-of-day so business dates stay stable across server timezones
    const requestedDate = new Date(dto.requestedCheckOutDate);
    if (isNaN(requestedDate.getTime())) {
      throw new BadRequestException('Format tanggal checkout tidak valid');
    }
    requestedDate.setUTCHours(0, 0, 0, 0);

    // Validate H+1 (at least tomorrow)
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (requestedDate < tomorrow) {
      throw new BadRequestException(
        'Tanggal checkout yang diajukan harus minimal H+1 dari hari ini',
      );
    }

    const request = await this.prisma.$transaction(async (tx) => {
      await this.assertNoOpenInvoices(
        dto.stayId,
        'Selesaikan tagihan aktif sebelum mengajukan keluar',
        tx,
      );

      const existingPending = await tx.checkoutRequest.findFirst({
        where: { stayId: dto.stayId, status: CheckoutRequestStatus.PENDING },
      });
      if (existingPending) {
        throw new ConflictException(
          'Masih ada permintaan checkout yang menunggu persetujuan',
        );
      }

      return tx.checkoutRequest.create({
        data: {
          stayId: dto.stayId,
          requestedCheckOutDate: requestedDate,
          checkoutReason: dto.checkoutReason,
          requestNotes: dto.requestNotes ?? null,
        },
      });
    });

    // Notify OWNER/ADMIN — non-blocking
    await this.notifyOwnerAdminOnCreate(request.id, stay.id);

    return request;
  }

  /** Admin/owner approves a pending checkout request. Does NOT execute checkout. */
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

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.assertNoOpenInvoices(
        request.stayId,
        'Pengajuan keluar belum bisa disetujui karena masih ada tagihan aktif',
        tx,
      );

      return tx.checkoutRequest.update({
        where: { id },
        data: {
          status: CheckoutRequestStatus.APPROVED,
          reviewNotes: dto.reviewNotes ?? null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });
    });

    // Notify tenant — non-blocking
    await this.notifyTenantOnApprove(request.stayId, id);

    return updated;
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

    // Notify tenant — non-blocking
    await this.notifyTenantOnReject(request.stayId, id, dto.reviewNotes);

    return updated;
  }

  /** Admin/owner list checkout requests with optional status and stay filters. */
  async findAll(status?: CheckoutRequestStatus, stayId?: number) {
    const where: { status?: CheckoutRequestStatus; stayId?: number } = {};
    if (status) where.status = status;
    if (stayId) where.stayId = stayId;

    const items = await this.prisma.checkoutRequest.findMany({
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

    return { items };
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

  // ---------------------------------------------------------------------------
  // Notification helpers — non-blocking (failures logged, not thrown)
  // ---------------------------------------------------------------------------

  private async notifyOwnerAdminOnCreate(
    requestId: number,
    stayId: number,
  ) {
    try {
      const [ownerAdminUsers, checkoutRequest] = await Promise.all([
        this.prisma.user.findMany({
          where: { role: { in: [UserRole.OWNER, UserRole.ADMIN] }, isActive: true },
          select: { id: true, fullName: true },
        }),
        this.prisma.checkoutRequest.findUnique({
          where: { id: requestId },
          select: {
            requestedCheckOutDate: true,
            stay: {
              select: {
                tenant: { select: { fullName: true, phone: true } },
                room: { select: { code: true, name: true } },
                plannedCheckOutDate: true,
              },
            },
          },
        }),
      ]);

      if (ownerAdminUsers.length === 0) return;

      const stay = checkoutRequest?.stay;
      const tenantName = stay?.tenant?.fullName || 'Tenant';
      const roomLabel = stay?.room?.code
        ? `${stay.room.code}${stay.room.name ? ` - ${stay.room.name}` : ''}`
        : 'kamar terkait';
      const requestedDate = checkoutRequest?.requestedCheckOutDate
        ? ` Tanggal keluar yang diajukan: ${checkoutRequest.requestedCheckOutDate.toLocaleDateString('id-ID', { timeZone: 'UTC' })}.`
        : '';
      const currentPlannedDate = stay?.plannedCheckOutDate
        ? ` Akhir masa sewa saat ini: ${stay.plannedCheckOutDate.toLocaleDateString('id-ID', { timeZone: 'UTC' })}.`
        : '';
      const body = `${tenantName} mengajukan keluar dari ${roomLabel}.${requestedDate}${currentPlannedDate}`;

      const notifications = ownerAdminUsers.map((user) =>
        this.appNotificationService.create({
          recipientUserId: user.id,
          title: 'Permintaan Checkout Baru',
          body,
          linkTo: '/stays?status=BOOKINGS',
          entityType: 'CheckoutRequest',
          entityId: String(requestId),
        }),
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi OWNER/ADMIN untuk checkout request #${requestId}`,
        (error as Error)?.message ?? error,
      );
    }
  }

  private async notifyTenantOnApprove(stayId: number, requestId: number) {
    try {
      const stay = await this.prisma.stay.findUnique({
        where: { id: stayId },
        select: {
          tenant: {
            select: {
              id: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      const tenantUser = stay?.tenant?.user;
      if (!tenantUser) {
        this.logger.warn(
          `Tidak dapat menemukan user portal untuk tenant stay #${stayId}, notifikasi approve dilewati`,
        );
        return;
      }

      await this.appNotificationService.create({
        recipientUserId: tenantUser.id,
        title: 'Permintaan Checkout Disetujui',
        body: 'Permintaan checkout Anda telah disetujui. Proses checkout final akan ditangani oleh admin. Silakan hubungi admin untuk jadwal checkout.',
        linkTo: '/portal/stay',
        entityType: 'CheckoutRequest',
        entityId: String(requestId),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi approve ke tenant untuk checkout request #${requestId}`,
        (error as Error)?.message ?? error,
      );
    }
  }

  private async notifyTenantOnReject(
    stayId: number,
    requestId: number,
    reviewNotes: string,
  ) {
    try {
      const stay = await this.prisma.stay.findUnique({
        where: { id: stayId },
        select: {
          tenant: {
            select: {
              id: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      const tenantUser = stay?.tenant?.user;
      if (!tenantUser) {
        this.logger.warn(
          `Tidak dapat menemukan user portal untuk tenant stay #${stayId}, notifikasi reject dilewati`,
        );
        return;
      }

      const body = reviewNotes
        ? `Permintaan checkout Anda ditolak. Catatan: ${reviewNotes}`
        : 'Permintaan checkout Anda ditolak. Silakan hubungi admin untuk informasi lebih lanjut.';

      await this.appNotificationService.create({
        recipientUserId: tenantUser.id,
        title: 'Permintaan Checkout Ditolak',
        body,
        linkTo: '/portal/stay',
        entityType: 'CheckoutRequest',
        entityId: String(requestId),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi reject ke tenant untuk checkout request #${requestId}`,
        (error as Error)?.message ?? error,
      );
    }
  }
}