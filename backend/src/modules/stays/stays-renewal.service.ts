// FILE: stays-renewal.service.ts — perpanjangan sewa stay existing: hitung biaya + perpanjang masa
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  StayStatus,
  PricingTerm,
  InvoiceStatus,
  InvoiceLineType,
  UtilityType,
  CheckoutRequestStatus,
} from '../../common/enums/app.enums';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import {
  RenewStayDto,
} from './dto/stay.dto';
import {
  startOfDay,
  maxDate,
  mapPricingTermToUnit,
  calculatePeriodEnd,
  calculateDueDate,
} from './stays.helpers';
import {
  assertCoreLifecycleActor,
  assertNoOpenInvoicesTx,
  parseMeterDecimal,
  createRenewUtilityCheckpointLineTx,
  resolveDepositSettlementAmount,
  isMeterInvoice,
  invoiceRemainingRupiah,
  computeMeterDepositSettlement,
} from './stays-service.helpers';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { SettingsService } from '../settings/settings.service';
import {
  endOfDay,
  parseJakartaDateOnly,
  startOfJakartaBusinessDay,
} from '../../common/utils/date.util';
import { getUtilityAllowanceMonths } from '../../common/business/utility-billing-cycle.helper';

@Injectable()
export class StaysRenewalService {
  private readonly logger = new Logger(StaysRenewalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * The free allowance belongs to the lease period being closed, not to every
   * meter checkpoint. If a MTR invoice was issued mid-period, only the unused
   * part of that single allowance can be applied at renewal.
   */
  private async getRenewalElectricityFreeAllowanceTx(
    tx: Prisma.TransactionClient,
    params: {
      stayId: number;
      roomId: number;
      checkInDate: Date;
      previousPeriodEnd: Date;
      currentReadingValue: Prisma.Decimal;
      configuredFreeKwh: number;
    },
  ) {
    const configuredFreeKwh = Math.max(0, params.configuredFreeKwh);
    const closedLeaseInvoice = await tx.invoice.findFirst({
      where: {
        stayId: params.stayId,
        status: InvoiceStatus.PAID,
        periodEnd: params.previousPeriodEnd,
        NOT: { invoiceNumber: { contains: '-RDP-' } },
        lines: { some: { lineType: InvoiceLineType.RENT as any } },
      },
      orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
      select: { periodStart: true, periodEnd: true },
    });
    const periodStart = closedLeaseInvoice?.periodStart ?? startOfJakartaBusinessDay(params.checkInDate);
    const allowanceMonths = closedLeaseInvoice
      ? getUtilityAllowanceMonths({ start: closedLeaseInvoice.periodStart, end: closedLeaseInvoice.periodEnd })
      : 1;
    const totalFreeKwh = configuredFreeKwh * allowanceMonths;

    const [periodBaseline, previousReading, priorMeterLines] = await Promise.all([
      tx.meterReading.findFirst({
        where: {
          roomId: params.roomId,
          utilityType: UtilityType.ELECTRICITY,
          readingAt: { lte: periodStart },
        },
        orderBy: { readingAt: 'desc' },
        select: { readingValue: true },
      }),
      tx.meterReading.findFirst({
        where: {
          roomId: params.roomId,
          utilityType: UtilityType.ELECTRICITY,
          readingAt: { lt: params.previousPeriodEnd },
        },
        orderBy: { readingAt: 'desc' },
        select: { readingValue: true },
      }),
      tx.invoiceLine.findMany({
        where: {
          lineType: InvoiceLineType.ELECTRICITY as any,
          invoice: {
            stayId: params.stayId,
            invoiceNumber: { startsWith: 'MTR-' },
            status: { not: InvoiceStatus.CANCELLED },
            periodStart: { gte: periodStart, lt: params.previousPeriodEnd },
          },
        },
        select: { qty: true },
      }),
    ]);

    if (!periodBaseline || !previousReading) return totalFreeKwh;

    const wholePeriodUsage = params.currentReadingValue.minus(periodBaseline.readingValue);
    const usageSincePreviousReading = params.currentReadingValue.minus(previousReading.readingValue);
    if (wholePeriodUsage.lt(0) || usageSincePreviousReading.lt(0)) return 0;

    const previouslyBilledKwh = priorMeterLines.reduce((total, line) => total + Number(line.qty), 0);
    const remainingChargeableKwh = Math.max(
      0,
      wholePeriodUsage.toNumber() - totalFreeKwh - previouslyBilledKwh,
    );
    // The checkpoint helper charges `usage since last reading - allowance`.
    // Convert the remaining charge into the part of this interval's allowance.
    return Math.max(0, usageSincePreviousReading.toNumber() - remainingChargeableKwh);
  }

  async renewStay(id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    assertCoreLifecycleActor(actor, 'Perpanjangan masa sewa');
    void id;
    void dto;
    throw new ConflictException(
      'Perpanjangan langsung dinonaktifkan. Gunakan alur Permintaan Perpanjangan agar DP, invoice pelunasan, dan status pembayaran terverifikasi.',
    );
  }

  /**
   * F2-1 inc.2b: terbitkan invoice DP 30% perpanjangan TERPISAH (ISSUED + jurnal).
   * Dibayar PENUH via bukti bayar (no-partial); confirm-dp memverifikasi PAID sebelum DP_SECURED.
   */
  async issueRenewalDownPaymentInvoiceTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    downPaymentRupiah: number,
    actor: CurrentUserPayload,
  ) {
    const stay = await tx.stay.findUnique({ where: { id: stayId } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== StayStatus.ACTIVE) throw new ConflictException('Stay tidak aktif');
    if (!(downPaymentRupiah > 0)) throw new ConflictException('Nominal DP perpanjangan tidak valid');

    const invoiceNumber = `INV-${stay.id}-RDP-${Date.now().toString().slice(-6)}`;
    const periodStart = startOfDay(new Date());
    const periodEnd = stay.plannedCheckOutDate ? startOfDay(stay.plannedCheckOutDate) : periodStart;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate: calculateDueDate(periodEnd),
        notes: 'DP 30% perpanjangan kontrak (dibayar penuh sebelum kamar diamankan).',
        createdById: actor.id,
      },
    });
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: InvoiceLineType.RENT as any,
        description: 'DP 30% perpanjangan masa sewa',
        qty: 1,
        unit: 'paket',
        unitPriceRupiah: downPaymentRupiah,
        lineAmountRupiah: downPaymentRupiah,
        sortOrder: 0,
      },
    });
    const issued = await tx.invoice.update({
      where: { id: invoice.id },
      data: { totalAmountRupiah: downPaymentRupiah, status: InvoiceStatus.ISSUED, issuedAt: new Date() },
    });
    await this.accountingPosting.postInvoiceIssuedTx(tx, issued.id, actor.id);
    return issued;
  }

  async prepareRenewalSettlementInTransaction(
    tx: Prisma.TransactionClient,
    id: number,
    dto: RenewStayDto,
    actor: CurrentUserPayload,
    settlementDueDate?: Date | null,
  ) {
    assertCoreLifecycleActor(actor, 'Perpanjangan masa sewa');

    // Audit M-15: kunci stay agar dobel-renew / race dengan sweeper auto-ops
    // tidak bisa membuat dua invoice perpanjangan untuk periode yang sama.
    await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${id} FOR UPDATE`;
    const stay = await tx.stay.findUnique({
      where: { id },
      include: { room: { select: { id: true, code: true } } },
    });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== StayStatus.ACTIVE)
      throw new ConflictException('Stay tidak aktif, tidak dapat diperpanjang');

    // S-01: cross-block — cegah renewal saat checkout request PENDING/APPROVED
    // masih aktif. Karena Stay sudah di-lock FOR UPDATE di atas, pengecekan ini
    // serialized terhadap checkout createRequest / approveRequest.
    const activeCheckout = await tx.checkoutRequest.findFirst({
      where: {
        stayId: id,
        status: { in: [CheckoutRequestStatus.PENDING, CheckoutRequestStatus.APPROVED] },
      },
    });
    if (activeCheckout) {
      throw new ConflictException(
        'Tidak dapat memperpanjang karena ada permintaan checkout yang sedang aktif atau sudah disetujui. Selesaikan atau batalkan permintaan checkout terlebih dahulu.',
      );
    }

    await assertNoOpenInvoicesTx(tx, id, 'Perpanjangan masa sewa');
    if (!dto.electricityReadingValue || !dto.waterReadingValue || !dto.meterReadingAt) {
      throw new BadRequestException(
        'Meter listrik, meter air, dan tanggal pencatatan wajib diisi untuk menerbitkan invoice pelunasan.',
      );
    }

    const effectivePricingTerm = dto.pricingTerm ?? stay.pricingTerm;

    const meterReadingAt = parseJakartaDateOnly(
      dto.meterReadingAt,
      'Tanggal catat meter tidak valid',
    );

    const electricityReadingValue = parseMeterDecimal(
      dto.electricityReadingValue,
      'listrik',
    );
    const waterReadingValue = parseMeterDecimal(
      dto.waterReadingValue,
      'air',
    );

    const currentPlannedCheckOut = stay.plannedCheckOutDate
      ? startOfDay(stay.plannedCheckOutDate)
      : null;
    const today = startOfDay(new Date());
    // periodEnd/plannedCheckOutDate is exclusive, so the renewal starts on the current periodEnd date.
    const logicalPeriodStart = currentPlannedCheckOut ?? today;

    const newPlannedCheckOut = dto.plannedCheckOutDate
      ? startOfDay(new Date(dto.plannedCheckOutDate))
      : calculatePeriodEnd(logicalPeriodStart, effectivePricingTerm);

    if (Number.isNaN(newPlannedCheckOut.getTime())) {
      throw new BadRequestException('Tanggal perpanjangan tidak valid');
    }

    if (newPlannedCheckOut <= logicalPeriodStart) {
      throw new ConflictException(
        'Tanggal perpanjangan harus setelah awal periode renewal yang baru',
      );
    }

    const rentAmount =
      dto.agreedRentAmountRupiah ?? stay.agreedRentAmountRupiah;
    // F2-1 inc.2b: bila DP 30% sudah ditagih via invoice terpisah, rent-line invoice renewal
    // = sisa (rent − DP). Stay.agreedRentAmountRupiah tetap penuh (di update bawah).
    const priorDownPayment = Math.max(0, Number(dto.priorDownPaymentRupiah ?? 0));
    const settlementRentLine = Math.max(0, Number(rentAmount ?? 0) - priorDownPayment);

    const invoiceNumber = `INV-${stay.id}-R-${Date.now().toString().slice(-6)}`;
    const periodStart = logicalPeriodStart;
    const periodEnd = newPlannedCheckOut;
    const dueDate = settlementDueDate
      ? startOfDay(settlementDueDate)
      : calculateDueDate(periodEnd);

    // Keep invoice in DRAFT while inserting all lines because DB guards prevent line mutation after ISSUE.
    let invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate,
        notes:
          'Tagihan perpanjangan termasuk checkpoint meter listrik dan air periode sebelumnya.',
        createdById: actor.id,
      },
    });

    const unit = mapPricingTermToUnit(effectivePricingTerm);
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: InvoiceLineType.RENT as any,
        description: priorDownPayment > 0
          ? `Perpanjangan masa sewa ${effectivePricingTerm} (sisa setelah DP Rp ${priorDownPayment.toLocaleString('id-ID')})`
          : `Perpanjangan masa sewa ${effectivePricingTerm}`,
        qty: 1,
        unit,
        unitPriceRupiah: settlementRentLine,
        lineAmountRupiah: settlementRentLine,
        sortOrder: 0,
      },
    });

    const settings = await this.settings.getOperational();
    const electricityFreeAllowanceKwh = await this.getRenewalElectricityFreeAllowanceTx(tx, {
      stayId: stay.id,
      roomId: stay.roomId,
      checkInDate: stay.checkInDate,
      previousPeriodEnd: logicalPeriodStart,
      currentReadingValue: electricityReadingValue,
      configuredFreeKwh: Number(settings.freeElectricityKwhPerMonth ?? 0),
    });
    const electricitySummary = await createRenewUtilityCheckpointLineTx(
      tx,
      {
        roomId: stay.roomId,
        invoiceId: invoice.id,
        utilityType: UtilityType.ELECTRICITY,
        label: 'listrik',
        unit: 'kWh',
        newReadingValue: electricityReadingValue,
        readingAt: meterReadingAt,
        tariffRupiah: stay.electricityTariffPerKwhRupiah,
        freeAllowanceKwh: electricityFreeAllowanceKwh,
        actorId: actor.id,
        sortOrder: 1,
      },
    );

    const waterSummary = await createRenewUtilityCheckpointLineTx(tx, {
      roomId: stay.roomId,
      invoiceId: invoice.id,
      utilityType: UtilityType.WATER,
      label: 'air',
      unit: 'm³',
      newReadingValue: waterReadingValue,
      readingAt: meterReadingAt,
      tariffRupiah: stay.waterTariffPerM3Rupiah,
      actorId: actor.id,
      sortOrder: 2,
    });

    const renewalTotalAmountRupiah =
      Number(settlementRentLine) +
      Number(electricitySummary.amountRupiah ?? 0) +
      Number(waterSummary.amountRupiah ?? 0);

    invoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmountRupiah: renewalTotalAmountRupiah,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
      },
    });
    await this.accountingPosting.postInvoiceIssuedTx(tx, invoice.id, actor.id);

    const issuedInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });

    return {
      oldStay: stay,
      invoice: issuedInvoice ?? invoice,
      plannedStayUpdate: {
        plannedCheckOutDate: newPlannedCheckOut,
        pricingTerm: effectivePricingTerm,
        agreedRentAmountRupiah: rentAmount,
      },
      meterSummary: {
        readingAt: meterReadingAt,
        electricity: electricitySummary,
        water: waterSummary,
      },
    };
  }

  async finalizePreparedRenewalInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      stayId: number;
      settlementInvoiceId: number;
      pricingTerm: PricingTerm;
      agreedRentAmountRupiah: number;
    },
    actor: CurrentUserPayload,
  ) {
    assertCoreLifecycleActor(actor, 'Finalisasi perpanjangan masa sewa');
    await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${params.stayId} FOR UPDATE`;

    const [stay, invoice] = await Promise.all([
      tx.stay.findUnique({ where: { id: params.stayId } }),
      tx.invoice.findUnique({
        where: { id: params.settlementInvoiceId },
        include: { lines: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);

    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException('Stay tidak aktif, tidak dapat difinalkan');
    }
    if (!invoice || invoice.stayId !== stay.id) {
      throw new ConflictException('Invoice pelunasan perpanjangan tidak cocok dengan stay');
    }
    if (invoice.status !== InvoiceStatus.PAID || !invoice.paidAt) {
      throw new ConflictException(
        'Invoice pelunasan belum PAID. Setujui bukti pembayaran penuh sebelum finalisasi perpanjangan.',
      );
    }
    const otherOpenInvoice = await tx.invoice.findFirst({
      where: {
        stayId: stay.id,
        id: { not: invoice.id },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { invoiceNumber: true },
    });
    if (otherOpenInvoice) {
      throw new ConflictException(
        `Masih ada tagihan aktif ${otherOpenInvoice.invoiceNumber}. Selesaikan sebelum finalisasi perpanjangan.`,
      );
    }
    if (
      stay.plannedCheckOutDate
      && startOfDay(stay.plannedCheckOutDate).getTime() !== startOfDay(invoice.periodStart).getTime()
    ) {
      throw new ConflictException(
        'Periode stay berubah setelah invoice pelunasan diterbitkan. Batalkan dan siapkan ulang renewal.',
      );
    }

    const updatedStay = await tx.stay.update({
      where: { id: stay.id },
      data: {
        plannedCheckOutDate: invoice.periodEnd,
        pricingTerm: params.pricingTerm,
        agreedRentAmountRupiah: params.agreedRentAmountRupiah,
      },
    });

    return {
      oldStay: stay,
      stay: updatedStay,
      invoice,
    };
  }

  async cancelUnpaidRenewalInvoiceInTransaction(
    tx: Prisma.TransactionClient,
    invoiceId: number,
    actorUserId: number,
    reason: string,
  ) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceNumber: true, status: true },
    });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) return invoice;
    if ([InvoiceStatus.PAID, InvoiceStatus.PARTIAL].includes(invoice.status as InvoiceStatus)) {
      throw new ConflictException(
        `Invoice ${invoice.invoiceNumber} sudah memiliki pembayaran dan tidak dapat dibatalkan lewat penolakan renewal.`,
      );
    }

    const cancelled = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelReason: reason,
      },
    });
    const postedJournal = await tx.journalEntry.findFirst({
      where: {
        sourceType: 'INVOICE' as any,
        sourceId: String(invoice.id),
        status: 'POSTED' as any,
      },
      select: { id: true },
    });
    if (postedJournal) {
      const reversal = await this.accountingPosting.postInvoiceCancellationReversalTx(
        tx,
        invoice.id,
        actorUserId,
      );
      if (reversal?.skipped) {
        throw new ConflictException(
          `Reversal jurnal invoice ${invoice.invoiceNumber} gagal: ${reversal.reason ?? 'alasan tidak diketahui'}`,
        );
      }
    }
    return cancelled;
  }
}
