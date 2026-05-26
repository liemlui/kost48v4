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
      note: 'Scanner ini menunjukkan transaksi operasional yang belum punya JournalEntry POSTED. B3.3 mulai memproses deposit received yang sudah lunas; reversal invoice cancel muncul sebagai ADJUSTMENT.',
    };
  }


  async recentJournals(query: { sourceTypes?: string; limit?: number } = {}) {
    await this.schemaGuard.assertReady();
    const allowedSourceTypes = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'ADJUSTMENT', 'DEPRECIATION', 'OPENING_BALANCE', 'MANUAL'];
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
    const assetRegisterDisclosure = await this.assetRegisterDisclosure(grossFixedAssets, accumulatedDepreciation, netFixedAssets);

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
      assetRegisterDisclosure,
      readinessNote: guarded
        ? 'Balance Sheet Lite guarded: pastikan accounting readiness siap dan Trial Balance balanced sebelum membaca laporan sebagai statement formal.'
        : balanced
          ? 'Balance Sheet Lite siap dibaca. Current profit/loss masih ditampilkan sebagai komponen ekuitas sementara sampai closing retained earnings dibuat.'
          : 'Balance Sheet Lite belum balance. Review journal dan P&L sebelum dipakai sebagai laporan formal.',
    };
  }


  private async assetRegisterDisclosure(grossFixedAssets: number, accumulatedDepreciation: number, netFixedAssets: number) {
    try {
      const [assetAgg, assetCount] = await Promise.all([
        (this.prisma as any).fixedAsset.aggregate({
          _sum: { acquisitionCostRupiah: true, accumulatedDepreciationRupiah: true },
        }),
        (this.prisma as any).fixedAsset.count(),
      ]);
      const registerAcquisitionCost = Number(assetAgg?._sum?.acquisitionCostRupiah ?? 0);
      const registerAccumulatedDepreciation = Number(assetAgg?._sum?.accumulatedDepreciationRupiah ?? 0);
      const registerNetBookValue = Math.max(registerAcquisitionCost - registerAccumulatedDepreciation, 0);
      const ledgerNetFixedAssets = netFixedAssets;

      return {
        basis: 'ASSET_REGISTER_DISCLOSURE_B5',
        assetCount,
        registerAcquisitionCostRupiah: registerAcquisitionCost,
        registerAccumulatedDepreciationRupiah: registerAccumulatedDepreciation,
        registerNetBookValueRupiah: registerNetBookValue,
        ledgerGrossFixedAssetsRupiah: grossFixedAssets,
        ledgerAccumulatedDepreciationRupiah: accumulatedDepreciation,
        ledgerNetFixedAssetsRupiah: ledgerNetFixedAssets,
        registerVsLedgerNetDifferenceRupiah: registerNetBookValue - ledgerNetFixedAssets,
        aligned: registerNetBookValue === ledgerNetFixedAssets,
        warning: registerNetBookValue === ledgerNetFixedAssets
          ? 'Asset register dan ledger fixed asset sudah selaras.'
          : 'Asset register adalah disclosure operasional. Untuk Balance Sheet formal, nilai perolehan aset harus masuk ledger Fixed Assets melalui opening balance/adjustment yang terkontrol, bukan acquisition journal otomatis.',
      };
    } catch (error) {
      return {
        basis: 'ASSET_REGISTER_DISCLOSURE_B5',
        assetCount: 0,
        registerAcquisitionCostRupiah: 0,
        registerAccumulatedDepreciationRupiah: 0,
        registerNetBookValueRupiah: 0,
        ledgerGrossFixedAssetsRupiah: grossFixedAssets,
        ledgerAccumulatedDepreciationRupiah: accumulatedDepreciation,
        ledgerNetFixedAssetsRupiah: netFixedAssets,
        registerVsLedgerNetDifferenceRupiah: 0 - netFixedAssets,
        aligned: false,
        warning: 'Asset register belum bisa dibaca untuk disclosure. Balance Sheet tetap memakai ledger sebagai source of truth.',
      };
    }
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
    const snapshot = await this.buildDepositReconciliationSnapshot(25);
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
    const snapshot = await this.buildDepositReconciliationSnapshot(25);
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

  private async buildDepositReconciliationSnapshot(limit = 25) {
    await this.schemaGuard.assertReady();
    const depositAccount = await (this.prisma as any).chartOfAccount.findFirst({
      where: { code: '2000', isActive: true },
      select: { id: true, code: true, name: true, type: true },
    });

    const [operationalAgg, settledAgg, operationalStays, mappedDepositIds] = await Promise.all([
      (this.prisma as any).stay.aggregate({
        _sum: { depositAmountRupiah: true, depositPaidAmountRupiah: true },
        _count: { id: true },
        where: { depositAmountRupiah: { gt: 0 } },
      }),
      (this.prisma as any).stay.aggregate({
        _sum: { depositDeductionRupiah: true, depositRefundedRupiah: true },
        where: { depositAmountRupiah: { gt: 0 }, depositStatus: { in: ['REFUNDED', 'FORFEITED', 'PARTIALLY_REFUNDED'] as any } },
      }),
      (this.prisma as any).stay.findMany({
        where: { OR: [{ depositAmountRupiah: { gt: 0 } }, { depositPaidAmountRupiah: { gt: 0 } }] },
        select: {
          id: true,
          tenantId: true,
          roomId: true,
          status: true,
          depositAmountRupiah: true,
          depositPaidAmountRupiah: true,
          depositPaymentStatus: true,
          depositStatus: true,
          depositDeductionRupiah: true,
          depositRefundedRupiah: true,
          createdAt: true,
          tenant: { select: { fullName: true } },
          room: { select: { code: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      this.mappedSourceIds('DEPOSIT'),
    ]);

    const mappedDepositSet = new Set(mappedDepositIds);
    const operationalPaid = Number(operationalAgg._sum.depositPaidAmountRupiah ?? 0);
    const refunded = Number(settledAgg._sum.depositRefundedRupiah ?? 0);
    const deducted = Number(settledAgg._sum.depositDeductionRupiah ?? 0);
    const operationalHeld = Math.max(operationalPaid - refunded - deducted, 0);

    const ledgerBreakdown = await this.depositLedgerBreakdown(depositAccount?.id ?? null);
    const ledgerDebit = ledgerBreakdown.reduce((sum: number, row: any) => sum + Number(row.debitRupiah ?? 0), 0);
    const ledgerCredit = ledgerBreakdown.reduce((sum: number, row: any) => sum + Number(row.creditRupiah ?? 0), 0);
    const ledgerLiability = Math.max(ledgerCredit - ledgerDebit, 0);
    const difference = ledgerLiability - operationalHeld;
    const openingBalanceRupiah = ledgerBreakdown
      .filter((row: any) => row.sourceType === 'OPENING_BALANCE' || row.sourceType === 'OPENING_BALANCE_FALLBACK')
      .reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);
    const depositAutoJournalRupiah = ledgerBreakdown
      .filter((row: any) => row.sourceType === 'DEPOSIT')
      .reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);
    const adjustmentRupiah = ledgerBreakdown
      .filter((row: any) => row.sourceType === 'ADJUSTMENT')
      .reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);

    const differenceDirection = difference === 0
      ? 'MATCHED'
      : difference > 0
        ? 'LEDGER_HIGHER_THAN_OPERATIONAL'
        : 'OPERATIONAL_HIGHER_THAN_LEDGER';

    const candidateActions: Array<{ key: string; label: string; severity: string; action: string; note: string }> = [];
    const warnings: string[] = [];
    let status = 'MATCHED';
    let explanation = 'Deposit ledger dan operational deposit sudah matched.';

    if (difference > 0) {
      status = openingBalanceRupiah >= difference ? 'OPENING_BALANCE_ONLY' : 'NEEDS_REVIEW';
      explanation = openingBalanceRupiah >= difference
        ? 'Ledger deposit lebih tinggi karena saldo awal/opening balance. Ini belum tentu error; jangan backfill deposit operasional jika depositPaid masih 0.'
        : 'Ledger deposit lebih tinggi daripada operational held dan tidak seluruhnya dijelaskan oleh opening balance. Perlu review manual sebelum adjustment.';
      candidateActions.push({
        key: 'DISCLOSE_OPENING_BALANCE_DEPOSIT',
        label: 'Disclosure saldo awal deposit',
        severity: openingBalanceRupiah >= difference ? 'info' : 'warning',
        action: 'Jangan membuat DEPOSIT journal tambahan sampai sumber opening balance/divergence dipastikan.',
        note: explanation,
      });
      warnings.push(`Ledger deposit lebih tinggi ${difference.toLocaleString('id-ID')} dari operational held.`);
    } else if (difference < 0) {
      status = 'OPERATIONAL_HIGHER_THAN_LEDGER';
      explanation = 'Operational paid deposit lebih tinggi daripada ledger liability. Deposit backfill dry-run dapat mencari kandidat yang aman.';
      candidateActions.push({
        key: 'RUN_DEPOSIT_BACKFILL_DRY_RUN',
        label: 'Dry-run backfill deposit',
        severity: 'warning',
        action: 'Owner boleh menjalankan dry-run. Execute journal hanya setelah candidate source jelas dan tidak double-post.',
        note: 'Backfill hanya untuk stay dengan depositPaidAmountRupiah > 0 yang belum punya DEPOSIT journal.',
      });
      warnings.push(`Operational deposit lebih tinggi ${Math.abs(difference).toLocaleString('id-ID')} dari ledger liability.`);
    } else {
      candidateActions.push({
        key: 'NO_ACTION_REQUIRED',
        label: 'Tidak perlu action',
        severity: 'success',
        action: 'Tidak ada backfill/adjustment deposit yang diperlukan.',
        note: explanation,
      });
    }

    const formattedOperationalStays = operationalStays.map((stay: any) => {
      const paid = Number(stay.depositPaidAmountRupiah ?? 0);
      const refund = Number(stay.depositRefundedRupiah ?? 0);
      const deduction = Number(stay.depositDeductionRupiah ?? 0);
      return {
        stayId: stay.id,
        tenantId: stay.tenantId,
        tenantName: stay.tenant?.fullName ?? null,
        roomId: stay.roomId,
        roomCode: stay.room?.code ?? null,
        status: stay.status,
        depositAmountRupiah: Number(stay.depositAmountRupiah ?? 0),
        depositPaidRupiah: paid,
        depositRefundedRupiah: refund,
        depositDeductedRupiah: deduction,
        depositHeldRupiah: Math.max(paid - refund - deduction, 0),
        depositPaymentStatus: stay.depositPaymentStatus,
        depositStatus: stay.depositStatus,
        hasDepositJournal: mappedDepositSet.has(stay.id),
        backfillCandidate: paid > 0 && !mappedDepositSet.has(stay.id),
      };
    });

    return {
      account: depositAccount,
      operational: {
        stayCount: Number(operationalAgg._count?.id ?? 0),
        depositAmountRupiah: Number(operationalAgg._sum.depositAmountRupiah ?? 0),
        depositPaidRupiah: operationalPaid,
        depositRefundedRupiah: refunded,
        depositDeductedRupiah: deducted,
        depositHeldRupiah: operationalHeld,
      },
      ledger: {
        debitRupiah: ledgerDebit,
        creditRupiah: ledgerCredit,
        liabilityRupiah: ledgerLiability,
      },
      ledgerBreakdownSummary: { openingBalanceRupiah, depositAutoJournalRupiah, adjustmentRupiah },
      ledgerBreakdown,
      operationalStays: formattedOperationalStays,
      differenceRupiah: difference,
      reconciliation: { status, differenceDirection },
      candidateActions,
      warnings,
      explanation,
    };
  }

  private async depositLedgerBreakdown(depositAccountId: number | null) {
    if (!depositAccountId) return [];
    const [journalLines, openingJournalSourceIds] = await Promise.all([
      (this.prisma as any).journalLine.findMany({
        where: { chartOfAccountId: depositAccountId, journalEntry: { status: 'POSTED' as any } },
        include: { journalEntry: { select: { id: true, entryNumber: true, sourceType: true, sourceId: true, memo: true, entryDate: true } } },
        orderBy: { id: 'asc' },
      }),
      this.mappedSourceIds('OPENING_BALANCE'),
    ]);

    const buckets = new Map<string, any>();
    const push = (sourceType: string, debit: number, credit: number, entry?: any) => {
      const current = buckets.get(sourceType) ?? { sourceType, debitRupiah: 0, creditRupiah: 0, liabilityRupiah: 0, sourceCount: 0, sampleEntries: [] };
      current.debitRupiah += debit;
      current.creditRupiah += credit;
      current.liabilityRupiah = Math.max(current.creditRupiah - current.debitRupiah, 0);
      if (entry && current.sampleEntries.length < 10) current.sampleEntries.push(entry);
      current.sourceCount += entry ? 1 : 0;
      buckets.set(sourceType, current);
    };

    for (const line of journalLines) {
      push(String(line.journalEntry?.sourceType ?? 'UNKNOWN'), Number(line.debitRupiah ?? 0), Number(line.creditRupiah ?? 0), {
        id: line.journalEntry?.id,
        entryNumber: line.journalEntry?.entryNumber,
        sourceType: line.journalEntry?.sourceType,
        sourceId: line.journalEntry?.sourceId,
        memo: line.journalEntry?.memo,
        entryDate: line.journalEntry?.entryDate,
        debitRupiah: Number(line.debitRupiah ?? 0),
        creditRupiah: Number(line.creditRupiah ?? 0),
      });
    }

    const openingFallback = await (this.prisma as any).openingBalanceLine.findMany({
      where: {
        chartOfAccountId: depositAccountId,
        batch: { status: 'POSTED' as any, id: { notIn: openingJournalSourceIds } },
      },
      include: { batch: { select: { id: true, batchNumber: true, cutoverDate: true, notes: true } } },
      orderBy: { id: 'asc' },
    });
    for (const line of openingFallback) {
      push('OPENING_BALANCE_FALLBACK', Number(line.debitRupiah ?? 0), Number(line.creditRupiah ?? 0), {
        id: line.batch?.id,
        entryNumber: line.batch?.batchNumber,
        sourceType: 'OPENING_BALANCE_FALLBACK',
        sourceId: String(line.batch?.id ?? ''),
        memo: line.description ?? line.batch?.notes ?? 'Opening balance fallback',
        entryDate: line.batch?.cutoverDate,
        debitRupiah: Number(line.debitRupiah ?? 0),
        creditRupiah: Number(line.creditRupiah ?? 0),
      });
    }

    return Array.from(buckets.values()).sort((a: any, b: any) => String(a.sourceType).localeCompare(String(b.sourceType)));
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
