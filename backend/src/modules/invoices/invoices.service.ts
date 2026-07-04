import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CancelInvoiceDto, CreateInvoiceDto, CreateInvoiceLineDto, CreateInvoiceWithLinesAndIssueDto, UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { InvoiceLineType, InvoiceStatus, UserRole, UtilityType } from '../../common/enums/app.enums';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { AccountingReadinessResult, AccountingReadinessService } from '../accounting/accounting-readiness.service';

type InvoiceAccountingPostingStatus = 'POSTED' | 'ALREADY_POSTED' | 'SKIPPED_ACCOUNTING_NOT_READY';

type InvoiceAccountingPostingMetadata = {
  accountingPosted: boolean;
  accountingJournalEntryId: number | null;
  accountingPostingStatus: InvoiceAccountingPostingStatus;
  accountingWarning: string | null;
  accountingReason: string | null;
  formalStatementReady: boolean;
};

type InvoicePostingResult = {
  posted?: boolean;
  skipped?: boolean;
  reason?: string;
  journalEntry?: { id?: number | null; entryNumber?: string | null } | null;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly accountingReadiness: AccountingReadinessService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Normalization & Accounting Helpers
  // ═══════════════════════════════════════════════════════════

  private numeric(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeInvoiceTotals<T extends { totalAmountRupiah?: number | null; paidAmountRupiah?: number | null; lines?: Array<{ lineAmountRupiah?: number | null }>; payments?: Array<{ amountRupiah?: number | null }> }>(invoice: T): T {
    const lineTotal = (invoice.lines ?? []).reduce((sum, line) => sum + this.numeric(line.lineAmountRupiah), 0);
    const storedTotal = this.numeric(invoice.totalAmountRupiah);
    const paymentTotal = (invoice.payments ?? []).reduce((sum, payment) => sum + this.numeric(payment.amountRupiah), 0);
    return {
      ...invoice,
      totalAmountRupiah: storedTotal > 0 ? storedTotal : lineTotal,
      paidAmountRupiah: paymentTotal,
    };
  }

  private normalizeInvoiceList<T extends { totalAmountRupiah?: number | null; paidAmountRupiah?: number | null; lines?: Array<{ lineAmountRupiah?: number | null }>; payments?: Array<{ amountRupiah?: number | null }> }>(items: T[]): T[] {
    return items.map((item) => this.normalizeInvoiceTotals(item));
  }

  private shouldAttemptInvoiceAccountingPosting(readiness: AccountingReadinessResult) {
    return readiness.schemaStatus?.ready !== false;
  }

  private buildSkippedAccountingMetadata(readiness: AccountingReadinessResult, reason: string): InvoiceAccountingPostingMetadata {
    return {
      accountingPosted: false,
      accountingJournalEntryId: null,
      accountingPostingStatus: 'SKIPPED_ACCOUNTING_NOT_READY',
      accountingWarning: `Tagihan sudah diterbitkan, tetapi jurnal accounting belum dibuat: ${reason}`,
      accountingReason: reason,
      formalStatementReady: Boolean(readiness.formalStatementReady),
    };
  }

  private isAccountingSetupSkipReason(reason: string) {
    const normalized = reason.toLowerCase();
    return [
      'coa ',
      'accounts receivable',
      'cash/bank',
      'accounting period',
      'tidak ada accounting period',
      'periode ',
      'belum tersedia',
    ].some((term) => normalized.includes(term));
  }

  private isInvariantPostingSkipReason(reason: string) {
    const normalized = reason.toLowerCase();
    return [
      'invoice tidak ditemukan',
      'belum punya line',
      'invoice total 0',
      'journal line kurang',
      'debit dan kredit sekaligus',
      'journal tidak balance',
      'status draft',
      'status cancelled',
      'sudah closed',
      'sudah ditutup',
      'workflow reopen',
    ].some((term) => normalized.includes(term));
  }

  private resolveInvoiceAccountingMetadata(
    postingResult: InvoicePostingResult | null | undefined,
    readiness: AccountingReadinessResult,
  ): InvoiceAccountingPostingMetadata {
    if (postingResult?.posted) {
      return {
        accountingPosted: true,
        accountingJournalEntryId: postingResult.journalEntry?.id ?? null,
        accountingPostingStatus: 'POSTED',
        accountingWarning: null,
        accountingReason: null,
        formalStatementReady: Boolean(readiness.formalStatementReady),
      };
    }

    if (postingResult?.skipped && postingResult.journalEntry?.id) {
      return {
        accountingPosted: true,
        accountingJournalEntryId: postingResult.journalEntry.id,
        accountingPostingStatus: 'ALREADY_POSTED',
        accountingWarning: null,
        accountingReason: postingResult.reason ?? null,
        formalStatementReady: Boolean(readiness.formalStatementReady),
      };
    }

    const reason = postingResult?.reason ?? 'Accounting posting tidak mengembalikan hasil journal yang valid.';
    const setupSkip = this.isAccountingSetupSkipReason(reason);
    const invariantSkip = this.isInvariantPostingSkipReason(reason);

    if (readiness.formalStatementReady || invariantSkip || !setupSkip) {
      throw new ConflictException(`Tagihan gagal diterbitkan ke accounting: ${reason}`);
    }

    return this.buildSkippedAccountingMetadata(readiness, reason);
  }

  private attachAccountingMetadata<T extends Record<string, unknown>>(
    invoice: T,
    accounting: InvoiceAccountingPostingMetadata,
  ): T & { accounting: InvoiceAccountingPostingMetadata } {
    return { ...invoice, accounting };
  }

  private assertFinanceMutationAllowed(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Hanya OWNER/ADMIN yang boleh mengubah data invoice finance');
    }
  }

  private assertValidInvoicePeriod(periodStart: string | Date, periodEnd: string | Date) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ConflictException('Periode invoice tidak valid');
    }
    if (end <= start) {
      throw new ConflictException('Tanggal akhir periode harus setelah tanggal mulai periode.');
    }
  }

  private buildLineData(invoiceId: number, dto: CreateInvoiceLineDto, sortOrderFallback = 0): Prisma.InvoiceLineCreateInput {
    const qtyDecimal = new Prisma.Decimal(dto.qty);
    if (qtyDecimal.lte(0)) {
      throw new ConflictException('Qty invoice harus lebih dari 0');
    }
    const unitPriceRupiah = Number(dto.unitPriceRupiah ?? 0);
    if (!Number.isFinite(unitPriceRupiah) || unitPriceRupiah < 0) {
      throw new ConflictException('Harga satuan invoice tidak valid');
    }
    const lineAmountRupiah = qtyDecimal.times(unitPriceRupiah).toNumber();
    return {
      invoice: { connect: { id: invoiceId } },
      lineType: dto.lineType as InvoiceLineType,
      utilityType: dto.utilityType as UtilityType,
      description: dto.description,
      qty: qtyDecimal,
      unit: dto.unit,
      unitPriceRupiah,
      lineAmountRupiah,
      sortOrder: dto.sortOrder ?? sortOrderFallback,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Query Methods
  // ═══════════════════════════════════════════════════════════

  async findAll(query: InvoicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.InvoiceWhereInput = {
      AND: [
        query.search ? { invoiceNumber: { contains: query.search, mode: Prisma.QueryMode.insensitive } } : undefined,
        // Validasi stayId: hanya tambah filter jika stayId valid (bukan undefined/null/NaN)
        query.stayId && !isNaN(Number(query.stayId)) ? { stayId: Number(query.stayId) } : undefined,
        query.status ? { status: query.status } : undefined,
        query.periodStartFrom || query.periodEndTo ? { periodStart: { gte: query.periodStartFrom ? new Date(query.periodStartFrom) : undefined }, periodEnd: { lte: query.periodEndTo ? new Date(query.periodEndTo) : undefined } } : undefined,
        query.dueDateFrom || query.dueDateTo ? { dueDate: { gte: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined, lte: query.dueDateTo ? new Date(query.dueDateTo) : undefined } } : undefined,
      ].filter(Boolean),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, skip, take, include: { lines: { orderBy: { sortOrder: 'asc' } }, payments: true, stay: { include: { tenant: true, room: true } } }, orderBy: { id: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items: serializePrismaResult(this.normalizeInvoiceList(items)), meta: buildMeta(page, limit, totalItems) };
  }

  async findMine(user: CurrentUserPayload, query: InvoicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.InvoiceWhereInput = {
      AND: [
        { stay: { tenantId: user.tenantId ?? -1 } },
        query.status ? { status: query.status } : undefined,
        query.periodStartFrom || query.periodEndTo
          ? {
              periodStart: { gte: query.periodStartFrom ? new Date(query.periodStartFrom) : undefined },
              periodEnd: { lte: query.periodEndTo ? new Date(query.periodEndTo) : undefined },
            }
          : undefined,
        query.dueDateFrom || query.dueDateTo
          ? {
              dueDate: {
                gte: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
                lte: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
              },
            }
          : undefined,
      ].filter(Boolean),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { lines: { orderBy: { sortOrder: 'asc' } }, payments: true },
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: serializePrismaResult(this.normalizeInvoiceList(items)),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  async findOne(id: number, user: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ 
      where: { id }, 
      include: { 
        lines: { orderBy: { sortOrder: 'asc' } }, 
        payments: true, 
        stay: {
          include: {
            tenant: true,
            room: true,
          },
        },
      } 
    });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (user.role === 'TENANT' && invoice.stay.tenantId !== user.tenantId) throw new NotFoundException('Invoice tidak ditemukan');
    return this.normalizeInvoiceTotals(invoice);
  }

  async create(dto: CreateInvoiceDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const stay = await this.prisma.stay.findUnique({ where: { id: dto.stayId } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    this.assertValidInvoicePeriod(dto.periodStart, dto.periodEnd);
    const existingNumber = await this.prisma.invoice.findUnique({ where: { invoiceNumber: dto.invoiceNumber } });
    if (existingNumber) throw new ConflictException('Nomor invoice sudah digunakan');
    const created = await this.prisma.invoice.create({ data: { stayId: dto.stayId, invoiceNumber: dto.invoiceNumber, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, notes: dto.notes, createdById: actor.id } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Invoice', entityId: String(created.id), newData: created });
    return created;
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Invoice Create + Issue
  // ═══════════════════════════════════════════════════════════

  async createWithLinesAndIssue(dto: CreateInvoiceWithLinesAndIssueDto, actor: CurrentUserPayload, opts?: { systemIssued?: boolean }) {
    // systemIssued: invoice yang nominalnya dihitung sistem (mis. tagihan meter dari
    // pencatatan mandiri tenant). Aman walau aktor bukan owner/admin karena tidak ada
    // input nominal bebas — semua dari tarif/jatah di OperationalSetting.
    if (!opts?.systemIssued) this.assertFinanceMutationAllowed(actor);
    this.assertValidInvoicePeriod(dto.periodStart, dto.periodEnd);
    if (!dto.lines?.length) throw new ConflictException('Tagihan wajib memiliki minimal satu rincian tagihan');

    const result = await (this.prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      return this.createWithLinesAndIssueTx(tx, dto, actor, opts);
    });

    const normalized = this.normalizeInvoiceTotals(result.invoice);
    const response = this.attachAccountingMetadata(normalized as Record<string, unknown>, result.accounting);
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE_AND_ISSUE', entityType: 'Invoice', entityId: String(result.invoice.id), newData: response });
    return response;
  }

  // Versi tx-aware: dipakai oleh createWithLinesAndIssue DAN oleh service lain
  // (mis. meter-readings) yang butuh atomisitas dengan operasi DB lainnya dalam
  // satu transaksi yang sama. Tidak memanggil audit — caller yang bertanggung jawab.
  async createWithLinesAndIssueTx(
    tx: Prisma.TransactionClient,
    dto: CreateInvoiceWithLinesAndIssueDto,
    actor: CurrentUserPayload,
    opts?: { systemIssued?: boolean },
  ) {
    const readiness = await this.accountingReadiness.getReadiness();

    const stay = await tx.stay.findUnique({ where: { id: dto.stayId } });
    if (!stay) throw new NotFoundException('Masa sewa tidak ditemukan');

    const existingNumber = await tx.invoice.findUnique({ where: { invoiceNumber: dto.invoiceNumber } });
    if (existingNumber) throw new ConflictException('Nomor tagihan sudah digunakan');

    // H12: cegah duplicate invoice untuk stay+period yang sama.
    const existingPeriod = await tx.invoice.findFirst({
      where: { stayId: dto.stayId, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), status: { notIn: [InvoiceStatus.CANCELLED] as any } },
      select: { id: true, invoiceNumber: true },
    });
    if (existingPeriod) throw new ConflictException(`Tagihan untuk periode ini sudah ada: ${existingPeriod.invoiceNumber}`);

    const created = await tx.invoice.create({
      data: {
        stayId: dto.stayId,
        invoiceNumber: dto.invoiceNumber,
        status: InvoiceStatus.DRAFT,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdById: actor.id,
      },
    });

    let totalAmountRupiah = 0;
    for (let index = 0; index < dto.lines.length; index += 1) {
      const lineData = this.buildLineData(created.id, dto.lines[index], index);
      const lineSign = String(dto.lines[index].lineType) === 'DISCOUNT' ? -1 : 1;
      totalAmountRupiah += lineSign * Number(lineData.lineAmountRupiah ?? 0);
      await tx.invoiceLine.create({ data: lineData });
    }

    if (totalAmountRupiah <= 0) {
      throw new ConflictException('Tagihan tidak valid: total harus lebih dari 0');
    }

    const issued = await tx.invoice.update({
      where: { id: created.id },
      data: {
        totalAmountRupiah,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, payments: true, stay: { include: { tenant: true, room: true } } },
    });

    const accounting = this.shouldAttemptInvoiceAccountingPosting(readiness)
      ? this.resolveInvoiceAccountingMetadata(
          await this.accountingPosting.postInvoiceIssuedTx(tx, issued.id, actor.id),
          readiness,
        )
      : this.buildSkippedAccountingMetadata(
          readiness,
          readiness.schemaStatus?.message ?? 'Accounting foundation schema belum siap di database.',
        );

    return { invoice: issued, accounting };
  }

  async update(id: number, dto: UpdateInvoiceDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Invoice tidak ditemukan');
    if (existing.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, notes: dto.notes } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Invoice', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async addLine(id: number, dto: CreateInvoiceLineDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const line = await this.prisma.invoiceLine.create({ data: this.buildLineData(id, dto, 0) });
    await this.recalculateInvoiceTotal(id);
    await this.audit.log({ actorUserId: actor.id, action: 'ADD_LINE', entityType: 'InvoiceLine', entityId: String(line.id), newData: line, meta: { invoiceId: id } });
    return line;
  }

  async updateLine(invoiceId: number, lineId: number, dto: UpdateInvoiceLineDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException('Invoice atau line tidak ditemukan');
    
    // Hitung lineAmountRupiah jika qty atau unitPriceRupiah berubah
    const updateData: Prisma.InvoiceLineUpdateInput = {
      ...(dto.lineType !== undefined ? { lineType: dto.lineType as InvoiceLineType } : {}),
      ...(dto.utilityType !== undefined ? { utilityType: dto.utilityType as UtilityType } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };
    
    if (dto.qty !== undefined) {
      updateData.qty = new Prisma.Decimal(dto.qty);
    }
    if (dto.unit !== undefined) {
      updateData.unit = dto.unit;
    }
    if (dto.unitPriceRupiah !== undefined) {
      updateData.unitPriceRupiah = dto.unitPriceRupiah;
    }
    
    // Jika qty atau unitPriceRupiah berubah, hitung lineAmountRupiah
    if (dto.qty !== undefined || dto.unitPriceRupiah !== undefined) {
      const qty = dto.qty !== undefined ? new Prisma.Decimal(dto.qty) : line.qty;
      const unitPriceRupiah = dto.unitPriceRupiah !== undefined ? dto.unitPriceRupiah : line.unitPriceRupiah;
      updateData.lineAmountRupiah = qty.times(unitPriceRupiah).toNumber();
    }
    
    const updated = await this.prisma.invoiceLine.update({ where: { id: lineId }, data: updateData });
    await this.recalculateInvoiceTotal(invoiceId);
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE_LINE', entityType: 'InvoiceLine', entityId: String(updated.id), oldData: line, newData: updated, meta: { invoiceId } });
    return updated;
  }

  async removeLine(invoiceId: number, lineId: number, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException('Invoice atau line tidak ditemukan');
    await this.prisma.invoiceLine.delete({ where: { id: lineId } });
    await this.recalculateInvoiceTotal(invoiceId);
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE_LINE', entityType: 'InvoiceLine', entityId: String(line.id), oldData: line, meta: { invoiceId } });
    const refreshed = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    return { invoiceId, deletedLineId: lineId, totalAmountRupiahAfterRecalc: refreshed?.totalAmountRupiah ?? 0 };
  }

  private async recalculateInvoiceTotal(invoiceId: number) {
    // Audit M-08: DISCOUNT adalah pengurang - harus identik dengan trigger DB
    // recalc_invoice_total, kalau tidak guard DB menolak update total.
    const lines = await this.prisma.invoiceLine.findMany({
      where: { invoiceId },
      select: { lineType: true, lineAmountRupiah: true },
    });
    const total = lines.reduce(
      (sum, line) =>
        sum +
        (String(line.lineType) === 'DISCOUNT'
          ? -Number(line.lineAmountRupiah ?? 0)
          : Number(line.lineAmountRupiah ?? 0)),
      0,
    );
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalAmountRupiah: total },
    });
  }

  async issue(id: number, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const readiness = await this.accountingReadiness.getReadiness();

    const result = await (this.prisma as any).$transaction(async (tx: Prisma.TransactionClient) => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { lines: true } });
      if (!invoice) throw new NotFoundException('Tagihan tidak ditemukan');
      if (invoice.status !== InvoiceStatus.DRAFT) throw new ConflictException('Transisi status tidak valid');
      if (!invoice.lines.length) throw new ConflictException('Draft tagihan belum valid untuk diterbitkan');
      if ((invoice.totalAmountRupiah ?? 0) <= 0) throw new ConflictException('Tagihan tidak valid: total harus lebih dari 0');

      const updated = await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, payments: true, stay: { include: { tenant: true, room: true } } },
      });

      const accounting = this.shouldAttemptInvoiceAccountingPosting(readiness)
        ? this.resolveInvoiceAccountingMetadata(
            await this.accountingPosting.postInvoiceIssuedTx(tx, updated.id, actor.id),
            readiness,
          )
        : this.buildSkippedAccountingMetadata(
            readiness,
            readiness.schemaStatus?.message ?? 'Accounting foundation schema belum siap di database.',
          );

      return { invoice, updated, accounting };
    });

    const normalized = this.normalizeInvoiceTotals(result.updated);
    const response = this.attachAccountingMetadata(normalized as Record<string, unknown>, result.accounting);
    await this.audit.log({ actorUserId: actor.id, action: 'ISSUE', entityType: 'Invoice', entityId: String(result.updated.id), oldData: result.invoice, newData: response });
    return response;
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Cancel Invoice
  // ═══════════════════════════════════════════════════════════

  async cancel(id: number, dto: CancelInvoiceDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (!dto.cancelReason) throw new ConflictException('Alasan pembatalan wajib diisi');
    if (invoice.status === InvoiceStatus.CANCELLED) throw new ConflictException('Invoice sudah dibatalkan');
    if (invoice.status === 'PARTIAL' || invoice.status === 'PAID') throw new ConflictException('Invoice tidak dapat dibatalkan karena status tidak valid atau sudah ada pembayaran');
    if (invoice.status === 'ISSUED' && invoice.payments.length > 0) throw new ConflictException('Invoice tidak dapat dibatalkan karena status tidak valid atau sudah ada pembayaran');

    const updated = await (this.prisma as any).$transaction(async (tx: any) => {
      // Audit A14: lock + re-validasi dalam transaksi — pembayaran bisa masuk
      // di sela pengecekan awal (di luar tx) dan eksekusi pembatalan.
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
      const fresh = await tx.invoice.findUnique({ where: { id }, include: { payments: true } });
      if (!fresh) throw new NotFoundException('Invoice tidak ditemukan');
      if (fresh.status === InvoiceStatus.CANCELLED) throw new ConflictException('Invoice sudah dibatalkan');
      if (fresh.status === 'PARTIAL' || fresh.status === 'PAID' || fresh.payments.length > 0) {
        throw new ConflictException('Invoice tidak dapat dibatalkan karena sudah ada pembayaran');
      }

      const postedInvoiceJournal = fresh.status === InvoiceStatus.DRAFT
        ? null
        : await tx.journalEntry.findFirst({
            where: {
              sourceType: 'INVOICE' as any,
              sourceId: String(invoice.id),
              status: 'POSTED' as any,
            },
            select: { id: true, entryNumber: true },
            orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
          });

      const cancelled = await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.CANCELLED, cancelReason: dto.cancelReason },
      });

      // DRAFT invoices are never journaled; cancellation is only a status change.
      // Journaled invoices must receive a controlled reversal, and reversal failures
      // must fail visibly instead of being swallowed after invoice status mutation.
      if (postedInvoiceJournal) {
        const reversalResult = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, cancelled.id, actor.id);
        if (reversalResult?.skipped) {
          throw new ConflictException(
            `Pembatalan invoice gagal karena reversal accounting tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}`,
          );
        }
      }

      return cancelled;
    });

    await this.audit.log({ actorUserId: actor.id, action: 'CANCEL', entityType: 'Invoice', entityId: String(updated.id), oldData: invoice, newData: updated });
    return updated;
  }
}
