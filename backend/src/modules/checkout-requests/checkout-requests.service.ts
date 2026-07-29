// FILE: checkout-requests.service.ts — proses check-out tenant: request → approve + hitung akhir
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Prisma } from '../../generated/prisma';
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
import { ACTIVE_RENEW_STATUSES } from '../../common/business/lifecycle-guards.helper';

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
        .map((invoice: any) => `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} belum dibayar`)
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

    // P2-02: Guard — checkout tidak boleh melebihi akhir masa sewa saat ini
    if (stay.plannedCheckOutDate && requestedDate > stay.plannedCheckOutDate) {
      throw new BadRequestException(
        'Tanggal checkout tidak boleh melebihi akhir masa sewa saat ini. Untuk perpanjangan, silakan ajukan perpanjangan sewa (renewal).',
      );
    }

    const request = await this.prisma.$transaction(async (tx) => {
      // S-01: FOR UPDATE lock Stay untuk serialisasi terhadap renewal
      // (prepareRenewalSettlementInTransaction juga mengambil lock yang sama).
      await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${dto.stayId} FOR UPDATE`;

      // S-01: cross-block — cegah checkout saat renew request masih aktif.
      // Dipindahkan ke dalam transaction setelah FOR UPDATE agar serialized
      // terhadap renew-request createRequest.
      const activeRenew = await tx.renewRequest.findFirst({
        where: { stayId: dto.stayId, status: { in: ACTIVE_RENEW_STATUSES } },
      });
      if (activeRenew) {
        throw new ConflictException(
          'Tidak dapat mengajukan checkout karena ada permintaan perpanjangan yang sedang aktif',
        );
      }

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
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Hanya OWNER/ADMIN yang dapat menyetujui pengajuan keluar',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // H9: FOR UPDATE lock — cegah TOCTOU antara pengecekan status dan update.
      const locked = await tx.$queryRaw<Array<{ id: number; status: string; stayId: number; requestedCheckOutDate: Date }>>(
        Prisma.sql`SELECT id, status, "stayId", "requestedCheckOutDate" FROM "CheckoutRequest" WHERE id = ${id} FOR UPDATE`,
      );
      if (locked.length !== 1 || locked[0].status !== CheckoutRequestStatus.PENDING) {
        throw new ConflictException('Permintaan checkout sudah diproses sebelumnya');
      }
      const lockedRequest = locked[0];

      // P2-04: FOR UPDATE lock Stay sebelum diupdate — cegah race condition
      // stay berubah status antara pengecekan dan updateMany
      await tx.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`SELECT id FROM "Stay" WHERE id = ${lockedRequest.stayId} FOR UPDATE`,
      );

      // S-01: cross-block — cegah approve checkout saat renew request
      // masih aktif (PENDING, PENDING_DECISION, AWAITING_DP, DP_SECURED).
      // Karena Stay sudah di-lock FOR UPDATE, pengecekan ini serialized
      // terhadap prepareRenewalSettlementInTransaction.
      const activeRenew = await tx.renewRequest.findFirst({
        where: { stayId: lockedRequest.stayId, status: { in: ACTIVE_RENEW_STATUSES } },
      });
      if (activeRenew) {
        throw new ConflictException(
          'Tidak dapat menyetujui checkout karena ada permintaan perpanjangan yang sedang aktif. Selesaikan atau tolak permintaan perpanjangan terlebih dahulu.',
        );
      }

      await this.assertNoOpenInvoices(
        lockedRequest.stayId,
        'Pengajuan keluar belum bisa disetujui karena masih ada tagihan aktif',
        tx,
      );

      const approveResult = await tx.checkoutRequest.updateMany({
        where: { id, status: CheckoutRequestStatus.PENDING },
        data: {
          status: CheckoutRequestStatus.APPROVED,
          reviewNotes: dto.reviewNotes ?? null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });

      if (approveResult.count !== 1) {
        throw new ConflictException(
          'Permintaan checkout sudah diproses sebelumnya',
        );
      }

      const stay = await tx.stay.findUnique({
        where: { id: lockedRequest.stayId },
        select: { plannedCheckOutDate: true },
      });
      const requestedDate = new Date(lockedRequest.requestedCheckOutDate);
      const currentCheckOut = stay?.plannedCheckOutDate
        ? new Date(stay.plannedCheckOutDate)
        : null;
      if (currentCheckOut && requestedDate > currentCheckOut) {
        throw new ConflictException(
          'Tanggal checkout tidak boleh melebihi tanggal kontrak saat ini. Untuk perpanjangan, silakan ajukan perpanjangan sewa (renewal).',
        );
      }
      await tx.stay.updateMany({
        where: { id: lockedRequest.stayId, status: StayStatus.ACTIVE },
        data: { plannedCheckOutDate: requestedDate },
      });

      return tx.checkoutRequest.findUniqueOrThrow({ where: { id } });
    });

    // Notify tenant — non-blocking
    await this.notifyTenantOnApprove(updated.stayId, id);

    return updated;
  }

  /** Admin/owner rejects a pending checkout request. */
  async rejectRequest(
    id: number,
    dto: RejectCheckoutRequestDto,
    actor: CurrentUserPayload,
  ) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        'Hanya OWNER/ADMIN yang dapat menolak pengajuan keluar',
      );
    }

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
      const rejectResult = await tx.checkoutRequest.updateMany({
        where: { id, status: CheckoutRequestStatus.PENDING },
        data: {
          status: CheckoutRequestStatus.REJECTED,
          reviewNotes: dto.reviewNotes,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });

      if (rejectResult.count !== 1) {
        throw new ConflictException(
          'Permintaan checkout sudah diproses sebelumnya',
        );
      }

      return tx.checkoutRequest.findUniqueOrThrow({ where: { id } });
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