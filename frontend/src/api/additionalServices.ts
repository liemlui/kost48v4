import client from './client';
import type { ApiEnvelope } from '../types';

// PUB-LAYANAN-TAMBAHAN: layanan tambahan + tarif (dikelola owner).
export interface AdditionalService {
  id: number;
  name: string;
  description?: string | null;
  priceRupiah: number;
  unit?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export async function listActiveAdditionalServices(): Promise<AdditionalService[]> {
  const response = await client.get<ApiEnvelope<{ items: AdditionalService[] }>>(
    '/additional-services/active',
  );
  return response.data.data.items;
}

// PUB-LAYANAN-MINAT: minat tenant + proses admin.
export type ServiceInterestStatus = 'PENDING' | 'CONTACTED' | 'DONE' | 'CANCELLED';

export interface ServiceInterest {
  id: number;
  serviceId: number;
  tenantId: number;
  status: ServiceInterestStatus;
  note?: string | null;
  adminNote?: string | null;
  createdAt: string;
  service?: { name: string; priceRupiah: number; unit?: string | null };
  tenant?: { fullName: string; phone?: string | null };
}

export async function createServiceInterest(serviceId: number, note?: string): Promise<ServiceInterest> {
  const response = await client.post<ApiEnvelope<ServiceInterest>>(
    `/additional-services/${serviceId}/interest`,
    { note },
  );
  return response.data.data;
}

export async function listMyServiceInterests(): Promise<Array<{ id: number; serviceId: number; status: ServiceInterestStatus }>> {
  const response = await client.get<ApiEnvelope<{ items: Array<{ id: number; serviceId: number; status: ServiceInterestStatus }> }>>(
    '/additional-services/my-interests',
  );
  return response.data.data.items;
}

export async function listServiceInterests(status?: string): Promise<{ items: ServiceInterest[]; meta: unknown }> {
  const response = await client.get<ApiEnvelope<{ items: ServiceInterest[]; meta: unknown }>>(
    '/additional-services/interests',
    { params: { status, limit: 100 } },
  );
  return response.data.data;
}

export async function updateServiceInterest(id: number, status: ServiceInterestStatus, adminNote?: string): Promise<ServiceInterest> {
  const response = await client.patch<ApiEnvelope<ServiceInterest>>(
    `/additional-services/interests/${id}`,
    { status, adminNote },
  );
  return response.data.data;
}
