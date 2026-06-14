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
