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

function readAlias<T>(source: unknown, ...keys: string[]): T | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) return value as T;
  }
  return undefined;
}

function normalizeStay(raw: Stay): Stay {
  return {
    ...raw,
    checkInDate: readAlias<string>(raw, 'checkInDate', 'check_in_date') ?? raw.checkInDate,
    plannedCheckOutDate: readAlias<string | null>(raw, 'plannedCheckOutDate', 'planned_check_out_date') ?? raw.plannedCheckOutDate ?? null,
    actualCheckOutDate: readAlias<string | null>(raw, 'actualCheckOutDate', 'actual_check_out_date') ?? raw.actualCheckOutDate ?? null,
    expiresAt: readAlias<string | null>(raw, 'expiresAt', 'expires_at') ?? raw.expiresAt ?? null,
    bookingSource: readAlias<string | null>(raw, 'bookingSource', 'booking_source') ?? raw.bookingSource ?? null,
    stayPurpose: readAlias<string | null>(raw, 'stayPurpose', 'stay_purpose') ?? raw.stayPurpose ?? null,
    checkoutReason: readAlias<string | null>(raw, 'checkoutReason', 'checkout_reason') ?? raw.checkoutReason ?? null,
    cancelReason: readAlias<string | null>(raw, 'cancelReason', 'cancel_reason') ?? raw.cancelReason ?? null,
    room: raw.room
      ? {
          ...raw.room,
          status: readAlias<string>(raw.room, 'status', 'roomStatus', 'room_status') ?? raw.room.status,
        }
      : raw.room,
  };
}

export async function listStays(params?: Record<string, unknown>) {
  const response = await listResource<Stay>('/stays', params) as PaginatedResponse<Stay>;
  return {
    ...response,
    items: (response.items ?? []).map((item) => normalizeStay(item)),
  } satisfies PaginatedResponse<Stay>;
}

export async function getStayById(id: number | string) {
  const response = await getResource<Stay>(`/stays/${id}`);
  return normalizeStay(response);
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
