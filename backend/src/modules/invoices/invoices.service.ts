import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CancelInvoiceDto, CreateInvoiceDto, CreateInvoiceLineDto, UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { Prisma } from 'src/generated/prisma';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: InvoicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search ? { invoiceNumber: { contains: query.search, mode: 'insensitive' } } : {},
        // Validasi stayId: hanya tambah filter jika stayId valid (bukan undefined/null/NaN)
        query.stayId && !isNaN(Number(query.stayId)) ? { stayId: Number(query.stayId) } : {},
        query.status ? { status: query.status } : {},
        query.periodStartFrom || query.periodEndTo ? { periodStart: { gte: query.periodStartFrom ? new Date(query.periodStartFrom) : undefined }, periodEnd: { lte: query.periodEndTo ? new Date(query.periodEndTo) : undefined } } : {},
        query.dueDateFrom || query.dueDateTo ? { dueDate: { gte: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined, lte: query.dueDateTo ? new Date(query.dueDateTo) : undefined } } : {},
      ],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, skip, take, include: { stay: { include: { tenant: true, room: true } } }, orderBy: { id: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items: serializePrismaResult(items), meta: buildMeta(page, limit, totalItems) };
  }

  async findMine(user: CurrentUserPayload, query: InvoicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        { stay: { tenantId: user.tenantId ?? -1 } },
        query.status ? { status: query.status } : {},
        query.periodStartFrom || query.periodEndTo
          ? {
              periodStart: { gte: query.periodStartFrom ? new Date(query.periodStartFrom) : undefined },
              periodEnd: { lte: query.periodEndTo ? new Date(query.periodEndTo) : undefined },
            }
          : {},
        query.dueDateFrom || query.dueDateTo
          ? {
              dueDate: {
                gte: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
                lte: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
              },
            }
          : {},
      ],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: serializePrismaResult(items),
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
    return invoice;
  }

  async create(dto: CreateInvoiceDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({ where: { id: dto.stayId } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (new Date(dto.periodEnd) < new Date(dto.periodStart)) throw new ConflictException('Periode invoice salah');
    const existingNumber = await this.prisma.invoice.findUnique({ where: { invoiceNumber: dto.invoiceNumber } });
    if (existingNumber) throw new ConflictException('Nomor invoice sudah digunakan');
    const created = await this.prisma.invoice.create({ data: { stayId: dto.stayId, invoiceNumber: dto.invoiceNumber, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, notes: dto.notes, createdById: actor.id } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Invoice', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateInvoiceDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Invoice tidak ditemukan');
    if (existing.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, notes: dto.notes } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Invoice', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async addLine(id: number, dto: CreateInvoiceLineDto, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const qtyDecimal = new Prisma.Decimal(dto.qty);
    const lineAmountRupiah = qtyDecimal.times(dto.unitPriceRupiah).toNumber();
    const line = await this.prisma.invoiceLine.create({ data: { invoiceId: id, lineType: dto.lineType as any, utilityType: dto.utilityType as any, description: dto.description, qty: qtyDecimal, unit: dto.unit, unitPriceRupiah: dto.unitPriceRupiah, lineAmountRupiah, sortOrder: dto.sortOrder ?? 0 } });
    await this.audit.log({ actorUserId: actor.id, action: 'ADD_LINE', entityType: 'InvoiceLine', entityId: String(line.id), newData: line, meta: { invoiceId: id } });
    return line;
  }

  async updateLine(invoiceId: number, lineId: number, dto: UpdateInvoiceLineDto, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException('Invoice atau line tidak ditemukan');
    
    // Hitung lineAmountRupiah jika qty atau unitPriceRupiah berubah
    const updateData: any = { 
      lineType: dto.lineType as any, 
      utilityType: dto.utilityType as any, 
      description: dto.description, 
      sortOrder: dto.sortOrder 
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
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE_LINE', entityType: 'InvoiceLine', entityId: String(updated.id), oldData: line, newData: updated, meta: { invoiceId } });
    return updated;
  }

  async removeLine(invoiceId: number, lineId: number, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Invoice bukan status DRAFT');
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId } });
    if (!line || line.invoiceId !== invoiceId) throw new NotFoundException('Invoice atau line tidak ditemukan');
    await this.prisma.invoiceLine.delete({ where: { id: lineId } });
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE_LINE', entityType: 'InvoiceLine', entityId: String(line.id), oldData: line, meta: { invoiceId } });
    const refreshed = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    return { invoiceId, deletedLineId: lineId, totalAmountRupiahAfterRecalc: refreshed?.totalAmountRupiah ?? 0 };
  }

  async issue(id: number, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status !== 'DRAFT') throw new ConflictException('Transisi status tidak valid');
    if (!invoice.lines.length) throw new ConflictException('Invoice draft belum valid untuk diterbitkan');
    if ((invoice.totalAmountRupiah ?? 0) <= 0) throw new ConflictException('Invoice tidak valid: total harus lebih dari 0');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: 'ISSUED' as any, issuedAt: new Date() } });
    await this.audit.log({ actorUserId: actor.id, action: 'ISSUE', entityType: 'Invoice', entityId: String(updated.id), oldData: invoice, newData: updated });
    return updated;
  }

  async cancel(id: number, dto: CancelInvoiceDto, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (!dto.cancelReason) throw new ConflictException('Alasan pembatalan wajib diisi');
    if (invoice.status === 'PARTIAL' || invoice.status === 'PAID') throw new ConflictException('Invoice tidak dapat dibatalkan karena status tidak valid atau sudah ada pembayaran');
    if (invoice.status === 'ISSUED' && invoice.payments.length > 0) throw new ConflictException('Invoice tidak dapat dibatalkan karena status tidak valid atau sudah ada pembayaran');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' as any, cancelReason: dto.cancelReason } });
    await this.audit.log({ actorUserId: actor.id, action: 'CANCEL', entityType: 'Invoice', entityId: String(updated.id), oldData: invoice, newData: updated });
    return updated;
  }
}
