import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { UserRole } from '../../common/enums/app.enums';
import { AppNotificationService } from '../notifications/app-notification.service';
import {
  AdditionalServicesQueryDto,
  CreateAdditionalServiceDto,
  CreateServiceInterestDto,
  ServiceInterestsQueryDto,
  UpdateAdditionalServiceDto,
  UpdateServiceInterestDto,
} from './dto/additional-service.dto';

const INTEREST_STATUSES = ['PENDING', 'CONTACTED', 'DONE', 'CANCELLED'];

// PUB-LAYANAN-TAMBAHAN: layanan tambahan (galon/TV/WiFi/dll) + tarif.
@Injectable()
export class AdditionalServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AppNotificationService,
  ) {}

  async findAll(query: AdditionalServicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where =
      typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : {};
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.additionalService.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.additionalService.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async listActive() {
    const items = await this.prisma.additionalService.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items };
  }

  async findOne(id: number) {
    const item = await this.prisma.additionalService.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Layanan tambahan tidak ditemukan');
    return item;
  }

  create(dto: CreateAdditionalServiceDto) {
    return this.prisma.additionalService.create({ data: { ...dto } });
  }

  async update(id: number, dto: UpdateAdditionalServiceDto) {
    await this.findOne(id);
    return this.prisma.additionalService.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.additionalService.delete({ where: { id } });
    return { id };
  }

  // ── PUB-LAYANAN-MINAT: minat tenant ──────────────────────────────────────

  async createInterest(tenantId: number, serviceId: number, dto: CreateServiceInterestDto) {
    const service = await this.prisma.additionalService.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      throw new NotFoundException('Layanan tambahan tidak ditemukan atau tidak aktif');
    }
    // Dedupe: bila sudah ada minat PENDING utk layanan yang sama, kembalikan itu.
    const existing = await this.prisma.serviceInterest.findFirst({
      where: { tenantId, serviceId, status: 'PENDING' as any },
    });
    if (existing) return existing;

    const created = await this.prisma.serviceInterest.create({
      data: { tenantId, serviceId, note: dto.note?.trim() || null },
    });

    // Notifikasi admin/owner (best-effort, tak menggagalkan minat).
    void this.notifyAdminsNewInterest(created.id, serviceId, tenantId, service.name);
    return created;
  }

  private async notifyAdminsNewInterest(interestId: number, serviceId: number, tenantId: number, serviceName: string) {
    try {
      const [recipients, tenant] = await Promise.all([
        this.prisma.user.findMany({
          where: { role: { in: [UserRole.OWNER, UserRole.ADMIN] }, isActive: true },
          select: { id: true },
        }),
        this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { fullName: true } }),
      ]);
      if (!recipients.length) return;
      const body = `${tenant?.fullName ?? 'Penghuni'} berminat pada layanan "${serviceName}".`;
      await Promise.allSettled(
        recipients.map((r) =>
          this.notifications.createOnce({
            recipientUserId: r.id,
            title: 'Minat Layanan Tambahan',
            body,
            linkTo: '/service-interests',
            entityType: 'ServiceInterest',
            entityId: String(interestId),
          }),
        ),
      );
    } catch {
      // best-effort
    }
  }

  async listMyInterests(tenantId: number) {
    const items = await this.prisma.serviceInterest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, serviceId: true, status: true, createdAt: true },
    });
    return { items };
  }

  async listInterests(query: ServiceInterestsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where =
      query.status && INTEREST_STATUSES.includes(query.status) ? { status: query.status as any } : {};
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.serviceInterest.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          service: { select: { name: true, priceRupiah: true, unit: true } },
          tenant: { select: { fullName: true, phone: true } },
        },
      }),
      this.prisma.serviceInterest.count({ where }),
    ]);
    return { items: rows, meta: buildMeta(page, limit, totalItems) };
  }

  async updateInterest(id: number, dto: UpdateServiceInterestDto) {
    if (!INTEREST_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Status minat tidak valid');
    }
    const existing = await this.prisma.serviceInterest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Minat layanan tidak ditemukan');
    return this.prisma.serviceInterest.update({
      where: { id },
      data: { status: dto.status as any, adminNote: dto.adminNote?.trim() || undefined },
    });
  }
}
