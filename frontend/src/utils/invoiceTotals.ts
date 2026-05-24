import type { Invoice, InvoiceLine, InvoicePayment } from '../types';

type InvoiceLike = Partial<Invoice> & {
  lines?: Array<Partial<InvoiceLine>> | null;
  payments?: Array<Partial<InvoicePayment>> | null;
  totalAmountRupiah?: number | string | null;
  paidAmountRupiah?: number | string | null;
};

function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sumInvoiceLines(lines?: Array<Partial<InvoiceLine>> | null): number {
  return (lines ?? []).reduce((sum, line) => sum + money(line.lineAmountRupiah), 0);
}

export function sumInvoicePayments(payments?: Array<Partial<InvoicePayment>> | null): number {
  return (payments ?? []).reduce((sum, payment) => sum + money(payment.amountRupiah), 0);
}

export function getInvoiceTotalAmount(invoice?: InvoiceLike | null): number {
  if (!invoice) return 0;
  const lineTotal = sumInvoiceLines(invoice.lines);
  const storedTotal = money(invoice.totalAmountRupiah);
  // If lines are present, they are the most reliable source. This protects UI when
  // older/local dev data has totalAmountRupiah stuck at 0 while invoice lines exist.
  return lineTotal > 0 ? lineTotal : storedTotal;
}

export function getInvoicePaidAmount(invoice?: InvoiceLike | null): number {
  if (!invoice) return 0;
  const paidFromPayments = sumInvoicePayments(invoice.payments);
  return paidFromPayments > 0 ? paidFromPayments : money(invoice.paidAmountRupiah);
}

export function getInvoiceOutstandingAmount(invoice?: InvoiceLike | null): number {
  return Math.max(getInvoiceTotalAmount(invoice) - getInvoicePaidAmount(invoice), 0);
}

export function getBookingInvoiceRemaining(booking?: {
  invoiceRemainingAmountRupiah?: number | string | null;
  invoiceTotalAmountRupiah?: number | string | null;
  invoicePaidAmountRupiah?: number | string | null;
  agreedRentAmountRupiah?: number | string | null;
} | null): number {
  if (!booking) return 0;
  const explicitRemaining = money(booking.invoiceRemainingAmountRupiah);
  if (explicitRemaining > 0) return explicitRemaining;

  const total = money(booking.invoiceTotalAmountRupiah) || money(booking.agreedRentAmountRupiah);
  const paid = money(booking.invoicePaidAmountRupiah);
  return Math.max(total - paid, 0);
}
