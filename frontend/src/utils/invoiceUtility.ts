export type InvoiceUtilityLineLike = {
  lineType?: string | null;
  description?: string | null;
  qty?: number | string | null;
  unit?: string | null;
  unitPriceRupiah?: number | string | null;
  lineAmountRupiah?: number | string | null;
};

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isUtilityInvoiceLine(line: InvoiceUtilityLineLike): boolean {
  const type = String(line.lineType ?? '').toUpperCase();
  return type === 'ELECTRICITY' || type === 'WATER';
}

export function isRenewUtilityInvoice(lines?: InvoiceUtilityLineLike[] | null): boolean {
  return Boolean(lines?.some(isUtilityInvoiceLine));
}

export function getInvoiceUtilitySummary(lines?: InvoiceUtilityLineLike[] | null) {
  const utilityLines = (lines ?? []).filter(isUtilityInvoiceLine);
  const electricityLine = utilityLines.find((line) => String(line.lineType ?? '').toUpperCase() === 'ELECTRICITY') ?? null;
  const waterLine = utilityLines.find((line) => String(line.lineType ?? '').toUpperCase() === 'WATER') ?? null;
  const rentLine = (lines ?? []).find((line) => String(line.lineType ?? '').toUpperCase() === 'RENT') ?? null;
  const electricityAmount = num(electricityLine?.lineAmountRupiah);
  const waterAmount = num(waterLine?.lineAmountRupiah);
  const rentAmount = num(rentLine?.lineAmountRupiah);
  const utilityAmount = electricityAmount + waterAmount;

  return {
    hasUtilityLines: utilityLines.length > 0,
    rentLine,
    electricityLine,
    waterLine,
    electricityUsage: num(electricityLine?.qty),
    waterUsage: num(waterLine?.qty),
    electricityUnit: electricityLine?.unit || 'kWh',
    waterUnit: waterLine?.unit || 'm³',
    electricityRate: num(electricityLine?.unitPriceRupiah),
    waterRate: num(waterLine?.unitPriceRupiah),
    electricityAmount,
    waterAmount,
    rentAmount,
    utilityAmount,
  };
}

export function invoiceKindLabel(lines?: InvoiceUtilityLineLike[] | null): string {
  if (isRenewUtilityInvoice(lines)) return 'Tagihan Perpanjangan + Utilitas';
  if (lines?.some((line) => String(line.lineType ?? '').toUpperCase() === 'RENT')) return 'Tagihan Sewa';
  return 'Tagihan';
}
