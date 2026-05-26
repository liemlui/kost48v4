import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { TrialBalanceQueryDto } from './dto/journal-entry.dto';
import { AccountingSchemaGuard } from './accounting-schema.guard';

function accountBalance(type: string, debit: number, credit: number) {
  if (type === 'ASSET' || type === 'EXPENSE' || type === 'COGS') return debit - credit;
  return credit - debit;
}

@Injectable()
export class AccountingReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: AccountingReadinessService,
    private readonly schemaGuard: AccountingSchemaGuard,
  ) {}

  async trialBalance(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const openingJournalSourceIds = await this.mappedSourceIds('OPENING_BALANCE');
    const [accounts, journalSums, openingSums] = await Promise.all([
      (this.prisma as any).chartOfAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
      (this.prisma as any).journalLine.groupBy({
        by: ['chartOfAccountId'],
        _sum: { debitRupiah: true, creditRupiah: true },
        where: {
          journalEntry: {
            status: 'POSTED' as any,
            entryDate: { lte: asOf },
          },
        },
      }),
      (this.prisma as any).openingBalanceLine.groupBy({
        by: ['chartOfAccountId'],
        _sum: { debitRupiah: true, creditRupiah: true },
        where: {
          batch: {
            status: 'POSTED' as any,
            id: { notIn: openingJournalSourceIds },
            cutoverDate: { lte: asOf },
          },
        },
      }),
    ]);

    const sums = new Map<number, { debit: number; credit: number }>();
    for (const row of [...journalSums, ...openingSums]) {
      const current = sums.get(row.chartOfAccountId) ?? { debit: 0, credit: 0 };
      current.debit += Number(row._sum.debitRupiah ?? 0);
      current.credit += Number(row._sum.creditRupiah ?? 0);
      sums.set(row.chartOfAccountId, current);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const lines = accounts.map((account) => {
      const sum = sums.get(account.id) ?? { debit: 0, credit: 0 };
      totalDebit += sum.debit;
      totalCredit += sum.credit;
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        debitRupiah: sum.debit,
        creditRupiah: sum.credit,
        balanceRupiah: accountBalance(String(account.type), sum.debit, sum.credit),
      };
    });

    return {
      asOf: asOf.toISOString().slice(0, 10),
      basis: 'POSTED_JOURNAL_PLUS_POSTED_OPENING_BALANCE',
      ledgerBacked: true,
      formalStatementReady: false,
      totalDebitRupiah: totalDebit,
      totalCreditRupiah: totalCredit,
      isBalanced: totalDebit === totalCredit,
      lines,
      note: 'Trial balance memakai JournalEntry POSTED. OpeningBalanceLine POSTED hanya dibaca sebagai fallback jika belum ada JournalEntry OPENING_BALANCE agar tidak double-count.',
    };
  }

  async unmappedTransactions() {
    await this.schemaGuard.assertReady();
    const [mappedInvoices, mappedPayments, mappedExpenses, mappedWifiSales, mappedDeposits] = await Promise.all([
      this.mappedSourceIds('INVOICE'),
      this.mappedSourceIds('INVOICE_PAYMENT'),
      this.mappedSourceIds('EXPENSE'),
      this.mappedSourceIds('WIFI_SALE'),
      this.mappedSourceIds('DEPOSIT'),
    ]);

    const [invoices, payments, expenses, wifiSales, deposits] = await Promise.all([
      (this.prisma as any).invoice.findMany({
        where: { status: { not: 'CANCELLED' as any }, id: { notIn: mappedInvoices } },
        select: { id: true, invoiceNumber: true, status: true, totalAmountRupiah: true, periodStart: true, periodEnd: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      (this.prisma as any).invoicePayment.findMany({
        where: { id: { notIn: mappedPayments } },
        select: { id: true, invoiceId: true, amountRupiah: true, paymentDate: true, method: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      (this.prisma as any).expense.findMany({
        where: { id: { notIn: mappedExpenses } },
        select: { id: true, expenseDate: true, category: true, description: true, amountRupiah: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      (this.prisma as any).wifiSale.findMany({
        where: { id: { notIn: mappedWifiSales } },
        select: { id: true, saleDate: true, customerName: true, packageName: true, soldPriceRupiah: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      (this.prisma as any).stay.findMany({
        where: { depositPaidAmountRupiah: { gt: 0 }, id: { notIn: mappedDeposits } },
        select: { id: true, tenantId: true, roomId: true, status: true, depositPaidAmountRupiah: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    return {
      basis: 'UNMAPPED_OPERATIONAL_TRANSACTION_SCAN',
      ledgerBacked: false,
      formalStatementReady: false,
      summary: {
        invoiceSampleCount: invoices.length,
        invoicePaymentSampleCount: payments.length,
        expenseSampleCount: expenses.length,
        wifiSaleSampleCount: wifiSales.length,
        depositSnapshotSampleCount: deposits.length,
      },
      samples: { invoices, payments, expenses, wifiSales, depositSnapshots: deposits },
      note: 'Scanner ini menunjukkan transaksi operasional yang belum punya JournalEntry POSTED. B3 Auto Journal Lite memproses INVOICE, INVOICE_PAYMENT, EXPENSE, dan WIFI_SALE; deposit/reversal tetap deferred.',
    };
  }


  async recentJournals(query: { sourceTypes?: string; limit?: number } = {}) {
    await this.schemaGuard.assertReady();
    const allowedSourceTypes = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'OPENING_BALANCE', 'MANUAL'];
    const sourceTypes = String(query.sourceTypes ?? 'INVOICE,INVOICE_PAYMENT,EXPENSE,WIFI_SALE')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => allowedSourceTypes.includes(item));
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);

    const entries = await (this.prisma as any).journalEntry.findMany({
      where: {
        status: 'POSTED' as any,
        ...(sourceTypes.length ? { sourceType: { in: sourceTypes as any } } : {}),
      },
      include: {
        accountingPeriod: { select: { id: true, year: true, month: true, status: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } },
            cashAccount: { select: { id: true, name: true, accountType: true, isDefault: true } },
          },
        },
      },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return {
      basis: 'RECENT_AUTO_JOURNAL_ACTIVITY',
      ledgerBacked: true,
      sourceTypes: sourceTypes.length ? sourceTypes : ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'],
      limit,
      items: entries.map((entry: any) => this.formatJournalEntry(entry)),
      note: 'Aktivitas ini membantu UAT B3.1B: transaksi operasional baru harus muncul sebagai JournalEntry POSTED yang balance.',
    };
  }

  async journalBySource(query: { sourceType: string; sourceId: string }) {
    await this.schemaGuard.assertReady();
    const entry = await (this.prisma as any).journalEntry.findFirst({
      where: {
        sourceType: String(query.sourceType).toUpperCase() as any,
        sourceId: String(query.sourceId),
        status: 'POSTED' as any,
      },
      include: {
        accountingPeriod: { select: { id: true, year: true, month: true, status: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } },
            cashAccount: { select: { id: true, name: true, accountType: true, isDefault: true } },
          },
        },
      },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    return {
      basis: 'JOURNAL_BY_SOURCE_LOOKUP',
      ledgerBacked: true,
      sourceType: String(query.sourceType).toUpperCase(),
      sourceId: String(query.sourceId),
      found: Boolean(entry),
      item: entry ? this.formatJournalEntry(entry) : null,
      note: entry ? 'JournalEntry POSTED ditemukan untuk source ini.' : 'Belum ada JournalEntry POSTED untuk source ini. Cek readiness, period, COA, atau unmapped scanner.',
    };
  }

  async profitLoss(query: TrialBalanceQueryDto = {}) {
    const trial = await this.trialBalance(query);
    const lines = (trial.lines ?? []) as Array<{
      accountId: number;
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      debitRupiah: number;
      creditRupiah: number;
      balanceRupiah: number;
    }>;

    const buildLines = (type: string) => lines
      .filter((line) => line.type === type && line.balanceRupiah !== 0)
      .map((line) => ({
        accountId: line.accountId,
        code: line.code,
        name: line.name,
        type: line.type,
        debitRupiah: line.debitRupiah,
        creditRupiah: line.creditRupiah,
        amountRupiah: Math.abs(line.balanceRupiah),
      }))
      .sort((a, b) => b.amountRupiah - a.amountRupiah || a.code.localeCompare(b.code));

    const revenueLines = buildLines('REVENUE');
    const cogsLines = buildLines('COGS');
    const expenseLines = buildLines('EXPENSE');
    const totalRevenue = revenueLines.reduce((sum, line) => sum + line.amountRupiah, 0);
    const totalCogs = cogsLines.reduce((sum, line) => sum + line.amountRupiah, 0);
    const totalExpense = expenseLines.reduce((sum, line) => sum + line.amountRupiah, 0);
    const netProfit = totalRevenue - totalCogs - totalExpense;

    return {
      asOf: trial.asOf,
      basis: 'LEDGER_POSTED_JOURNAL_PROFIT_LOSS_LITE',
      ledgerBacked: true,
      formalStatementReady: trial.isBalanced,
      trialBalance: {
        totalDebitRupiah: trial.totalDebitRupiah,
        totalCreditRupiah: trial.totalCreditRupiah,
        isBalanced: trial.isBalanced,
      },
      totals: {
        revenueRupiah: totalRevenue,
        cogsRupiah: totalCogs,
        expenseRupiah: totalExpense,
        netProfitRupiah: netProfit,
        netProfitMarginPercent: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
      },
      lines: {
        revenue: revenueLines,
        cogs: cogsLines,
        expenses: expenseLines,
      },
      note: 'P&L Lite membaca JournalEntry POSTED dari ledger. Invoice payment tidak diakui sebagai revenue; revenue berasal dari invoice issued journal.',
    };
  }

  async balanceSheet(query: TrialBalanceQueryDto = {}) {
    const readiness = await this.readinessService.getReadiness();
    if (readiness.schemaStatus && !readiness.schemaStatus.ready) {
      return {
        ready: false,
        basis: 'ACCOUNTING_SCHEMA_NOT_APPLIED',
        ledgerBacked: false,
        formalStatementReady: false,
        readiness,
        trialBalancePreview: null,
        statement: null,
        lines: null,
        readinessNote: 'Backend accounting sudah terpasang, tetapi migration database belum diterapkan. Jalankan npx prisma migrate deploy atau npx prisma db push sebelum membaca Balance Sheet.',
      };
    }

    const trial = await this.trialBalance(query);
    const typedLines = (trial.lines ?? []) as Array<{
      accountId: number;
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      debitRupiah: number;
      creditRupiah: number;
      balanceRupiah: number;
    }>;

    const statementLine = (line: typeof typedLines[number]) => ({
      accountId: line.accountId,
      code: line.code,
      name: line.name,
      type: line.type,
      debitRupiah: line.debitRupiah,
      creditRupiah: line.creditRupiah,
      balanceRupiah: Math.abs(line.balanceRupiah),
    });
    const assetsLines = typedLines.filter((l) => l.type === 'ASSET' && l.balanceRupiah !== 0).map(statementLine);
    const liabilitiesLines = typedLines.filter((l) => l.type === 'LIABILITY' && l.balanceRupiah !== 0).map(statementLine);
    const equityLines = typedLines.filter((l) => l.type === 'EQUITY' && l.balanceRupiah !== 0).map(statementLine);
    const revenue = typedLines.filter((l) => l.type === 'REVENUE').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const cogs = typedLines.filter((l) => l.type === 'COGS').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const expenses = typedLines.filter((l) => l.type === 'EXPENSE').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const currentProfit = revenue - cogs - expenses;

    const assets = assetsLines.reduce((sum, l) => sum + l.balanceRupiah, 0);
    const liabilities = liabilitiesLines.reduce((sum, l) => sum + l.balanceRupiah, 0);
    const equityBase = equityLines.reduce((sum, l) => sum + l.balanceRupiah, 0);
    const equityIncludingCurrentProfit = equityBase + currentProfit;
    const liabilitiesAndEquity = liabilities + equityIncludingCurrentProfit;
    const balanced = assets === liabilitiesAndEquity;
    const guarded = !readiness.ready || !trial.isBalanced;

    return {
      ready: !guarded && balanced,
      basis: 'LEDGER_BALANCE_SHEET_LITE_GUARDED',
      ledgerBacked: true,
      formalStatementReady: !guarded && balanced,
      asOf: trial.asOf,
      readiness,
      trialBalancePreview: {
        asOf: trial.asOf,
        totalDebitRupiah: trial.totalDebitRupiah,
        totalCreditRupiah: trial.totalCreditRupiah,
        isBalanced: trial.isBalanced,
      },
      statement: {
        assetsRupiah: assets,
        liabilitiesRupiah: liabilities,
        equityRupiah: equityBase,
        currentProfitRupiah: currentProfit,
        equityIncludingCurrentProfitRupiah: equityIncludingCurrentProfit,
        liabilitiesAndEquityRupiah: liabilitiesAndEquity,
        differenceRupiah: assets - liabilitiesAndEquity,
        balanced,
      },
      lines: {
        assets: assetsLines,
        liabilities: liabilitiesLines,
        equity: equityLines,
      },
      readinessNote: guarded
        ? 'Balance Sheet Lite guarded: pastikan accounting readiness siap dan Trial Balance balanced sebelum membaca laporan sebagai statement formal.'
        : balanced
          ? 'Balance Sheet Lite siap dibaca. Current profit/loss masih ditampilkan sebagai komponen ekuitas sementara sampai closing retained earnings dibuat.'
          : 'Balance Sheet Lite belum balance. Review journal dan P&L sebelum dipakai sebagai laporan formal.',
    };
  }


  private formatJournalEntry(entry: any) {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      accountingPeriod: entry.accountingPeriod ?? null,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      memo: entry.memo,
      totalDebitRupiah: Number(entry.totalDebitRupiah ?? 0),
      totalCreditRupiah: Number(entry.totalCreditRupiah ?? 0),
      isBalanced: Boolean(entry.isBalanced),
      postedAt: entry.postedAt,
      createdAt: entry.createdAt,
      lines: (entry.lines ?? []).map((line: any) => ({
        id: line.id,
        chartOfAccountId: line.chartOfAccountId,
        cashAccountId: line.cashAccountId,
        description: line.description,
        debitRupiah: Number(line.debitRupiah ?? 0),
        creditRupiah: Number(line.creditRupiah ?? 0),
        sortOrder: line.sortOrder,
        chartOfAccount: line.chartOfAccount ?? null,
        cashAccount: line.cashAccount ?? null,
      })),
    };
  }

  private async mappedSourceIds(sourceType: string) {
    const rows = await (this.prisma as any).journalEntry.findMany({
      where: { sourceType: sourceType as any, sourceId: { not: null }, status: 'POSTED' as any },
      select: { sourceId: true },
    });
    return rows.map((row) => Number(row.sourceId)).filter((id) => Number.isFinite(id));
  }
}
