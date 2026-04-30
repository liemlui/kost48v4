import { createResource, getResource, listResource, postAction } from './resources';
import type { CreateRenewRequestPayload, RenewRequest, ApproveRenewRequestPayload, RejectRenewRequestPayload, PaginatedResponse } from '../types';

export async function createRenewRequest(payload: CreateRenewRequestPayload): Promise<RenewRequest> {
  return createResource<RenewRequest>('/tenant/renew-requests', payload as unknown as Record<string, unknown>);
}

export async function listMyRenewRequests(): Promise<PaginatedResponse<RenewRequest>> {
  return getResource<PaginatedResponse<RenewRequest>>('/tenant/renew-requests/my');
}

export async function listAdminRenewRequests(params?: { status?: string }): Promise<PaginatedResponse<RenewRequest>> {
  return listResource<RenewRequest>('/admin/renew-requests', params as Record<string, unknown>) as Promise<PaginatedResponse<RenewRequest>>;
}

export async function approveRenewRequest(id: number, payload?: ApproveRenewRequestPayload): Promise<RenewRequest> {
  return postAction<RenewRequest>(`/admin/renew-requests/${id}/approve`, payload as Record<string, unknown> | undefined);
}

export async function rejectRenewRequest(id: number, payload: RejectRenewRequestPayload): Promise<RenewRequest> {
  return postAction<RenewRequest>(`/admin/renew-requests/${id}/reject`, payload as unknown as Record<string, unknown>);
}