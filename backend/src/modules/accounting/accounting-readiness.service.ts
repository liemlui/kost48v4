import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingSchemaGuard, AccountingSchemaStatus } from './accounting-schema.guard';

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

  private dateOnly(value: Date | string): Date {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return this.dateOnly(new Date());
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private periodKey(period: { year: number; month: number } | null | undefined): string | null {
    if (!period) return null;
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
  }

  private async getPostingPeriodReadiness(postingDateInput?: Date | string): Promise<AccountingPostingPeriodReadiness> {
    const postingDate = this.dateOnly(postingDateInput ?? new Date());
    const period = await (this.prisma as any).accountingPeriod.findFirst({
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
    const [
      coaCount,
      assetCount,
      liabilityCount,
      equityCount,
      revenueCount,
      expenseCount,
      cogsCount,
      cashAccountCount,
      periodCount,
      openingDraftCount,
      openingPostedCount,
      journalCount,
      postedJournalCount,
      unbalancedPostedJournalCount,
      postingPeriod,
    ] = await Promise.all([
      (this.prisma as any).chartOfAccount.count(),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'ASSET' as any } }),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'LIABILITY' as any } }),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'EQUITY' as any } }),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'REVENUE' as any } }),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'EXPENSE' as any } }),
      (this.prisma as any).chartOfAccount.count({ where: { type: 'COGS' as any } }),
      (this.prisma as any).cashAccount.count({ where: { isActive: true } }),
      (this.prisma as any).accountingPeriod.count(),
      (this.prisma as any).openingBalanceBatch.count({ where: { status: 'DRAFT' as any } }),
      (this.prisma as any).openingBalanceBatch.count({ where: { status: 'POSTED' as any } }),
      (this.prisma as any).journalEntry.count(),
      (this.prisma as any).journalEntry.count({ where: { status: 'POSTED' as any } }),
      (this.prisma as any).journalEntry.count({ where: { status: 'POSTED' as any, isBalanced: false } }),
      this.getPostingPeriodReadiness(postingDateInput),
    ]);

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
