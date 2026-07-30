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
  category?: 'FINANCE' | 'OPERATIONS' | 'SYSTEM';
};

type NotificationCategory = NonNullable<CreateAppNotificationInput['category']>;

const FINANCE_ENTITY_TYPES = new Set([
  'INVOICE',
  'PAYMENT',
  'PAYMENTSUBMISSION',
  'DEPOSIT',
  'LOYALTY',
  'ACCOUNTING',
]);

const OPERATIONS_ENTITY_TYPES = new Set([
  'ANNOUNCEMENT',
  'BOOKING',
  'STAY',
  'RENEWREQUEST',
  'CHECKOUTREQUEST',
  'TICKET',
  'TICKETSLA',
  'ROOM',
  'ROOMTRANSFER',
  'SERVICEINTEREST',
  'BELONGINGSABANDONED',
  'STAFFFIELDREPORT',
]);

function resolveCategory(input: CreateAppNotificationInput): NotificationCategory {
  if (input.category) return input.category;

  const entityType = (input.entityType ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (FINANCE_ENTITY_TYPES.has(entityType)) return 'FINANCE';
  if (OPERATIONS_ENTITY_TYPES.has(entityType)) return 'OPERATIONS';
  return 'SYSTEM';
}

function notificationDedupeKey(input: {
  recipientUserId: number;
  title: string;
  entityType?: string | null;
  entityId?: string | null;
}) {
  return JSON.stringify([
    input.recipientUserId,
    input.title,
    input.entityType ?? null,
    input.entityId ?? null,
  ]);
}

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
        // Kategori tersimpan sebagai data eksplisit. Call-site perlu mengirim
        // category untuk event dengan konteks khusus; fallback ini menjaga
        // event lama dan event baru tetap memiliki nilai yang aman.
        category: resolveCategory(input),
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

  /**
   * Versi bulk createOnce: satu query untuk mencari duplikat dan satu createMany
   * untuk seluruh penerima baru. Cocok untuk fan-out notifikasi admin/owner agar
   * jumlah query tidak bertambah mengikuti jumlah penerima.
   */
  async createManyOnce(inputs: CreateAppNotificationInput[]) {
    if (inputs.length === 0) return { created: 0, skipped: 0 };

    const uniqueInputs = [...new Map(inputs.map((input) => [notificationDedupeKey(input), input])).values()];
    const existing = await this.prisma.appNotification.findMany({
      where: {
        OR: uniqueInputs.map((input) => ({
          recipientUserId: input.recipientUserId,
          title: input.title,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
        })),
      },
      select: {
        recipientUserId: true,
        title: true,
        entityType: true,
        entityId: true,
      },
    });
    const existingKeys = new Set(existing.map((row) => notificationDedupeKey(row)));
    const missing = uniqueInputs.filter((input) => !existingKeys.has(notificationDedupeKey(input)));
    if (missing.length === 0) return { created: 0, skipped: uniqueInputs.length };

    const result = await this.prisma.appNotification.createMany({
      data: missing.map((input) => ({
        recipientUserId: input.recipientUserId,
        title: input.title,
        body: input.body,
        linkTo: input.linkTo ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        category: resolveCategory(input),
        pushStatus: 'PENDING' as const,
      })),
    });
    return { created: result.count, skipped: uniqueInputs.length - result.count };
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
        category: n.category,
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
