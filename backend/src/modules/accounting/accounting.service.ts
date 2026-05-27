import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { DEFAULT_COA } from './constants/default-coa';
import { AccountingAccountsQueryDto, CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto/accounting-account.dto';
import { CashAccountsQueryDto, CreateCashAccountDto, UpdateCashAccountDto } from './dto/cash-account.dto';
import { AccountingPeriodsQueryDto, CreateAccountingPeriodDto, UpdateAccountingPeriodDto } from './dto/accounting-period.dto';
import { CreateOpeningBalanceDraftDto, OpeningBalancesQueryDto } from './dto/opening-balance.dto';
import { CreateJournalDraftDto, JournalEntriesQueryDto } from './dto/journal-entry.dto';
import { AccountingSchemaGuard } from './accounting-schema.guard';

function rupiah(value?: number | null) {
  return Math.max(0, Number(value ?? 0));
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function dateOnly(value: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isDateBetweenInclusive(value: Date, start: Date, end: Date) {
  const target = dateOnly(value).getTime();
  return target >= dateOnly(start).getTime() && target <= dateOnly(end).getTime();
}

function isPrismaUniqueError(error: unknown, field?: string) {
  const candidate = error as { code?: string; meta?: { target?: string[] | string } };
  if (candidate?.code !== 'P2002') return false;
  if (!field) return true;
  const target = candidate.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? '').includes(field);
}

function periodLabel(period: { year: number; month: number }) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schemaGuard: AccountingSchemaGuard,
  ) {}

  async seedDefaultCoa() {
    await this.schemaGuard.assertReady();
    const results = await (this.prisma as any).$transaction(async (tx: any) => {
      const rows = [] as Array<{ id: number; code: string; name: string; createdOrUpdated: 'UPSERTED' }>;
      for (const account of DEFAULT_COA) {
        const row = await tx.chartOfAccount.upsert({
          where: { code: account.code },
          create: {
            code: account.code,
            name: account.name,
            type: account.type as any,
            normalBalance: account.normalBalance as any,
            description: account.description,
            isSystemDefault: true,
            isActive: true,
          },
          update: {
            name: account.name,
            type: account.type as any,
            normalBalance: account.normalBalance as any,
            description: account.description,
            isSystemDefault: true,
            isActive: true,
          },
        });
        rows.push({ id: row.id, code: row.code, name: row.name, createdOrUpdated: 'UPSERTED' });
      }
      return rows;
    });
    return {
      seededCount: results.length,
      accounts: results,
      note: 'Default COA idempotent dan diproses dalam satu transaksi. Deposit liability tersedia sebagai akun liability dan ledger siap dipakai oleh posting accounting.',
    };
  }

  async listAccounts(query: AccountingAccountsQueryDto = {}) {
    await this.schemaGuard.assertReady();
    return (this.prisma as any).chartOfAccount.findMany({
      where: {
        ...(query.type ? { type: query.type as any } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? { OR: [{ code: { contains: query.search, mode: 'insensitive' as any } }, { name: { contains: query.search, mode: 'insensitive' as any } }] }
          : {}),
      },
      orderBy: [{ code: 'asc' }],
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
  }

  async createAccount(dto: CreateChartOfAccountDto) {
    await this.schemaGuard.assertReady();
    if (dto.parentId) await this.ensureAccount(dto.parentId);
    return (this.prisma as any).chartOfAccount.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        type: dto.type as any,
        normalBalance: dto.normalBalance as any,
        description: dto.description,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAccount(id: number, dto: UpdateChartOfAccountDto) {
    await this.schemaGuard.assertReady();
    await this.ensureAccount(id);
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('Akun tidak boleh menjadi parent dirinya sendiri.');
      await this.ensureAccount(dto.parentId);
    }
    return (this.prisma as any).chartOfAccount.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type as any } : {}),
        ...(dto.normalBalance !== undefined ? { normalBalance: dto.normalBalance as any } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async listCashAccounts(query: CashAccountsQueryDto = {}) {
    await this.schemaGuard.assertReady();
    return (this.prisma as any).cashAccount.findMany({
      where: {
        ...(query.accountType ? { accountType: query.accountType as any } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as any } }, { bankName: { contains: query.search, mode: 'insensitive' as any } }] }
          : {}),
      },
      include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createCashAccount(dto: CreateCashAccountDto) {
    await this.schemaGuard.assertReady();
    const coa = await this.ensureAccount(dto.chartOfAccountId);
    if (coa.type !== 'ASSET') throw new BadRequestException('Cash account harus terhubung ke COA bertipe ASSET.');
    try {
      return await (this.prisma as any).$transaction(async (tx: any) => {
        if (dto.isDefault) await tx.cashAccount.updateMany({ data: { isDefault: false } });
        return tx.cashAccount.create({
          data: {
            name: dto.name.trim(),
            accountType: (dto.accountType ?? 'BANK') as any,
            chartOfAccountId: dto.chartOfAccountId,
            bankName: dto.bankName,
            accountNumberMasked: dto.accountNumberMasked,
            holderName: dto.holderName,
            openingBalanceRupiah: dto.openingBalanceRupiah ?? 0,
            currentBalanceRupiah: dto.currentBalanceRupiah ?? dto.openingBalanceRupiah ?? 0,
            isDefault: dto.isDefault ?? false,
            isActive: dto.isActive ?? true,
            notes: dto.notes,
          },
        });
      });
    } catch (error) {
      if (isPrismaUniqueError(error, 'name')) {
        throw new ConflictException(`Cash/bank account "${dto.name.trim()}" sudah ada. Gunakan nama lain atau edit akun yang tersedia.`);
      }
      throw error;
    }
  }

  async updateCashAccount(id: number, dto: UpdateCashAccountDto) {
    await this.schemaGuard.assertReady();
    await this.ensureCashAccount(id);
    if (dto.chartOfAccountId) {
      const coa = await this.ensureAccount(dto.chartOfAccountId);
      if (coa.type !== 'ASSET') throw new BadRequestException('Cash account harus terhubung ke COA bertipe ASSET.');
    }
    return (this.prisma as any).$transaction(async (tx: any) => {
      if (dto.isDefault) await tx.cashAccount.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      return tx.cashAccount.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.accountType !== undefined ? { accountType: dto.accountType as any } : {}),
          ...(dto.chartOfAccountId !== undefined ? { chartOfAccountId: dto.chartOfAccountId } : {}),
          ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
          ...(dto.accountNumberMasked !== undefined ? { accountNumberMasked: dto.accountNumberMasked } : {}),
          ...(dto.holderName !== undefined ? { holderName: dto.holderName } : {}),
          ...(dto.openingBalanceRupiah !== undefined ? { openingBalanceRupiah: dto.openingBalanceRupiah } : {}),
          ...(dto.currentBalanceRupiah !== undefined ? { currentBalanceRupiah: dto.currentBalanceRupiah } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
    });
  }

  async listPeriods(query: AccountingPeriodsQueryDto = {}) {
    await this.schemaGuard.assertReady();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const periods = await (this.prisma as any).accountingPeriod.findMany({
      where: {
        ...(query.year ? { year: query.year } : {}),
        ...(query.month ? { month: query.month } : {}),
        ...(query.status ? { status: query.status as any } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return Promise.all(periods.map(async (period: any) => {
      const [postedJournalCount, draftJournalCount, closingJournalCount, reversalJournalCount] = await Promise.all([
        (this.prisma as any).journalEntry.count({ where: { accountingPeriodId: period.id, status: 'POSTED' as any } }),
        (this.prisma as any).journalEntry.count({ where: { accountingPeriodId: period.id, status: 'DRAFT' as any } }),
        (this.prisma as any).journalEntry.count({ where: { accountingPeriodId: period.id, status: 'POSTED' as any, sourceType: 'CLOSING_ENTRY' as any } }),
        (this.prisma as any).journalEntry.count({ where: { accountingPeriodId: period.id, status: 'POSTED' as any, sourceType: 'CLOSING_REVERSAL' as any } }),
      ]);
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      const isCurrentPostingPeriod = start <= today && today <= end;
      const key = `${period.year}-${String(period.month).padStart(2, '0')}`;
      const isPostingOpen = isCurrentPostingPeriod && period.status === 'OPEN';
      return {
        ...period,
        key,
        periodKey: key,
        isCurrentPostingPeriod,
        isPostingOpen,
        postedJournalCount,
        draftJournalCount,
        closingJournalCount,
        reversalJournalCount,
        statusNarrative: isCurrentPostingPeriod && period.status !== 'OPEN'
          ? `Periode posting berjalan ${key} sudah ${period.status}. Tagihan baru akan diblokir sampai Owner membuka ulang periode atau memakai workflow adjustment yang sah.`
          : period.status === 'OPEN'
            ? `Periode ${key} masih OPEN untuk posting yang sah.`
            : `Periode ${key} berstatus ${period.status}.`,
        ownerAction: isCurrentPostingPeriod && period.status !== 'OPEN'
          ? 'OWNER_REOPEN_REQUIRED_FOR_NEW_POSTING'
          : period.status === 'OPEN'
            ? 'REVIEW_BEFORE_CLOSE'
            : 'READ_ONLY_HISTORY',
      };
    }));
  }

  async getPeriodById(id: number) {
    await this.schemaGuard.assertReady();
    const period = await (this.prisma as any).accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Accounting period tidak ditemukan.');
    return period;
  }

  async createPeriod(dto: CreateAccountingPeriodDto) {
    await this.schemaGuard.assertReady();
    const range = monthRange(dto.year, dto.month);
    try {
      return await (this.prisma as any).accountingPeriod.create({
        data: {
          year: dto.year,
          month: dto.month,
          startDate: dto.startDate ? new Date(dto.startDate) : range.start,
          endDate: dto.endDate ? new Date(dto.endDate) : range.end,
          status: (dto.status ?? 'OPEN') as any,
          notes: dto.notes,
        },
      });
    } catch (error) {
      if (isPrismaUniqueError(error, 'year') || isPrismaUniqueError(error, 'month')) {
        throw new ConflictException(`Accounting period ${dto.year}-${String(dto.month).padStart(2, '0')} sudah ada. Gunakan periode yang tersedia.`);
      }
      throw error;
    }
  }

  async updatePeriod(id: number, dto: UpdateAccountingPeriodDto) {
    await this.schemaGuard.assertReady();
    const row = await (this.prisma as any).accountingPeriod.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Accounting period tidak ditemukan.');
    if (dto.status !== undefined && dto.status !== row.status) {
      throw new BadRequestException('Status accounting period tidak boleh diubah manual. Gunakan workflow Tutup Periode atau Buka Ulang agar jurnal closing/reversal tetap auditable.');
    }
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      throw new BadRequestException('Tanggal accounting period tidak boleh diedit manual setelah periode dibuat. Buat periode baru atau gunakan workflow koreksi yang auditable.');
    }
    if (dto.notes === undefined) {
      throw new BadRequestException('Tidak ada field yang bisa diperbarui. Hanya catatan internal period yang boleh diubah manual.');
    }
    return (this.prisma as any).accountingPeriod.update({
      where: { id },
      data: { notes: dto.notes },
    });
  }

  async listOpeningBalances(query: OpeningBalancesQueryDto = {}) {
    await this.schemaGuard.assertReady();
    return (this.prisma as any).openingBalanceBatch.findMany({
      where: { ...(query.status ? { status: query.status as any } : {}) },
      include: {
        accountingPeriod: true,
        lines: { include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } } }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createOpeningBalanceDraft(dto: CreateOpeningBalanceDraftDto, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();
    if (!dto.lines?.length || dto.lines.length < 2) throw new BadRequestException('Opening balance membutuhkan minimal dua line.');

    const cutoverDate = dateOnly(dto.cutoverDate);
    const existingForCutover = await (this.prisma as any).openingBalanceBatch.findFirst({
      where: {
        status: { in: ['DRAFT', 'POSTED'] as any },
        OR: [
          ...(dto.accountingPeriodId ? [{ accountingPeriodId: dto.accountingPeriodId }] : []),
          { cutoverDate },
        ],
      },
      select: { id: true, batchNumber: true, status: true },
    });
    if (existingForCutover?.status === 'POSTED') {
      throw new ConflictException(`Opening balance untuk periode/cutover ini sudah POSTED (${existingForCutover.batchNumber}). Draft baru tidak dibuat agar saldo awal tidak dobel.`);
    }
    if (existingForCutover?.status === 'DRAFT') {
      throw new ConflictException(`Masih ada draft opening balance untuk periode/cutover ini (${existingForCutover.batchNumber}). Posting atau batalkan draft tersebut sebelum membuat draft baru.`);
    }

    await this.ensureLinesAccounts(dto.lines.map((line) => line.chartOfAccountId));
    const totalDebit = dto.lines.reduce((sum, line) => sum + rupiah(line.debitRupiah), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + rupiah(line.creditRupiah), 0);
    const invalid = dto.lines.find((line) => rupiah(line.debitRupiah) > 0 && rupiah(line.creditRupiah) > 0);
    if (invalid) throw new BadRequestException('Satu opening balance line tidak boleh debit dan kredit sekaligus.');
    const batchNumber = dto.batchNumber?.trim() || `OB-${Date.now()}`;

    try {
      return await (this.prisma as any).openingBalanceBatch.create({
        data: {
          batchNumber,
          accountingPeriodId: dto.accountingPeriodId,
          cutoverDate,
          notes: dto.notes,
          totalDebitRupiah: totalDebit,
          totalCreditRupiah: totalCredit,
          createdById: user.id,
          status: 'DRAFT' as any,
          lines: {
            create: dto.lines.map((line, index) => ({
              chartOfAccountId: line.chartOfAccountId,
              description: line.description,
              debitRupiah: rupiah(line.debitRupiah),
              creditRupiah: rupiah(line.creditRupiah),
              sortOrder: line.sortOrder ?? index,
            })),
          },
        },
        include: { lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      if (isPrismaUniqueError(error, 'batchNumber')) {
        throw new ConflictException(`Nomor batch opening balance ${batchNumber} sudah ada. Buat draft baru dengan nomor batch lain.`);
      }
      throw error;
    }
  }


  async getOpeningBalance(id: number) {
    await this.schemaGuard.assertReady();
    const row = await (this.prisma as any).openingBalanceBatch.findUnique({
      where: { id },
      include: {
        accountingPeriod: true,
        lines: { include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true, isActive: true } } }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Opening balance tidak ditemukan.');
    return row;
  }


  async voidOpeningBalance(id: number, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();
    const row = await (this.prisma as any).openingBalanceBatch.findUnique({
      where: { id },
      include: { lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Opening balance tidak ditemukan.');
    if (row.status !== 'DRAFT') throw new BadRequestException('Hanya draft opening balance yang bisa dibatalkan. Opening balance POSTED membutuhkan reversal plan terpisah.');

    return (this.prisma as any).openingBalanceBatch.update({
      where: { id },
      data: {
        status: 'VOID' as any,
        notes: [row.notes, `Draft dibatalkan oleh user #${user.id} pada ${new Date().toISOString()}`].filter(Boolean).join('\\n'),
      },
      include: {
        accountingPeriod: true,
        lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async postOpeningBalance(id: number, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();

    return (this.prisma as any).$transaction(async (tx: any) => {
      const batch = await tx.openingBalanceBatch.findUnique({
        where: { id },
        include: {
          accountingPeriod: true,
          lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!batch) throw new NotFoundException('Opening balance tidak ditemukan.');
      if (batch.status !== 'DRAFT') throw new BadRequestException('Hanya opening balance DRAFT yang bisa diposting.');
      if (!batch.accountingPeriodId || !batch.accountingPeriod) throw new BadRequestException('Opening balance harus terhubung ke accounting period sebelum diposting.');
      if (batch.accountingPeriod.status !== 'OPEN') throw new BadRequestException('Accounting period harus OPEN untuk posting opening balance.');
      if (!isDateBetweenInclusive(batch.cutoverDate, batch.accountingPeriod.startDate, batch.accountingPeriod.endDate)) {
        throw new BadRequestException('Cutover date harus berada di dalam rentang accounting period.');
      }
      if (!batch.lines || batch.lines.length < 2) throw new BadRequestException('Opening balance minimal membutuhkan dua line sebelum diposting.');

      const totalDebit = batch.lines.reduce((sum: number, line: any) => sum + rupiah(line.debitRupiah), 0);
      const totalCredit = batch.lines.reduce((sum: number, line: any) => sum + rupiah(line.creditRupiah), 0);
      if (totalDebit <= 0 || totalCredit <= 0) throw new BadRequestException('Opening balance harus memiliki nilai debit dan kredit lebih dari 0.');
      if (totalDebit !== totalCredit) throw new BadRequestException('Opening balance belum balance. Total debit harus sama dengan total kredit sebelum posting.');

      const invalidLine = batch.lines.find((line: any) => {
        const debit = rupiah(line.debitRupiah);
        const credit = rupiah(line.creditRupiah);
        return (debit > 0 && credit > 0) || (debit === 0 && credit === 0) || !line.chartOfAccount?.isActive;
      });
      if (invalidLine) throw new BadRequestException('Setiap line harus memakai COA aktif dan hanya salah satu sisi debit/kredit yang bernilai.');

      const otherPosted = await tx.openingBalanceBatch.findFirst({
        where: {
          id: { not: id },
          status: 'POSTED' as any,
          OR: [
            { accountingPeriodId: batch.accountingPeriodId },
            { cutoverDate: batch.cutoverDate },
          ],
        },
        select: { id: true, batchNumber: true },
      });
      if (otherPosted) {
        throw new BadRequestException(`Opening balance lain sudah POSTED untuk period/cutover ini (${otherPosted.batchNumber}). Void dulu jika memang perlu koreksi.`);
      }

      const existingJournal = await tx.journalEntry.findFirst({
        where: { sourceType: 'OPENING_BALANCE' as any, sourceId: String(batch.id), status: { not: 'VOID' as any } },
        select: { id: true, entryNumber: true },
      });
      if (existingJournal) throw new BadRequestException(`Opening balance ini sudah memiliki journal pembuka (${existingJournal.entryNumber}).`);

      const entryNumber = `JE-OPENING-${batch.id}`;
      const journal = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: batch.cutoverDate,
          accountingPeriodId: batch.accountingPeriodId,
          status: 'POSTED' as any,
          sourceType: 'OPENING_BALANCE' as any,
          sourceId: String(batch.id),
          memo: batch.notes ? `Jurnal pembuka: ${batch.notes}` : `Jurnal pembuka ${batch.batchNumber}`,
          totalDebitRupiah: totalDebit,
          totalCreditRupiah: totalCredit,
          isBalanced: true,
          createdById: batch.createdById ?? user.id,
          postedById: user.id,
          postedAt: new Date(),
          lines: {
            create: batch.lines.map((line: any, index: number) => ({
              chartOfAccountId: line.chartOfAccountId,
              description: line.description || `Opening balance ${batch.batchNumber}`,
              debitRupiah: rupiah(line.debitRupiah),
              creditRupiah: rupiah(line.creditRupiah),
              sortOrder: line.sortOrder ?? index,
            })),
          },
        },
        include: { lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } } },
      });

      const updatedBatch = await tx.openingBalanceBatch.update({
        where: { id },
        data: {
          status: 'POSTED' as any,
          totalDebitRupiah: totalDebit,
          totalCreditRupiah: totalCredit,
          postedById: user.id,
          postedAt: new Date(),
        },
        include: {
          accountingPeriod: true,
          lines: { include: { chartOfAccount: true }, orderBy: { sortOrder: 'asc' } },
        },
      });

      return {
        openingBalance: updatedBatch,
        journalEntry: journal,
        note: 'Opening balance berhasil diposting sebagai JournalEntry OPENING_BALANCE. Ledger pembuka siap menjadi dasar Trial Balance dan Neraca.',
      };
    });
  }

  async listJournalEntries(query: JournalEntriesQueryDto = {}) {
    await this.schemaGuard.assertReady();
    return (this.prisma as any).journalEntry.findMany({
      where: {
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.sourceType ? { sourceType: query.sourceType as any } : {}),
        ...(query.from || query.to ? { entryDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      },
      include: {
        accountingPeriod: true,
        lines: { include: { chartOfAccount: { select: { id: true, code: true, name: true, type: true, normalBalance: true } }, cashAccount: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async createJournalDraft(dto: CreateJournalDraftDto, user: CurrentUserPayload) {
    await this.schemaGuard.assertReady();
    if (!dto.lines?.length || dto.lines.length < 2) throw new BadRequestException('Journal draft minimal membutuhkan dua line.');
    await this.assertPeriodOpenForDraft(dto.entryDate, dto.accountingPeriodId);
    await this.ensureLinesAccounts(dto.lines.map((line) => line.chartOfAccountId));
    const cashIds = dto.lines.map((line) => line.cashAccountId).filter((id): id is number => Boolean(id));
    for (const id of cashIds) await this.ensureCashAccount(id);
    const totalDebit = dto.lines.reduce((sum, line) => sum + rupiah(line.debitRupiah), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + rupiah(line.creditRupiah), 0);
    const invalid = dto.lines.find((line) => rupiah(line.debitRupiah) > 0 && rupiah(line.creditRupiah) > 0);
    if (invalid) throw new BadRequestException('Satu journal line tidak boleh debit dan kredit sekaligus.');
    const entryNumber = dto.entryNumber?.trim() || `JE-${Date.now()}`;

    return (this.prisma as any).journalEntry.create({
      data: {
        entryNumber,
        entryDate: new Date(dto.entryDate),
        accountingPeriodId: dto.accountingPeriodId,
        status: 'DRAFT' as any,
        sourceType: (dto.sourceType ?? 'MANUAL') as any,
        sourceId: dto.sourceId,
        memo: dto.memo,
        totalDebitRupiah: totalDebit,
        totalCreditRupiah: totalCredit,
        isBalanced: totalDebit === totalCredit,
        createdById: user.id,
        lines: {
          create: dto.lines.map((line, index) => ({
            chartOfAccountId: line.chartOfAccountId,
            cashAccountId: line.cashAccountId,
            description: line.description,
            debitRupiah: rupiah(line.debitRupiah),
            creditRupiah: rupiah(line.creditRupiah),
            sortOrder: line.sortOrder ?? index,
          })),
        },
      },
      include: { lines: { include: { chartOfAccount: true, cashAccount: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  private async assertPeriodOpenForDraft(entryDateInput: string, accountingPeriodId?: number) {
    const entryDate = dateOnly(entryDateInput);
    const period = accountingPeriodId
      ? await (this.prisma as any).accountingPeriod.findUnique({ where: { id: accountingPeriodId } })
      : await (this.prisma as any).accountingPeriod.findFirst({
          where: { startDate: { lte: entryDate }, endDate: { gte: entryDate } },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
    if (!period) return;
    if (!isDateBetweenInclusive(entryDate, period.startDate, period.endDate)) {
      throw new BadRequestException(`Tanggal jurnal tidak masuk rentang accounting period ${periodLabel(period)}.`);
    }
    if (period.status !== 'OPEN') {
      throw new BadRequestException(`Periode ${periodLabel(period)} sudah ${period.status}. Buat correction lewat Buka Ulang Periode atau adjustment periode berjalan, bukan draft langsung ke periode tertutup.`);
    }
  }

  private async ensureAccount(id: number) {
    const row = await (this.prisma as any).chartOfAccount.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Chart of Account tidak ditemukan.');
    return row;
  }

  private async ensureCashAccount(id: number) {
    const row = await (this.prisma as any).cashAccount.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cash account tidak ditemukan.');
    return row;
  }

  private async ensureLinesAccounts(ids: number[]) {
    const unique = [...new Set(ids)];
    const rows = await (this.prisma as any).chartOfAccount.findMany({ where: { id: { in: unique } }, select: { id: true, isActive: true } });
    if (rows.length !== unique.length) throw new BadRequestException('Ada COA line yang tidak ditemukan.');
    if (rows.some((row: any) => !row.isActive)) throw new BadRequestException('Semua COA line harus aktif.');
  }
}
