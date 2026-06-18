import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingPeriodCloseService } from '../../accounting/accounting-period-close.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { AppNotificationService } from '../../notifications/app-notification.service';
import { AssetsService } from '../../assets/assets.service';
import { RentRecognitionService } from '../../accounting/rent-recognition.service';
import { jakartaYearMonth, previousJakartaYearMonth } from '../auto-ops-period.helper';

@Injectable()
export class AccountingSweepService {
  private readonly logger = new Logger(AccountingSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPeriodCloseService: AccountingPeriodCloseService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly appNotification: AppNotificationService,
    private readonly assetsService: AssetsService,
    private readonly rentRecognitionService: RentRecognitionService,
  ) {}

  wibToday(): Date {
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    return new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
  }

  async runRecurringExpenseDrafts(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    const enabled = String(process.env.RECURRING_EXPENSE_DRAFTS_ENABLED ?? 'true').toLowerCase() !== 'false';
    const source = options.source ?? 'AUTO_OPS_RECURRING_EXPENSE_DRAFTS';
    if (!enabled) return { createdCount: 0, skipped: true, skippedReason: 'RECURRING_EXPENSE_DRAFTS_DISABLED', source };

    try {
    const { year, month } = jakartaYearMonth(options.now ?? new Date());
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const expenseDate = new Date(Date.UTC(year, month - 1, 1));
    const categories = [
      { category: 'SALARY', label: 'Gaji', type: 'FIXED' },
      { category: 'ELECTRICITY', label: 'Listrik', type: 'VARIABLE' },
      { category: 'WATER', label: 'Air', type: 'VARIABLE' },
      { category: 'INTERNET', label: 'Internet', type: 'FIXED' },
      { category: 'RENT_BUILDING', label: 'Sewa gedung', type: 'FIXED' },
      { category: 'TAX', label: 'Pajak', type: 'FIXED' },
    ] as const;

    const createdIds: number[] = [];
    for (const item of categories) {
      const recurringKey = `RECURRING-${monthKey}-${item.category}`;
      const existing = await this.prisma.expense.findUnique({ where: { recurringKey }, select: { id: true } });
      if (existing) continue;

      const latest = await this.prisma.expense.findFirst({
        where: {
          category: item.category as any,
          status: 'CONFIRMED' as any,
          expenseDate: { lt: expenseDate },
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        select: { amountRupiah: true, vendorName: true, type: true, description: true },
      });

      try {
        const created = await this.prisma.expense.create({
          data: {
            expenseDate,
            type: (latest?.type ?? item.type) as any,
            status: 'DRAFT' as any,
            category: item.category as any,
            description: `Draft rutin ${item.label} ${monthKey}`,
            amountRupiah: latest?.amountRupiah ?? 0,
            vendorName: latest?.vendorName ?? null,
            recurringKey,
            note: latest
              ? `Dibuat otomatis dari expense terkonfirmasi terakhir. Konfirmasi nominal sebelum posting. Sumber: ${latest.description}`
              : 'Dibuat otomatis tanpa histori nominal. Isi nominal lalu konfirmasi.',
            createdById: options.actorUserId ?? null,
          },
          select: { id: true },
        });
        createdIds.push(created.id);
      } catch (error: any) {
        if (String(error?.code) !== 'P2002') {
          this.logger.warn(`AutoOps recurring expense ${recurringKey} gagal: ${error?.message ?? error}`);
        }
      }
    }

    return {
      period: monthKey,
      createdCount: createdIds.length,
      createdIds,
      skipped: false,
      source,
    };
    } catch (error: any) {
      return {
        createdCount: 0,
        skipped: true,
        skippedReason: error?.message ?? 'Recurring expense drafts skipped',
        source,
      };
    }
  }

  async runAutomaticDepreciation(options: { actorUserId?: number | null; source?: string; now?: Date } = {}) {
    const enabled = String(process.env.ASSET_DEPRECIATION_AUTO_ENABLED ?? 'true').toLowerCase() !== 'false';
    const source = options.source ?? 'AUTO_OPS_ASSET_DEPRECIATION';
    if (!enabled) return { posted: false, skipped: true, skippedReason: 'ASSET_DEPRECIATION_AUTO_DISABLED', source };

    const { year, month } = previousJakartaYearMonth(options.now ?? new Date());

    try {
      const preview = await this.assetsService.depreciationPreview({ year, month });
      if (preview.alreadyPosted) {
        return { posted: false, skipped: true, skippedReason: 'DEPRECIATION_ALREADY_POSTED', year, month, source };
      }
      if (!preview.eligibleLines.length) {
        return { posted: false, skipped: true, skippedReason: 'NO_ELIGIBLE_ASSETS', year, month, source };
      }
      const result = await this.assetsService.runDepreciationForPeriod(
        year,
        month,
        options.actorUserId ?? null,
        `AUTO_DEPRECIATION: diproses oleh ${source}.`,
      );
      return { posted: true, skipped: false, year, month, source, result };
    } catch (error: any) {
      return {
        posted: false,
        skipped: true,
        skippedReason: error?.message ?? 'Automatic depreciation skipped',
        year,
        month,
        source,
      };
    }
  }

  async runAccountingAutoClose(options: { actorUserId?: number | null; source?: string } = {}) {
    try {
      return await this.accountingPeriodCloseService.autoCloseMonthly({
        actorUserId: options.actorUserId ?? null,
        source: options.source ?? 'AUTO_OPS_INTERVAL',
      });
    } catch (error: any) {
      return {
        closed: false,
        skipped: true,
        skippedReason: error?.message ?? 'Accounting auto-close skipped',
        source: options.source ?? 'AUTO_OPS_INTERVAL',
      };
    }
  }

  /**
   * F4-1 (PSAK 72): tangguhkan pendapatan sewa panjang ke Unearned (2200) lalu akui
   * bertahap per bulan. Best-effort; nonaktif via env RENT_RECOGNITION_ENABLED=false.
   */
  async runRentRecognition(options: { actorUserId?: number | null; source?: string } = {}) {
    const source = options.source ?? 'AUTO_OPS_RENT_RECOGNITION';
    const enabled = String(process.env.RENT_RECOGNITION_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return { skipped: true, skippedReason: 'RENT_RECOGNITION_DISABLED', source };
    try {
      const result = await this.rentRecognitionService.run({ actorUserId: options.actorUserId ?? null });
      return { ...result, skipped: false, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps rent recognition gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'Rent recognition skipped', source };
    }
  }

  /**
   * F4-7 (N-04): pruning notifikasi lebih tua dari retensi agar AppNotification tak
   * tumbuh tanpa batas (broadcast ALL ke banyak penerima). Retensi via env
   * NOTIFICATION_RETENTION_DAYS (default 90 hari); bisa dimatikan via
   * NOTIFICATION_PRUNING_ENABLED=false. Best-effort, tak pernah menggagalkan runAll.
   */
  async runNotificationPruning(options: { actorUserId?: number | null; source?: string } = {}) {
    const source = options.source ?? 'AUTO_OPS_NOTIFICATION_PRUNING';
    const enabled = String(process.env.NOTIFICATION_PRUNING_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return { deleted: 0, skipped: true, skippedReason: 'NOTIFICATION_PRUNING_DISABLED', source };

    const retentionDays = Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 90);
    try {
      const result = await this.appNotification.pruneOlderThan(retentionDays);
      return { ...result, skipped: false, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps notification pruning gagal: ${error?.message ?? error}`);
      return { deleted: 0, skipped: true, skippedReason: error?.message ?? 'Notification pruning skipped', source };
    }
  }

  /**
   * F5-6 (L-1 / D-22.1): AUTO-REKONSILIASI jurnal warisan best-effort.
   * Flow lama memposting jurnal secara best-effort (operasi tetap commit walau jurnal gagal);
   * sweeper ini mem-backfill jurnal untuk sumber operasional yang BELUM terjurnal
   * (invoice/payment/expense/wifi) lalu MEMBERI TAHU OWNER/ADMIN bila ada yang dibuat atau gagal.
   * Idempotent (postBySourceType dedupe per sumber). Best-effort; nonaktif via env.
   */
  async runAutoJournalReconciliation(options: { actorUserId?: number | null; source?: string } = {}) {
    const source = options.source ?? 'AUTO_OPS_JOURNAL_RECONCILIATION';
    const enabled = String(process.env.JOURNAL_RECONCILIATION_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return { skipped: true, skippedReason: 'JOURNAL_RECONCILIATION_DISABLED', source };
    const limit = Number(process.env.JOURNAL_RECONCILIATION_LIMIT ?? 50);
    try {
      const result = await this.accountingPosting.backfillAutoJournal(
        { limit: Number.isFinite(limit) ? limit : 50 },
        options.actorUserId ?? null,
      );
      // Alert OWNER/ADMIN bila ada jurnal yang baru dibuat (artinya sebelumnya bolong) atau gagal.
      if (result.createdCount > 0 || result.failedCount > 0) {
        await this.notifyAdminsJournalReconciliation(result.createdCount, result.failedCount, result.warnings ?? []);
      }
      return { ...result, skipped: false, source };
    } catch (error: any) {
      this.logger.warn(`AutoOps rekonsiliasi jurnal gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'Journal reconciliation skipped', source };
    }
  }

  /** F5-6: beri tahu OWNER/ADMIN hasil rekonsiliasi jurnal (dedupe per hari WIB). */
  async notifyAdminsJournalReconciliation(createdCount: number, failedCount: number, warnings: string[]) {
    const dayKey = this.wibToday().toISOString().slice(0, 10);
    const title = `🧾 Rekonsiliasi jurnal otomatis — ${dayKey}`;
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true },
      select: { id: true },
    });
    const warnNote = warnings.length ? ` Catatan: ${warnings.slice(0, 5).join('; ')}.` : '';
    const body =
      `Sistem menemukan transaksi operasional yang belum terjurnal dan memprosesnya otomatis: ` +
      `${createdCount} jurnal dibuat, ${failedCount} gagal.` +
      (failedCount > 0 ? ' Mohon cek menu Akuntansi (readiness "unmapped-operational").' : '') +
      warnNote;
    for (const admin of admins) {
      const existing = await (this.prisma as any).appNotification.findFirst({
        where: { recipientUserId: admin.id, entityType: 'Accounting', entityId: dayKey, title },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await this.appNotification.create({
          recipientUserId: admin.id,
          title,
          body,
          linkTo: '/accounting',
          entityType: 'Accounting',
          entityId: dayKey,
        });
      } catch (err) {
        this.logger.warn(`Notif rekonsiliasi jurnal gagal (admin #${admin.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
