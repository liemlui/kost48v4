import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { AnnouncementsQueryDto } from './dto/announcements-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AnnouncementAudience, RoomStatus, StayStatus, UserRole } from '../../common/enums/app.enums';
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
    const tenantHasOccupiedStay = user.role === UserRole.TENANT
      ? await this.hasTenantOccupiedStay(user).catch((err) => {
          this.logger.warn('Gagal cek status huni tenant untuk filter pengumuman, asumsikan tidak menghuni', err?.message ?? err);
          return false;
        })
      : false;

    const audience = user.role === UserRole.TENANT
      ? tenantHasOccupiedStay
        ? [AnnouncementAudience.TENANT, AnnouncementAudience.ALL]
        : [AnnouncementAudience.ALL]
      : undefined;

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

      if (item.audience === AnnouncementAudience.TENANT) {
        const tenantHasOccupiedStay = await this.hasTenantOccupiedStay(user);
        if (!tenantHasOccupiedStay) {
          throw new ForbiddenException('Pengumuman operasional hanya tersedia untuk tenant yang sedang menghuni kamar');
        }
      }
    }
    return item;
  }

  async canAccessImage(fileKey: string, user: CurrentUserPayload) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        OR: [
          { imageFileKey: fileKey },
          { imageUrl: { endsWith: `/${fileKey}` } },
        ],
      },
      select: { id: true },
    });

    // A newly uploaded image can be previewed before the announcement record
    // is saved. The filename is random and this endpoint still requires auth.
    if (!announcement) return true;
    await this.findOne(announcement.id, user);
    return true;
  }

  async create(dto: CreateAnnouncementDto, actor: CurrentUserPayload) {
    this.validateCreateWindow(dto.startsAt, dto.expiresAt);
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

    this.validateUpdateWindow(
      dto.startsAt,
      dto.expiresAt,
      existing.startsAt?.toISOString() ?? null,
      existing.expiresAt?.toISOString() ?? null,
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

  /**
   * P2: pengumuman adalah konten operasional, sehingga penghapusan dilakukan
   * secara hard delete. Notifikasi broadcast yang menunjuk pengumuman ini ikut
   * dibersihkan agar tenant tidak menerima link yang akan menghasilkan 404.
   */
  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement tidak ditemukan');

    const [deletedNotifications] = await this.prisma.$transaction([
      this.prisma.appNotification.deleteMany({
        where: {
          entityType: 'ANNOUNCEMENT',
          entityId: String(id),
        },
      }),
      this.prisma.announcement.delete({ where: { id } }),
    ]);

    await this.audit.log({
      actorUserId: actor.id,
      action: 'DELETE',
      entityType: 'Announcement',
      entityId: String(existing.id),
      oldData: existing,
    });

    return {
      deletedId: existing.id,
      imageFileKey: existing.imageFileKey,
      deletedNotifications: deletedNotifications.count,
    };
  }

  private async hasTenantOccupiedStay(user: CurrentUserPayload): Promise<boolean> {
    if (!user.tenantId) return false;

    try {
      const occupiedStay = await this.prisma.stay.findFirst({
        where: {
          tenantId: user.tenantId,
          status: StayStatus.ACTIVE as any,
          room: { status: RoomStatus.OCCUPIED as any },
        },
        select: { id: true },
      });

      return Boolean(occupiedStay);
    } catch (err: any) {
      // AH-01: DB drift atau enum tidak sinkron → jangan 503;
      // asumsikan tidak menghuni agar endpoint tetap 200 [].
      this.logger.warn('Gagal query hasTenantOccupiedStay (kemungkinan schema drift DB)', err?.message ?? err);
      return false;
    }
  }

  private async notifyPublished(announcement: Announcement) {
    // N-02: jangan kirim notifikasi bila konten belum tayang (startsAt di masa
    // depan). Sebelumnya notif instan menunjuk pengumuman yang belum bisa dibuka.
    // AnnouncementSweepService akan mengirimnya saat startsAt tercapai.
    if (announcement.startsAt && announcement.startsAt.getTime() > Date.now()) {
      this.logger.log(
        `Notif pengumuman #${announcement.id} ditahan: startsAt ${announcement.startsAt.toISOString()} masih di masa depan.`,
      );
      return;
    }

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
          category: 'OPERATIONS',
        });
      } catch (err) {
        this.logger.error(
          `Gagal membuat notifikasi untuk user ${user.id} pada pengumuman ${announcement.id}`,
          err,
        );
        // jangan rethrow agar satu penerima gagal tidak memblok penerima lain
      }
    }

    // P2-2: tandai sudah didispatch setelah notifikasi berhasil dikirim
    try {
      await this.prisma.announcement.update({
        where: { id: announcement.id },
        data: { dispatchedAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Gagal update dispatchedAt untuk announcement #${announcement.id}`, err);
    }
  }

  /**
   * Validasi untuk CREATE: startsAt baru harus di masa depan, expiresAt > startsAt.
   */
  private validateCreateWindow(startsAt?: string | null, expiresAt?: string | null) {
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

  /**
   * Validasi untuk UPDATE:
   * - Jika startsAt DIUBAH (dto.startsAt disertakan), baru divalidasi tidak boleh di masa lalu.
   * - Jika startsAt tidak diubah (undefined), startsAt lama (boleh di masa lalu) tetap dipakai.
   * - expiresAt jika diubah harus > startsAt (baik startsAt baru maupun existing).
   */
  private validateUpdateWindow(
    dtoStartsAt: string | undefined | null,
    dtoExpiresAt: string | undefined | null,
    existingStartsAt: string | null,
    existingExpiresAt: string | null,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tentukan startsAt efektif: pakai DTO jika diubah, else existing
    const effectiveStartsAt = dtoStartsAt !== undefined ? dtoStartsAt : existingStartsAt;
    const effectiveExpiresAt = dtoExpiresAt !== undefined ? dtoExpiresAt : existingExpiresAt;

    // Jika startsAt DIUBAH (disertakan dalam body), validasi tidak boleh masa lalu
    if (dtoStartsAt !== undefined && dtoStartsAt !== null) {
      const startsDate = new Date(dtoStartsAt);
      startsDate.setHours(0, 0, 0, 0);
      if (startsDate < today) {
        throw new ConflictException('Tanggal mulai tayang tidak boleh di masa lalu.');
      }
    }

    // Jika expiresAt diubah menjadi null, hapus batas waktu — tidak perlu validasi
    if (dtoExpiresAt !== undefined && dtoExpiresAt === null) {
      return;
    }

    // Validasi expiresAt > startsAt (gunakan effective)
    if (effectiveStartsAt && effectiveExpiresAt) {
      const startsDate = new Date(effectiveStartsAt);
      startsDate.setHours(0, 0, 0, 0);
      const expiresDate = new Date(effectiveExpiresAt);
      expiresDate.setHours(0, 0, 0, 0);
      if (expiresDate <= startsDate) {
        throw new ConflictException('Tanggal berakhir harus setelah tanggal mulai tayang.');
      }
    }
  }
}
