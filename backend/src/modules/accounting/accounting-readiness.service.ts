import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingSchemaGuard, AccountingSchemaStatus } from './accounting-schema.guard';
import { dateOnlyWib, isoDate } from '../../common/utils/date-only';

export type AccountingReadinessResult = {
  ready: boolean;
  score: number;
  basis: 'ACCOUNTING_LEDGER_READINESS';
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  gates: Array<{ key: string; label: string; ready: boolean; count?: number; note?: string }>;
  missing: string[];
  nextActions: string[];
  warnings: string[];
  schemaStatus?: AccountingSchemaStatus;
  postingPeriod?: AccountingPostingPeriodReadiness;
};

export type AccountingPostingPeriodReadiness = {
  ready: boolean;
  postingDate: string;
  key: string | null;
  id: number | null;
  year: number | null;
  month: number | null;
  status: string | null;
  startDate: Date | null;
  endDate: Date | null;
  warning: string | null;
  nextAction: string | null;
};

@Injectable()
export class AccountingReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schemaGuard: AccountingSchemaGuard,
  ) {}

  // dateOnlyWib + isoDate imported from ../../common/utils/date-only (unifikasi 2026-07-07)
  private dateOnly(value: Date | string): Date {
    return dateOnlyWib(value, true); // fallbackToToday = true (NaN-safe — perilaku lama)
  }

  private isoDate(value: Date): string {
    return isoDate(value);
  }

  private periodKey(period: { year: number; month: number } | null | undefined): string | null {
    if (!period) return null;
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
  }

  private getModelDelegate(modelName: string) {
    return (this.prisma as any)[modelName];
  }

  private hasCountDelegate(modelName: string) {
    const delegate = this.getModelDelegate(modelName);
    return Boolean(delegate && typeof delegate.count === 'function');
  }

  private async safeCount(modelName: string, args?: any): Promise<{ ok: boolean; count: number; reason?: string }> {
    const delegate = this.getModelDelegate(modelName);
    if (!delegate || typeof delegate.count !== 'function') {
      return { ok: false, count: 0, reason: `Prisma delegate ${modelName} belum tersedia di runtime.` };
    }

    try {
      return { ok: true, count: await delegate.count(args) };
    } catch (error: any) {
      return { ok: false, count: 0, reason: error?.message ?? `Gagal membaca ${modelName}.` };
    }
  }

  private async getPostingPeriodReadiness(postingDateInput?: Date | string): Promise<AccountingPostingPeriodReadiness> {
    const postingDate = this.dateOnly(postingDateInput ?? new Date());
    const accountingPeriodDelegate = this.getModelDelegate('accountingPeriod');
    if (!accountingPeriodDelegate || typeof accountingPeriodDelegate.findFirst !== 'function') {
      return {
        ready: false,
        postingDate: this.isoDate(postingDate),
        key: null,
        id: null,
        year: null,
        month: null,
        status: null,
        startDate: null,
        endDate: null,
        warning: 'Prisma client belum memiliki delegate accountingPeriod. Accounting readiness tidak boleh crash; regenerate Prisma client dan restart backend.',
        nextAction: 'Jalankan npm run build:local di backend, restore generated Prisma noise jika schema tidak berubah, lalu restart backend.',
      };
    }

    const period = await accountingPeriodDelegate.findFirst({
      where: { startDate: { lte: postingDate }, endDate: { gte: postingDate } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (!period) {
      return {
        ready: false,
        postingDate: this.isoDate(postingDate),
        key: null,
        id: null,
        year: null,
        month: null,
        status: null,
        startDate: null,
        endDate: null,
        warning: `Tidak ada accounting period untuk tanggal posting ${this.isoDate(postingDate)}. Tagihan baru tidak bisa membuat jurnal sampai periode dibuat dan dibuka.`,
        nextAction: 'Buat accounting period yang mencakup tanggal posting berjalan, lalu pastikan statusnya OPEN.',
      };
    }

    const key = this.periodKey(period);
    const isOpen = period.status === 'OPEN';
    return {
      ready: isOpen,
      postingDate: this.isoDate(postingDate),
      key,
      id: period.id,
      year: period.year,
      month: period.month,
      status: period.status,
      startDate: period.startDate,
      endDate: period.endDate,
      warning: isOpen ? null : `Periode accounting ${key} untuk tanggal posting ${this.isoDate(postingDate)} sudah ${period.status}. Tagihan baru tidak bisa diterbitkan ke jurnal sampai periode dibuka ulang oleh OWNER atau tanggal posting diarahkan ke periode OPEN lewat workflow yang sah.`,
      nextAction: isOpen ? null : 'Review apakah periode perlu dibuka ulang Owner-only atau gunakan workflow adjustment periode berjalan; jangan membuat jurnal baru langsung ke periode tertutup.',
    };
  }

  async getReadiness(postingDateInput?: Date | string): Promise<AccountingReadinessResult> {
    const schemaStatus = await this.schemaGuard.getStatus();
    if (!schemaStatus.ready) {
      return {
        ready: false,
        score: 0,
        basis: 'ACCOUNTING_LEDGER_READINESS',
        ledgerBacked: false,
        formalStatementReady: false,
        gates: [
          {
            key: 'schema.migrated',
            label: 'Tabel accounting foundation sudah diterapkan ke database',
            ready: false,
            count: schemaStatus.checkedTables.length - schemaStatus.missingTables.length,
            note: schemaStatus.message,
          },
        ],
        missing: ['Accounting foundation schema belum diterapkan ke database.'],
        nextActions: schemaStatus.nextActions,
        warnings: [
          'Backend code accounting sudah terpasang, tetapi PostgreSQL belum memiliki tabel accounting baru.',
          'Jalankan migration additive; jangan reset DB kecuali memang sedang dev bootstrap dan user eksplisit meminta.',
          'Balance Sheet tetap ready=false sampai schema, COA, cash account, opening balance, dan journal siap.',
        ],
        schemaStatus,
      };
    }
    const requiredDelegates = ['chartOfAccount', 'cashAccount', 'accountingPeriod', 'openingBalanceBatch', 'journalEntry'];
    const missingDelegates = requiredDelegates.filter((modelName) => !this.hasCountDelegate(modelName));
    if (missingDelegates.length > 0) {
      return {
        ready: false,
        score: 0,
        basis: 'ACCOUNTING_LEDGER_READINESS',
        ledgerBacked: false,
        formalStatementReady: false,
        gates: [
          {
            key: 'prisma.generatedClient',
            label: 'Prisma client runtime sinkron dengan schema accounting',
            ready: false,
            count: requiredDelegates.length - missingDelegates.length,
            note: `Delegate Prisma belum tersedia: ${missingDelegates.join(', ')}.`,
          },
        ],
        missing: ['Prisma generated client runtime belum sinkron dengan schema accounting.'],
        nextActions: [
          'Jalankan build backend agar Prisma client digenerate ulang sesuai schema.',
          'Restart backend setelah build karena endpoint runtime membaca dist/generated/prisma.',
          'Jangan reset database dan jangan commit generated Prisma jika schema tidak berubah.',
        ],
        warnings: [
          'Tabel database bisa sudah ada, tetapi Prisma client runtime yang sedang dipakai belum memiliki model delegate yang dibutuhkan.',
          'Accounting readiness dikembalikan sebagai ready=false, bukan 500, agar owner dashboard tetap aman dibuka.',
        ],
        schemaStatus,
      };
    }

    const [
      coaCountResult,
      assetCountResult,
      liabilityCountResult,
      equityCountResult,
      revenueCountResult,
      expenseCountResult,
      cogsCountResult,
      cashAccountCountResult,
      periodCountResult,
      openingDraftCountResult,
      openingPostedCountResult,
      journalCountResult,
      postedJournalCountResult,
      unbalancedPostedJournalCountResult,
      postingPeriod,
    ] = await Promise.all([
      this.safeCount('chartOfAccount'),
      this.safeCount('chartOfAccount', { where: { type: 'ASSET' as any } }),
      this.safeCount('chartOfAccount', { where: { type: 'LIABILITY' as any } }),
      this.safeCount('chartOfAccount', { where: { type: 'EQUITY' as any } }),
      this.safeCount('chartOfAccount', { where: { type: 'REVENUE' as any } }),
      this.safeCount('chartOfAccount', { where: { type: 'EXPENSE' as any } }),
      this.safeCount('chartOfAccount', { where: { type: 'COGS' as any } }),
      this.safeCount('cashAccount', { where: { isActive: true } }),
      this.safeCount('accountingPeriod'),
      this.safeCount('openingBalanceBatch', { where: { status: 'DRAFT' as any } }),
      this.safeCount('openingBalanceBatch', { where: { status: 'POSTED' as any } }),
      this.safeCount('journalEntry'),
      this.safeCount('journalEntry', { where: { status: 'POSTED' as any } }),
      this.safeCount('journalEntry', { where: { status: 'POSTED' as any, isBalanced: false } }),
      this.getPostingPeriodReadiness(postingDateInput),
    ]);

    const countResults = [
      coaCountResult,
      assetCountResult,
      liabilityCountResult,
      equityCountResult,
      revenueCountResult,
      expenseCountResult,
      cogsCountResult,
      cashAccountCountResult,
      periodCountResult,
      openingDraftCountResult,
      openingPostedCountResult,
      journalCountResult,
      postedJournalCountResult,
      unbalancedPostedJournalCountResult,
    ];
    const failedCount = countResults.find((result) => !result.ok);
    if (failedCount) {
      return {
        ready: false,
        score: 0,
        basis: 'ACCOUNTING_LEDGER_READINESS',
        ledgerBacked: false,
        formalStatementReady: false,
        gates: [
          {
            key: 'accounting.counts.readable',
            label: 'Accounting readiness dapat membaca model accounting',
            ready: false,
            count: 0,
            note: failedCount.reason ?? 'Gagal membaca salah satu model accounting.',
          },
        ],
        missing: ['Accounting readiness belum bisa membaca semua model accounting.'],
        nextActions: [
          'Jalankan npm run build:local di backend dan restart backend.',
          'Cek apakah Prisma client runtime sudah sinkron dengan schema.',
          'Jangan reset database untuk masalah readiness read guard ini.',
        ],
        warnings: [failedCount.reason ?? 'Accounting readiness read guard menangkap error count.'],
        schemaStatus,
      };
    }

    const coaCount = coaCountResult.count;
    const assetCount = assetCountResult.count;
    const liabilityCount = liabilityCountResult.count;
    const equityCount = equityCountResult.count;
    const revenueCount = revenueCountResult.count;
    const expenseCount = expenseCountResult.count;
    const cogsCount = cogsCountResult.count;
    const cashAccountCount = cashAccountCountResult.count;
    const periodCount = periodCountResult.count;
    const openingDraftCount = openingDraftCountResult.count;
    const openingPostedCount = openingPostedCountResult.count;
    const journalCount = journalCountResult.count;
    const postedJournalCount = postedJournalCountResult.count;
    const unbalancedPostedJournalCount = unbalancedPostedJournalCountResult.count;

    const gates = [
      { key: 'coa.seeded', label: 'Chart of Accounts minimal tersedia', ready: coaCount >= 30, count: coaCount, note: 'Seed default COA minimal kos harus dijalankan.' },
      { key: 'coa.coverage', label: 'COA mencakup asset/liability/equity/revenue/expense', ready: assetCount > 0 && liabilityCount > 0 && equityCount > 0 && revenueCount > 0 && expenseCount > 0, count: assetCount + liabilityCount + equityCount + revenueCount + expenseCount + cogsCount },
      { key: 'cashAccount.exists', label: 'Cash/bank account operasional tersedia', ready: cashAccountCount > 0, count: cashAccountCount, note: 'Minimal satu cash/bank account harus dibuat dan dipetakan ke COA asset.' },
      { key: 'period.exists', label: 'Accounting period tersedia', ready: periodCount > 0, count: periodCount, note: 'Buat periode bulanan untuk cutover dan laporan.' },
      { key: 'postingPeriod.open', label: 'Periode posting berjalan OPEN', ready: postingPeriod.ready, count: postingPeriod.id ? 1 : 0, note: postingPeriod.ready ? `Tanggal posting ${postingPeriod.postingDate} masuk periode ${postingPeriod.key} yang masih OPEN.` : (postingPeriod.warning ?? 'Periode posting berjalan belum siap.') },
      { key: 'openingBalance.posted', label: 'Opening balance sudah diposting', ready: openingPostedCount > 0, count: openingPostedCount, note: 'Tanpa opening balance, Balance Sheet belum bisa formal.' },
      { key: 'journal.exists', label: 'Journal ledger mulai tersedia', ready: postedJournalCount > 0, count: journalCount, note: postedJournalCount > 0 ? 'Journal ledger sudah terisi dan menjadi dasar laporan.' : 'Mulai jurnal manual/draft untuk transaksi setelah cutover.' },
      { key: 'journal.balanced', label: 'Tidak ada posted journal yang tidak balance', ready: unbalancedPostedJournalCount === 0, count: unbalancedPostedJournalCount },
    ];

    const passed = gates.filter((g) => g.ready).length;
    const ready = gates.every((g) => g.ready);
    const missing = gates.filter((g) => !g.ready).map((g) => g.label);
    const nextActions = [
      ...(coaCount < 30 ? ['Jalankan POST /api/accounting/default-coa/seed.'] : []),
      ...(cashAccountCount === 0 ? ['Buat minimal satu cash/bank account dan hubungkan ke COA asset.'] : []),
      ...(periodCount === 0 ? ['Buat accounting period cutover/bulan aktif.'] : []),
      ...(!postingPeriod.ready && postingPeriod.nextAction ? [postingPeriod.nextAction] : []),
      ...(openingDraftCount > 0 && openingPostedCount === 0 ? ['Review draft opening balance; posting tetap manual di batch lanjutan.'] : []),
      ...(openingPostedCount === 0 ? ['Siapkan opening balance: cash/bank, deposit liability, aset, modal owner.'] : []),
      ...(postedJournalCount === 0 ? ['Mulai jurnal manual/draft untuk transaksi setelah cutover.'] : []),
    ];

    return {
      ready,
      score: Math.round((passed / gates.length) * 100),
      basis: 'ACCOUNTING_LEDGER_READINESS',
      ledgerBacked: postedJournalCount > 0,
      formalStatementReady: ready,
      gates,
      missing,
      nextActions,
      schemaStatus,
      postingPeriod,
      warnings: ready
        ? [
            'Ledger accounting sudah siap dibaca. Tetap review data quality, jurnal draft, dan status tutup periode sebelum keputusan owner.',
            'Deposit tetap diperlakukan sebagai liability. Stay deposit fields masih menjadi snapshot operasional sampai ledger deposit detail dibuat di batch terpisah.',
          ]
        : [
            ...(postingPeriod.warning ? [postingPeriod.warning] : []),
            'Beberapa laporan masih bersifat preview operasional sampai seluruh readiness ledger terpenuhi.',
            'Deposit tetap diperlakukan sebagai liability. Stay deposit fields masih menjadi snapshot operasional sampai ledger deposit detail dibuat di batch terpisah.',
            'Accounting belum siap penuh; selesaikan gate yang masih missing sebelum memakai laporan untuk keputusan owner.',
          ],
    };
  }
}
