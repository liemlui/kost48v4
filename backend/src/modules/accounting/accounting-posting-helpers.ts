import { PrismaService } from '../../prisma/prisma.service';
import { dateOnlyWib } from '../../common/utils/date-only';

export const AUTO_SOURCE_TYPES = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'] as const;
export type AutoSourceType = (typeof AUTO_SOURCE_TYPES)[number];

// Unifikasi 2026-07-07 — pakai shared utility, re-export untuk backward compatibility.
const dateOnly = dateOnlyWib;
export { dateOnly };

export async function mappedDepositStaySourceIds(prisma: PrismaService): Promise<Set<number>> {
  const entries = await (prisma as any).journalEntry.findMany({
    where: { sourceType: 'DEPOSIT' as any, status: 'POSTED' as any },
    select: { sourceId: true },
  });
  const mapped = new Set<number>();
  for (const entry of entries ?? []) {
    const sourceId = String(entry.sourceId ?? '');
    if (/^\d+$/.test(sourceId)) mapped.add(Number(sourceId));
  }
  return mapped;
}

export async function mappedSourceIds(prisma: PrismaService, sourceType: AutoSourceType) {
  const rows = await (prisma as any).journalEntry.findMany({
    where: { sourceType: sourceType as any, sourceId: { not: null }, status: { not: 'VOID' as any } },
    select: { sourceId: true },
  });
  return rows.map((row: any) => Number(row.sourceId)).filter((id: number) => Number.isFinite(id));
}

export async function findAccountingPeriodForPostingTx(tx: any, value: Date) {
  const entryDate = dateOnly(value);
  return tx.accountingPeriod.findFirst({
    where: { startDate: { lte: entryDate }, endDate: { gte: entryDate } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

export async function findAccountByCodeTx(tx: any, code: string) {
  return tx.chartOfAccount.findFirst({ where: { code, isActive: true } });
}

export async function findDefaultCashAccountTx(tx: any) {
  const defaultCash = await tx.cashAccount.findFirst({
    where: { isDefault: true, isActive: true },
    orderBy: { id: 'asc' },
  });
  if (defaultCash) return defaultCash;
  return tx.cashAccount.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
}

export async function findCashAccountForPaymentMethodTx(tx: any, method?: string | null) {
  const preferredType =
    method === 'QRIS' ? 'QRIS' :
    method === 'EWALLET' ? 'EWALLET' :
    method === 'CASH' ? 'CASH' : 'BANK';
  const preferred = await tx.cashAccount.findFirst({
    where: { accountType: preferredType as any, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  if (preferred) return preferred;
  return findDefaultCashAccountTx(tx);
}

export function revenueCodeForInvoiceLine(lineType?: string | null, utilityType?: string | null) {
  if (lineType === 'RENT') return '4000';
  if (lineType === 'ELECTRICITY' || utilityType === 'ELECTRICITY') return '4100';
  if (lineType === 'WATER' || utilityType === 'WATER') return '4110';
  if (lineType === 'WIFI') return '4200';
  if (lineType === 'PENALTY') return '4400';
  if (lineType === 'DISCOUNT') return '4010'; // Contra-revenue — Sales Discount
  return '4300';
}

export function expenseCodeForCategory(category?: string | null) {
  const mapping: Record<string, string> = {
    SALARY: '6000', ELECTRICITY: '6100', WATER: '6110', INTERNET: '6120',
    MAINTENANCE: '6200', CLEANING: '6210', SUPPLIES: '6220',
    MARKETING: '6300', TAX: '6400', OTHER: '6990', RENT_BUILDING: '6990',
  };
  return mapping[String(category ?? 'OTHER')] ?? '6990';
}
