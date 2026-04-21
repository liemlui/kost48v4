import { createResource, getResource, listResource, postAction, updateResource } from './resources';
import {
  CancelStayPayload,
  CompleteStayPayload,
  Invoice,
  InvoiceSuggestionItem,
  PaginatedResponse,
  ProcessDepositPayload,
  Stay,
  StayCreatePayload,
} from '../types';

export type CreateStayResponse = {
  stay: Stay;
  invoice: Invoice;
};

export async function listStays(params?: Record<string, unknown>) {
  return listResource<Stay>('/stays', params) as Promise<PaginatedResponse<Stay>>;
}

export async function getStayById(id: number | string) {
  return getResource<Stay>(`/stays/${id}`);
}

export async function createStay(payload: StayCreatePayload) {
  return createResource<CreateStayResponse>('/stays', payload as unknown as Record<string, unknown>);
}

export async function updateStay(id: number | string, payload: Partial<Stay>) {
  return updateResource<Stay>(`/stays/${id}`, payload as unknown as Record<string, unknown>);
}

export async function completeStay(id: number | string, payload: CompleteStayPayload) {
  return postAction<Stay>(`/stays/${id}/complete`, payload as unknown as Record<string, unknown>);
}

export async function processDeposit(id: number | string, payload: ProcessDepositPayload) {
  return postAction<Stay>(`/stays/${id}/deposit/process`, payload as unknown as Record<string, unknown>);
}

export async function getStayInvoiceSuggestion(id: number | string): Promise<InvoiceSuggestionItem[]> {
  const response = await getResource<InvoiceSuggestionItem[] | { items?: InvoiceSuggestionItem[] }>(`/stays/${id}/invoice-suggestion`);
  if (Array.isArray(response)) return response;
  return Array.isArray(response.items) ? response.items : [];
}

export async function cancelStay(id: number | string, payload: CancelStayPayload) {
  return postAction<Stay>(`/stays/${id}/cancel`, payload as unknown as Record<string, unknown>);
}

export async function renewStay(
  id: number | string,
  payload?: { plannedCheckOutDate?: string; agreedRentAmountRupiah?: number }
) {
  return postAction<CreateStayResponse>(`/stays/${id}/renew`, payload || {});
}
