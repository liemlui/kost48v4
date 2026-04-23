import { createResource, getResource, listResource, postAction } from './resources';
import { Invoice, InvoiceLine, PaginatedResponse } from '../types';

export async function listInvoices(params?: Record<string, unknown>) {
  return listResource<Invoice>('/invoices', params) as Promise<PaginatedResponse<Invoice>>;
}

export async function getInvoiceById(id: number | string) {
  return getResource<Invoice>(`/invoices/${id}`);
}

export async function createInvoice(payload: {
  stayId: number;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  notes?: string;
}) {
  return createResource<Invoice>('/invoices', payload as unknown as Record<string, unknown>);
}

export async function addInvoiceLine(invoiceId: number | string, payload: {
  lineType: string;
  description: string;
  qty: number | string;
  unit?: string;
  unitPriceRupiah: number;
  sortOrder?: number;
}) {
  return createResource<InvoiceLine>(`/invoices/${invoiceId}/lines`, payload as unknown as Record<string, unknown>);
}

export async function issueInvoice(invoiceId: number | string) {
  return postAction<Invoice>(`/invoices/${invoiceId}/issue`);
}

export async function cancelInvoice(
  invoiceId: number | string,
  payload: { cancelReason: string },
) {
  return postAction<Invoice>(`/invoices/${invoiceId}/cancel`, payload as unknown as Record<string, unknown>);
}
