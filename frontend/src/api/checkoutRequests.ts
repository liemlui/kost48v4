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
  return getResource<PaginatedResponse<CheckoutRequest>>('/tenant/checkout-requests/my');
}

export async function listAdminCheckoutRequests(params?: { status?: string }): Promise<PaginatedResponse<CheckoutRequest>> {
  return listResource<CheckoutRequest>('/admin/checkout-requests', params as Record<string, unknown>) as Promise<PaginatedResponse<CheckoutRequest>>;
}

export async function approveCheckoutRequest(id: number, payload?: ApproveCheckoutRequestPayload): Promise<CheckoutRequest> {
  return postAction<CheckoutRequest>(`/admin/checkout-requests/${id}/approve`, payload as Record<string, unknown> | undefined);
}

export async function rejectCheckoutRequest(id: number, payload: RejectCheckoutRequestPayload): Promise<CheckoutRequest> {
  return postAction<CheckoutRequest>(`/admin/checkout-requests/${id}/reject`, payload as unknown as Record<string, unknown>);
}