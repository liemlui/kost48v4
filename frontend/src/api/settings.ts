import client from './client';
import type { ApiEnvelope } from '../types';

export type OperationalSetting = {
  id: number;
  freeElectricityKwhPerMonth: number;
  electricityTariffPerKwhRupiah: number;
  waterMeteringEnabled: boolean;
  waterTariffPerM3Rupiah: number;
  freeWaterM3PerMonth: number;
  updatedAt: string;
  updatedById?: number | null;
};

export type UpdateOperationalSettingPayload = Partial<
  Omit<OperationalSetting, 'id' | 'updatedAt' | 'updatedById'>
>;

export async function fetchOperationalSettings() {
  const res = await client.get<ApiEnvelope<OperationalSetting>>('/settings/operational');
  return res.data.data;
}

export async function updateOperationalSettings(payload: UpdateOperationalSettingPayload) {
  const res = await client.put<ApiEnvelope<OperationalSetting>>('/settings/operational', payload);
  return res.data.data;
}
