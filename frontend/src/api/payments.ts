import { createResource, listResource } from './resources';
import { InvoicePayment, PaginatedResponse } from '../types';

export async function listPayments(params?: Record<string, unknown>) {
  return listResource<InvoicePayment>('/invoice-payments', params) as Promise<PaginatedResponse<InvoicePayment>>;
}

export async function createPayment(payload: {
  invoiceId: number;
  paymentDate: string;
  amountRupiah: number;
  method: string;
  referenceNo?: string;
  note?: string;
}) {
  return createResource<InvoicePayment>('/invoice-payments', payload as unknown as Record<string, unknown>);
}
