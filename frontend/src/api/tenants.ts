import client from './client';
import { ApiEnvelope } from '../types';

export interface TogglePortalAccessResponse {
  tenantId: number;
  portalUserId: number;
  portalEmail: string;
  portalIsActive: boolean;
  previousPortalIsActive: boolean;
  lastLoginAt: string | null;
}

export interface CreatePortalAccessRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface CreatePortalAccessResponse {
  tenantId: number;
  portalUserId: number;
  portalEmail: string;
  portalIsActive: boolean;
  lastLoginAt: string | null;
}

export async function togglePortalAccess(tenantId: number, isActive: boolean): Promise<TogglePortalAccessResponse> {
  const response = await client.patch<ApiEnvelope<TogglePortalAccessResponse>>(
    `/tenants/${tenantId}/portal-access/status`,
    { isActive }
  );
  return response.data.data;
}

export interface ResetPortalPasswordRequest {
  newPassword: string;
}

export interface ResetPortalPasswordResponse {
  tenantId: number;
  portalUserId: number;
  portalEmail: string;
  portalIsActive: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string;
}

export async function createPortalAccess(
  tenantId: number, 
  data: CreatePortalAccessRequest
): Promise<CreatePortalAccessResponse> {
  const response = await client.post<ApiEnvelope<CreatePortalAccessResponse>>(
    `/tenants/${tenantId}/portal-access`,
    data
  );
  return response.data.data;
}

export async function resetPortalPassword(
  tenantId: number,
  data: ResetPortalPasswordRequest
): Promise<ResetPortalPasswordResponse> {
  const response = await client.post<ApiEnvelope<ResetPortalPasswordResponse>>(
    `/tenants/${tenantId}/portal-access/reset-password`,
    data
  );
  return response.data.data;
}
