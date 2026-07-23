import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoicePaymentDto, UpdateInvoicePaymentDto } from './dto/invoice-payment.dto';
import { InvoicePaymentsQueryDto } from './dto/invoice-payments-query.dto';
import { InvoiceStatus, PaymentMethod, RoomStatus, UserRole } from '../../common/enums/app.enums';
import { AccountingPostingService } from '../accounting/accounting-posting.service';

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  private assertFinanceMutationAllowed(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Hanya OWNER/ADMIN yang boleh mencatat atau mengubah pembayaran invoice');
    }
  }

  private invoiceTotal(invoice: { totalAmountRupiah?: number | null; lines?: Array<{ lineAmountRupiah?: number | null }> }): number {
    const storedTotal = Number(invoice.totalAmountRupiah ?? 0);
    const lineTotal = (invoice.lines ?? []).reduce((sum, line) => sum + Number(line.lineAmountRupiah ?? 0), 0);
    return storedTotal > 0 ? storedTotal : lineTotal;
  }

  private async findActivePaymentJournal(paymentId: number, db: any = this.prisma) {
    return db.journalEntry.findFirst({
      where: {
        sourceType: 'INVOICE_PAYMENT' as any,
        sourceId: String(paymentId),
        status: { not: 'VOID' as any },
      },
      select: { id: true, entryNumber: true, status: true, postedAt: true },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  private buildAccountingMeta(result: any) {
    if (!result) {
      return {
        accountingPosted: false,
        accountingWarning: 'Auto journal pembayaran belum memberi hasil. Cek readiness accounting.',
      };
    }
    return {
      accountingPosted: Boolean(result.posted),
      accountingSkipped: Boolean(result.skipped),
      accountingJournalEntryId: result.journalEntry?.id ?? null,
      accountingJournalEntryNumber: result.journalEntry?.entryNumber ?? null,
      accountingWarning: result.posted ? null : (result.reason ?? 'Auto journal pembayaran belum terposting. Cek readiness accounting.'),
      accountingReason: result.reason ?? null,
    };
  }

  private assertNoActivePaymentJournal(paymentId: number, journal: any) {
    if (journal) {
      throw new ConflictException(
        `Pembayaran sudah masuk jurnal accounting (${journal.entryNumber}). Gunakan reversal/koreksi resmi, bukan edit/delete langsung.`,
      );
    }
  }


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
      ].filter(Boolean) as Prisma.InvoicePaymentWhereInput[],
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
    this.assertFinanceMutationAllowed(actor);
    const invoiceSnapshot = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      select: {
        id: true,
        status: true,
        stay: {
          select: {
            tenantId: true,
            roomId: true,
            initialMetersPromotedAt: true,
            room: { select: { status: true } },
          },
        },
      },
    });

    if (!invoiceSnapshot) throw new NotFoundException('Invoice tidak ditemukan');
    if (invoiceSnapshot.status === InvoiceStatus.DRAFT) {
      throw new ConflictException('Invoice masih draft dan belum bisa dibayar. Terbitkan invoice terlebih dahulu.');
    }
    if (invoiceSnapshot.status === InvoiceStatus.CANCELLED) {
      throw new ConflictException('Invoice sudah dibatalkan dan tidak bisa menerima pembayaran.');
    }
    // Pembayaran booking wajib lewat approve bukti bayar (payment submission).
    // Jalur manual tidak menjalankan aktivasi kamar/deposit/promosi meter, sehingga
    // booking yang lunas manual tetap dianggap "belum bayar" oleh auto-ops dan bisa
    // dibatalkan otomatis (temuan audit A1).
    if (
      invoiceSnapshot.stay &&
      [RoomStatus.RESERVED].includes(invoiceSnapshot.stay.room?.status as RoomStatus) &&
      !invoiceSnapshot.stay.initialMetersPromotedAt
    ) {
      throw new ConflictException(
        'Invoice ini milik booking yang belum aktif. Catat pembayaran lewat Review Pembayaran (approve bukti bayar tenant) agar kamar aktif, deposit tercatat, dan booking tidak dibatalkan otomatis.',
      );
    }

    const { payment: created, accountingResult } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${dto.invoiceId} FOR UPDATE`;
      const agg = await tx.invoicePayment.aggregate({
        where: { invoiceId: dto.invoiceId },
        _sum: { amountRupiah: true },
      });
      const freshPaid = agg._sum.amountRupiah ?? 0;
      const invoice = await tx.invoice.findUnique({
        where: { id: dto.invoiceId },
        include: { lines: true },
      });
      if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
      if (freshPaid + dto.amountRupiah > this.invoiceTotal(invoice)) {
        throw new ConflictException('Pembayaran melebihi total invoice');
      }
      // F1-1R (D-02): pembayaran manual wajib MELUNASI tagihan penuh — tidak ada cicilan/partial.
      if (freshPaid + dto.amountRupiah !== this.invoiceTotal(invoice)) {
        throw new ConflictException(
          `Pembayaran manual harus melunasi tagihan penuh Rp ${(this.invoiceTotal(invoice) - freshPaid).toLocaleString('id-ID')} (tidak ada pembayaran sebagian).`,
        );
      }
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
      const postingResult = await this.accountingPosting.postInvoicePaymentTx(tx, payment.id, actor.id);
      return { payment, accountingResult: postingResult };
    });

    const refreshed = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId }, include: { stay: true } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InvoicePayment', entityId: String(created.id), newData: { ...created, accounting: this.buildAccountingMeta(accountingResult) } });

    return { ...created, invoiceStatusAfterSync: refreshed?.status, invoicePaidAt: refreshed?.paidAt, ...this.buildAccountingMeta(accountingResult) };
  }

  async update(id: number, dto: UpdateInvoicePaymentDto, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const existing = await this.prisma.invoicePayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pembayaran tidak ditemukan');

    const { payment: updated, accountingResult } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lock + validasi dalam transaksi (audit A6) — pola sama dengan create (fix #7).
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${existing.invoiceId} FOR UPDATE`;
      await this.assertStayNotOccupiedForPaymentMutationTx(tx, existing.invoiceId);
      this.assertNoActivePaymentJournal(id, await this.findActivePaymentJournal(id, tx));

      const invoice = await tx.invoice.findUnique({
        where: { id: existing.invoiceId },
        include: { lines: true, payments: true },
      });
      if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new ConflictException('Invoice masih draft dan pembayaran belum boleh diubah. Terbitkan invoice terlebih dahulu.');
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new ConflictException('Invoice sudah dibatalkan; pembayarannya tidak boleh diubah.');
      }

      const otherPaid = invoice.payments.filter((p) => p.id !== id).reduce((sum, p) => sum + p.amountRupiah, 0);
      const nextAmount = dto.amountRupiah ?? existing.amountRupiah;
      if (otherPaid + nextAmount > this.invoiceTotal(invoice)) {
        throw new ConflictException('Pembayaran melebihi total invoice');
      }
      // F1-1R (D-02): pembayaran manual wajib MELUNASI tagihan penuh — tidak ada cicilan/partial.
      if (otherPaid + nextAmount !== this.invoiceTotal(invoice)) {
        throw new ConflictException(
          `Pembayaran manual harus melunasi tagihan penuh Rp ${(this.invoiceTotal(invoice) - otherPaid).toLocaleString('id-ID')} (tidak ada pembayaran sebagian).`,
        );
      }

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
      const postingResult = await this.accountingPosting.postInvoicePaymentTx(tx, payment.id, actor.id);
      return { payment, accountingResult: postingResult };
    });

    const refreshed = await this.prisma.invoice.findUnique({ where: { id: existing.invoiceId } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InvoicePayment', entityId: String(updated.id), oldData: existing, newData: { ...updated, accounting: this.buildAccountingMeta(accountingResult) } });
    return { ...updated, invoiceStatusAfterSync: refreshed?.status, invoicePaidAt: refreshed?.paidAt, ...this.buildAccountingMeta(accountingResult) };
  }

  async remove(id: number, actor: CurrentUserPayload) {
    this.assertFinanceMutationAllowed(actor);
    const existing = await this.prisma.invoicePayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pembayaran tidak ditemukan');

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lock + cek jurnal dalam transaksi (audit A6).
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${existing.invoiceId} FOR UPDATE`;
      await this.assertStayNotOccupiedForPaymentMutationTx(tx, existing.invoiceId);
      this.assertNoActivePaymentJournal(id, await this.findActivePaymentJournal(id, tx));
      await tx.invoicePayment.delete({ where: { id } });
      await this.syncInvoiceStatus(tx, existing.invoiceId);
      return tx.invoice.findUnique({ where: { id: existing.invoiceId } });
    });

    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'InvoicePayment', entityId: String(existing.id), oldData: existing });
    return { deletedPaymentId: existing.id, invoiceId: existing.invoiceId, invoiceStatusAfterSync: result?.status, invoicePaidAt: result?.paidAt };
  }

  private async assertStayNotOccupiedForPaymentMutationTx(tx: Prisma.TransactionClient, invoiceId: number) {
    // F1-2 (GAP #3/B-04): pembayaran kamar yang SUDAH DITEMPATI (stay promoted / room OCCUPIED)
    // tak boleh diubah/dihapus — walau jurnalnya belum ada — agar occupancy & uang tetap konsisten.
    const inv = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { stay: { select: { initialMetersPromotedAt: true, room: { select: { status: true } } } } },
    });
    if (inv?.stay && (inv.stay.initialMetersPromotedAt || inv.stay.room?.status === RoomStatus.OCCUPIED)) {
      throw new ConflictException('Tidak dapat mengubah/menghapus pembayaran kamar yang sudah ditempati.');
    }
  }

  private async syncInvoiceStatus(tx: Prisma.TransactionClient, invoiceId: number) {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true, payments: true } });
    if (!invoice) return;

    if ([InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT].includes(invoice.status as InvoiceStatus)) {
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountRupiah, 0);
    let status: InvoiceStatus = invoice.status as InvoiceStatus;
    let paidAt: Date | null = null;

    if (totalPaid === 0) {
      status = InvoiceStatus.ISSUED;
    } else if (totalPaid < this.invoiceTotal(invoice)) {
      status = InvoiceStatus.PARTIAL;
    } else {
      status = InvoiceStatus.PAID;
      // Audit A12: pakai tanggal pembayaran terakhir, bukan waktu sinkronisasi,
      // agar konsisten dengan jalur approve submission dan laporan tanggal lunas.
      paidAt = invoice.payments.reduce<Date | null>(
        (latest, payment) => (!latest || payment.paymentDate > latest ? payment.paymentDate : latest),
        null,
      ) ?? new Date();
    }

    await tx.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
  }
}
