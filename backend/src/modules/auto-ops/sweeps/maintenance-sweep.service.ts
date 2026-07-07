import { Injectable, Logger } from '@nestjs/common';
import { StayStatus } from '../../../common/enums/app.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppNotificationService } from '../../notifications/app-notification.service';
import { PushService } from '../../push/push.service';
import { ReferralService } from '../../loyalty/referral.service';
import { evaluateAcCleaning, AC_DEFAULT_KWH_THRESHOLD } from '../ac-cleaning.helper';

@Injectable()
export class MaintenanceSweepService {
  private readonly logger = new Logger(MaintenanceSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotification: AppNotificationService,
    private readonly pushService: PushService,
    private readonly referralService: ReferralService,
  ) {}

  wibToday(): Date {
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    return new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
  }

  /**
   * F4-13: pemberian poin referral — referral PENDING yang teman-nya sudah tenant aktif.
   * Best-effort; nonaktif via env REFERRAL_REWARDS_ENABLED=false.
   */
  async runReferralRewards(options: { actorUserId?: number | null; source?: string } = {}) {
    const source = options.source ?? 'AUTO_OPS_REFERRAL_REWARDS';
    const enabled = String(process.env.REFERRAL_REWARDS_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return { skipped: true, skippedReason: 'REFERRAL_REWARDS_DISABLED', source };
    try {
      const result = await this.referralService.rewardEligible({ actorUserId: options.actorUserId ?? null });
      return { ...result, skipped: false, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps referral rewards gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'Referral rewards skipped', source };
    }
  }

  /**
   * F4-15: jadwal cuci AC. Kamar ber-AC yang belum pernah / sudah lewat interval sejak
   * dicuci → buat tiket `AC_CLEANING` (dedupe: tak ada tiket AC terbuka). Biaya cuci
   * dicatat owner sebagai Expense saat bayar tukang (flow normal). Reset jadwal saat
   * tiket AC ditutup (lihat tickets.service). Best-effort.
   */
  async runAcCleaningSchedule(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    const source = options.source ?? 'AUTO_OPS_AC_CLEANING';
    const db = await this.prisma.operationalSetting.findUnique({ where: { id: 1 }, select: { acCleaningEnabled: true } });
    const enabled = db?.acCleaningEnabled ?? (String(process.env.AC_CLEANING_ENABLED ?? 'true').toLowerCase() !== 'false');
    if (!enabled) return { skipped: true, skippedReason: 'AC_CLEANING_DISABLED', source };
    const now = options.now ?? new Date();
    // Ambang kWh: prioritas OperationalSetting (owner-settable dari UI) → ENV → default.
    const opSetting = await this.prisma.operationalSetting.findUnique({ where: { id: 1 }, select: { acCleanKwhThreshold: true } });
    const kwhThreshold = opSetting?.acCleanKwhThreshold ?? Number(process.env.AC_CLEAN_KWH_THRESHOLD ?? AC_DEFAULT_KWH_THRESHOLD);
    try {
      const rooms = await this.prisma.room.findMany({
        where: { hasAc: true, isActive: true },
        select: { id: true, code: true, name: true, acLastCleanedAt: true, acCleanIntervalDays: true, acWattage: true, acUsageHoursPerDay: true },
        take: 100,
      });
      const roomIds = rooms.map((room) => room.id);
      // L25: dedup juga untuk CLOSED dalam interval maksimal (90 hari) — cegah duplikasi
      // bila tiket ditutup tanpa update acLastCleanedAt (mis. dibatalkan sebelum cuci).
      const maxAcInterval = Math.max(...rooms.map((r) => r.acCleanIntervalDays ?? 90), 90);
      const closedThreshold = new Date(now.getTime() - maxAcInterval * 24 * 60 * 60 * 1000);
      const existingAcTickets = roomIds.length
        ? await this.prisma.ticket.findMany({
            where: {
              roomId: { in: roomIds },
              category: 'AC_CLEANING' as any,
              OR: [
                { status: { in: ['OPEN', 'IN_PROGRESS', 'DONE'] as any } },
                { status: 'CLOSED' as any, closedAt: { gte: closedThreshold } },
              ],
            },
            select: { roomId: true },
          })
        : [];
      const blockedRoomIds = new Set(existingAcTickets.map((ticket) => ticket.roomId));
      let created = 0;
      for (const room of rooms) {
        // F5-4 (AUD-3): hibrid — interval HARI + pemicu dini estimasi kWh (watt × jam/hari).
        const evalAc = evaluateAcCleaning(room, now, { kwhThreshold: Number.isFinite(kwhThreshold) ? kwhThreshold : undefined });
        if (!evalAc.due) continue;
        if (blockedRoomIds.has(room.id)) continue;
        // F5-3 (AUD-5/D-22.2): tiket cuci AC dibuat TANPA assignee → admin memilih staf internal
        // ATAU menandai vendor luar (handledByVendor). Jadi tak masuk round-robin/KPI staf otomatis.
        const roomLabel = room.code || room.name || `Kamar #${room.id}`;
        const base = `TIC-${now.getFullYear()}-AC-${room.id}`;
        let ticketNumber = base;
        let suffix = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await this.prisma.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
          suffix += 1;
          ticketNumber = `${base}-${suffix}`;
        }
        const triggerNote =
          evalAc.reason === 'KWH'
            ? `Pemicu DINI: estimasi pemakaian ~${Math.round(evalAc.estimatedKwh)} kWh sejak cuci terakhir (≈${evalAc.kwhPerDay.toFixed(1)} kWh/hari) sudah tinggi, walau interval ${room.acCleanIntervalDays} hari belum tercapai.`
            : evalAc.reason === 'NEVER'
              ? `Belum pernah tercatat dicuci.`
              : `Sudah lewat interval rutin ${room.acCleanIntervalDays} hari (estimasi ~${Math.round(evalAc.estimatedKwh)} kWh sejak cuci terakhir).`;
        await this.prisma.ticket.create({
          data: {
            ticketNumber,
            roomId: room.id,
            title: `Cuci AC — ${roomLabel}`,
            description: `AC kamar ${roomLabel} waktunya dicuci. ${triggerNote} Jadwalkan tukang cuci AC (boleh staf internal atau vendor luar — tandai bila vendor); biaya ditanggung kos (catat sebagai Expense). Tandai tiket selesai setelah AC bersih.`,
            category: 'AC_CLEANING' as any,
            assignedToId: null,
          },
        });
        created += 1;
      }
      return { created, skipped: false, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps AC cleaning gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'AC cleaning skipped', source };
    }
  }

