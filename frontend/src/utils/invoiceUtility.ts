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

// ── SI-4: Peruntukan invoice yang JELAS untuk orang awam ──
// "Tagihan harus jelas, buat bayar sewa atau listrik dll, jangan cuma nomor" (owner 2026-06-16).
// Diturunkan dari jenis baris (lineType); DP dideteksi dari nomor/catatan (tak ada lineType khusus).

export type InvoiceLikeForPurpose = {
  lines?: InvoiceUtilityLineLike[] | null;
  invoiceNumber?: string | null;
  notes?: string | null;
};

/** Noun peruntukan ringkas: "Sewa", "Listrik", "Air", "Listrik & Air", "Sewa + Listrik", "Uang Muka (DP)"… */
export function invoicePurposeLabel(input?: InvoiceLikeForPurpose | InvoiceUtilityLineLike[] | null): string {
  const inv: InvoiceLikeForPurpose = Array.isArray(input) ? { lines: input } : (input ?? {});
  const lines = inv.lines ?? [];
  const types = new Set(lines.map((l) => String(l.lineType ?? '').toUpperCase()).filter(Boolean));
  const num = String(inv.invoiceNumber ?? '').toUpperCase();
  const notes = String(inv.notes ?? '').toLowerCase();
  const has = (t: string) => types.has(t);
  const rent = has('RENT');
  const elec = has('ELECTRICITY');
  const water = has('WATER');
  const wifi = has('WIFI');
  const penalty = has('PENALTY');
  const isDp = /\bDP\b|UANG MUKA|DOWN ?PAYMENT/.test(num) || /uang muka|down ?payment|\bdp\b/.test(notes);
  const util = elec && water ? 'Listrik & Air' : elec ? 'Listrik' : water ? 'Air' : '';

  if (isDp) return 'Uang Muka (DP)';
  if (rent && util) return `Sewa + ${util}`;
  if (rent && wifi) return 'Sewa + WiFi';
  if (rent) return 'Sewa';
  if (util) return util;
  if (wifi) return 'WiFi';
  if (penalty) return 'Denda';
  if (num.startsWith('MTR')) return 'Listrik';
  return 'Lainnya';
}

/** Badge: { label, icon (emoji), bg (varian react-bootstrap Badge) } untuk tampilan cepat. */
export function invoicePurposeMeta(input?: InvoiceLikeForPurpose | InvoiceUtilityLineLike[] | null): {
  label: string; icon: string; bg: string;
} {
  const label = invoicePurposeLabel(input);
  if (label.startsWith('Sewa') && label.includes('+')) return { label, icon: '🏠⚡', bg: 'primary' };
  if (label === 'Sewa') return { label, icon: '🏠', bg: 'primary' };
  if (label === 'Listrik & Air') return { label, icon: '⚡', bg: 'warning' };
  if (label === 'Listrik') return { label, icon: '⚡', bg: 'warning' };
  if (label === 'Air') return { label, icon: '💧', bg: 'info' };
  if (label === 'Uang Muka (DP)') return { label, icon: '💰', bg: 'secondary' };
  if (label === 'WiFi') return { label, icon: '📶', bg: 'info' };
  if (label === 'Denda') return { label, icon: '⚠️', bg: 'danger' };
  return { label, icon: '🧾', bg: 'secondary' };
}

/** "Tagihan <peruntukan>" — untuk judul/detail. Tetap kompatibel dgn pemakai lama. */
export function invoiceKindLabel(input?: InvoiceLikeForPurpose | InvoiceUtilityLineLike[] | null): string {
  return `Tagihan ${invoicePurposeLabel(input)}`;
}
