import type { CheckoutRequest, Invoice, PaymentSubmission, RenewRequest, Stay } from '../types';
import { isOpenInvoiceStatus, isPayableInvoiceStatus, isPendingReviewStatus } from './tenantCopy';

export function getPendingReviewInvoiceIds(submissions: PaymentSubmission[] = []) {
  const ids = new Set<number>();
  for (const submission of submissions) {
    if (submission.invoiceId != null && isPendingReviewStatus(submission.status)) {
      ids.add(Number(submission.invoiceId));
    }
  }
  return ids;
}

export function isTenantInvoiceOverdue(invoice: Invoice) {
  if (!invoice.dueDate || !isOpenInvoiceStatus(invoice.status)) return false;
  const due = new Date(invoice.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function getOpenTenantInvoices(invoices: Invoice[] = []) {
  return invoices.filter((invoice) => isOpenInvoiceStatus(invoice.status));
}

export function getPayableTenantInvoices(invoices: Invoice[] = []) {
  return invoices.filter((invoice) => isPayableInvoiceStatus(invoice.status));
}

export function getPrimaryTenantInvoice(invoices: Invoice[] = [], pendingReviewIds = new Set<number>()) {
  const overdue = invoices.find((invoice) => isTenantInvoiceOverdue(invoice) && !pendingReviewIds.has(invoice.id));
  if (overdue) return overdue;
  const payable = invoices.find((invoice) => isPayableInvoiceStatus(invoice.status) && !pendingReviewIds.has(invoice.id));
  if (payable) return payable;
  return invoices.find((invoice) => isOpenInvoiceStatus(invoice.status)) ?? null;
}

export function getDaysUntilTenantDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function findStayRenewRequest(stay: Stay, requests: RenewRequest[] = [], status: string) {
  return requests.find((request) => request.stayId === stay.id && (request.status ?? '').toUpperCase() === status.toUpperCase());
}

export function findStayCheckoutRequest(stay: Stay, requests: CheckoutRequest[] = [], status: string) {
  return requests.find((request) => request.stayId === stay.id && (request.status ?? '').toUpperCase() === status.toUpperCase());
}
