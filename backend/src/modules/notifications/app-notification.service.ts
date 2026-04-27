import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification.dto';

@Injectable()
export class AppNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    recipientUserId: number;
    title: string;
    body: string;
    linkTo?: string;
    entityType?: string;
    entityId?: string;
  }) {
    return this.prisma.appNotification.create({
      data: {
        recipientUserId: input.recipientUserId,
        title: input.title,
        body: input.body,
        linkTo: input.linkTo ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
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
}
