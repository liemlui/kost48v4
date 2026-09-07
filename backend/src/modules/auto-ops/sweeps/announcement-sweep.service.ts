import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppNotificationService } from '../../notifications/app-notification.service';
import { AnnouncementAudience, UserRole } from '../../../common/enums/app.enums';

/**
 * P2-2: Sweeper untuk announcement yang sudah waktunya tayang (startsAt <= now)
 * tetapi belum pernah didispatch (dispatchedAt IS NULL).
 *
 * Idempoten: hanya memproses announcement published dengan startsAt <= now
 * dan dispatchedAt = null. Setelah dispatch, dispatchedAt diisi.
 * Announcement yang di-unpublish sebelum startsAt tidak akan diproses.
 */
@Injectable()
export class AnnouncementSweepService {
  private readonly logger = new Logger(AnnouncementSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: AppNotificationService,
  ) {}

  async sweepAnnouncementDispatch(): Promise<{ dispatched: number; errors: number }> {
    const now = new Date();

    // Cari announcement published yang sudah waktunya tayang tapi belum didispatch
    const pendingAnnouncements = await this.prisma.announcement.findMany({
      where: {
        isPublished: true,
        dispatchedAt: null,
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } },
            ],
          },
        ],
      },
      select: { id: true, title: true, audience: true },
    });

    if (pendingAnnouncements.length === 0) {
      return { dispatched: 0, errors: 0 };
    }

    let dispatched = 0;
    let errors = 0;

    for (const announcement of pendingAnnouncements) {
      try {
        await this.dispatchForAnnouncement(announcement.id, announcement.title, announcement.audience as AnnouncementAudience);
        dispatched++;
      } catch (err) {
        this.logger.error(`Gagal dispatch announcement #${announcement.id}`, err);
        errors++;
      }
    }

    this.logger.log(`Announcement dispatch: ${dispatched} success, ${errors} errors`);
    return { dispatched, errors };
  }

  private async dispatchForAnnouncement(
    announcementId: number,
    title: string,
    audience: AnnouncementAudience,
  ) {
    const isTenantAudience = audience === AnnouncementAudience.TENANT;

    let recipients: { id: number; role: string }[];

    if (isTenantAudience) {
      // Hanya tenant dengan stay aktif dan room OCCUPIED
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

    // Batch fan-out: satu findMany untuk duplikat + satu createMany untuk penerima baru,
    // sehingga jumlah query tidak tumbuh seiring jumlah penerima.
    try {
      await this.notificationService.createManyOnce(
        recipients.map((user) => ({
          recipientUserId: user.id,
          title: 'Pengumuman baru',
          body: title,
          linkTo: user.role === UserRole.TENANT ? '/portal/announcements' : '/announcements',
          entityType: 'ANNOUNCEMENT',
          entityId: String(announcementId),
          category: 'OPERATIONS' as const,
        })),
      );
    } catch (err) {
      this.logger.error(
        `Gagal membuat notifikasi batch untuk pengumuman ${announcementId}`,
        err,
      );
      // jangan rethrow agar notifikasi gagal tidak memblok dispatch announcement
    }

    // Tandai sudah didispatch
    await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { dispatchedAt: new Date() },
    });
  }
}
