import { Injectable, Logger } from '@nestjs/common';
import { StayStatus } from '../../../common/enums/app.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppNotificationService } from '../../notifications/app-notification.service';

/**
 * W-TNT-003 — pengingat KTP pasca-check-in.
 *
 * Keputusan owner 19 Okt 2026 (P25=a, P26=a) yang ditegakkan di sini:
 * - KTP **tidak** memblokir check-in/booking; kewajibannya dikejar sesudahnya.
 * - Pengingat berulang tiap **7 hari** sejak check-in sampai KTP terverifikasi.
 * - Satu pengingat per gelombang (dedupe judul + Stay) → sweeper boleh jalan tiap
 *   5 menit tanpa spam; gelombang yang terlewat tetap terkirim sekali.
 * - Eskalasi ke OWNER/ADMIN sekali setelah hari ke-8 (P26: eskalasi hari ke-8).
 * - Pesan **tanpa NIK/foto/alamat**; hanya kode kamar + jumlah hari.
 */
export const KTP_REMINDER_INTERVAL_DAYS = 7;
export const KTP_REMINDER_ESCALATION_DAYS = 8;

/** Gelombang pengingat untuk `daysSinceCheckIn`: null bila belum jatuh tempo. */
export function ktpReminderWave(daysSinceCheckIn: number): number | null {
  if (!Number.isFinite(daysSinceCheckIn)) return null;
  if (daysSinceCheckIn < KTP_REMINDER_INTERVAL_DAYS) return null;
  return Math.floor(daysSinceCheckIn / KTP_REMINDER_INTERVAL_DAYS);
}

/** KTP dianggap selesai bila sudah diverifikasi (termasuk data legacy tanpa ktpStatus). */
export function isKtpComplete(tenant: {
  ktpStatus?: string | null;
  ktpVerifiedAt?: Date | string | null;
} | null | undefined): boolean {
  if (!tenant) return false;
  return Boolean(tenant.ktpVerifiedAt) || tenant.ktpStatus === 'VERIFIED';
}

/** Selisih hari kalender (WIB) antara `todayWib` dan tanggal check-in. */
export function daysSinceCheckIn(checkInDate: Date | string, todayWib: Date): number {
  const checkIn = new Date(checkInDate);
  const base = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate());
  return Math.floor((todayWib.getTime() - base) / 86_400_000);
}

@Injectable()
export class KtpReminderSweepService {
  private readonly logger = new Logger(KtpReminderSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotification: AppNotificationService,
  ) {}

  private wibToday(now: Date): Date {
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    return new Date(
      Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()),
    );
  }

  async runKtpReminders(
    options: { actorUserId?: number | null; source?: string; now?: Date } = {},
  ) {
    const source = options.source ?? 'AUTO_OPS_KTP_REMINDERS';
    const todayWib = this.wibToday(options.now ?? new Date());
    let scanned = 0;
    let remindersSent = 0;
    let escalationsSent = 0;

    try {
      const stays = await this.prisma.stay.findMany({
        where: {
          status: StayStatus.ACTIVE,
          // hanya stay yang benar-benar sudah check-in (meter awal dipromosikan)
          initialMetersPromotedAt: { not: null },
        },
        select: {
          id: true,
          tenantId: true,
          checkInDate: true,
          room: { select: { code: true, name: true } },
          tenant: { select: { id: true, ktpStatus: true, ktpVerifiedAt: true, isActive: true } },
        },
        orderBy: { id: 'asc' },
        take: 300,
      });
      scanned = stays.length;

      for (const stay of stays) {
        const tenant = stay.tenant as
          | { id: number; ktpStatus?: string | null; ktpVerifiedAt?: Date | null; isActive?: boolean }
          | null;
        if (!tenant || tenant.isActive === false) continue;
        if (isKtpComplete(tenant)) continue; // berhenti otomatis saat VERIFIED

        const days = daysSinceCheckIn(stay.checkInDate as Date, todayWib);
        const wave = ktpReminderWave(days);
        if (wave == null) continue;

        const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${stay.id}`;

        // 1) Pengingat ke penghuni (bila punya akun portal).
        const tenantUser = await this.prisma.user.findFirst({
          where: { tenantId: stay.tenantId, role: 'TENANT' as any, isActive: true },
          select: { id: true },
        });
        if (tenantUser) {
          // Judul stabil per gelombang → dedupe per gelombang, bukan per hari.
          const result = await this.appNotification.createOnce({
            recipientUserId: tenantUser.id,
            title: `🪪 Pengingat KTP (minggu ke-${wave})`,
            body: `Kewajiban melengkapi foto KTP untuk kamar ${roomLabel} belum selesai (${days} hari sejak check-in). Buka Profil → Unggah Foto KTP. Pengingat ini berhenti otomatis setelah KTP terverifikasi.`,
            linkTo: '/portal/profile',
            entityType: 'Stay',
            entityId: String(stay.id),
          });
          if (result.created) remindersSent += 1;
        }

        // 2) Eskalasi ke OWNER/ADMIN sekali setelah hari ke-8 (P26), juga saat tenant
        //    tidak punya akun portal (tidak bisa diingatkan lewat aplikasi).
        if (days >= KTP_REMINDER_ESCALATION_DAYS) {
          const staff = await this.prisma.user.findMany({
            where: { role: { in: ['OWNER', 'ADMIN'] as any }, isActive: true },
            select: { id: true },
          });
          if (staff.length > 0) {
            const escalation = await this.appNotification.createManyOnce(
              staff.map((user) => ({
                recipientUserId: user.id,
                title: `🪪 KTP belum lengkap: kamar ${roomLabel}`,
                body: `Penghuni kamar ${roomLabel} belum melengkapi/memverifikasi KTP (${days} hari sejak check-in). Buka Data Penghuni → filter "KTP Perlu Review" untuk memeriksa. Pesan ini tidak memuat NIK/foto.`,
                linkTo: '/tenants?ktpStatus=PENDING_REVIEW',
                entityType: 'Stay' as const,
                entityId: String(stay.id),
              })),
            );
            escalationsSent += escalation.created;
          }
        }
      }

      return { skipped: false, source, scanned, remindersSent, escalationsSent };
    } catch (error: any) {
      this.logger.warn(`AutoOps pengingat KTP gagal: ${error?.message ?? error}`);
      return {
        skipped: true,
        skippedReason: error?.message ?? 'KTP reminders skipped',
        source,
        scanned,
        remindersSent,
        escalationsSent,
      };
    }
  }
}
