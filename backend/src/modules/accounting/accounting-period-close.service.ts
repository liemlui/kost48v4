import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingSchemaGuard } from './accounting-schema.guard';
import { PeriodClosePayloadDto, PeriodCloseQueryDto, PeriodReopenPayloadDto } from './dto/period-close.dto';

const RETAINED_EARNINGS_CODE = '3200';
const CLOSE_BASIS = 'PERIOD_CLOSE_RETAINED_EARNINGS_B8';
const REOPEN_BASIS = 'PERIOD_REOPEN_REVERSAL_B8';
const PNL_EXCLUDED_CLOSING_SOURCE_TYPES = ['CLOSING_ENTRY', 'CLOSING_REVERSAL'] as const;

type ClosingLine = {
  chartOfAccountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  description: string;
  debitRupiah: number;
  creditRupiah: number;
  sortOrder: number;
};

function rupiah(value?: number | null) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : 0;
}

function signedRupiah(value?: number | null) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function closeSourceIdFor(year: number, month: number, version = 1) {
  const key = `PERIOD_CLOSE:${monthKey(year, month)}`;
  return version <= 1 ? key : `${key}:V${version}`;
}

function reopenSourceIdFor(year: number, month: number, version = 1) {
  return `PERIOD_REOPEN:${monthKey(year, month)}:V${version}`;
}

