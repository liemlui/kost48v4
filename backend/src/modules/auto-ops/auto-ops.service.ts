import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { AUTO_OPS_DEADLINES } from '../../common/business/auto-ops.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPeriodCloseService } from '../accounting/accounting-period-close.service';
import { BookingSweepService } from './sweeps/booking-sweep.service';
import { StaySweepService } from './sweeps/stay-sweep.service';
import { RenewalSweepService } from './sweeps/renewal-sweep.service';
import { AccountingSweepService } from './sweeps/accounting-sweep.service';
import { MaintenanceSweepService } from './sweeps/maintenance-sweep.service';

type AutoOpsRunResult = {
  expiredBookings: number;
  heldForPaymentReview: number;
  releasedRooms: number;
  expiredStayIds: number[];
  releasedRoomIds: number[];
  accountingAutoClose?: unknown;
  recurringExpenseDrafts?: unknown;
  automaticDepreciation?: unknown;
  notificationPruning?: unknown;
  pushDispatch?: unknown;
  rentRecognition?: unknown;
  acCleaning?: unknown;
  journalReconciliation?: unknown;
};

@Injectable()
export class AutoOpsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoOpsService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPeriodCloseService: AccountingPeriodCloseService,
    private readonly bookingSweep: BookingSweepService,
    private readonly staySweep: StaySweepService,
    private readonly renewalSweep: RenewalSweepService,
    private readonly accountingSweep: AccountingSweepService,
    private readonly maintenanceSweep: MaintenanceSweepService,
  ) {}

  private async loadEnabled(): Promise<boolean> {
    try {
      const db = await this.prisma.operationalSetting.findUnique({
        where: { id: 1 },
        select: { autoOpsEnabled: true },
      });
      if (db && typeof db.autoOpsEnabled === 'boolean') return db.autoOpsEnabled;
    } catch { /* DB not ready — fallback env */ }
    const raw = String(process.env.AUTO_OPS_ENABLED ?? 'true').trim().toLowerCase();
    return ['true', '1', 'yes', 'y', 'on'].includes(raw);
  }

  async onModuleInit() {
    const enabled = await this.loadEnabled();
    if (!enabled) return;
    const intervalMs = Math.max(60_000, AUTO_OPS_DEADLINES.AUTO_OPS_INTERVAL_MINUTES * 60_000);
    this.timer = setInterval(() => {
      this.runAll({ actorUserId: null, source: 'AUTO_OPS_INTERVAL' }).catch((error) => {
        this.logger.warn(`AutoOps skipped/failed: ${error?.message ?? error}`);
      });
    }, intervalMs);
    this.logger.log(`AutoOps aktif setiap ${Math.round(intervalMs / 60000)} menit`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async status() {
    const now = new Date();
    const [expiredCandidates, heldForPaymentReview, orphanReservedRooms] = await Promise.all([
      this.prisma.stay.count({
        where: this.bookingSweep.expiredBookingWhere(false),
      }),
      this.prisma.stay.count({
        where: this.bookingSweep.expiredBookingWhere(true),
      }),
      this.prisma.room.count({
        where: {
          status: RoomStatus.RESERVED,
          stays: { none: { status: StayStatus.ACTIVE } },
        },
      }),
    ]);

    const accountingAutoClosePolicy = await this.accountingPeriodCloseService.autoClosePolicy(now);

    return {
      enabled: await this.loadEnabled(),
      now,
      intervalMinutes: AUTO_OPS_DEADLINES.AUTO_OPS_INTERVAL_MINUTES,
      deadlines: AUTO_OPS_DEADLINES,
      expiredCandidates,
      heldForPaymentReview,
      orphanReservedRooms,
      accountingAutoClosePolicy,
      policy: 'First paid wins. Booking saja belum mengunci kamar; pembayaran valid dan kamar siap huni yang menentukan prioritas. Accounting auto-close menutup bulan lalu hanya jika readiness aman.',
    };
  }

  private skipped(skippedReason: string): AutoOpsRunResult {
    return {
      expiredBookings: 0,
      heldForPaymentReview: 0,
      releasedRooms: 0,
      expiredStayIds: [],
      releasedRoomIds: [],
      accountingAutoClose: { skipped: true, skippedReason },
    };
  }

  private async withAdvisoryLock<T>(fn: () => Promise<T>): Promise<T | null> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL wajib diisi untuk AutoOps advisory lock.');
    }

    const client = new Client({ connectionString });
    await client.connect();
    let locked = false;
    try {
      const result = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [1],
      );
      locked = result.rows[0]?.locked === true;
      if (!locked) return null;
      return await fn();
    } finally {
      if (locked) {
        await client.query('SELECT pg_advisory_unlock($1)', [1]).catch((error) => {
          this.logger.warn(`AutoOps advisory unlock gagal: ${error?.message ?? error}`);
        });
      }
      await client.end().catch(() => undefined);
    }
  }

  async runAll(options: { actorUserId?: number | null; source?: string } = {}): Promise<AutoOpsRunResult> {
    if (this.running) {
      return this.skipped('AUTO_OPS_ALREADY_RUNNING');
    }

    this.running = true;
    try {
      const result = await this.withAdvisoryLock(() => this.runAllUnlocked(options));
      return result ?? this.skipped('AUTO_OPS_LOCK_HELD_BY_ANOTHER_PROCESS');
    } finally {
      this.running = false;
    }
  }

  private async runAllUnlocked(options: { actorUserId?: number | null; source?: string } = {}): Promise<AutoOpsRunResult> {
    // Sequential (audit A4): job-job ini menyentuh tabel Stay/Room yang sama;
    // paralel menimbulkan race double-cancel dengan hasil DP/jaminan berbeda.
    const bookingResult = await this.bookingSweep.runBookingExpiry(options);
    await this.maintenanceSweep.runContractEndReminders(options);
    await this.maintenanceSweep.runTicketSlaEscalation(options);
    await this.maintenanceSweep.runBelongingsAbandonment(options);
      // F2-1 inc.3: sweeper renewal (hibrida) — expiry prioritas OTOMATIS, forfeit DITANDAI.
    await this.renewalSweep.runRenewalPriorityExpiry(options);
    await this.renewalSweep.runRenewalSettlementForfeit(options);
    const dpForfeitResult = await this.bookingSweep.runDownPaymentForfeit(options);
    void dpForfeitResult;
    await this.staySweep.runOverstayForcedCheckout(options);
    const autoCancelResult = await this.staySweep.runPostCheckoutAutoCancel(options);
    void autoCancelResult;
    const noonResult = await this.staySweep.runRoomReleaseAtNoon(options);
    const roomResult = await this.staySweep.runRoomHealer(options);
    const overstayResult = await this.staySweep.runOverstayEnforcement(options);
    void overstayResult;
    const recurringExpenseDrafts = await this.accountingSweep.runRecurringExpenseDrafts(options);
    const automaticDepreciation = await this.accountingSweep.runAutomaticDepreciation(options);
    const rentRecognition = await this.accountingSweep.runRentRecognition(options);
    const acCleaning = await this.maintenanceSweep.runAcCleaningSchedule(options);
    await this.maintenanceSweep.runReferralRewards(options);
      // F5-6 (L-1): backfill jurnal warisan yang bolong SEBELUM auto-close (agar readiness bersih).
    const journalReconciliation = await this.accountingSweep.runAutoJournalReconciliation(options);
    const accountingAutoClose = await this.accountingSweep.runAccountingAutoClose(options);
    const notificationPruning = await this.accountingSweep.runNotificationPruning(options);
    const pushDispatch = await this.maintenanceSweep.runPushDispatch(options);
    return {
      expiredBookings: bookingResult.expiredStayIds.length,
      heldForPaymentReview: bookingResult.heldForPaymentReview,
      releasedRooms: roomResult.releasedRoomIds.length + noonResult.releasedRoomIds.length,
      expiredStayIds: bookingResult.expiredStayIds,
      releasedRoomIds: [...roomResult.releasedRoomIds, ...noonResult.releasedRoomIds],
      recurringExpenseDrafts,
      automaticDepreciation,
      rentRecognition,
      accountingAutoClose,
      notificationPruning,
      pushDispatch,
      acCleaning,
      journalReconciliation,
    };
  }

  // ── Proxy methods for controller ──────────────────────────────────────────

  async runBookingExpiry(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.bookingSweep.runBookingExpiry(options);
  }

  async runRoomHealer(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.staySweep.runRoomHealer(options);
  }

  async runRecurringExpenseDrafts(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    return this.accountingSweep.runRecurringExpenseDrafts(options);
  }

  async runAutomaticDepreciation(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    return this.accountingSweep.runAutomaticDepreciation(options);
  }

  async runRenewalPriorityExpiry(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.renewalSweep.runRenewalPriorityExpiry(options);
  }

  async runRenewalSettlementForfeit(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.renewalSweep.runRenewalSettlementForfeit(options);
  }

  async runContractEndReminders(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.maintenanceSweep.runContractEndReminders(options);
  }

  async runTicketSlaEscalation(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.maintenanceSweep.runTicketSlaEscalation(options);
  }

  async runBelongingsAbandonment(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.maintenanceSweep.runBelongingsAbandonment(options);
  }

  async runDownPaymentForfeit(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.bookingSweep.runDownPaymentForfeit(options);
  }

  async runOverstayForcedCheckout(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.staySweep.runOverstayForcedCheckout(options);
  }

  async runPostCheckoutAutoCancel(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.staySweep.runPostCheckoutAutoCancel(options);
  }

  async runRoomReleaseAtNoon(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.staySweep.runRoomReleaseAtNoon(options);
  }

  async runOverstayEnforcement(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.staySweep.runOverstayEnforcement(options);
  }

  async runRentRecognition(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.accountingSweep.runRentRecognition(options);
  }

  async runAcCleaningSchedule(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    return this.maintenanceSweep.runAcCleaningSchedule(options);
  }

  async runReferralRewards(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.maintenanceSweep.runReferralRewards(options);
  }

  async runAutoJournalReconciliation(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.accountingSweep.runAutoJournalReconciliation(options);
  }

  async runAccountingAutoClose(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.accountingSweep.runAccountingAutoClose(options);
  }

  async runNotificationPruning(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.accountingSweep.runNotificationPruning(options);
  }

  async runPushDispatch(options: { actorUserId?: number | null; source?: string } = {}) {
    return this.maintenanceSweep.runPushDispatch(options);
  }
}
