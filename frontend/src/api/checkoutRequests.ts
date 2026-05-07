import { createResource, getResource, listResource, postAction } from './resources';
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

export async function listMyCheckoutRequests(): Promise<PaginatedResponse<CheckoutRequest>> {
  const data = await getResource<CheckoutRequest[]>('/tenant/checkout-requests/my');
  // Backend returns a plain array; normalize to PaginatedResponse shape
  const items = Array.isArray(data) ? data : (data as unknown as PaginatedResponse<CheckoutRequest>)?.items ?? [];
  return { items };
}

export async function listAdminCheckoutRequests(params?: { status?: string }): Promise<PaginatedResponse<CheckoutRequest>> {
  const data = await listResource<CheckoutRequest>('/admin/checkout-requests', params as Record<string, unknown>) as unknown as CheckoutRequest[];
  // Backend returns a plain array; normalize to PaginatedResponse shape
  const items = Array.isArray(data) ? data : (data as unknown as PaginatedResponse<CheckoutRequest>)?.items ?? [];
  return { items };
}

export async function approveCheckoutRequest(id: number, payload?: ApproveCheckoutRequestPayload): Promise<CheckoutRequest> {
  return postAction<CheckoutRequest>(`/admin/checkout-requests/${id}/approve`, payload as Record<string, unknown> | undefined);
}

export async function rejectCheckoutRequest(id: number, payload: RejectCheckoutRequestPayload): Promise<CheckoutRequest> {
  return postAction<CheckoutRequest>(`/admin/checkout-requests/${id}/reject`, payload as unknown as Record<string, unknown>);
}