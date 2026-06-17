import client from './client';
import { ApiEnvelope, TenantProfileResponse } from '../types';

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

// ── Tenant self-service profile ───────────────────────────────────────────────

export async function getTenantProfile(): Promise<TenantProfileResponse> {
  const response = await client.get<ApiEnvelope<TenantProfileResponse>>('/tenant/profile');
  return response.data.data;
}

// TEN-PROFILE-NOTIF: kelengkapan profil (ringan) untuk badge "Lengkapi Profil".
export interface ProfileCompleteness {
  requiredFields: string[];
  completedFields: string[];
  missingFields: string[];
  completionPercent: number;
  isComplete: boolean;
}

export async function getProfileCompleteness(): Promise<ProfileCompleteness> {
  const response = await client.get<ApiEnvelope<ProfileCompleteness>>('/tenant/profile/completeness');
  return response.data.data;
}

export interface TenantProfileOnboardingPayload {
  gender?: string;
  birthDate?: string;
  originCity?: string;
  occupation?: string;
  companyOrCampus?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export async function fillTenantProfileOnboarding(
  payload: TenantProfileOnboardingPayload
): Promise<TenantProfileResponse> {
  const response = await client.patch<ApiEnvelope<TenantProfileResponse>>(
    '/tenant/profile/onboarding',
    payload
  );
  return response.data.data;
}
