import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoicePaymentDto, UpdateInvoicePaymentDto } from './dto/invoice-payment.dto';
import { InvoicePaymentsQueryDto } from './dto/invoice-payments-query.dto';
import { InvoiceStatus, PaymentMethod } from '../../common/enums/app.enums';

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async findAll(query: InvoicePaymentsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.InvoicePaymentWhereInput = {
      AND: [
        query.invoiceId ? { invoiceId: Number(query.invoiceId) } : undefined,
        query.method ? { method: query.method } : undefined,
        query.paymentDateFrom || query.paymentDateTo
          ? {
              paymentDate: {
                gte: query.paymentDateFrom ? new Date(query.paymentDateFrom) : undefined,
                lte: query.paymentDateTo ? new Date(query.paymentDateTo) : undefined,
              },
            }
          : undefined,
      ].filter(Boolean),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.invoicePayment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: { include: { stay: { include: { tenant: true, room: true } } } },
        },
      }),
      this.prisma.invoicePayment.count({ where }),
    ]);

    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.invoicePayment.findUnique({
      where: { id },
      include: { invoice: { include: { stay: { include: { tenant: true, room: true } } } } },
    });

    if (!item) throw new NotFoundException('Pembayaran tidak ditemukan');
    return item;
  }

  async create(dto: CreateInvoicePaymentDto, actor: CurrentUserPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true, stay: true },
    });

    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status === 'CANCELLED') {
      throw new ConflictException('Pembayaran melebihi total invoice atau invoice berstatus CANCELLED');
    }

    const totalPaid = invoice.payments.reduce((sum, item) => sum + item.amountRupiah, 0);
    if (totalPaid + dto.amountRupiah > invoice.totalAmountRupiah) {
      throw new ConflictException('Pembayaran melebihi total invoice');
    }

    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId: dto.invoiceId,
          paymentDate: new Date(dto.paymentDate),
          amountRupiah: dto.amountRupiah,
          method: dto.method as PaymentMethod,
          referenceNo: dto.referenceNo,
          note: dto.note,
          capturedById: actor.id,
        },
      });
      await this.syncInvoiceStatus(tx, dto.invoiceId);
      return payment;
    });

    const refreshed = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId }, include: { stay: true } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InvoicePayment', entityId: String(created.id), newData: created });

    return { ...created, invoiceStatusAfterSync: refreshed?.status, invoicePaidAt: refreshed?.paidAt };
  }

  async update(id: number, dto: UpdateInvoicePaymentDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.invoicePayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pembayaran tidak ditemukan');

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: existing.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoice.status === 'CANCELLED') throw new ConflictException('Update menyebabkan overpayment atau invoice CANCELLED');

    const otherPaid = invoice.payments.filter((p) => p.id !== id).reduce((sum, p) => sum + p.amountRupiah, 0);
    const nextAmount = dto.amountRupiah ?? existing.amountRupiah;
    if (otherPaid + nextAmount > invoice.totalAmountRupiah) {
      throw new ConflictException('Pembayaran melebihi total invoice');
    }

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.invoicePayment.update({
        where: { id },
        data: {
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
          amountRupiah: dto.amountRupiah,
          method: dto.method as PaymentMethod,
          referenceNo: dto.referenceNo,
          note: dto.note,
        },
      });
      await this.syncInvoiceStatus(tx, existing.invoiceId);
      return payment;
    });

    const refreshed = await this.prisma.invoice.findUnique({ where: { id: existing.invoiceId } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InvoicePayment', entityId: String(updated.id), oldData: existing, newData: updated });
    return { ...updated, invoiceStatusAfterSync: refreshed?.status, invoicePaidAt: refreshed?.paidAt };
  }

  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.invoicePayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pembayaran tidak ditemukan');

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.invoicePayment.delete({ where: { id } });
      await this.syncInvoiceStatus(tx, existing.invoiceId);
      return tx.invoice.findUnique({ where: { id: existing.invoiceId } });
    });

    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'InvoicePayment', entityId: String(existing.id), oldData: existing });
    return { deletedPaymentId: existing.id, invoiceId: existing.invoiceId, invoiceStatusAfterSync: result?.status, invoicePaidAt: result?.paidAt };
  }

  private async syncInvoiceStatus(tx: Prisma.TransactionClient, invoiceId: number) {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!invoice) return;

    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountRupiah, 0);
    let status: InvoiceStatus = invoice.status as InvoiceStatus;
    let paidAt: Date | null = null;

    if (totalPaid === 0) {
      status = InvoiceStatus.ISSUED;
    } else if (totalPaid < invoice.totalAmountRupiah) {
      status = InvoiceStatus.PARTIAL;
    } else {
      status = InvoiceStatus.PAID;
      paidAt = new Date();
    }

    await tx.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
  }
}
