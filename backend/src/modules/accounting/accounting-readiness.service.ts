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
};

@Injectable()
export class AccountingReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schemaGuard: AccountingSchemaGuard,
  ) {}

  async getReadiness(): Promise<AccountingReadinessResult> {
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
    ]);

    const gates = [
      { key: 'coa.seeded', label: 'Chart of Accounts minimal tersedia', ready: coaCount >= 30, count: coaCount, note: 'Seed default COA minimal kos harus dijalankan.' },
      { key: 'coa.coverage', label: 'COA mencakup asset/liability/equity/revenue/expense', ready: assetCount > 0 && liabilityCount > 0 && equityCount > 0 && revenueCount > 0 && expenseCount > 0, count: assetCount + liabilityCount + equityCount + revenueCount + expenseCount + cogsCount },
      { key: 'cashAccount.exists', label: 'Cash/bank account operasional tersedia', ready: cashAccountCount > 0, count: cashAccountCount, note: 'Minimal satu cash/bank account harus dibuat dan dipetakan ke COA asset.' },
      { key: 'period.exists', label: 'Accounting period tersedia', ready: periodCount > 0, count: periodCount, note: 'Buat periode bulanan untuk cutover dan laporan.' },
      { key: 'openingBalance.posted', label: 'Opening balance sudah diposting', ready: openingPostedCount > 0, count: openingPostedCount, note: 'Tanpa opening balance, Balance Sheet belum bisa formal.' },
      { key: 'journal.exists', label: 'Journal ledger mulai tersedia', ready: postedJournalCount > 0, count: journalCount, note: 'B1 belum auto-posting; jurnal manual/draft bisa mulai disiapkan.' },
      { key: 'journal.balanced', label: 'Tidak ada posted journal yang tidak balance', ready: unbalancedPostedJournalCount === 0, count: unbalancedPostedJournalCount },
    ];

    const passed = gates.filter((g) => g.ready).length;
    const ready = gates.every((g) => g.ready);
    const missing = gates.filter((g) => !g.ready).map((g) => g.label);
    const nextActions = [
      ...(coaCount < 30 ? ['Jalankan POST /api/accounting/default-coa/seed.'] : []),
      ...(cashAccountCount === 0 ? ['Buat minimal satu cash/bank account dan hubungkan ke COA asset.'] : []),
      ...(periodCount === 0 ? ['Buat accounting period cutover/bulan aktif.'] : []),
      ...(openingDraftCount > 0 && openingPostedCount === 0 ? ['Review draft opening balance; posting tetap manual di batch lanjutan.'] : []),
      ...(openingPostedCount === 0 ? ['Siapkan opening balance: cash/bank, deposit liability, aset, modal owner.'] : []),
      ...(postedJournalCount === 0 ? ['Mulai jurnal manual/draft untuk transaksi setelah cutover; auto-posting ditunda sampai batch berikutnya.'] : []),
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
      warnings: [
        'Current finance reports masih OPERATIONAL_APPROXIMATION sampai readiness true.',
        'Deposit tetap liability dan Stay deposit fields tetap operational snapshot; belum migrasi TenantDepositLedger.',
        'B1/B2 foundation tidak melakukan auto-posting dan tidak menyentuh payment/stay/checkout/renew flow.',
      ],
    };
  }
}
