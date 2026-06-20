import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import {
  InvoiceStatus,
  InvoiceLineType,
  UserRole,
  UtilityType,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { endOfDay } from '../../common/utils/date.util';
import { roundRupiah } from '../../common/business/money.helper';

export function assertCoreLifecycleActor(actor: CurrentUserPayload, actionLabel: string) {
  if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
    throw new ForbiddenException(`${actionLabel} hanya boleh dilakukan oleh owner/admin`);
  }
}

export function formatOpenInvoiceRefs(
  invoices: Array<{ id: number; invoiceNumber: string | null; status: InvoiceStatus | string }>,
) {
  return invoices
    .map((invoice) => `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} (${invoice.status})`)
    .join(', ');
}

export async function assertNoOpenInvoicesTx(
  tx: Prisma.TransactionClient,
  stayId: number,
  actionLabel: string,
) {
  const openInvoices = await tx.invoice.findMany({
    where: { stayId, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } },
    select: { id: true, invoiceNumber: true, status: true },
    orderBy: { id: 'asc' },
  });
  if (openInvoices.length > 0) {
    throw new ConflictException(
      `${actionLabel} belum bisa diproses karena masih ada tagihan aktif: ${formatOpenInvoiceRefs(openInvoices)}. Selesaikan atau batalkan tagihan terlebih dahulu.`,
    );
  }
}

// =========================================================================
// METER M-5: checkout meter final × deposit jaminan
// Listrik/air 100% PASCABAYAR. Tagihan meter periode terakhir yang belum
// dibayar saat checkout BOLEH menahan kamar lepas, tapi diselesaikan dengan
// memotong DEPOSIT JAMINAN (pola sama dengan forced-checkout F3-16):
//   deposit menutup tagihan meter (DR 2000 / CR 1100), sisa di-refund kas,
//   kekurangan TETAP jadi piutang AR. (Bukan jenis deposit baru.)
// =========================================================================

/**
 * Sebuah tagihan = "tagihan meter" bila punya minimal 1 baris dan SELURUH
 * barisnya bertipe utilitas (ELECTRICITY/WATER). Tagihan campuran (mis. sewa +
 * listrik) BUKAN tagihan meter dan tetap memblokir checkout seperti biasa.
 */
export function isMeterInvoice(invoice: {
  lines: Array<{ lineType: InvoiceLineType | string }>;
}): boolean {
  if (!invoice.lines || invoice.lines.length === 0) return false;
  return invoice.lines.every(
    (line) =>
      line.lineType === InvoiceLineType.ELECTRICITY ||
      line.lineType === InvoiceLineType.WATER,
  );
}

/** Sisa tagihan = total − Σ pembayaran (tidak pernah negatif). */
export function invoiceRemainingRupiah(invoice: {
  totalAmountRupiah: number | null;
  payments: Array<{ amountRupiah: number | Prisma.Decimal | null }>;
}): number {
  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amountRupiah ?? 0), 0);
  return Math.max(0, roundRupiah(Number(invoice.totalAmountRupiah ?? 0) - paid));
}

/**
 * M5.3: hitung pemotongan deposit terhadap tagihan meter OPEN saat settlement.
 * - applied   = bagian deposit yang menutup tagihan meter (jadi pembayaran AR)
 * - excess    = sisa deposit yang dikembalikan ke tenant (refund kas)
 * - shortfall = tagihan meter yang tak tertutup deposit → TETAP piutang AR
 */
export function computeMeterDepositSettlement(params: {
  meterDueRupiah: number;
  depositHeldRupiah: number;
}) {
  const meterDue = Math.max(0, roundRupiah(params.meterDueRupiah));
  const depositHeld = Math.max(0, roundRupiah(params.depositHeldRupiah));
  const applied = Math.min(meterDue, depositHeld);
  const excess = depositHeld - applied;
  const shortfall = meterDue - applied;
  return { meterDue, depositHeld, applied, excess, shortfall };
}

export function computeInvoiceDepositSettlement(params: {
  invoiceDueRupiah: number;
  depositHeldRupiah: number;
}) {
  const result = computeMeterDepositSettlement({
    meterDueRupiah: params.invoiceDueRupiah,
    depositHeldRupiah: params.depositHeldRupiah,
  });
  return {
    invoiceDue: result.meterDue,
    depositHeld: result.depositHeld,
    applied: result.applied,
    excess: result.excess,
    shortfall: result.shortfall,
  };
}

