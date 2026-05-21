import { createResource, getResource, listResource, postAction, patchAction } from './resources';
import type {
  CreateCheckoutRequestPayload,
  CheckoutRequest,
  ApproveCheckoutRequestPayload,
  RejectCheckoutRequestPayload,
  PaginatedResponse,
} from '../types';

export async function createCheckoutRequest(payload: CreateCheckoutRequestPayload): Promise<CheckoutRequest> {
  return createResource<CheckoutRequest>('/tenant/checkout-requests', payload as unknown as Record<string, unknown>);
}

function normalizeCheckoutRequests(data: CheckoutRequest[] | PaginatedResponse<CheckoutRequest>): PaginatedResponse<CheckoutRequest> {
  if (Array.isArray(data)) {
    return { items: data };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    meta: data?.meta,
  };
}

export async function listMyCheckoutRequests(): Promise<PaginatedResponse<CheckoutRequest>> {
  const data = await getResource<CheckoutRequest[] | PaginatedResponse<CheckoutRequest>>('/tenant/checkout-requests/my');
  return normalizeCheckoutRequests(data);
}

export async function listAdminCheckoutRequests(params?: { status?: string; stayId?: number }): Promise<PaginatedResponse<CheckoutRequest>> {
  const data = await listResource<CheckoutRequest>('/admin/checkout-requests', params as Record<string, unknown>) as unknown as CheckoutRequest[] | PaginatedResponse<CheckoutRequest>;
  return normalizeCheckoutRequests(data);
}

export async function approveCheckoutRequest(id: number, payload?: ApproveCheckoutRequestPayload): Promise<CheckoutRequest> {
  return patchAction<CheckoutRequest>(`/admin/checkout-requests/${id}/approve`, payload as Record<string, unknown> | undefined);
}

export async function rejectCheckoutRequest(id: number, payload: RejectCheckoutRequestPayload): Promise<CheckoutRequest> {
  return patchAction<CheckoutRequest>(`/admin/checkout-requests/${id}/reject`, payload as unknown as Record<string, unknown>);
}