  /**
   * F3-15: barang tenant yang ditinggal melewati batas 30 hari (belongingsDeadline)
   * dengan status masih PENDING → tandai ABANDONED + notif admin. Tindakan fisik
   * (keluarkan/buang/lelang) tetap manual.
   */
  async runBelongingsAbandonment(options: { actorUserId?: number | null; source?: string } = {}) {
    void options;
    const todayWib = this.wibToday();
    const overdue = await this.prisma.stay.findMany({
      where: {
        belongingsStatus: 'PENDING' as any,
        belongingsDeadline: { not: null, lt: todayWib },
      },
      select: {
        id: true,
        belongingsDeadline: true,
        tenant: { select: { fullName: true } },
        room: { select: { code: true, name: true } },
      },
      take: 200,
    });
    if (overdue.length === 0) return { abandoned: 0 };

    let abandoned = 0;
    for (const stay of overdue) {
      await this.prisma.stay.update({
        where: { id: stay.id },
        data: { belongingsStatus: 'ABANDONED' as any, belongingsResolvedAt: new Date() },
      });
      abandoned += 1;

      const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${stay.id}`;
      const tenantName = stay.tenant?.fullName || 'Tenant';
      const deadline = stay.belongingsDeadline
        ? (stay.belongingsDeadline as Date).toISOString().slice(0, 10)
        : '-';
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.appNotification
          .createOnce({
            recipientUserId: admin.id,
            title: `📦 Barang ditinggal jadi ABANDONED — ${roomLabel}`,
            body: `Barang ${tenantName} di ${roomLabel} melewati batas pengambilan 30 hari (jatuh tempo ${deadline}) dan kini berstatus ABANDONED. Lakukan tindakan fisik sesuai kebijakan (keluarkan/simpan/buang).`,
            linkTo: '/stays',
            entityType: 'BelongingsAbandoned',
            entityId: String(stay.id),
          })
          .catch((err) =>
            this.logger.warn(`Notif barang abandoned stay #${stay.id} gagal: ${err instanceof Error ? err.message : String(err)}`),
          );
      }
    }
    return { abandoned };
  }

  /**
   * F4-2 (PWA Web Push): kirim notifikasi pushStatus=PENDING ke device aktif penerima.
   * Best-effort, tak pernah menggagalkan runAll. VAPID nonaktif → di-skip oleh service.
   */
  async runPushDispatch(options: { actorUserId?: number | null; source?: string } = {}) {
    const source = options.source ?? 'AUTO_OPS_PUSH_DISPATCH';
    const enabled = String(process.env.PUSH_DISPATCH_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return { skipped: true, skippedReason: 'PUSH_DISPATCH_DISABLED', source };
    try {
      const result = await this.pushService.dispatchPending();
      return { ...result, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps push dispatch gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'Push dispatch skipped', source };
    }
  }

  /**
   * F3-19: eskalasi tiket yang melewati SLA (dueAt) dan belum selesai.
   * L0->1 (staf lewat SLA) → notif ADMIN+OWNER; L1->2 (setelah grace) → notif OWNER.
   * escalationLevel mencegah pemrosesan ulang; createOnce mencegah notif ganda.
   */
  async runTicketSlaEscalation(options: { actorUserId?: number | null; source?: string } = {}) {
    void options;
    const now = new Date();
    const overdue = await this.prisma.ticket.findMany({
      where: {
        dueAt: { not: null, lt: now },
        status: { in: ['OPEN', 'IN_PROGRESS'] as any },
        escalationLevel: { lt: 2 },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        dueAt: true,
        escalationLevel: true,
        room: { select: { code: true, name: true } },
        assignedTo: { select: { fullName: true } },
      },
      take: 200,
    });
    if (overdue.length === 0) return { escalated: 0 };

    const ownerGraceMs = 24 * 60 * 60 * 1000; // L1->2 hanya setelah 1 hari tambahan
    let escalated = 0;
    for (const t of overdue) {
      const due = t.dueAt as Date;
      const nextLevel = t.escalationLevel === 0 ? 1 : 2;
      if (nextLevel === 2 && now.getTime() < due.getTime() + ownerGraceMs) continue;

      await this.prisma.ticket.update({
        where: { id: t.id },
        data: { escalationLevel: nextLevel, escalatedAt: now },
      });
      escalated += 1;

      const roomLabel = t.room?.code || t.room?.name || '';
      const ticketLabel = t.title || t.ticketNumber || `Tiket #${t.id}`;
      const targetRoles = nextLevel === 1 ? ['ADMIN', 'OWNER'] : ['OWNER'];
      const recipients = await this.prisma.user.findMany({
        where: { role: { in: targetRoles as any }, isActive: true },
        select: { id: true },
      });
      const title = `⚠️ SLA tiket terlewat (eskalasi L${nextLevel}) — ${ticketLabel}`;
      const body = `Tiket "${ticketLabel}"${roomLabel ? ` (kamar ${roomLabel})` : ''} melewati batas SLA ${due.toISOString().slice(0, 10)}${t.assignedTo?.fullName ? `, PJ ${t.assignedTo.fullName}` : ''}. ${nextLevel === 1 ? 'Mohon ditindaklanjuti.' : 'Eskalasi ke OWNER — perlu perhatian segera.'}`;
      for (const u of recipients) {
        await this.appNotification
          .createOnce({
            recipientUserId: u.id,
            title,
            body,
            linkTo: '/tickets',
            entityType: 'TicketSla',
            entityId: `${t.id}:L${nextLevel}`,
          })
          .catch((err) =>
            this.logger.warn(`Notif eskalasi SLA tiket #${t.id} gagal: ${err instanceof Error ? err.message : String(err)}`),
          );
      }
    }
    return { escalated };
  }

  async runContractEndReminders(options: { actorUserId?: number | null; source?: string } = {}) {
    void options;
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    const todayWib = new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
    const horizon = new Date(todayWib);
    horizon.setUTCDate(horizon.getUTCDate() + 10); // F2-1 #3: prompt renewal mulai H-10

    const stays = await this.prisma.stay.findMany({
      where: {
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: { not: null },
        plannedCheckOutDate: { not: null, gte: todayWib, lte: horizon },
      },
      select: {
        id: true,
        tenantId: true,
        plannedCheckOutDate: true,
        room: { select: { code: true, name: true } },
      },
      take: 200,
    });

    // B-14: gelombang reminder pakai WINDOW (`daysLeft <= threshold`), bukan
    // exact-match. Bila sweeper mati di hari-H gelombang, reminder tak hilang —
    // gelombang yang sudah terlewati tetap terkirim sekali (dedupe per gelombang).
    const REMINDER_THRESHOLDS = [10, 7, 3, 1, 0]; // F2-1 #3: prompt mulai H-10
    let sent = 0;
    for (const stay of stays) {
      const planned = new Date(stay.plannedCheckOutDate as Date);
      planned.setUTCHours(0, 0, 0, 0);
      const daysLeft = Math.round((planned.getTime() - todayWib.getTime()) / 86_400_000);
      // Gelombang aktif = threshold terkecil yang sudah tercapai (daysLeft <= T).
      const wave = REMINDER_THRESHOLDS.filter((t) => daysLeft <= t).sort((a, b) => a - b)[0];
      if (wave === undefined) continue; // daysLeft > 10 (di luar horizon)

      const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${stay.id}`;
      const tenantUser = await this.prisma.user.findFirst({
        where: { tenantId: stay.tenantId, role: 'TENANT' as any, isActive: true },
        select: { id: true },
      });
      // F2-1 #3 fallback: tenant tanpa akun portal tak bisa diberi notif → beri tahu ADMIN
      // agar dihubungi manual soal perpanjangan/checkout (dedupe per stay per gelombang).
      if (!tenantUser) {
        await this.notifyAdminsTenantNoPortalContract(stay.id, roomLabel, wave, planned).catch((err) =>
          this.logger.warn(`Notif admin fallback (stay #${stay.id}) gagal: ${err instanceof Error ? err.message : String(err)}`),
        );
        continue;
      }
      // Judul stabil per gelombang (dedupe per gelombang, bukan per hari exact);
      // tanggal & sisa hari yang akurat ada di body.
      const title =
        wave === 0
          ? `⏰ Kontrak ${roomLabel} berakhir HARI INI`
          : `⏰ Pengingat kontrak ${roomLabel} (H-${wave})`;

      const existing = await (this.prisma as any).appNotification.findFirst({
        where: {
          recipientUserId: tenantUser.id,
          entityType: 'Stay',
          entityId: String(stay.id),
          title,
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.appNotification.create({
        recipientUserId: tenantUser.id,
        title,
        body:
          daysLeft <= 0
            ? `Kontrak sewa kamar ${roomLabel} berakhir hari ini. Segera ajukan perpanjangan atau checkout sebelum pk 12:00 WIB. Jika tidak ada tindakan hingga besok pk 12:00, sistem akan melakukan checkout otomatis dan barang Anda dikeluarkan oleh staf.`
            : `Kontrak sewa kamar ${roomLabel} berakhir ${daysLeft} hari lagi (${planned.toISOString().slice(0, 10)}). Silakan ajukan perpanjangan lewat portal, atau ajukan checkout. Tanpa tindakan, kamar dilepas otomatis pk 12:00 di hari berakhirnya kontrak.`,
        linkTo: '/portal/stay',
        entityType: 'Stay',
        entityId: String(stay.id),
      });
      sent += 1;
    }

    return { remindersSent: sent };
  }

  /** F2-1 #3: fallback — tenant tanpa akun portal → beri tahu ADMIN/OWNER agar dihubungi manual. */
  async notifyAdminsTenantNoPortalContract(stayId: number, roomLabel: string, wave: number, planned: Date) {
    // B-14: judul stabil per gelombang → dedupe per (stay, gelombang), bukan per hari.
    const title = `📭 Tenant tanpa portal — kontrak ${roomLabel} ${wave === 0 ? 'berakhir HARI INI' : `H-${wave}`}`;
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      const existing = await (this.prisma as any).appNotification.findFirst({
        where: { recipientUserId: admin.id, entityType: 'Stay', entityId: String(stayId), title },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await this.appNotification.create({
          recipientUserId: admin.id,
          title,
          body: `Tenant kamar ${roomLabel} TIDAK punya akun portal → tak bisa diberi notifikasi perpanjangan otomatis. Kontrak berakhir ${planned.toISOString().slice(0, 10)} (H-${wave}). Hubungi tenant secara manual untuk konfirmasi perpanjang atau checkout.`,
          linkTo: '/stays',
          entityType: 'Stay',
          entityId: String(stayId),
        });
      } catch (err) {
        this.logger.warn(`Notif admin fallback create gagal (stay #${stayId}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
