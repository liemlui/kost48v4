import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { TrialBalanceQueryDto } from './dto/journal-entry.dto';
import { AccountingSchemaGuard } from './accounting-schema.guard';
import {
  formatJournalEntry,
  mappedSourceIds,
  buildDepositReconciliationSnapshot,
  assetRegisterDisclosure,
  resolveProfitLossPeriod,
} from './accounting-report-helpers';
import { classifyCashflow, type CashflowLineInput } from './cashflow-classifier';
import {
  sumLinesByPrefix,
  expenseRatioPercent,
  CASH_PREFIXES,
  INVENTORY_PREFIXES,
  CURRENT_LIABILITY_PREFIXES,
} from './financial-ratios.helper';

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

    const openingJournalSourceIds = await mappedSourceIds(this.prisma,'OPENING_BALANCE');
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
      formalStatementReady: totalDebit === totalCredit,
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
      mappedSourceIds(this.prisma,'INVOICE'),
      mappedSourceIds(this.prisma,'INVOICE_PAYMENT'),
      mappedSourceIds(this.prisma,'EXPENSE'),
      mappedSourceIds(this.prisma,'WIFI_SALE'),
      mappedSourceIds(this.prisma,'DEPOSIT'),
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
      note: 'Scanner ini menunjukkan transaksi operasional yang belum punya JournalEntry POSTED. B3.3 mulai memproses deposit received yang sudah lunas; reversal invoice cancel muncul sebagai ADJUSTMENT.',
    };
  }


  async recentJournals(query: { sourceTypes?: string; limit?: number } = {}) {
    await this.schemaGuard.assertReady();
    const allowedSourceTypes = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'ADJUSTMENT', 'DEPRECIATION', 'CLOSING_ENTRY', 'CLOSING_REVERSAL', 'OPENING_BALANCE', 'MANUAL'];
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
      items: entries.map((entry: any) => formatJournalEntry(entry)),
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
      item: entry ? formatJournalEntry(entry) : null,
      note: entry ? 'JournalEntry POSTED ditemukan untuk source ini.' : 'Belum ada JournalEntry POSTED untuk source ini. Cek readiness, period, COA, atau unmapped scanner.',
    };
  }

  async profitLoss(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const period = await resolveProfitLossPeriod(this.prisma, query);
    const accounts = await (this.prisma as any).chartOfAccount.findMany({
      where: { type: { in: ['REVENUE', 'COGS', 'EXPENSE'] as any }, isActive: true },
      orderBy: { code: 'asc' },
    });
    const sums = await (this.prisma as any).journalLine.groupBy({
      by: ['chartOfAccountId'],
      _sum: { debitRupiah: true, creditRupiah: true },
      where: {
        journalEntry: {
          status: 'POSTED' as any,
          sourceType: { notIn: ['CLOSING_ENTRY', 'CLOSING_REVERSAL'] as any },
          entryDate: { gte: period.startDate, lte: period.endDate },
        },
      },
    });
    const sumByAccount = new Map<number, { debit: number; credit: number }>();
    for (const row of sums) {
      sumByAccount.set(row.chartOfAccountId, {
        debit: Number(row._sum.debitRupiah ?? 0),
        credit: Number(row._sum.creditRupiah ?? 0),
      });
    }

    const lines = accounts.map((account: any) => {
      const sum = sumByAccount.get(account.id) ?? { debit: 0, credit: 0 };
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
    const totalRevenue = lines.filter((line) => line.type === 'REVENUE').reduce((sum, line) => sum + line.balanceRupiah, 0);
    const totalCogs = lines.filter((line) => line.type === 'COGS').reduce((sum, line) => sum + line.balanceRupiah, 0);
    const totalExpense = lines.filter((line) => line.type === 'EXPENSE').reduce((sum, line) => sum + line.balanceRupiah, 0);
    const netProfit = totalRevenue - totalCogs - totalExpense;

    const closingJournal = period.accountingPeriod
      ? await (this.prisma as any).journalEntry.findFirst({
          where: {
            sourceType: 'CLOSING_ENTRY' as any,
            sourceId: { startsWith: `PERIOD_CLOSE:${period.key}` },
            status: 'POSTED' as any,
          },
          select: { id: true, entryNumber: true, postedAt: true, totalDebitRupiah: true, totalCreditRupiah: true, sourceId: true },
          orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
        })
      : null;

    return {
      asOf: period.endDate.toISOString().slice(0, 10),
      period: {
        year: period.year,
        month: period.month,
        key: period.key,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
        status: period.accountingPeriod?.status ?? 'VIRTUAL',
      },
      basis: 'LEDGER_OPERATIONAL_PNL_EXCLUDING_CLOSING_AND_REVERSAL_B8',
      ledgerBacked: true,
      formalStatementReady: Boolean(period.accountingPeriod && period.accountingPeriod.status === 'CLOSED' ? closingJournal : true),
      closing: {
        periodClosed: period.accountingPeriod?.status === 'CLOSED',
        closingJournalEntryId: closingJournal?.id ?? period.accountingPeriod?.closingJournalEntryId ?? null,
        closingEntryNumber: closingJournal?.entryNumber ?? null,
        closingPostedAt: closingJournal?.postedAt ?? period.accountingPeriod?.closedAt ?? null,
        netIncomeClosedToRetainedEarnings: period.accountingPeriod?.status === 'CLOSED' ? netProfit : null,
        reopenedAt: period.accountingPeriod?.reopenedAt ?? null,
        reopenJournalEntryId: period.accountingPeriod?.reopenJournalEntryId ?? null,
      },
      trialBalance: {
        totalDebitRupiah: lines.reduce((sum, line) => sum + line.debitRupiah, 0),
        totalCreditRupiah: lines.reduce((sum, line) => sum + line.creditRupiah, 0),
        isBalanced: true,
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
      note: closingJournal
        ? 'P&L operasional mengecualikan CLOSING_ENTRY dan CLOSING_REVERSAL agar performa periode tetap terbaca setelah close/reopen.'
        : 'P&L Lite membaca JournalEntry POSTED periode ini dan mengecualikan CLOSING_ENTRY/CLOSING_REVERSAL. Invoice payment tidak diakui sebagai revenue; revenue berasal dari invoice issued journal.',
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

    const isContraAsset = (line: typeof typedLines[number]) => line.type === 'ASSET' && line.normalBalance === 'CREDIT';
    const isFixedAsset = (line: typeof typedLines[number]) => line.type === 'ASSET' && !isContraAsset(line) && String(line.code).startsWith('15');
    const isCurrentAsset = (line: typeof typedLines[number]) => line.type === 'ASSET' && !isContraAsset(line) && !isFixedAsset(line);
    const isNonZero = (line: typeof typedLines[number]) => line.balanceRupiah !== 0 || line.debitRupiah !== 0 || line.creditRupiah !== 0;
    const statementLine = (line: typeof typedLines[number]) => ({
      accountId: line.accountId,
      code: line.code,
      name: line.name,
      type: line.type,
      normalBalance: line.normalBalance,
      debitRupiah: line.debitRupiah,
      creditRupiah: line.creditRupiah,
      balanceRupiah: line.balanceRupiah,
      amountRupiah: Math.abs(line.balanceRupiah),
      isContraAsset: isContraAsset(line),
      presentationLabel: isContraAsset(line) ? `Less: ${line.name}` : line.name,
    });
    const currentAssetLines = typedLines.filter((l) => isCurrentAsset(l) && isNonZero(l)).map(statementLine);
    const fixedAssetLines = typedLines.filter((l) => isFixedAsset(l) && isNonZero(l)).map(statementLine);
    const contraAssetLines = typedLines.filter((l) => isContraAsset(l) && isNonZero(l)).map(statementLine);
    const assetsLines = [...currentAssetLines, ...fixedAssetLines, ...contraAssetLines];
    const liabilitiesLines = typedLines.filter((l) => l.type === 'LIABILITY' && isNonZero(l)).map(statementLine);
    const equityLines = typedLines.filter((l) => l.type === 'EQUITY' && isNonZero(l)).map(statementLine);
    const revenue = typedLines.filter((l) => l.type === 'REVENUE').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const cogs = typedLines.filter((l) => l.type === 'COGS').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const expenses = typedLines.filter((l) => l.type === 'EXPENSE').reduce((sum, l) => sum + l.balanceRupiah, 0);
    const currentProfit = revenue - cogs - expenses;

    const currentAssets = currentAssetLines.reduce((sum, l) => sum + (l.balanceRupiah ?? 0), 0);
    const grossFixedAssets = fixedAssetLines.reduce((sum, l) => sum + (l.balanceRupiah ?? 0), 0);
    const accumulatedDepreciation = contraAssetLines.reduce((sum, l) => sum + Math.abs(l.balanceRupiah ?? 0), 0);
    const netFixedAssets = grossFixedAssets + contraAssetLines.reduce((sum, l) => sum + (l.balanceRupiah ?? 0), 0);
    const assets = currentAssets + netFixedAssets;
    const liabilities = liabilitiesLines.reduce((sum, l) => sum + (l.balanceRupiah ?? 0), 0);
    const equityBase = equityLines.reduce((sum, l) => sum + (l.balanceRupiah ?? 0), 0);
    const equityIncludingCurrentProfit = equityBase + currentProfit;
    const liabilitiesAndEquity = liabilities + equityIncludingCurrentProfit;
    const difference = assets - liabilitiesAndEquity;
    const balanced = difference === 0;
    const guarded = !readiness.ready || !trial.isBalanced;
    const assetRegisterDisclosureData = await assetRegisterDisclosure(this.prisma, grossFixedAssets, accumulatedDepreciation, netFixedAssets);
    const asOf = new Date(trial.asOf);
    asOf.setUTCHours(23, 59, 59, 999);
    const latestClosedPeriod = await (this.prisma as any).accountingPeriod.findFirst({
      where: {
        status: 'CLOSED' as any,
        endDate: { lte: asOf },
        closingJournalEntryId: { not: null },
      },
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
      select: { id: true, year: true, month: true, closedAt: true, closingJournalEntryId: true, closingNote: true, closeBasis: true, reopenedAt: true, reopenJournalEntryId: true, reopenReason: true },
    });

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
      closing: latestClosedPeriod ? {
        latestClosedPeriod,
        retainedEarningsActive: true,
        note: 'Periode tertutup sudah memindahkan laba/rugi ke Retained Earnings melalui CLOSING_ENTRY. Jika pernah dibuka ulang, CLOSING_REVERSAL menjaga audit trail. Current profit/loss hanya mewakili periode yang belum ditutup.',
      } : {
        latestClosedPeriod: null,
        retainedEarningsActive: false,
        note: 'Belum ada periode yang ditutup. Current profit/loss masih ditampilkan sebagai komponen ekuitas sementara sampai B7 close dijalankan.',
      },
      statement: {
        assetsRupiah: assets,
        currentAssetsRupiah: currentAssets,
        grossFixedAssetsRupiah: grossFixedAssets,
        accumulatedDepreciationRupiah: accumulatedDepreciation,
        netFixedAssetsRupiah: netFixedAssets,
        liabilitiesRupiah: liabilities,
        equityRupiah: equityBase,
        currentProfitRupiah: currentProfit,
        equityIncludingCurrentProfitRupiah: equityIncludingCurrentProfit,
        liabilitiesAndEquityRupiah: liabilitiesAndEquity,
        differenceRupiah: difference,
        balanced,
      },
      lines: {
        assets: assetsLines,
        currentAssets: currentAssetLines,
        fixedAssets: fixedAssetLines,
        contraAssets: contraAssetLines,
        liabilities: liabilitiesLines,
        equity: equityLines,
      },
      assetRegisterDisclosure: assetRegisterDisclosureData,
      readinessNote: guarded
        ? 'Balance Sheet Lite guarded: pastikan accounting readiness siap dan Trial Balance balanced sebelum membaca laporan sebagai statement formal.'
        : balanced
          ? latestClosedPeriod
            ? 'Balance Sheet Lite siap dibaca. Periode tertutup sudah dipindahkan ke Retained Earnings; current profit/loss hanya untuk periode berjalan yang belum close.'
            : 'Balance Sheet Lite siap dibaca. Current profit/loss masih ditampilkan sebagai komponen ekuitas sementara sampai tutup periode B7 dijalankan.'
          : 'Balance Sheet Lite belum balance. Review journal dan P&L sebelum dipakai sebagai laporan formal.',
    };
  }




  async assetReadiness() {
    await this.schemaGuard.assertReady();
    const requiredAccountCodes = ['1500', '1590', '6700'];
    const runtimeProofSources = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'];
    const allAutoJournalSources = [...runtimeProofSources, 'DEPOSIT', 'ADJUSTMENT', 'DEPRECIATION'];

    const [requiredAccounts, inventoryCount, roomItemCount, assignedRoomItemCount, inboundMovementCount, candidateExpenses, journalCounts, latestProofJournals] = await Promise.all([
      (this.prisma as any).chartOfAccount.findMany({
        where: { code: { in: requiredAccountCodes }, isActive: true },
        select: { id: true, code: true, name: true, type: true, normalBalance: true },
        orderBy: { code: 'asc' },
      }),
      (this.prisma as any).inventoryItem.count({ where: { isActive: true } }),
      (this.prisma as any).roomItem.count(),
      (this.prisma as any).roomItem.count({ where: { qty: { gt: 0 } } }),
      (this.prisma as any).inventoryMovement.count({ where: { movementType: { in: ['IN', 'ASSIGN_TO_ROOM'] as any } } }),
      (this.prisma as any).expense.findMany({
        where: {
          category: { in: ['MAINTENANCE', 'SUPPLIES', 'OTHER'] as any },
          amountRupiah: { gte: 500000 },
        },
        select: { id: true, expenseDate: true, category: true, description: true, amountRupiah: true, vendorName: true, roomId: true },
        orderBy: [{ amountRupiah: 'desc' }, { expenseDate: 'desc' }],
        take: 10,
      }),
      (this.prisma as any).journalEntry.groupBy({
        by: ['sourceType'],
        _count: { id: true },
        where: { status: 'POSTED' as any, sourceType: { in: allAutoJournalSources as any } },
      }),
      (this.prisma as any).journalEntry.findMany({
        where: { status: 'POSTED' as any, sourceType: { in: allAutoJournalSources as any } },
        select: { id: true, entryNumber: true, entryDate: true, sourceType: true, sourceId: true, totalDebitRupiah: true, totalCreditRupiah: true, isBalanced: true, postedAt: true },
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
    ]);

    const accountByCode = new Map(requiredAccounts.map((account: any) => [String(account.code), account]));
    const missingAccountCodes = requiredAccountCodes.filter((code) => !accountByCode.has(code));
    const journalCountBySource = new Map<string, number>(
      journalCounts.map((row: any): [string, number] => [String(row.sourceType), Number(row._count?.id ?? 0)]),
    );
    const runtimeProof = runtimeProofSources.map((sourceType) => {
      const postedJournalCount = journalCountBySource.get(sourceType) ?? 0;

      return {
        sourceType,
        postedJournalCount,
        proven: postedJournalCount > 0,
      };
    });
    const runtimeProofReady = runtimeProof.every((item) => item.proven);
    const operationalCandidateCount = Number(inventoryCount ?? 0) + Number(roomItemCount ?? 0) + Number(candidateExpenses.length ?? 0);
    const coreAccountsReady = missingAccountCodes.length === 0;
    const sourceProofCount = runtimeProof.filter((item) => item.proven).length;
    const score = Math.round(((coreAccountsReady ? 35 : 0) + (operationalCandidateCount > 0 ? 20 : 0) + (sourceProofCount / runtimeProofSources.length) * 25 + 10) * 10) / 10;

    return {
      basis: 'B4_ASSET_READINESS_SCHEMA_APPROVED',
      ledgerBacked: true,
      formalStatementReady: false,
      readyForAssetSchemaAct: coreAccountsReady && runtimeProofReady,
      schemaChangeRequired: false,
      schemaChangeApproved: true,
      noSchemaChangePatch: false,
      score,
      status: coreAccountsReady && runtimeProofReady ? 'B4_SCHEMA_FOUNDATION_ACTIVE' : 'RUNTIME_PROOF_REQUIRED',
      accountingAccounts: {
        fixedAssetAccount: accountByCode.get('1500') ?? null,
        accumulatedDepreciationAccount: accountByCode.get('1590') ?? null,
        depreciationExpenseAccount: accountByCode.get('6700') ?? null,
        missingAccountCodes,
      },
      operationalScan: {
        inventoryItemCount: Number(inventoryCount ?? 0),
        roomItemCount: Number(roomItemCount ?? 0),
        assignedRoomItemCount: Number(assignedRoomItemCount ?? 0),
        inboundOrAssignedMovementCount: Number(inboundMovementCount ?? 0),
        capexReviewCandidateExpenseCount: candidateExpenses.length,
        capexReviewCandidateExpenses: candidateExpenses.map((expense: any) => ({
          id: expense.id,
          expenseDate: expense.expenseDate,
          category: expense.category,
          description: expense.description,
          amountRupiah: Number(expense.amountRupiah ?? 0),
          vendorName: expense.vendorName ?? null,
          roomId: expense.roomId ?? null,
          reason: 'Nilai pengeluaran cukup besar dan kategorinya berpotensi maintenance/supplies/other; perlu owner review apakah expense atau fixed asset.',
        })),
      },
      runtimeProof: {
        requiredSources: runtimeProof,
        ready: runtimeProofReady,
        latestProofJournals: latestProofJournals.map((journal: any) => ({
          id: journal.id,
          entryNumber: journal.entryNumber,
          entryDate: journal.entryDate,
          sourceType: journal.sourceType,
          sourceId: journal.sourceId,
          totalDebitRupiah: Number(journal.totalDebitRupiah ?? 0),
          totalCreditRupiah: Number(journal.totalCreditRupiah ?? 0),
          isBalanced: Boolean(journal.isBalanced),
          postedAt: journal.postedAt,
        })),
      },
      gates: [
        {
          key: 'ASSET_COA_READY',
          label: 'COA aset/depresiasi tersedia',
          ready: coreAccountsReady,
          note: coreAccountsReady
            ? 'Akun 1500 Fixed Assets, 1590 Accumulated Depreciation, dan 6700 Depreciation siap dipakai.'
            : `Akun wajib belum lengkap: ${missingAccountCodes.join(', ')}.`,
        },
        {
          key: 'RUNTIME_AUTO_JOURNAL_PROOF',
          label: 'Runtime proof auto journal B3 selesai',
          ready: runtimeProofReady,
          note: runtimeProofReady
            ? 'Invoice, payment, expense, dan WiFi sale sudah punya JournalEntry POSTED.'
            : 'Buat transaksi nyata invoice/payment/expense/WiFi, lalu pastikan JournalEntry POSTED muncul sebelum schema B4.',
        },
        {
          key: 'OPERATIONAL_ASSET_CANDIDATES',
          label: 'Kandidat aset operasional terdeteksi',
          ready: operationalCandidateCount > 0,
          note: operationalCandidateCount > 0
            ? 'Inventory/room item/expense kandidat tersedia untuk dipetakan setelah schema asset register disetujui.'
            : 'Belum ada data kandidat aset dari inventory, room item, atau pengeluaran besar.',
        },
        {
          key: 'SCHEMA_APPROVAL_REQUIRED',
          label: 'Approval schema B4 diperlukan',
          ready: false,
          note: 'Schema B4 sudah additive. Gunakan /api/assets untuk register aset dan depreciation run.',
        },
      ],
      recommendedNextActions: [
        'Selesaikan runtime proof: INVOICE, INVOICE_PAYMENT, EXPENSE, dan WIFI_SALE harus muncul sebagai JournalEntry POSTED.',
        'Review kandidat expense besar: pisahkan biaya operasional biasa dari pembelian aset yang perlu dikapitalisasi.',
        'Tambahkan aset awal sebagai OPENING_BALANCE/DISCLOSURE_ONLY, lalu aktifkan depreciationEnabled hanya jika aman.',
      ],
      warnings: [
        'Jangan membuat acquisition journal otomatis untuk aset opening/disclosure agar Balance Sheet tidak double-count.',
        'Jika nilai aset sudah masuk dalam opening balance, onboarding FixedAsset harus disclosure-only dulu atau ditandai opening asset, bukan purchase baru.',
        'Tidak ada DB reset dan tidak ada lifecycle/payment/stay/checkout/renew mutation dalam patch B4 ini.',
      ],
      note: 'Endpoint ini membaca kesiapan COA, bukti runtime auto journal, dan kandidat aset. Schema asset register sekarang tersedia via /api/assets.',
    };
  }


  async depositPosition() {
    const snapshot = await buildDepositReconciliationSnapshot(this.prisma, this.schemaGuard, 25);
    return {
      basis: 'DEPOSIT_LIABILITY_POSITION_B3_3R',
      ledgerBacked: true,
      formalStatementReady: snapshot.reconciliation.status === 'MATCHED',
      account: snapshot.account,
      operational: snapshot.operational,
      ledger: snapshot.ledger,
      reconciliation: snapshot.reconciliation,
      differenceRupiah: snapshot.differenceRupiah,
      differenceDirection: snapshot.reconciliation.differenceDirection,
      note: snapshot.explanation,
    };
  }

  async depositReconciliation() {
    const snapshot = await buildDepositReconciliationSnapshot(this.prisma, this.schemaGuard, 25);
    return {
      basis: 'DEPOSIT_RECONCILIATION_B3_3R',
      ledgerBacked: true,
      formalStatementReady: snapshot.reconciliation.status === 'MATCHED',
      account: snapshot.account,
      summary: {
        operationalExpectedDepositRupiah: snapshot.operational.depositAmountRupiah,
        operationalPaidDepositRupiah: snapshot.operational.depositPaidRupiah,
        operationalNetLiabilityRupiah: snapshot.operational.depositHeldRupiah,
        ledgerDepositLiabilityRupiah: snapshot.ledger.liabilityRupiah,
        ledgerOpeningBalanceDepositRupiah: snapshot.ledgerBreakdownSummary.openingBalanceRupiah,
        ledgerAutoJournalDepositRupiah: snapshot.ledgerBreakdownSummary.depositAutoJournalRupiah,
        ledgerAdjustmentDepositRupiah: snapshot.ledgerBreakdownSummary.adjustmentRupiah,
        differenceRupiah: snapshot.differenceRupiah,
        differenceDirection: snapshot.reconciliation.differenceDirection,
        reconciliationStatus: snapshot.reconciliation.status,
      },
      ledgerBreakdown: snapshot.ledgerBreakdown,
      operationalStays: snapshot.operationalStays,
      candidateActions: snapshot.candidateActions,
      warnings: snapshot.warnings,
      explanation: snapshot.explanation,
      note: 'B3.3R memisahkan deposit opening balance, auto journal DEPOSIT, dan ADJUSTMENT agar owner tidak melakukan backfill yang menggandakan liability.',
    };
  }

  async reversalWatch() {
    await this.schemaGuard.assertReady();
    const cancelledInvoices = await (this.prisma as any).invoice.findMany({
      where: { status: 'CANCELLED' as any },
      select: { id: true, invoiceNumber: true, totalAmountRupiah: true, cancelReason: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const ids = cancelledInvoices.map((invoice: any) => String(invoice.id));
    const [invoiceJournals, reversalJournals] = await Promise.all([
      (this.prisma as any).journalEntry.findMany({
        where: { sourceType: 'INVOICE' as any, sourceId: { in: ids }, status: 'POSTED' as any },
        select: { id: true, sourceId: true, entryNumber: true, totalDebitRupiah: true, totalCreditRupiah: true },
      }),
      (this.prisma as any).journalEntry.findMany({
        where: { sourceType: 'ADJUSTMENT' as any, sourceId: { in: ids.map((id: string) => `INVOICE_REVERSAL:${id}`) }, status: 'POSTED' as any },
        select: { id: true, sourceId: true, entryNumber: true, totalDebitRupiah: true, totalCreditRupiah: true },
      }),
    ]);
    const journalByInvoice = new Map(invoiceJournals.map((entry: any) => [String(entry.sourceId), entry]));
    const reversalByInvoice = new Map(reversalJournals.map((entry: any) => [String(entry.sourceId).replace('INVOICE_REVERSAL:', ''), entry]));
    const items = cancelledInvoices
      .filter((invoice: any) => journalByInvoice.has(String(invoice.id)))
      .map((invoice: any) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmountRupiah: Number(invoice.totalAmountRupiah ?? 0),
        cancelReason: invoice.cancelReason,
        originalJournal: journalByInvoice.get(String(invoice.id)),
        reversalJournal: reversalByInvoice.get(String(invoice.id)) ?? null,
        reversalRequired: !reversalByInvoice.has(String(invoice.id)),
      }));

    return {
      basis: 'INVOICE_REVERSAL_WATCH_B3_3',
      ledgerBacked: true,
      formalStatementReady: false,
      summary: {
        cancelledWithOriginalJournalCount: items.length,
        reversalMissingCount: items.filter((item: any) => item.reversalRequired).length,
        reversalPostedCount: items.filter((item: any) => !item.reversalRequired).length,
      },
      items: items.slice(0, 25),
      note: 'Invoice CANCELLED yang sudah punya INVOICE journal harus punya ADJUSTMENT reversal agar revenue/piutang tidak overstated.',
    };
  }


  async cashflow(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    asOf.setHours(23, 59, 59, 999);
    const year = asOf.getUTCFullYear();
    const month = asOf.getUTCMonth() + 1;
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    periodEnd.setUTCHours(23, 59, 59, 999);

    const [cashAccounts, journalLines, openingSums] = await Promise.all([
      (this.prisma as any).cashAccount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      (this.prisma as any).journalLine.findMany({
        where: {
          journalEntry: {
            status: 'POSTED' as any,
            entryDate: { gte: periodStart, lte: periodEnd },
          },
        },
        include: {
          journalEntry: { select: { id: true, entryNumber: true, sourceType: true, sourceId: true, memo: true, entryDate: true } },
          chartOfAccount: { select: { id: true, code: true, name: true, type: true } },
          cashAccount: { select: { id: true, name: true, accountType: true } },
        },
        orderBy: { id: 'asc' },
      }),
      (this.prisma as any).openingBalanceLine.findMany({
        where: {
          batch: { status: 'POSTED' as any },
          // F1-3b (F-01): saldo awal KAS = prefix '10' (1000/1010/1020), bukan '11' (1100=PIUTANG).
          chartOfAccount: { type: 'ASSET' as any, code: { startsWith: '10' } },
        },
        select: { chartOfAccountId: true, debitRupiah: true, creditRupiah: true },
      }),
    ]);

    // F1-3a/c (F-01/19/20): klasifikasi arus kas via classifier MURNI & teruji
    // (cashflow-classifier.ts). Kas = line ber-cashAccountId ATAU akun prefix '10'
    // (BUKAN '11'=PIUTANG). Tiap sourceType diklasifikasi SEKALI (operating/investing/
    // financing) berbasis net debit−kredit — menghapus double-count versi lama.
    const cashflowLines: CashflowLineInput[] = journalLines.map((line: any) => ({
      sourceType: line.journalEntry?.sourceType ?? 'UNKNOWN',
      coaCode: line.chartOfAccount?.code ?? null,
      cashAccountId: line.cashAccountId ?? null,
      debitRupiah: Number(line.debitRupiah ?? 0),
      creditRupiah: Number(line.creditRupiah ?? 0),
    }));
    const classified = classifyCashflow(cashflowLines);
    const {
      operatingCashIn,
      operatingCashOut,
      investingCashIn,
      investingCashOut,
      financingCashIn,
      financingCashOut,
      operatingInTotal,
      operatingOutTotal,
    } = classified;

    // Audit E-4: saldo kas dihitung dari JURNAL (opening + Σ debit−kredit line
    // ber-cashAccountId pada entry POSTED), bukan field manual
    // CashAccount.currentBalanceRupiah yang tidak pernah di-update posting.
    const cashLineSums = await (this.prisma as any).journalLine.groupBy({
      by: ['cashAccountId'],
      where: { cashAccountId: { not: null }, journalEntry: { status: 'POSTED' as any } },
      _sum: { debitRupiah: true, creditRupiah: true },
    });
    const ledgerDeltaByCashId = new Map<number, number>(
      cashLineSums.map((row: any) => [
        Number(row.cashAccountId),
        Number(row._sum?.debitRupiah ?? 0) - Number(row._sum?.creditRupiah ?? 0),
      ]),
    );
    const cashAccountBalances = cashAccounts.map((ca: any) => {
      const opening = Number(ca.openingBalanceRupiah ?? 0);
      const ledgerDelta = ledgerDeltaByCashId.get(Number(ca.id)) ?? 0;
      return {
        id: ca.id,
        name: ca.name,
        accountType: ca.accountType,
        currentBalanceRupiah: opening + ledgerDelta,
        ledgerDeltaRupiah: ledgerDelta,
        manualBalanceRupiah: Number(ca.currentBalanceRupiah ?? 0),
        openingBalanceRupiah: opening,
      };
    });
    const totalCashOpening = cashAccountBalances.reduce((sum: number, ca: any) => sum + ca.openingBalanceRupiah, 0);
    const totalCashCurrent = cashAccountBalances.reduce((sum: number, ca: any) => sum + ca.currentBalanceRupiah, 0);

    // Opening balance from journal if cash account balances not set
    const openingBalanceFromJournal = openingSums.reduce(
      (sum: number, row: any) => sum + Number(row.debitRupiah ?? 0) - Number(row.creditRupiah ?? 0),
      0,
    );

    const netOperating = operatingInTotal - operatingOutTotal;
    const netInvesting = investingCashIn - investingCashOut;
    const netFinancing = financingCashIn - financingCashOut;
    const netCashflow = netOperating + netInvesting + netFinancing;

    // F1-3d: saldo awal periode = saldo akhir bulan lalu = opening CashAccount + Σ mutasi kas
    // POSTED SEBELUM periodStart. Lalu ending = beginning + netCashflow → invarian beginning+net=ending.
    const priorCashSums = await (this.prisma as any).journalLine.groupBy({
      by: ['cashAccountId'],
      where: {
        cashAccountId: { not: null },
        journalEntry: { status: 'POSTED' as any, entryDate: { lt: periodStart } },
      },
      _sum: { debitRupiah: true, creditRupiah: true },
    });
    const priorCashDelta = priorCashSums.reduce(
      (sum: number, row: any) => sum + Number(row._sum?.debitRupiah ?? 0) - Number(row._sum?.creditRupiah ?? 0),
      0,
    );
    const cashBeginning = cashAccounts.length > 0
      ? totalCashOpening + priorCashDelta
      : openingBalanceFromJournal;
    const cashEnding = cashBeginning + netCashflow;

    return {
      asOf: asOf.toISOString().slice(0, 10),
      period: {
        year,
        month,
        startDate: periodStart.toISOString().slice(0, 10),
        endDate: periodEnd.toISOString().slice(0, 10),
      },
      basis: 'LEDGER_CASHFLOW_DIRECT_METHOD_F1',
      ledgerBacked: true,
      formalStatementReady: cashAccounts.length > 0,
      cashAccounts: cashAccountBalances,
      operating: {
        cashIn: operatingCashIn,
        cashOut: operatingCashOut,
        totalInRupiah: operatingInTotal,
        totalOutRupiah: operatingOutTotal,
        netRupiah: netOperating,
      },
      investing: {
        totalInRupiah: investingCashIn,
        totalOutRupiah: investingCashOut,
        netRupiah: netInvesting,
      },
      financing: {
        totalInRupiah: financingCashIn,
        totalOutRupiah: financingCashOut,
        netRupiah: netFinancing,
      },
      totals: {
        netCashflowRupiah: netCashflow,
        cashBeginningRupiah: cashBeginning,
        cashEndingRupiah: cashEnding,
      },
      note: cashAccounts.length > 0
        ? 'Saldo awal = opening CashAccount + mutasi kas POSTED sebelum periode; ending = awal + arus bersih. Kas = line ber-cashAccountId atau akun prefix 10 (bukan 11=piutang). Operating terklasifikasi via source type journal.'
        : 'Belum ada CashAccount. Cashflow membaca journal line kas (akun prefix 10/ber-cashAccountId). Buat CashAccount untuk saldo formal.',
    };
  }

  async financialRatios(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const trial = await this.trialBalance(query);
    const pnl = await this.profitLoss(query);
    const bs = await this.balanceSheet(query);

    const lines = (trial.lines ?? []) as Array<{
      type: string; code: string; balanceRupiah: number; debitRupiah: number; creditRupiah: number;
    }>;

    // Calculate current assets (ASSET type, code starts with 11, 12, 13, 14, not 15)
    const currentAssets = lines
      .filter((l) => l.type === 'ASSET' && !String(l.code).startsWith('15'))
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    // F1-4 (F-03): kewajiban lancar = 2000(deposit)/2100/2200/2300, bukan hanya '21'
    // (versi lama melewatkan deposit liability 2000 → semua liquidity ratio salah).
    const currentLiabilities = sumLinesByPrefix(lines, 'LIABILITY', CURRENT_LIABILITY_PREFIXES);
    // Total liabilities
    const totalLiabilities = lines
      .filter((l) => l.type === 'LIABILITY')
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    // Total equity
    const totalEquity = lines
      .filter((l) => l.type === 'EQUITY')
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    // Total assets
    const totalAssets = lines
      .filter((l) => l.type === 'ASSET')
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    // Revenue
    const totalRevenue = lines
      .filter((l) => l.type === 'REVENUE')
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    // Gross profit (Revenue - COGS)
    const totalCogs = lines
      .filter((l) => l.type === 'COGS')
      .reduce((sum, l) => sum + l.balanceRupiah, 0);
    const grossProfit = totalRevenue - totalCogs;
    // Net profit from P&L
    const netProfit = pnl.totals?.netProfitRupiah ?? 0;
    const netProfitMargin = pnl.totals?.netProfitMarginPercent ?? 0;
    // F1-4 (F-18): Kas & bank = prefix '10' (1000/1010/1020), BUKAN '11' (1100=PIUTANG/AR).
    const cashAndBank = sumLinesByPrefix(lines, 'ASSET', CASH_PREFIXES);
    // F1-4: Persediaan = COA 1200 (prefix '12'); kode lama '14' tak pernah cocok → selalu 0.
    const inventory = sumLinesByPrefix(lines, 'ASSET', INVENTORY_PREFIXES);

    const currentRatio = currentLiabilities > 0 ? Math.round((currentAssets / currentLiabilities) * 100) / 100 : 0;
    const quickRatio = currentLiabilities > 0 ? Math.round(((currentAssets - inventory) / currentLiabilities) * 100) / 100 : 0;
    const cashRatio = currentLiabilities > 0 ? Math.round((cashAndBank / currentLiabilities) * 100) / 100 : 0;
    const debtToEquity = totalEquity > 0 ? Math.round((totalLiabilities / totalEquity) * 100) / 100 : 0;
    const debtRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) / 100 : 0;
    const grossProfitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
    const roa = totalAssets > 0 ? Math.round((netProfit / totalAssets) * 10000) / 100 : 0;
    const roce = (totalAssets - currentLiabilities) > 0
      ? Math.round((netProfit / (totalAssets - currentLiabilities)) * 10000) / 100
      : 0;
    // F1-4 (F-02): perbaiki presedensi — (expense / revenue) × 100, bukan expense × 100.
    const expenseRatio = expenseRatioPercent(pnl.totals?.expenseRupiah ?? 0, totalRevenue);
    const occupancyRate = bs.statement?.occupancyRate ?? 0;

    return {
      asOf: trial.asOf,
      basis: 'LEDGER_FINANCIAL_RATIOS_F2',
      ledgerBacked: trial.isBalanced && bs.ready,
      formalStatementReady: trial.isBalanced && bs.ready,
      readiness: {
        trialBalanceBalanced: trial.isBalanced,
        balanceSheetReady: bs.ready,
        cashAndBankAvailable: cashAndBank > 0 || cashAndBank < 0,
        currentLiabilitiesAvailable: currentLiabilities > 0,
        equityAvailable: totalEquity >= 0,
      },
      liquidity: {
        currentRatio,
        quickRatio,
        cashRatio,
        workingCapitalRupiah: currentAssets - currentLiabilities,
        label: currentRatio >= 2 ? 'BAIK' : currentRatio >= 1 ? 'CUKUP' : 'RENDAH',
      },
      profitability: {
        netProfitMarginPercent: netProfitMargin,
        grossProfitMarginPercent: grossProfitMargin,
        returnOnAssetsPercent: roa,
        returnOnCapitalEmployedPercent: roce,
        label: netProfitMargin >= 20 ? 'BAIK' : netProfitMargin >= 10 ? 'CUKUP' : 'RENDAH',
      },
      solvency: {
        debtToEquity,
        debtRatio,
        label: debtToEquity <= 1 ? 'RENDAH' : debtToEquity <= 2 ? 'CUKUP' : 'TINGGI',
      },
      efficiency: {
        expenseRatioPercent: expenseRatio,
        occupancyRatePercent: occupancyRate,
        label: expenseRatio <= 50 ? 'EFISIEN' : expenseRatio <= 70 ? 'CUKUP' : 'BOROS',
      },
      note: trial.isBalanced && bs.ready
        ? 'Rasio keuangan dihitung dari Trial Balance POSTED. Data ini siap digunakan untuk analisis formal.'
        : 'Rasio bersifat parsial karena Trial Balance belum balanced atau Balance Sheet belum siap. Beberapa rasio mungkin 0.',
    };
  }

  async profitLossDetail(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const current = await this.profitLoss(query);

    // Calculate previous period
    const baseDate = query.asOf ? new Date(query.asOf) : new Date();
    const year = query.year ?? baseDate.getUTCFullYear();
    const month = query.month ?? baseDate.getUTCMonth() + 1;
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth <= 0) { prevMonth += 12; prevYear -= 1; }

    const previous = await this.profitLoss({ year: prevYear, month: prevMonth });

    const changePercent = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    const buildLinesWithPrev = (type: string): any[] => {
      const currentLines: any[] = (current.lines as any)?.[type] ?? [];
      const prevLines: any[] = (previous.lines as any)?.[type] ?? [];
      const prevMap = new Map(prevLines.map((l: any) => [l.code, l]));
      return currentLines.map((line: any) => {
        const prev = prevMap.get(line.code);
        const prevAmount = prev?.amountRupiah ?? 0;
        const amt = line.amountRupiah ?? line.balanceRupiah ?? 0;
        return {
          ...line,
          amountRupiah: amt,
          prevAmountRupiah: prevAmount,
          changePercent: changePercent(amt, prevAmount),
        };
      });
    };

    return {
      asOf: current.asOf,
      period: current.period,
      basis: 'LEDGER_OPERATIONAL_PNL_WITH_PREV_PERIOD_F3',
      ledgerBacked: current.ledgerBacked,
      formalStatementReady: current.formalStatementReady,
      current: {
        revenueLines: buildLinesWithPrev('revenue'),
        cogsLines: buildLinesWithPrev('cogs'),
        expenseLines: buildLinesWithPrev('expenses'),
        totals: current.totals,
      },
      previous: {
        totals: previous.totals,
      },
      change: {
        revenueChangePercent: changePercent(current.totals?.revenueRupiah ?? 0, previous.totals?.revenueRupiah ?? 0),
        expenseChangePercent: changePercent(current.totals?.expenseRupiah ?? 0, previous.totals?.expenseRupiah ?? 0),
        netProfitChangePercent: changePercent(current.totals?.netProfitRupiah ?? 0, previous.totals?.netProfitRupiah ?? 0),
        revenueRupiah: (current.totals?.revenueRupiah ?? 0) - (previous.totals?.revenueRupiah ?? 0),
        expenseRupiah: (current.totals?.expenseRupiah ?? 0) - (previous.totals?.expenseRupiah ?? 0),
        netProfitRupiah: (current.totals?.netProfitRupiah ?? 0) - (previous.totals?.netProfitRupiah ?? 0),
      },
      closing: current.closing,
      note: 'P&L Detail menambahkan perbandingan month-over-month dengan perubahan absolut dan persen. Closing info diambil dari periode berjalan.',
    };
  }

  async balanceSheetDetail(query: TrialBalanceQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const current = await this.balanceSheet(query);

    // Calculate previous period (last month)
    const baseDate = query.asOf ? new Date(query.asOf) : new Date();
    const year = query.year ?? baseDate.getUTCFullYear();
    const month = query.month ?? baseDate.getUTCMonth() + 1;
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth <= 0) { prevMonth += 12; prevYear -= 1; }

    const previous = await this.balanceSheet({ year: prevYear, month: prevMonth });

    const changePercent = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    const buildStatement = (stmt: any) => ({
      assetsRupiah: stmt?.assetsRupiah ?? 0,
      currentAssetsRupiah: stmt?.currentAssetsRupiah ?? 0,
      fixedAssetsRupiah: stmt?.netFixedAssetsRupiah ?? 0,
      liabilitiesRupiah: stmt?.liabilitiesRupiah ?? 0,
      equityRupiah: stmt?.equityIncludingCurrentProfitRupiah ?? 0,
      balanced: stmt?.balanced ?? false,
    });

    const currentStmt = buildStatement(current.statement);
    const prevStmt = buildStatement(previous.statement);

    return {
      asOf: current.asOf,
      basis: 'LEDGER_BALANCE_SHEET_DETAIL_F3',
      ledgerBacked: current.ledgerBacked,
      formalStatementReady: current.formalStatementReady,
      readiness: current.readiness,
      trialBalancePreview: current.trialBalancePreview,
      closing: current.closing,
      current: {
        statement: currentStmt,
        lines: current.lines,
        assetRegisterDisclosure: current.assetRegisterDisclosure,
      },
      previous: {
        statement: prevStmt,
      },
      change: {
        assetsChangePercent: changePercent(currentStmt.assetsRupiah, prevStmt.assetsRupiah),
        liabilitiesChangePercent: changePercent(currentStmt.liabilitiesRupiah, prevStmt.liabilitiesRupiah),
        equityChangePercent: changePercent(currentStmt.equityRupiah, prevStmt.equityRupiah),
        assetsRupiah: currentStmt.assetsRupiah - prevStmt.assetsRupiah,
        liabilitiesRupiah: currentStmt.liabilitiesRupiah - prevStmt.liabilitiesRupiah,
        equityRupiah: currentStmt.equityRupiah - prevStmt.equityRupiah,
      },
      note: current.formalStatementReady
        ? 'Balance Sheet Detail menambahkan perbandingan month-over-month. Klasifikasi sama dengan Balance Sheet utama.'
        : 'Balance Sheet belum siap formal. Detail hanya sebagai preview.',
    };
  }

}
