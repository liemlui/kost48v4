import { createResource, getResource, listResource, postAction } from './resources';
import type { CreateRenewRequestPayload, RenewRequest, ApproveRenewRequestPayload, RejectRenewRequestPayload, PaginatedResponse } from '../types';

export async function createRenewRequest(payload: CreateRenewRequestPayload): Promise<RenewRequest> {
  return createResource<RenewRequest>('/tenant/renew-requests', payload as unknown as Record<string, unknown>);
}

function normalizeRenewRequests(data: RenewRequest[] | PaginatedResponse<RenewRequest>): PaginatedResponse<RenewRequest> {
  if (Array.isArray(data)) {
    return { items: data };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    meta: data?.meta,
  };
}

export async function listMyRenewRequests(): Promise<PaginatedResponse<RenewRequest>> {
  const data = await getResource<RenewRequest[] | PaginatedResponse<RenewRequest>>('/tenant/renew-requests/my');
  return normalizeRenewRequests(data);
}

export async function listAdminRenewRequests(params?: { status?: string }): Promise<PaginatedResponse<RenewRequest>> {
  const data = await listResource<RenewRequest>('/admin/renew-requests', params as Record<string, unknown>) as unknown as RenewRequest[] | PaginatedResponse<RenewRequest>;
  return normalizeRenewRequests(data);
}

export async function approveRenewRequest(id: number, payload?: ApproveRenewRequestPayload): Promise<RenewRequest> {
  return postAction<RenewRequest>(`/admin/renew-requests/${id}/approve`, payload as Record<string, unknown> | undefined);
}

export async function rejectRenewRequest(id: number, payload: RejectRenewRequestPayload): Promise<RenewRequest> {
  return postAction<RenewRequest>(`/admin/renew-requests/${id}/reject`, payload as unknown as Record<string, unknown>);
}