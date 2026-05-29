import { getInvoiceTotalAmount } from './invoiceTotals';

export type InvoiceActionSafety = {
  blockers: string[];
  warnings: string[];
  checklist: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  canSubmit: boolean;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDateAfter(start?: string, end?: string) {
  if (!start || !end) return false;
  const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}

export function isValidCancelReason(reason: string) {
  return reason.trim().length >= 8;
}

export function buildIssueInvoiceSafety(invoice: any, checks: Record<string, boolean> = {}): InvoiceActionSafety {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist = ['Rincian sudah benar', 'Periode tagihan sudah benar', 'Tenant boleh melihat tagihan ini'];
  const total = getInvoiceTotalAmount(invoice);
  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];

  if (invoice?.status !== 'DRAFT') blockers.push('Hanya draft yang bisa diterbitkan dari sini.');
  if (!lines.length) blockers.push('Belum ada rincian tagihan.');
  if (total <= 0) blockers.push('Total tagihan harus lebih dari Rp0.');
  if (!invoice?.periodStart || !invoice?.periodEnd) warnings.push('Periode tagihan belum lengkap.');
  if (!invoice?.dueDate) warnings.push('Jatuh tempo belum diisi.');

  const checklistReady = checklist.every((_, index) => checks[`issue-${index}`]);
  return {
    blockers,
    warnings,
    checklist,
    risk: blockers.length ? 'HIGH' : warnings.length ? 'MEDIUM' : 'LOW',
    canSubmit: blockers.length === 0 && checklistReady,
  };
}

export function buildCancelInvoiceSafety(invoice: any, reason: string): InvoiceActionSafety {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist = ['Saya paham tagihan ini tidak lagi ditagihkan ke tenant'];

  if (!['DRAFT', 'ISSUED'].includes(invoice?.status)) blockers.push('Status tagihan ini tidak bisa dibatalkan dari list.');
  if (!isValidCancelReason(reason)) blockers.push('Alasan minimal 8 karakter.');
  if (invoice?.status === 'DRAFT') warnings.push('DRAFT aman dibatalkan sebelum terlihat tenant.');
  if (invoice?.status === 'ISSUED') warnings.push('Tagihan terbit: cek dampak ke checkout dan laporan.');

  return {
    blockers,
    warnings,
    checklist,
    risk: blockers.length ? 'HIGH' : invoice?.status === 'ISSUED' ? 'MEDIUM' : 'LOW',
    canSubmit: blockers.length === 0,
  };
}

export function buildCreateInvoiceSafety(input: {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  items: Array<{ description?: string; qty?: number | string; unitPriceRupiah?: number | string }>;
  totalAmount: number;
}): InvoiceActionSafety {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist = ['Periode benar', 'Rincian benar', 'Total benar'];

  if (!input.dueDate) blockers.push('Jatuh tempo wajib diisi.');
  if (!isDateAfter(input.periodStart, input.periodEnd)) blockers.push('Akhir periode harus setelah awal periode.');
  if (!input.items.length) blockers.push('Minimal 1 rincian tagihan.');
  input.items.forEach((item, index) => {
    if (!String(item.description ?? '').trim()) blockers.push(`Item ${index + 1}: deskripsi wajib.`);
    if (toNumber(item.qty) <= 0) blockers.push(`Item ${index + 1}: qty harus > 0.`);
    if (toNumber(item.unitPriceRupiah) < 0) blockers.push(`Item ${index + 1}: harga tidak boleh negatif.`);
  });
  if (input.totalAmount <= 0) blockers.push('Total tagihan harus lebih dari Rp0.');
  if (input.items.some((item) => toNumber(item.unitPriceRupiah) === 0)) warnings.push('Ada item Rp0. Pastikan memang benar.');

  return {
    blockers: [...new Set(blockers)].slice(0, 4),
    warnings: [...new Set(warnings)].slice(0, 3),
    checklist,
    risk: blockers.length ? 'HIGH' : warnings.length ? 'MEDIUM' : 'LOW',
    canSubmit: blockers.length === 0,
  };
}

export function buildManualPaymentSafety(input: {
  amountRupiah: number;
  outstanding: number;
  paymentDate?: string;
  method?: string;
  referenceNo?: string;
  note?: string;
}): InvoiceActionSafety {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist = ['Ini catatan admin', 'Nominal sudah cocok', 'Referensi/catatan jelas'];

  if (!input.paymentDate) blockers.push('Tanggal wajib diisi.');
  if (input.amountRupiah <= 0) blockers.push('Nominal harus lebih dari Rp0.');
  if (input.amountRupiah > input.outstanding) blockers.push('Nominal melebihi sisa tagihan.');
  if (input.method === 'TRANSFER' && !String(input.referenceNo ?? '').trim()) warnings.push('Transfer sebaiknya punya no. referensi.');
  if (input.amountRupiah > 0 && input.amountRupiah < input.outstanding && String(input.note ?? '').trim().length < 8) {
    blockers.push('Pembayaran parsial wajib catatan minimal 8 karakter.');
  }

  return {
    blockers,
    warnings,
    checklist,
    risk: blockers.length ? 'HIGH' : warnings.length || input.amountRupiah < input.outstanding ? 'MEDIUM' : 'LOW',
    canSubmit: blockers.length === 0,
  };
}
