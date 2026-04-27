import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { AnnouncementsQueryDto } from './dto/announcements-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AnnouncementAudience, UserRole } from '../../common/enums/app.enums';
import { AppNotificationService } from '../notifications/app-notification.service';
import { Announcement } from '../../generated/prisma';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly notificationService: AppNotificationService,
  ) {}

  async findAll(query: AnnouncementsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { content: { contains: query.search, mode: 'insensitive' } }] } : {},
        query.audience ? { audience: query.audience } : {},
        typeof query.isPublished === 'string' ? { isPublished: query.isPublished === 'true' } : {},
        typeof query.isPinned === 'string' ? { isPinned: query.isPinned === 'true' } : {},
      ],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({ where, skip, take, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.announcement.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findActive(user: CurrentUserPayload) {
    const now = new Date();
    const audience = user.role === UserRole.TENANT ? [AnnouncementAudience.TENANT, AnnouncementAudience.ALL] : undefined;
    return {
      items: await this.prisma.announcement.findMany({
        where: {
          isPublished: true,
          AND: [
            audience ? { audience: { in: audience as any } } : {},
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          ],
        },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      }),
    };
  }

  async findOne(id: number, user: CurrentUserPayload) {
    const item = await this.prisma.announcement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Announcement tidak ditemukan');
    if (user.role === UserRole.TENANT) {
      const now = new Date();
      if (!item.isPublished) throw new ForbiddenException('Tidak berhak melihat announcement ini');
      if (![AnnouncementAudience.TENANT, AnnouncementAudience.ALL].includes(item.audience as any)) throw new ForbiddenException('Tidak berhak melihat announcement ini');
      if ((item.startsAt && item.startsAt > now) || (item.expiresAt && item.expiresAt < now)) throw new ForbiddenException('Tidak berhak melihat announcement ini');
    }
    return item;
  }

  async create(dto: CreateAnnouncementDto, actor: CurrentUserPayload) {
    this.validateWindow(dto.startsAt, dto.expiresAt);
    const isPublishing = !!dto.isPublished;
    const created = await this.prisma.announcement.create({
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById: actor.id,
        publishedAt: isPublishing ? new Date() : null,
      },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Announcement', entityId: String(created.id), newData: created });
    if (isPublishing) {
      this.notifyPublished(created).catch((err) => this.logger.error('Gagal membuat notifikasi pengumuman', err));
    }
    return created;
  }

  async update(id: number, dto: UpdateAnnouncementDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement tidak ditemukan');

    const wasUnpublished = !existing.isPublished;
    const isNowPublishing = typeof dto.isPublished === 'boolean' ? dto.isPublished : existing.isPublished;
    const transitionedToPublished = wasUnpublished && isNowPublishing;

    this.validateWindow(
      dto.startsAt ?? existing.startsAt?.toISOString(),
      dto.expiresAt ?? existing.expiresAt?.toISOString(),
    );

    const updateData: any = { ...dto };
    if (dto.startsAt !== undefined) {
      updateData.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (transitionedToPublished) {
      updateData.publishedAt = new Date();
    }

    const updated = await this.prisma.announcement.update({ where: { id }, data: updateData });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Announcement', entityId: String(updated.id), oldData: existing, newData: updated });

    if (transitionedToPublished) {
      this.notifyPublished(updated).catch((err) => this.logger.error('Gagal membuat notifikasi pengumuman', err));
    }
    return updated;
  }

  async publish(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement tidak ditemukan');
    if (existing.isPublished) throw new ConflictException('Announcement sudah dipublikasikan');
    const updated = await this.prisma.announcement.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
    await this.audit.log({ actorUserId: actor.id, action: 'PUBLISH', entityType: 'Announcement', entityId: String(updated.id), oldData: existing, newData: updated });
    this.notifyPublished(updated).catch((err) => this.logger.error('Gagal membuat notifikasi pengumuman', err));
    return updated;
  }

  private async notifyPublished(announcement: Announcement) {
    const isTenantAudience = announcement.audience === AnnouncementAudience.TENANT;

    let recipients: { id: number; role: string }[];

    if (isTenantAudience) {
      // Hanya tenant dengan stay aktif dan room OCCUPIED yang menerima pengumuman operasional TENANT
      recipients = await this.prisma.user.findMany({
        where: {
          role: UserRole.TENANT,
          isActive: true,
          tenant: {
            stays: {
              some: {
                status: 'ACTIVE' as any,
                room: {
                  status: 'OCCUPIED' as any,
                },
              },
            },
          },
        },
        select: { id: true, role: true },
      });
    } else {
      recipients = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, role: true },
      });
    }

    for (const user of recipients) {
      try {
        const existingNotification = await this.prisma.appNotification.findFirst({
          where: {
            recipientUserId: user.id,
            entityType: 'ANNOUNCEMENT',
            entityId: String(announcement.id),
          },
          select: { id: true },
        });

        if (existingNotification) {
          continue;
        }

        const linkTo = user.role === UserRole.TENANT ? '/portal/announcements' : '/announcements';

        await this.notificationService.create({
          recipientUserId: user.id,
          title: 'Pengumuman baru',
          body: announcement.title,
          linkTo,
          entityType: 'ANNOUNCEMENT',
          entityId: String(announcement.id),
        });
      } catch (err) {
        this.logger.error(
          `Gagal membuat notifikasi untuk user ${user.id} pada pengumuman ${announcement.id}`,
          err,
        );
        // jangan rethrow agar satu penerima gagal tidak memblok penerima lain
      }
    }
  }

  private validateWindow(startsAt?: string | null, expiresAt?: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startsAt) {
      const startsDate = new Date(startsAt);
      startsDate.setHours(0, 0, 0, 0);
      if (startsDate < today) {
        throw new ConflictException('Tanggal mulai tayang tidak boleh di masa lalu.');
      }
    }

    if (startsAt && expiresAt) {
      const startsDate = new Date(startsAt);
      startsDate.setHours(0, 0, 0, 0);
      const expiresDate = new Date(expiresAt);
      expiresDate.setHours(0, 0, 0, 0);
      if (expiresDate <= startsDate) {
        throw new ConflictException('Tanggal berakhir harus setelah tanggal mulai tayang.');
      }
    }
  }
}