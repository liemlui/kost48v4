import client from './client';
import { ApiEnvelope, Tenant, TenantProfileResponse } from '../types';

export async function getTenantKtpReviewQueue(): Promise<Tenant[]> {
  const response = await client.get<ApiEnvelope<{ items: Tenant[] }>>('/tenants?limit=300&isActive=true');
  return (response.data.data?.items ?? []).filter((tenant) => !!tenant.ktpImageUrl && !tenant.ktpVerifiedAt);
}

/** Detail tenant (OWNER/ADMIN) — termasuk field KTP untuk kartu verifikasi. */
export async function getTenant(tenantId: number): Promise<Tenant> {
  const response = await client.get<ApiEnvelope<Tenant>>(`/tenants/${tenantId}`);
  return response.data.data;
}

/** Upload foto KTP tenant (OWNER/ADMIN) — wajib sebelum verifikasi (F3-17). */
export async function uploadTenantKtpImage(tenantId: number, file: File): Promise<Tenant> {
  const form = new FormData();
  form.append('file', file);
  const response = await client.post<ApiEnvelope<Tenant>>(`/tenants/${tenantId}/ktp/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

/** Upload mandiri dari portal; backend memastikan tenantId milik akun aktif. */
export async function uploadMyKtpImage(tenantId: number, file: File): Promise<Tenant> {
  return uploadTenantKtpImage(tenantId, file);
}

export async function deleteTenantKtp(tenantId: number): Promise<Tenant> {
  const response = await client.delete<ApiEnvelope<Tenant>>(`/tenants/${tenantId}/ktp`);
  return response.data.data;
}

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

// PUB-FOTO-PROFIL-KTP: url avatar terproteksi (butuh Authorization → pakai useAuthenticatedMediaUrl).
export function tenantProfilePhotoUrl(tenantId: number): string {
  return `/api/tenants/${tenantId}/profile-photo/image`;
}

// PUB-FOTO-PROFIL-KTP: owner/admin ganti foto profil tenant (file sudah dikompres di klien).
export async function uploadTenantProfilePhoto(tenantId: number, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await client.post(`/tenants/${tenantId}/profile-photo/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteTenantProfilePhoto(tenantId: number): Promise<void> {
  await client.delete(`/tenants/${tenantId}/profile-photo`);
}

// ── G5+: KTP Verification — manual approve + save OCR data ─────────────────────

export interface VerifyKtpPayload {
  method?: 'AI' | 'AI_FAILED_MANUAL' | 'MANUAL';
  notes?: string;
}

export interface VerifyKtpResponse {
  id: number;
  ktpVerifiedAt: string;
  ktpVerifiedById: number;
  ktpVerificationMethod: string | null;
  ktpVerificationNotes: string | null;
}

/** Verifikasi KTP tenant secara manual (OWNER/ADMIN). */
export async function verifyTenantKtp(tenantId: number, payload?: VerifyKtpPayload): Promise<VerifyKtpResponse> {
  const response = await client.post<ApiEnvelope<VerifyKtpResponse>>(
    `/tenants/${tenantId}/ktp/verify`,
    payload ?? {},
  );
  return response.data.data;
}

export interface SaveKtpDataPayload {
  gender?: string;
  birthDate?: string;
  originCity?: string;
  originProvince?: string;
  occupation?: string;
  identityNumber?: string;
}

export interface SaveKtpDataResponse {
  savedFields: string[];
  tenant: Record<string, unknown>;
}

/** Simpan data KTP hasil ekstraksi OCR ke profil tenant. */
export async function saveTenantKtpData(tenantId: number, payload: SaveKtpDataPayload): Promise<SaveKtpDataResponse> {
  const response = await client.patch<ApiEnvelope<SaveKtpDataResponse>>(
    `/tenants/${tenantId}/ktp-data`,
    payload,
  );
  return response.data.data;
}

export interface DemographicsSummary {
  totalTenants: number;
  gender: Record<string, number>;
  topCities: Array<[string, number]>;
  topProvinces: Array<[string, number]>;
  topOccupations: Array<[string, number]>;
  ageGroups: Record<string, number>;
  maritalStatus: Record<string, number>;
  vehicleOwnership: Record<string, number>;
  leadSources: Record<string, number>;
  dataCompleteness: Record<string, number>;
}

/** Ringkasan demografi tenant untuk marketing analytics — OWNER only. */
export async function getDemographicsSummary(): Promise<DemographicsSummary> {
  const response = await client.get<ApiEnvelope<DemographicsSummary>>('/tenants/demographics/summary');
  return response.data.data;
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
  // Marketing analytics — bebas diedit kapan saja
  maritalStatus?: string;
  vehicleOwnership?: string;
  smokingHabit?: string;
  howDidYouHear?: string;
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
