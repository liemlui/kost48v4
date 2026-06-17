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