export function parseMeterDecimal(value: string, label: string) {
  try {
    const decimalValue = new Prisma.Decimal(value);
    if (decimalValue.lt(0)) {
      throw new BadRequestException(`Angka meter ${label} tidak boleh negatif`);
    }
    return decimalValue;
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(`Angka meter ${label} tidak valid`);
  }
}

export async function createRenewUtilityCheckpointLineTx(
  tx: Prisma.TransactionClient,
  params: {
    roomId: number;
    invoiceId: number;
    utilityType: UtilityType;
    label: string;
    unit: string;
    newReadingValue: Prisma.Decimal;
    readingAt: Date;
    tariffRupiah: number;
    actorId: number;
    sortOrder: number;
  },
) {
  const previousReading = await tx.meterReading.findFirst({
    where: { roomId: params.roomId, utilityType: params.utilityType, readingAt: { lt: params.readingAt } },
    orderBy: { readingAt: 'desc' },
  });
  if (!previousReading) {
    throw new ConflictException(`Belum ada catatan meter ${params.label} sebelumnya. Catat meter awal dulu sebelum menyetujui perpanjangan.`);
  }

  const duplicateReading = await tx.meterReading.findFirst({
    where: { roomId: params.roomId, utilityType: params.utilityType, readingAt: { gte: params.readingAt, lte: endOfDay(params.readingAt) } },
    select: { id: true },
  });
  if (duplicateReading) {
    throw new ConflictException(`Catatan meter ${params.label} untuk tanggal ini sudah ada`);
  }

  const nextReading = await tx.meterReading.findFirst({
    where: { roomId: params.roomId, utilityType: params.utilityType, readingAt: { gt: params.readingAt } },
    orderBy: { readingAt: 'asc' },
  });

  if (params.newReadingValue.lt(previousReading.readingValue)) {
    throw new ConflictException(`Angka meter ${params.label} tidak boleh lebih kecil dari catatan sebelumnya (${previousReading.readingValue.toString()})`);
  }
  if (nextReading && params.newReadingValue.gt(nextReading.readingValue)) {
    throw new ConflictException(`Angka meter ${params.label} tidak boleh lebih besar dari catatan setelahnya (${nextReading.readingValue.toString()})`);
  }

  const usageDelta = params.newReadingValue.minus(previousReading.readingValue);
  const billingQty = usageDelta.toDecimalPlaces(2);
  const tariff = params.tariffRupiah ?? 0;

  if (usageDelta.gt(0) && tariff <= 0) {
    throw new ConflictException(`Tarif ${params.label} belum diatur, tidak bisa menghitung tagihan perpanjangan`);
  }

  const lineAmount = roundRupiah(billingQty.toNumber() * tariff);

  const reading = await tx.meterReading.create({
    data: {
      roomId: params.roomId,
      utilityType: params.utilityType,
      readingAt: params.readingAt,
      readingValue: params.newReadingValue,
      recordedById: params.actorId,
      note: `Checkpoint perpanjangan masa sewa. Pemakaian ${params.label}: ${billingQty.toString()} ${params.unit}.`,
    },
  });

  const line = await tx.invoiceLine.create({
    data: {
      invoiceId: params.invoiceId,
      lineType: (params.utilityType === UtilityType.ELECTRICITY ? InvoiceLineType.ELECTRICITY : InvoiceLineType.WATER) as any,
      utilityType: params.utilityType,
      description: `Pemakaian ${params.label} periode sebelumnya: ${billingQty.toString()} ${params.unit}`,
      qty: billingQty,
      unit: params.unit,
      unitPriceRupiah: tariff,
      lineAmountRupiah: lineAmount,
      sortOrder: params.sortOrder,
    },
  });

  return {
    reading,
    line,
    previousReadingValue: previousReading.readingValue,
    readingValue: params.newReadingValue,
    usageDelta,
    tariffRupiah: tariff,
    amountRupiah: lineAmount,
  };
}

export function resolveDepositSettlementAmount(stay: {
  depositAmountRupiah: number | null;
  depositPaidAmountRupiah?: number | null;
}) {
  return Number(stay.depositPaidAmountRupiah ?? 0);
}
