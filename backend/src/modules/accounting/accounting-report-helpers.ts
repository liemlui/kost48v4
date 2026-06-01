import { PrismaService } from '../../prisma/prisma.service';
import { AccountingSchemaGuard } from './accounting-schema.guard';
import { TrialBalanceQueryDto } from './dto/journal-entry.dto';

export function formatJournalEntry(entry: any) {
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

export async function mappedSourceIds(prisma: PrismaService, sourceType: string) {
  const rows = await (prisma as any).journalEntry.findMany({
    where: { sourceType: sourceType as any, sourceId: { not: null }, status: 'POSTED' as any },
    select: { sourceId: true },
  });
  return rows.map((row: any) => Number(row.sourceId)).filter((id: number) => Number.isFinite(id));
}

export async function depositLedgerBreakdown(prisma: PrismaService, depositAccountId: number | null) {
  if (!depositAccountId) return [];
  const [journalLines, openingJournalSourceIds] = await Promise.all([
    (prisma as any).journalLine.findMany({
      where: { chartOfAccountId: depositAccountId, journalEntry: { status: 'POSTED' as any } },
      include: { journalEntry: { select: { id: true, entryNumber: true, sourceType: true, sourceId: true, memo: true, entryDate: true } } },
      orderBy: { id: 'asc' },
    }),
    mappedSourceIds(prisma, 'OPENING_BALANCE'),
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

  const openingFallback = await (prisma as any).openingBalanceLine.findMany({
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

export async function buildDepositReconciliationSnapshot(prisma: PrismaService, schemaGuard: AccountingSchemaGuard, limit = 25) {
  await schemaGuard.assertReady();
  const depositAccount = await (prisma as any).chartOfAccount.findFirst({
    where: { code: '2000', isActive: true },
    select: { id: true, code: true, name: true, type: true },
  });

  const [operationalAgg, settledAgg, operationalStays, mappedDepositIds] = await Promise.all([
    (prisma as any).stay.aggregate({
      _sum: { depositAmountRupiah: true, depositPaidAmountRupiah: true },
      _count: { id: true },
      where: { depositAmountRupiah: { gt: 0 } },
    }),
    (prisma as any).stay.aggregate({
      _sum: { depositDeductionRupiah: true, depositRefundedRupiah: true },
      where: { depositAmountRupiah: { gt: 0 }, depositStatus: { in: ['REFUNDED', 'FORFEITED', 'PARTIALLY_REFUNDED'] as any } },
    }),
    (prisma as any).stay.findMany({
      where: { OR: [{ depositAmountRupiah: { gt: 0 } }, { depositPaidAmountRupiah: { gt: 0 } }] },
      select: {
        id: true, tenantId: true, roomId: true, status: true,
        depositAmountRupiah: true, depositPaidAmountRupiah: true,
        depositPaymentStatus: true, depositStatus: true,
        depositDeductionRupiah: true, depositRefundedRupiah: true, createdAt: true,
        tenant: { select: { fullName: true } },
        room: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    mappedSourceIds(prisma, 'DEPOSIT'),
  ]);

  const mappedDepositSet = new Set(mappedDepositIds);
  const operationalPaid = Number(operationalAgg._sum.depositPaidAmountRupiah ?? 0);
  const refunded = Number(settledAgg._sum.depositRefundedRupiah ?? 0);
  const deducted = Number(settledAgg._sum.depositDeductionRupiah ?? 0);
  const operationalHeld = Math.max(operationalPaid - refunded - deducted, 0);

  const ledgerBreakdown = await depositLedgerBreakdown(prisma, depositAccount?.id ?? null);
  const ledgerDebit = ledgerBreakdown.reduce((sum: number, row: any) => sum + Number(row.debitRupiah ?? 0), 0);
  const ledgerCredit = ledgerBreakdown.reduce((sum: number, row: any) => sum + Number(row.creditRupiah ?? 0), 0);
  const ledgerLiability = Math.max(ledgerCredit - ledgerDebit, 0);
  const difference = ledgerLiability - operationalHeld;
  const openingBalanceRupiah = ledgerBreakdown.filter((row: any) => row.sourceType === 'OPENING_BALANCE' || row.sourceType === 'OPENING_BALANCE_FALLBACK').reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);
  const depositAutoJournalRupiah = ledgerBreakdown.filter((row: any) => row.sourceType === 'DEPOSIT').reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);
  const adjustmentRupiah = ledgerBreakdown.filter((row: any) => row.sourceType === 'ADJUSTMENT').reduce((sum: number, row: any) => sum + Number(row.liabilityRupiah ?? 0), 0);

  const differenceDirection = difference === 0 ? 'MATCHED' : difference > 0 ? 'LEDGER_HIGHER_THAN_OPERATIONAL' : 'OPERATIONAL_HIGHER_THAN_LEDGER';
  const candidateActions: Array<{ key: string; label: string; severity: string; action: string; note: string }> = [];
  const warnings: string[] = [];
  let status = 'MATCHED';
  let explanation = 'Deposit ledger dan operational deposit sudah matched.';

  if (difference > 0) {
    status = openingBalanceRupiah >= difference ? 'OPENING_BALANCE_ONLY' : 'NEEDS_REVIEW';
    explanation = openingBalanceRupiah >= difference
      ? 'Ledger deposit lebih tinggi karena saldo awal/opening balance. Ini belum tentu error; jangan backfill deposit operasional jika depositPaid masih 0.'
      : 'Ledger deposit lebih tinggi daripada operational held dan tidak seluruhnya dijelaskan oleh opening balance. Perlu review manual sebelum adjustment.';
    candidateActions.push({ key: 'DISCLOSE_OPENING_BALANCE_DEPOSIT', label: 'Disclosure saldo awal deposit', severity: openingBalanceRupiah >= difference ? 'info' : 'warning', action: 'Jangan membuat DEPOSIT journal tambahan sampai sumber opening balance/divergence dipastikan.', note: explanation });
    warnings.push(`Ledger deposit lebih tinggi ${difference.toLocaleString('id-ID')} dari operational held.`);
  } else if (difference < 0) {
    status = 'OPERATIONAL_HIGHER_THAN_LEDGER';
    explanation = 'Operational paid deposit lebih tinggi daripada ledger liability. Deposit backfill dry-run dapat mencari kandidat yang aman.';
    candidateActions.push({ key: 'RUN_DEPOSIT_BACKFILL_DRY_RUN', label: 'Dry-run backfill deposit', severity: 'warning', action: 'Owner boleh menjalankan dry-run. Execute journal hanya setelah candidate source jelas dan tidak double-post.', note: 'Backfill hanya untuk stay dengan depositPaidAmountRupiah > 0 yang belum punya DEPOSIT journal.' });
    warnings.push(`Operational deposit lebih tinggi ${Math.abs(difference).toLocaleString('id-ID')} dari ledger liability.`);
  } else {
    candidateActions.push({ key: 'NO_ACTION_REQUIRED', label: 'Tidak perlu action', severity: 'success', action: 'Tidak ada backfill/adjustment deposit yang diperlukan.', note: explanation });
  }

  const formattedOperationalStays = operationalStays.map((stay: any) => {
    const paid = Number(stay.depositPaidAmountRupiah ?? 0);
    const refund = Number(stay.depositRefundedRupiah ?? 0);
    const deduction = Number(stay.depositDeductionRupiah ?? 0);
    return {
      stayId: stay.id, tenantId: stay.tenantId, tenantName: stay.tenant?.fullName ?? null,
      roomId: stay.roomId, roomCode: stay.room?.code ?? null, status: stay.status,
      depositAmountRupiah: Number(stay.depositAmountRupiah ?? 0),
      depositPaidRupiah: paid, depositRefundedRupiah: refund, depositDeductedRupiah: deduction,
      depositHeldRupiah: Math.max(paid - refund - deduction, 0),
      depositPaymentStatus: stay.depositPaymentStatus, depositStatus: stay.depositStatus,
      hasDepositJournal: mappedDepositSet.has(stay.id),
      backfillCandidate: paid > 0 && !mappedDepositSet.has(stay.id),
    };
  });

  return {
    account: depositAccount,
    operational: { stayCount: Number(operationalAgg._count?.id ?? 0), depositAmountRupiah: Number(operationalAgg._sum.depositAmountRupiah ?? 0), depositPaidRupiah: operationalPaid, depositRefundedRupiah: refunded, depositDeductedRupiah: deducted, depositHeldRupiah: operationalHeld },
    ledger: { debitRupiah: ledgerDebit, creditRupiah: ledgerCredit, liabilityRupiah: ledgerLiability },
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

export async function assetRegisterDisclosure(prisma: PrismaService, grossFixedAssets: number, accumulatedDepreciation: number, netFixedAssets: number) {
  try {
    const [assetAgg, assetCount] = await Promise.all([
      (prisma as any).fixedAsset.aggregate({ _sum: { acquisitionCostRupiah: true, accumulatedDepreciationRupiah: true } }),
      (prisma as any).fixedAsset.count(),
    ]);
    const registerAcquisitionCost = Number(assetAgg?._sum?.acquisitionCostRupiah ?? 0);
    const registerAccumulatedDepreciation = Number(assetAgg?._sum?.accumulatedDepreciationRupiah ?? 0);
    const registerNetBookValue = Math.max(registerAcquisitionCost - registerAccumulatedDepreciation, 0);
    return {
      basis: 'ASSET_REGISTER_DISCLOSURE_B5',
      assetCount,
      registerAcquisitionCostRupiah: registerAcquisitionCost,
      registerAccumulatedDepreciationRupiah: registerAccumulatedDepreciation,
      registerNetBookValueRupiah: registerNetBookValue,
      ledgerGrossFixedAssetsRupiah: grossFixedAssets,
      ledgerAccumulatedDepreciationRupiah: accumulatedDepreciation,
      ledgerNetFixedAssetsRupiah: netFixedAssets,
      registerVsLedgerNetDifferenceRupiah: registerNetBookValue - netFixedAssets,
      aligned: registerNetBookValue === netFixedAssets,
      warning: registerNetBookValue === netFixedAssets ? 'Asset register dan ledger fixed asset sudah selaras.' : 'Asset register adalah disclosure operasional. Untuk Balance Sheet formal, nilai perolehan aset harus masuk ledger Fixed Assets melalui opening balance/adjustment yang terkontrol, bukan acquisition journal otomatis.',
    };
  } catch {
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

export async function resolveProfitLossPeriod(prisma: PrismaService, query: TrialBalanceQueryDto = {}) {
  const baseDate = query.asOf ? new Date(query.asOf) : new Date();
  baseDate.setUTCHours(0, 0, 0, 0);
  let period: any = null;
  if (query.year && query.month) {
    period = await (prisma as any).accountingPeriod.findUnique({ where: { year_month: { year: query.year, month: query.month } } });
    const startDate = period ? new Date(period.startDate) : new Date(Date.UTC(query.year, query.month - 1, 1));
    const endDate = period ? new Date(period.endDate) : new Date(Date.UTC(query.year, query.month, 0));
    endDate.setUTCHours(23, 59, 59, 999);
    return { year: query.year, month: query.month, key: `${query.year}-${String(query.month).padStart(2, '0')}`, startDate, endDate, accountingPeriod: period };
  }
  period = await (prisma as any).accountingPeriod.findFirst({
    where: { startDate: { lte: baseDate }, endDate: { gte: baseDate } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  if (period) {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    endDate.setUTCHours(23, 59, 59, 999);
    return { year: period.year, month: period.month, key: `${period.year}-${String(period.month).padStart(2, '0')}`, startDate, endDate, accountingPeriod: period };
  }
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth() + 1;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));
  endDate.setUTCHours(23, 59, 59, 999);
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}`, startDate, endDate, accountingPeriod: null };
}