function dateOnly(value: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function accountBalance(type: string, debit: number, credit: number) {
  if (type === 'ASSET' || type === 'EXPENSE' || type === 'COGS') return debit - credit;
  return credit - debit;
}

@Injectable()
export class AccountingPeriodCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: AccountingReportsService,
    private readonly schemaGuard: AccountingSchemaGuard,
    private readonly audit: AuditLogService,
  ) {}

  async readiness(query: PeriodCloseQueryDto) {
    await this.schemaGuard.assertReady();
    return this.buildReadiness(query.year, query.month);
  }

  async preview(dto: PeriodClosePayloadDto) {
    await this.schemaGuard.assertReady();
    const readiness = await this.buildReadiness(dto.year, dto.month);
    const preview = await this.buildClosingPreview(dto.year, dto.month);
    return {
      ...preview,
      readiness,
      canPost: readiness.canPost && preview.isBalanced,
      blockedReasons: [...readiness.blockedReasons, ...preview.blockedReasons],
      notes: dto.notes ?? null,
    };
  }

  async post(dto: PeriodClosePayloadDto, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const period = await tx.accountingPeriod.findUnique({ where: { year_month: { year: dto.year, month: dto.month } } });
      if (!period) throw new NotFoundException(`Accounting period ${monthKey(dto.year, dto.month)} belum dibuat.`);
      if (period.status !== 'OPEN') throw new BadRequestException(`Accounting period ${monthKey(dto.year, dto.month)} sudah ${period.status}.`);

      const closeVersion = Number(period.closeVersion ?? 0) + 1;
      const sourceId = closeSourceIdFor(dto.year, dto.month, closeVersion);
      const existing = await tx.journalEntry.findFirst({
        where: { sourceType: 'CLOSING_ENTRY' as any, sourceId, status: { not: 'VOID' as any } },
        select: { id: true, entryNumber: true, status: true },
      });
      if (existing) throw new ConflictException(`Periode ini sudah punya closing journal versi ini (${existing.entryNumber}).`);

      const readiness = await this.buildReadiness(dto.year, dto.month, tx);
      const preview = await this.buildClosingPreview(dto.year, dto.month, tx);
      const blockedReasons = [...readiness.blockedReasons, ...preview.blockedReasons];
      if (!readiness.canPost || !preview.isBalanced || blockedReasons.length) {
        throw new BadRequestException(`Tutup periode diblokir: ${blockedReasons.join(' | ')}`);
      }

      const journalData: any = {
        entryNumber: closeVersion <= 1 ? `JE-CLOSE-${monthKey(dto.year, dto.month)}` : `JE-CLOSE-${monthKey(dto.year, dto.month)}-V${closeVersion}`,
        entryDate: dateOnly(period.endDate),
        accountingPeriodId: period.id,
        status: 'POSTED' as any,
        sourceType: 'CLOSING_ENTRY' as any,
        sourceId,
        memo: dto.notes ? `Closing ${monthKey(dto.year, dto.month)}: ${dto.notes}` : `Closing retained earnings ${monthKey(dto.year, dto.month)}`,
        totalDebitRupiah: preview.totalDebitRupiah,
        totalCreditRupiah: preview.totalCreditRupiah,
        isBalanced: preview.isBalanced,
        createdById: user.id,
        postedById: user.id,
        postedAt: new Date(),
      };
      if (preview.lines.length) {
        journalData.lines = { create: preview.lines.map((line: ClosingLine) => ({
          chartOfAccountId: line.chartOfAccountId,
          description: line.description,
          debitRupiah: line.debitRupiah,
          creditRupiah: line.creditRupiah,
          sortOrder: line.sortOrder,
        })) };
      }

      const journal = await tx.journalEntry.create({ data: journalData });
      const closedPeriod = await tx.accountingPeriod.update({
        where: { id: period.id },
        data: {
          status: 'CLOSED' as any,
          closedAt: new Date(),
          closedById: user.id,
          closingJournalEntryId: journal.id,
          closingNote: dto.notes ?? null,
          closeBasis: CLOSE_BASIS,
          closeVersion,
        },
      });
      const freshJournal = await this.findJournalWithLines(tx, journal.id);

      return {
        basis: CLOSE_BASIS,
        posted: true,
        period: closedPeriod,
        journalEntry: freshJournal,
        preview,
        note: 'Periode berhasil ditutup. P&L operasional mengecualikan CLOSING_ENTRY/CLOSING_REVERSAL agar owner tidak melihat performa periode menjadi nol atau dobel.',
      };
    });
    await this.audit.log({
      actorUserId: user.id,
      action: 'PERIOD_CLOSE_POST',
      entityType: 'AccountingPeriod',
      entityId: String(result.period.id),
      newData: { period: result.period, journalEntryId: result.journalEntry?.id ?? null },
      meta: { basis: result.basis, year: dto.year, month: dto.month, notes: dto.notes ?? null },
    });
    return result;
  }

  async reopenPreview(dto: PeriodReopenPayloadDto) {
    await this.schemaGuard.assertReady();
    return this.buildReopenPreview(dto.year, dto.month, dto.reason);
  }

  async reopen(dto: PeriodReopenPayloadDto, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const preview = await this.buildReopenPreview(dto.year, dto.month, dto.reason, tx);
      if (!preview.canReopen || !preview.isBalanced || preview.blockedReasons.length) {
        throw new BadRequestException(`Buka ulang periode diblokir: ${preview.blockedReasons.join(' | ')}`);
      }
      const period = await tx.accountingPeriod.findUnique({ where: { year_month: { year: dto.year, month: dto.month } } });
      if (!period) throw new NotFoundException(`Accounting period ${monthKey(dto.year, dto.month)} belum dibuat.`);
      const reopenVersion = Number(period.reopenVersion ?? 0) + 1;
      const sourceId = reopenSourceIdFor(dto.year, dto.month, reopenVersion);
      const existing = await tx.journalEntry.findFirst({
        where: { sourceType: 'CLOSING_REVERSAL' as any, sourceId, status: { not: 'VOID' as any } },
        select: { id: true, entryNumber: true },
      });
      if (existing) throw new ConflictException(`Reopen journal versi ini sudah ada (${existing.entryNumber}).`);

      const journal = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-REOPEN-${monthKey(dto.year, dto.month)}-V${reopenVersion}`,
          entryDate: dateOnly(period.endDate),
          accountingPeriodId: period.id,
          status: 'POSTED' as any,
          sourceType: 'CLOSING_REVERSAL' as any,
          sourceId,
          memo: `Reopen ${monthKey(dto.year, dto.month)}: ${dto.reason}`,
          totalDebitRupiah: preview.totalDebitRupiah,
          totalCreditRupiah: preview.totalCreditRupiah,
          isBalanced: preview.isBalanced,
          createdById: user.id,
          postedById: user.id,
          postedAt: new Date(),
          lines: {
            create: preview.lines.map((line: ClosingLine) => ({
              chartOfAccountId: line.chartOfAccountId,
              description: line.description,
              debitRupiah: line.debitRupiah,
              creditRupiah: line.creditRupiah,
              sortOrder: line.sortOrder,
            })),
          },
        },
      });

      const reopenedPeriod = await tx.accountingPeriod.update({
        where: { id: period.id },
        data: {
          status: 'OPEN' as any,
          reopenedAt: new Date(),
          reopenedById: user.id,
          reopenJournalEntryId: journal.id,
          reopenReason: dto.reason,
          reopenVersion,
        },
      });
      const freshJournal = await this.findJournalWithLines(tx, journal.id);

      return {
        basis: REOPEN_BASIS,
        reopened: true,
        period: reopenedPeriod,
        journalEntry: freshJournal,
        preview,
        note: 'Periode dibuka ulang dengan jurnal reversal. Closing journal lama tidak dihapus agar audit trail tetap utuh.',
      };
    });
    await this.audit.log({
      actorUserId: user.id,
      action: 'PERIOD_REOPEN_POST',
      entityType: 'AccountingPeriod',
      entityId: String(result.period.id),
      newData: { period: result.period, journalEntryId: result.journalEntry?.id ?? null },
      meta: { basis: result.basis, year: dto.year, month: dto.month, reason: dto.reason },
    });
    return result;
  }

  private async buildReadiness(year: number, month: number, txOverride?: any) {
    const db = txOverride ?? (this.prisma as any);
    const period = await db.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
    if (!period) {
      return {
        basis: 'PERIOD_CLOSE_READINESS_B8',
        year,
        month,
        period: null,
        canPost: false,
        ready: false,
        blockedReasons: [`Accounting period ${monthKey(year, month)} belum dibuat.`],
        warnings: [],
        checks: [],
        profitLoss: null,
      };
    }

    const startDate = dateOnly(period.startDate);
    const endDate = dateOnly(period.endDate);
    const activeClose = period.status === 'CLOSED' && period.closingJournalEntryId
      ? await db.journalEntry.findUnique({ where: { id: period.closingJournalEntryId }, select: { id: true, entryNumber: true, status: true, sourceId: true } })
      : null;

    const [trial, retainedEarnings, draftJournals, unbalancedPosted, draftOpening, unmapped, depreciation, assetAlignment] = await Promise.all([
      txOverride ? this.trialBalanceFromDb(db, endDate) : this.reportsService.trialBalance({ asOf: endDate.toISOString().slice(0, 10) }),
      db.chartOfAccount.findFirst({ where: { code: RETAINED_EARNINGS_CODE, isActive: true } }),
      db.journalEntry.count({ where: { status: 'DRAFT' as any, entryDate: { gte: startDate, lte: endDate } } }),
      db.journalEntry.count({ where: { status: 'POSTED' as any, isBalanced: false, entryDate: { lte: endDate } } }),
      db.openingBalanceBatch.count({ where: { status: 'DRAFT' as any, OR: [{ accountingPeriodId: period.id }, { cutoverDate: { gte: startDate, lte: endDate } }] } }),
      this.unmappedOperationalCount(db, startDate, endDate),
      this.depreciationReadiness(db, year, month, endDate),
      this.assetAlignmentReadiness(db),
    ]);

    const preview = await this.buildClosingPreview(year, month, db);
    const checks = [
      { key: 'period-open', label: 'Accounting period OPEN', ready: period.status === 'OPEN', note: `Status sekarang: ${period.status}` },
      { key: 'not-actively-closed', label: 'Belum ada closing aktif', ready: !activeClose, note: activeClose ? `Periode sedang CLOSED oleh ${activeClose.entryNumber}` : period.reopenJournalEntryId ? 'Closing sebelumnya sudah di-reversal; periode bisa ditutup ulang.' : 'Belum pernah ditutup aktif.' },
      { key: 'trial-balance', label: 'Trial Balance balanced', ready: Boolean(trial?.isBalanced), note: `${rupiah(trial?.totalDebitRupiah)} debit / ${rupiah(trial?.totalCreditRupiah)} kredit` },
      { key: 'retained-earnings', label: 'COA Retained Earnings aktif', ready: Boolean(retainedEarnings), note: retainedEarnings ? `${retainedEarnings.code} ${retainedEarnings.name}` : 'COA 3200 belum ada/aktif.' },
      { key: 'draft-journals', label: 'Tidak ada draft journal periode ini', ready: draftJournals === 0, count: draftJournals, note: `${draftJournals} draft journal.` },
      { key: 'unbalanced-posted', label: 'Tidak ada posted journal tidak balance', ready: unbalancedPosted === 0, count: unbalancedPosted, note: `${unbalancedPosted} journal bermasalah.` },
      { key: 'draft-opening', label: 'Tidak ada draft opening balance periode ini', ready: draftOpening === 0, count: draftOpening, note: `${draftOpening} draft opening balance.` },
      { key: 'unmapped-operational', label: 'Transaksi operasional sudah terjurnal', ready: unmapped.total === 0, count: unmapped.total, note: `${unmapped.total} sample invoice/payment/expense/WiFi belum terjurnal.` },
      { key: 'depreciation', label: 'Depresiasi bulan ini aman', ready: depreciation.ready, count: depreciation.activeDepreciableAssetCount, note: depreciation.note },
      { key: 'asset-alignment', label: 'Asset ledger alignment aman', ready: assetAlignment.ready, count: assetAlignment.needsReviewCount, note: assetAlignment.note },
      { key: 'closing-preview', label: 'Preview closing journal balance', ready: preview.isBalanced, note: `${preview.lines.length} line, ${rupiah(preview.totalDebitRupiah)} debit / ${rupiah(preview.totalCreditRupiah)} kredit.` },
    ];

    const blockedReasons = checks.filter((check) => !check.ready).map((check) => check.note ? `${check.label}: ${check.note}` : check.label);
    const warnings: string[] = [];
    if (preview.netIncomeRupiah === 0) warnings.push('Net income periode ini 0. Sistem tetap bisa membuat zero closing journal untuk mengunci periode.');
    if (unmapped.depositSnapshotSampleCount > 0) warnings.push(`${unmapped.depositSnapshotSampleCount} deposit snapshot belum masuk DEPOSIT journal. Ini tidak otomatis memblokir close karena bisa berasal dari opening balance, tetapi owner perlu review.`);
    if (period.reopenJournalEntryId && period.status === 'OPEN') warnings.push('Periode ini pernah dibuka ulang. Re-close akan membuat closing journal versi berikutnya, bukan menghapus jurnal lama.');

    return {
      basis: 'PERIOD_CLOSE_READINESS_B8',
      year,
      month,
      period,
      ready: blockedReasons.length === 0,
      canPost: blockedReasons.length === 0,
      blockedReasons,
      warnings,
      checks,
      profitLoss: {
        revenueRupiah: preview.totals.revenueRupiah,
        cogsRupiah: preview.totals.cogsRupiah,
        expenseRupiah: preview.totals.expenseRupiah,
        netIncomeRupiah: preview.netIncomeRupiah,
      },
      supporting: {
        trialBalance: trial ? { totalDebitRupiah: trial.totalDebitRupiah, totalCreditRupiah: trial.totalCreditRupiah, isBalanced: trial.isBalanced, asOf: trial.asOf } : null,
        unmappedOperational: unmapped,
        depreciation,
        assetAlignment,
        closingJournal: activeClose,
      },
      note: 'Readiness B8 memblokir close jika period bukan OPEN, closing aktif masih ada, Trial Balance tidak balance, draft/unmapped critical masih ada, depresiasi/asset alignment belum aman, atau COA laba ditahan belum siap.',
    };
  }

  private async buildClosingPreview(year: number, month: number, txOverride?: any) {
    const db = txOverride ?? (this.prisma as any);
    const period = await db.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
    if (!period) throw new NotFoundException(`Accounting period ${monthKey(year, month)} belum dibuat.`);
    const startDate = dateOnly(period.startDate);
    const endDate = dateOnly(period.endDate);
    const closeVersion = Number(period.closeVersion ?? 0) + 1;
    const retainedEarnings = await db.chartOfAccount.findFirst({ where: { code: RETAINED_EARNINGS_CODE, isActive: true } });

    const accounts = await db.chartOfAccount.findMany({
      where: { type: { in: ['REVENUE', 'COGS', 'EXPENSE'] as any }, isActive: true },
      orderBy: { code: 'asc' },
    });
    const sums = await db.journalLine.groupBy({
      by: ['chartOfAccountId'],
      _sum: { debitRupiah: true, creditRupiah: true },
      where: {
        journalEntry: {
          status: 'POSTED' as any,
          sourceType: { notIn: PNL_EXCLUDED_CLOSING_SOURCE_TYPES as any },
          entryDate: { gte: startDate, lte: endDate },
        },
      },
    });
    const sumByAccount = new Map<number, { debit: number; credit: number }>();
    for (const row of sums) sumByAccount.set(row.chartOfAccountId, { debit: rupiah(row._sum.debitRupiah), credit: rupiah(row._sum.creditRupiah) });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpense = 0;
    const lines: ClosingLine[] = [];
    let sortOrder = 0;

    for (const account of accounts) {
      const sum = sumByAccount.get(account.id) ?? { debit: 0, credit: 0 };
      const balance = signedRupiah(accountBalance(String(account.type), sum.debit, sum.credit));
      if (String(account.type) === 'REVENUE') totalRevenue += balance;
      if (String(account.type) === 'COGS') totalCogs += balance;
      if (String(account.type) === 'EXPENSE') totalExpense += balance;
      if (balance === 0) continue;

      const closeWithDebit = (balance > 0 && String(account.type) === 'REVENUE') || (balance < 0 && String(account.type) !== 'REVENUE');
      const amount = Math.abs(balance);
      lines.push({
        chartOfAccountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        description: `Closing ${monthKey(year, month)} · ${account.code} ${account.name}`,
        debitRupiah: closeWithDebit ? amount : 0,
        creditRupiah: closeWithDebit ? 0 : amount,
        sortOrder: sortOrder++,
      });
    }

    const debitBeforeRetained = lines.reduce((sum, line) => sum + line.debitRupiah, 0);
    const creditBeforeRetained = lines.reduce((sum, line) => sum + line.creditRupiah, 0);
    const netIncome = totalRevenue - totalCogs - totalExpense;
    const retainedAmount = Math.abs(debitBeforeRetained - creditBeforeRetained);
    const blockedReasons: string[] = [];

    if (!retainedEarnings) blockedReasons.push('COA 3200 Retained Earnings belum tersedia/aktif.');
    else if (retainedAmount > 0) {
      const isProfit = debitBeforeRetained > creditBeforeRetained;
      lines.push({
        chartOfAccountId: retainedEarnings.id,
        accountCode: retainedEarnings.code,
        accountName: retainedEarnings.name,
        accountType: retainedEarnings.type,
        description: isProfit ? `Tutup laba bersih ${monthKey(year, month)} ke Retained Earnings` : `Tutup rugi bersih ${monthKey(year, month)} ke Retained Earnings`,
        debitRupiah: isProfit ? 0 : retainedAmount,
        creditRupiah: isProfit ? retainedAmount : 0,
        sortOrder: sortOrder++,
      });
    }

    const totalDebit = lines.reduce((sum, line) => sum + line.debitRupiah, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditRupiah, 0);

    return {
      basis: 'PERIOD_CLOSE_PREVIEW_B8',
      year,
      month,
      period: { id: period.id, year: period.year, month: period.month, status: period.status, startDate: period.startDate, endDate: period.endDate, closeVersion: period.closeVersion, reopenVersion: period.reopenVersion },
      sourceType: 'CLOSING_ENTRY',
      sourceId: closeSourceIdFor(year, month, closeVersion),
      entryNumber: closeVersion <= 1 ? `JE-CLOSE-${monthKey(year, month)}` : `JE-CLOSE-${monthKey(year, month)}-V${closeVersion}`,
      entryDate: dateOnly(period.endDate).toISOString().slice(0, 10),
      totals: { revenueRupiah: totalRevenue, cogsRupiah: totalCogs, expenseRupiah: totalExpense },
      netIncomeRupiah: netIncome,
      retainedEarningsAccount: retainedEarnings ? { id: retainedEarnings.id, code: retainedEarnings.code, name: retainedEarnings.name } : null,
      totalDebitRupiah: totalDebit,
      totalCreditRupiah: totalCredit,
      isBalanced: totalDebit === totalCredit,
      lines,
      blockedReasons: totalDebit === totalCredit ? blockedReasons : [...blockedReasons, `Preview tidak balance: debit ${totalDebit}, kredit ${totalCredit}.`],
      note: 'Preview mengecualikan CLOSING_ENTRY dan CLOSING_REVERSAL agar P&L operasional tetap terbaca saat periode ditutup, dibuka ulang, lalu ditutup lagi.',
    };
  }

  private async buildReopenPreview(year: number, month: number, reason: string, txOverride?: any) {
    const db = txOverride ?? (this.prisma as any);
    const period = await db.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
    if (!period) throw new NotFoundException(`Accounting period ${monthKey(year, month)} belum dibuat.`);
    const blockedReasons: string[] = [];
    const warnings: string[] = [];
    if (period.status !== 'CLOSED') blockedReasons.push(`Accounting period ${monthKey(year, month)} belum CLOSED. Status sekarang: ${period.status}.`);
    if (!String(reason ?? '').trim() || String(reason ?? '').trim().length < 8) blockedReasons.push('Alasan buka ulang minimal 8 karakter.');

    const laterClosedCount = await db.accountingPeriod.count({
      where: { status: 'CLOSED' as any, OR: [{ year: { gt: year } }, { year, month: { gt: month } }] },
    });
    if (laterClosedCount > 0) blockedReasons.push(`${laterClosedCount} periode setelah ${monthKey(year, month)} sudah CLOSED. B8 tidak mendukung cascading reopen.`);

    const closingJournal = period.closingJournalEntryId
      ? await db.journalEntry.findUnique({
          where: { id: period.closingJournalEntryId },
          include: {
            accountingPeriod: true,
            lines: {
              orderBy: { sortOrder: 'asc' },
              include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } } },
            },
          },
        })
      : null;
    if (!closingJournal) blockedReasons.push('Closing journal aktif tidak ditemukan pada AccountingPeriod.');
    else {
      if (closingJournal.status !== 'POSTED') blockedReasons.push(`Closing journal ${closingJournal.entryNumber} bukan POSTED.`);
      if (closingJournal.sourceType !== 'CLOSING_ENTRY') blockedReasons.push(`Journal ${closingJournal.entryNumber} bukan CLOSING_ENTRY.`);
      if (!closingJournal.isBalanced) blockedReasons.push(`Closing journal ${closingJournal.entryNumber} tidak balanced.`);
      if (!closingJournal.lines?.length) warnings.push('Closing journal tidak punya line. Reopen akan membuat reversal kosong dan hanya membuka status periode.');
    }

    const reopenVersion = Number(period.reopenVersion ?? 0) + 1;
    const lines: ClosingLine[] = (closingJournal?.lines ?? []).map((line: any, index: number) => ({
      chartOfAccountId: line.chartOfAccountId,
      accountCode: line.chartOfAccount?.code ?? String(line.chartOfAccountId),
      accountName: line.chartOfAccount?.name ?? 'Account',
      accountType: line.chartOfAccount?.type ?? 'UNKNOWN',
      description: `Reversal reopen ${monthKey(year, month)} · ${line.chartOfAccount?.code ?? line.chartOfAccountId} ${line.chartOfAccount?.name ?? ''}`.trim(),
      debitRupiah: rupiah(line.creditRupiah),
      creditRupiah: rupiah(line.debitRupiah),
      sortOrder: index,
    }));
    const totalDebit = lines.reduce((sum, line) => sum + line.debitRupiah, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditRupiah, 0);
    const isBalanced = totalDebit === totalCredit;
    if (!isBalanced) blockedReasons.push(`Preview reversal tidak balance: debit ${totalDebit}, kredit ${totalCredit}.`);

    return {
      basis: 'PERIOD_REOPEN_PREVIEW_B8',
      year,
      month,
      period,
      sourceType: 'CLOSING_REVERSAL',
      sourceId: reopenSourceIdFor(year, month, reopenVersion),
      entryNumber: `JE-REOPEN-${monthKey(year, month)}-V${reopenVersion}`,
      entryDate: dateOnly(period.endDate).toISOString().slice(0, 10),
      closingJournalEntry: closingJournal ? { id: closingJournal.id, entryNumber: closingJournal.entryNumber, sourceId: closingJournal.sourceId, totalDebitRupiah: closingJournal.totalDebitRupiah, totalCreditRupiah: closingJournal.totalCreditRupiah, postedAt: closingJournal.postedAt } : null,
      totalDebitRupiah: totalDebit,
      totalCreditRupiah: totalCredit,
      isBalanced,
      lines,
      blockedReasons,
      warnings,
      canReopen: blockedReasons.length === 0,
      reason,
      note: 'Preview reopen membuat jurnal CLOSING_REVERSAL yang membalik jurnal closing aktif. Jurnal closing lama tidak dihapus.',
    };
  }

  private async unmappedOperationalCount(db: any, startDate: Date, endDate: Date) {
    const [mappedInvoices, mappedPayments, mappedExpenses, mappedWifiSales, mappedDeposits] = await Promise.all([
      this.mappedSourceIds(db, 'INVOICE'),
      this.mappedSourceIds(db, 'INVOICE_PAYMENT'),
      this.mappedSourceIds(db, 'EXPENSE'),
      this.mappedSourceIds(db, 'WIFI_SALE'),
      this.mappedSourceIds(db, 'DEPOSIT'),
    ]);
    const [invoiceCount, paymentCount, expenseCount, wifiSaleCount, depositCount] = await Promise.all([
      db.invoice.count({ where: { status: { notIn: ['DRAFT', 'CANCELLED'] as any }, id: { notIn: mappedInvoices }, OR: [{ issuedAt: { gte: startDate, lte: endDate } }, { issuedAt: null, createdAt: { gte: startDate, lte: endDate } }] } }),
      db.invoicePayment.count({ where: { id: { notIn: mappedPayments }, paymentDate: { gte: startDate, lte: endDate } } }),
      db.expense.count({ where: { id: { notIn: mappedExpenses }, expenseDate: { gte: startDate, lte: endDate } } }),
      db.wifiSale.count({ where: { id: { notIn: mappedWifiSales }, saleDate: { gte: startDate, lte: endDate } } }),
      db.stay.count({ where: { depositPaidAmountRupiah: { gt: 0 }, id: { notIn: mappedDeposits }, createdAt: { lte: endDate } } }),
    ]);
    const total = invoiceCount + paymentCount + expenseCount + wifiSaleCount;
    return { invoiceSampleCount: invoiceCount, invoicePaymentSampleCount: paymentCount, expenseSampleCount: expenseCount, wifiSaleSampleCount: wifiSaleCount, depositSnapshotSampleCount: depositCount, total };
  }

  private async mappedSourceIds(db: any, sourceType: string) {
    const entries = await db.journalEntry.findMany({ where: { sourceType: sourceType as any, status: 'POSTED' as any }, select: { sourceId: true } });
    return entries.map((entry: any) => Number(entry.sourceId)).filter((id: number) => Number.isInteger(id) && id > 0);
  }

  private async depreciationReadiness(db: any, year: number, month: number, endDate: Date) {
    const activeDepreciableAssetCount = await db.fixedAsset.count({ where: { depreciationEnabled: true, status: { in: ['ACTIVE', 'FULLY_DEPRECIATED'] as any }, depreciationStartDate: { lte: endDate } } });
    if (activeDepreciableAssetCount === 0) return { ready: true, activeDepreciableAssetCount, postedRun: null, note: 'Tidak ada aset aktif yang membutuhkan depresiasi bulan ini.' };
    const postedRun = await db.assetDepreciationRun.findUnique({
      where: { periodYear_periodMonth: { periodYear: year, periodMonth: month } },
      select: { id: true, runNumber: true, status: true, totalDepreciationRupiah: true, journalEntryId: true, postedAt: true },
    });
    const ready = Boolean(postedRun && postedRun.status === 'POSTED' && postedRun.journalEntryId);
    return { ready, activeDepreciableAssetCount, postedRun, note: ready ? `Depresiasi ${postedRun.runNumber} sudah POSTED dan punya journal.` : `${activeDepreciableAssetCount} aset membutuhkan depresiasi, tetapi run POSTED + journal bulan ini belum lengkap.` };
  }

  private async assetAlignmentReadiness(db: any) {
    const needsReviewCount = await db.fixedAsset.count({ where: { ledgerAlignmentStatus: 'NEEDS_REVIEW' as any } });
    return { ready: needsReviewCount === 0, needsReviewCount, note: needsReviewCount === 0 ? 'Semua asset ledger alignment aman atau tidak diperlukan.' : `${needsReviewCount} aset masih NEEDS_REVIEW untuk ledger alignment.` };
  }

  private async trialBalanceFromDb(db: any, asOfInput: Date) {
    const asOf = new Date(asOfInput.getTime());
    asOf.setUTCHours(23, 59, 59, 999);
    const accounts = await db.chartOfAccount.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
    const journalSums = await db.journalLine.groupBy({ by: ['chartOfAccountId'], _sum: { debitRupiah: true, creditRupiah: true }, where: { journalEntry: { status: 'POSTED' as any, entryDate: { lte: asOf } } } });
    const sums = new Map<number, { debit: number; credit: number }>();
    for (const row of journalSums) sums.set(row.chartOfAccountId, { debit: rupiah(row._sum.debitRupiah), credit: rupiah(row._sum.creditRupiah) });
    let totalDebit = 0;
    let totalCredit = 0;
    const lines = accounts.map((account: any) => {
      const sum = sums.get(account.id) ?? { debit: 0, credit: 0 };
      totalDebit += sum.debit;
      totalCredit += sum.credit;
      return { accountId: account.id, code: account.code, name: account.name, type: account.type, normalBalance: account.normalBalance, debitRupiah: sum.debit, creditRupiah: sum.credit, balanceRupiah: accountBalance(String(account.type), sum.debit, sum.credit) };
    });
    return { asOf: asOf.toISOString().slice(0, 10), totalDebitRupiah: totalDebit, totalCreditRupiah: totalCredit, isBalanced: totalDebit === totalCredit, lines };
  }

  private async findJournalWithLines(db: any, id: number) {
    return db.journalEntry.findUnique({
      where: { id },
      include: {
        accountingPeriod: true,
        lines: {
          include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
