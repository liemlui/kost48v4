import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { RentRecognitionService } from '../accounting/rent-recognition.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { InvoiceLineType, InvoiceStatus, PaymentMethod } from '../../common/enums/app.enums';
import { addCalendarMonthsClamped, startOfDay } from './stays.helpers';

/**
 * F4-11 — prabayar/perpanjangan fleksibel: tenant membayar N bulan ke depan dengan
 * HARGA BULANAN, satu invoice di muka (keputusan owner D-18). Akuntansi PSAK 72:
 * kas masuk diakui sebagai Unearned (2200) lalu diakui per bulan (reuse F4-1).
 * Disederhanakan: admin/owner mencatat prabayar yang sudah dibayar penuh (no-partial).
 */
@Injectable()
export class PrepayExtensionService {
  private readonly logger = new Logger(PrepayExtensionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posting: AccountingPostingService,
    private readonly rentRecognition: RentRecognitionService,
    private readonly audit: AuditLogService,
  ) {}

  async prepayExtension(
    stayId: number,
    dto: { months: number; method?: string; paidAt?: string; note?: string },
    actor: CurrentUserPayload,
  ) {
    const months = Math.floor(Number(dto.months));
    if (!Number.isFinite(months) || months < 1 || months > 24) {
      throw new BadRequestException('Jumlah bulan prabayar harus 1-24.');
    }
    const method = (dto.method as PaymentMethod) || PaymentMethod.TRANSFER;
    const paymentDate = startOfDay(dto.paidAt ? new Date(dto.paidAt) : new Date());

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${stayId} FOR UPDATE`;
      const stay = await tx.stay.findUnique({ where: { id: stayId }, include: { room: true } });
      if (!stay) throw new NotFoundException('Stay tidak ditemukan');
      if (stay.status !== 'ACTIVE' || !stay.initialMetersPromotedAt) {
        throw new ConflictException('Prabayar hanya untuk penghuni aktif yang sudah huni (promoted).');
      }

      // Harga bulanan terkunci (rent-loyalty D-16): MONTHLY pakai agreedRent; lainnya tarif kamar.
      const monthlyRent = stay.pricingTerm === 'MONTHLY'
        ? stay.agreedRentAmountRupiah
        : (stay.room?.monthlyRateRupiah ?? stay.agreedRentAmountRupiah);
      if (monthlyRent <= 0) throw new ConflictException('Tarif bulanan kamar belum diatur.');
      const total = monthlyRent * months;

      const startDate = startOfDay(stay.plannedCheckOutDate ?? new Date());
      const periodEnd = addCalendarMonthsClamped(startDate, months);
      const invoiceNumber = `INV-${stay.id}-PRE-${Date.now().toString().slice(-6)}`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          stayId: stay.id,
          status: InvoiceStatus.ISSUED,
          periodStart: startDate,
          periodEnd,
          issuedAt: new Date(),
          totalAmountRupiah: total,
          createdById: actor.id,
          notes: `Prabayar ${months} bulan (harga bulanan). ${dto.note ?? ''}`.trim(),
          lines: {
            create: [{
              lineType: InvoiceLineType.RENT,
              description: `Sewa prabayar ${months} bulan`,
              qty: months as any,
              unitPriceRupiah: monthlyRent,
              lineAmountRupiah: total,
              sortOrder: 0,
            }],
          },
        },
      });

      const payment = await tx.invoicePayment.create({
        data: { invoiceId: invoice.id, paymentDate, amountRupiah: total, method, capturedById: actor.id, note: 'Prabayar perpanjangan' },
      });
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.PAID, paidAt: paymentDate } });

      // Jurnal: issuance (DR 1100 / CR 4000) + payment (DR kas / CR 1100).
      const issued = await this.posting.postInvoiceIssuedTx(tx, invoice.id, actor.id);
      if (!((issued as any)?.posted || (issued as any)?.journalEntry)) {
        throw new ConflictException('Gagal memposting jurnal invoice prabayar (cek periode akuntansi OPEN & COA).');
      }
      const paid = await this.posting.postInvoicePaymentTx(tx, payment.id, actor.id);
      if (!((paid as any)?.posted || (paid as any)?.journalEntry)) {
        throw new ConflictException('Gagal memposting jurnal pembayaran prabayar.');
      }

      // PSAK 72: deferral seluruh prabayar ke 2200 + jadwal pengakuan bulanan (F4-1).
      const sched = await this.rentRecognition.scheduleExtension(tx, {
        stayId: stay.id,
        invoiceId: invoice.id,
        startDate,
        months,
        monthlyRentRupiah: monthlyRent,
        entryDate: paymentDate,
        createdById: actor.id,
      });

      // Perpanjang masa sewa.
      const updatedStay = await tx.stay.update({ where: { id: stay.id }, data: { plannedCheckOutDate: periodEnd } });

      return { stay: updatedStay, invoice, months, monthlyRent, total, periodEnd, scheduled: sched };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'PREPAY_EXTENSION',
      entityType: 'Stay',
      entityId: String(stayId),
      newData: { invoiceId: result.invoice.id, months: result.months, total: result.total, periodEnd: result.periodEnd },
    });

    return {
      stayId,
      invoiceNumber: result.invoice.invoiceNumber,
      months: result.months,
      monthlyRentRupiah: result.monthlyRent,
      totalRupiah: result.total,
      newPlannedCheckOutDate: result.periodEnd,
    };
  }
}
