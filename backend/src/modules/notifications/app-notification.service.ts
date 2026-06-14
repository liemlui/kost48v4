import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification.dto';

export type CreateAppNotificationInput = {
  recipientUserId: number;
  title: string;
  body: string;
  linkTo?: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class AppNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAppNotificationInput) {
    return this.prisma.appNotification.create({
      data: {
        recipientUserId: input.recipientUserId,
        title: input.title,
        body: input.body,
        linkTo: input.linkTo ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        // F4-2: setiap notifikasi in-app diantre untuk Web Push (outbox in-place).
        // Sweeper PushService.dispatchPending memprosesnya; bila VAPID nonaktif /
        // tenant tak punya device, status diselesaikan tanpa efek samping.
        pushStatus: 'PENDING',
      },
    });
  }

  async createOnce(input: CreateAppNotificationInput) {
    const duplicate = await this.prisma.appNotification.findFirst({
      where: {
        recipientUserId: input.recipientUserId,
        title: input.title,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
      select: { id: true },
    });

    if (duplicate) {
      return { created: false, notificationId: duplicate.id };
    }

    const notification = await this.create(input);
    return { created: true, notificationId: notification.id };
  }

  async listMine(userId: number, query: NotificationQueryDto) {
    const where: any = { recipientUserId: userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.appNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
      }),
      this.prisma.appNotification.count({ where }),
      this.prisma.appNotification.count({
        where: { recipientUserId: userId, isRead: false },
      }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        linkTo: n.linkTo,
        entityType: n.entityType,
        entityId: n.entityId,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      unreadCount,
    };
  }

  async markMineAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.appNotification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    if (notification.isRead) {
      return {
        id: notification.id,
        isRead: true,
        readAt: notification.readAt?.toISOString() ?? null,
      };
    }

    const updated = await this.prisma.appNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    return {
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString() ?? null,
    };
  }

  async markAllMineAsRead(userId: number) {
    const result = await this.prisma.appNotification.updateMany({
      where: { recipientUserId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { affected: result.count };
  }

  /**
   * F4-7 (N-04): pruning notifikasi lebih tua dari retensi (default 90 hari) agar
   * tabel AppNotification tak tumbuh tanpa batas (broadcast ALL ke banyak penerima).
   * Dibatasi per-batch (`batchLimit`) supaya satu eksekusi sweeper tidak menghapus
   * terlalu banyak sekaligus; sisa dibersihkan pada eksekusi berikutnya.
   */
  async pruneOlderThan(retentionDays = 90, batchLimit = 5000) {
    const days = Number.isFinite(retentionDays) && retentionDays > 0 ? Math.floor(retentionDays) : 90;
    const limit = Number.isFinite(batchLimit) && batchLimit > 0 ? Math.floor(batchLimit) : 5000;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stale = await this.prisma.appNotification.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: limit,
    });
    if (stale.length === 0) {
      return { deleted: 0, retentionDays: days, cutoff: cutoff.toISOString() };
    }

    const result = await this.prisma.appNotification.deleteMany({
      where: { id: { in: stale.map((n) => n.id) } },
    });
    return { deleted: result.count, retentionDays: days, cutoff: cutoff.toISOString() };
  }
}
