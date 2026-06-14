import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/push-subscription.dto';

/**
 * F4-2 — PWA Web Push.
 * Mengirim notifikasi in-app (AppNotification) sebagai Web Push ke device tenant/staf.
 * Outbox in-place: AppNotification.pushStatus (NONE/PENDING/SENT/FAILED) jadi antrean.
 * VAPID dibaca dari env; bila tak ada → push nonaktif (notif in-app tetap jalan).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private configured = false;
  private static readonly MAX_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const publicKey = (process.env.VAPID_PUBLIC_KEY ?? '').trim();
    const privateKey = (process.env.VAPID_PRIVATE_KEY ?? '').trim();
    const subject = (process.env.VAPID_SUBJECT ?? 'mailto:admin@kost48.local').trim();
    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
        this.logger.log('Web Push VAPID terkonfigurasi.');
      } catch (error) {
        this.logger.warn(`VAPID gagal dikonfigurasi: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      this.logger.warn('VAPID belum di-set (VAPID_PUBLIC_KEY/PRIVATE_KEY) → Web Push nonaktif; notifikasi in-app tetap berjalan.');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getVapidPublicKey(): string | null {
    return this.configured ? (process.env.VAPID_PUBLIC_KEY ?? '').trim() : null;
  }

  /** Simpan/perbarui langganan device (upsert by endpoint). */
  async subscribe(userId: number, dto: SubscribePushDto) {
    const sub = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        // device bisa berpindah pemilik (login user berbeda di browser yang sama)
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      select: { id: true },
    });
    return { id: sub.id };
  }

  /** Nonaktifkan langganan device milik user (saat logout / matikan notif). */
  async unsubscribe(userId: number, endpoint: string) {
    const result = await this.prisma.pushSubscription.updateMany({
      where: { endpoint, userId },
      data: { isActive: false },
    });
    return { affected: result.count };
  }

  /**
   * Kirim semua notifikasi pushStatus=PENDING ke device aktif penerimanya.
   * - Tanpa device aktif → langsung SENT (no-op, tak ada yang dikirimi).
   * - Endpoint mati (404/410) → subscription dinonaktifkan.
   * - Semua device gagal (sementara) → tetap PENDING sampai MAX_ATTEMPTS, lalu FAILED.
   * Best-effort: kegagalan satu notif tidak menghentikan yang lain.
   */
  async dispatchPending(limit = 100) {
    if (!this.configured) {
      return { skipped: true, skippedReason: 'VAPID_NOT_CONFIGURED', processed: 0, sent: 0, failed: 0, noDevice: 0, deactivated: 0 };
    }

    const pending = await this.prisma.appNotification.findMany({
      where: { pushStatus: 'PENDING' as any },
      orderBy: { id: 'asc' },
      take: limit,
    });

    let sent = 0;
    let failed = 0;
    let noDevice = 0;
    let deactivated = 0;

    for (const notif of pending) {
      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId: notif.recipientUserId, isActive: true },
      });

      if (subs.length === 0) {
        await this.prisma.appNotification.update({
          where: { id: notif.id },
          data: { pushStatus: 'SENT' as any, pushedAt: new Date() },
        });
        noDevice += 1;
        continue;
      }

      const payload = JSON.stringify({
        title: notif.title,
        body: notif.body,
        linkTo: notif.linkTo,
        notificationId: notif.id,
      });

      let anyOk = false;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          anyOk = true;
          await this.prisma.pushSubscription
            .update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } })
            .catch(() => undefined);
        } catch (error: any) {
          const status = Number(error?.statusCode);
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { isActive: false } })
              .catch(() => undefined);
            deactivated += 1;
          } else {
            this.logger.warn(`Push gagal (sub #${sub.id}, status ${status || '?'}): ${error?.message ?? error}`);
          }
        }
      }

      const attempts = notif.pushAttempts + 1;
      if (anyOk) {
        await this.prisma.appNotification.update({
          where: { id: notif.id },
          data: { pushStatus: 'SENT' as any, pushAttempts: attempts, pushedAt: new Date() },
        });
        sent += 1;
      } else {
        const finalStatus = attempts >= PushService.MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
        await this.prisma.appNotification.update({
          where: { id: notif.id },
          data: { pushStatus: finalStatus as any, pushAttempts: attempts },
        });
        if (finalStatus === 'FAILED') failed += 1;
      }
    }

    return { skipped: false, processed: pending.length, sent, failed, noDevice, deactivated };
  }
}
