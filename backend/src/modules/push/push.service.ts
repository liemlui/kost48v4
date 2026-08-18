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
export function normalizePushStatusCode(error: unknown): number | undefined {
  const candidate = (error as { statusCode?: unknown } | undefined)?.statusCode;
  if (candidate === null || candidate === undefined || candidate === '') return undefined;

  const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ── Runtime config VAPID (dari OperationalSetting/DB) ──
// SettingsService memanggil setVapidConfig saat boot & setelah owner update.
// Kosong = fallback ke env (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT).
type VapidRuntime = { publicKey: string; privateKey: string; subject: string };
let vapidRuntime: VapidRuntime | null = null;

export function setVapidConfig(input: { publicKey?: string; privateKey?: string; subject?: string } | null | undefined): void {
  const publicKey = (input?.publicKey ?? '').trim();
  const privateKey = (input?.privateKey ?? '').trim();
  const subject = (input?.subject ?? '').trim();
  vapidRuntime = publicKey || privateKey
    ? { publicKey, privateKey, subject: subject || 'mailto:admin@kost48.local' }
    : null;
}

function resolveVapid(): VapidRuntime {
  return {
    publicKey: vapidRuntime?.publicKey || (process.env.VAPID_PUBLIC_KEY ?? '').trim(),
    privateKey: vapidRuntime?.privateKey || (process.env.VAPID_PRIVATE_KEY ?? '').trim(),
    subject: vapidRuntime?.subject || (process.env.VAPID_SUBJECT ?? 'mailto:admin@kost48.local').trim(),
  };
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private configured = false;
  private static readonly MAX_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.applyVapid();
  }

  /** (Re)terapkan VAPID dari runtime/DB (fallback env) — dipanggil saat boot & setelah owner update. */
  refreshVapid(): void {
    this.applyVapid();
  }

  private applyVapid() {
    const { publicKey, privateKey, subject } = resolveVapid();
    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
        this.logger.log('Web Push VAPID terkonfigurasi.');
      } catch (error) {
        this.configured = false;
        this.logger.warn(`VAPID gagal dikonfigurasi: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      this.configured = false;
      this.logger.warn('VAPID belum di-set (VAPID_PUBLIC_KEY/PRIVATE_KEY) → Web Push nonaktif; notifikasi in-app tetap berjalan.');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getVapidPublicKey(): string | null {
    return this.configured ? resolveVapid().publicKey : null;
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
          const status = normalizePushStatusCode(error);
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { isActive: false } })
              .catch(() => undefined);
            deactivated += 1;
          } else {
            this.logger.warn(`Push gagal (sub #${sub.id}, status ${status ?? '?'}): ${error?.message ?? error}`);
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
