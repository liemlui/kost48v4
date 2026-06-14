import client from './client';
import type { ApiEnvelope } from '../types';

// F4-9 Gamifikasi & Loyalitas — API client.

export interface LoyaltyHistoryItem {
  id: number;
  delta: number;
  reason: string;
  note: string | null;
  createdAt: string;
}

export interface LoyaltyMine {
  balance: number;
  items: LoyaltyHistoryItem[];
}

export interface LoyaltyReward {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  type: string;
  valueRupiah: number | null;
  isActive: boolean;
  stockQty: number | null;
  createdAt: string;
}

export interface Redemption {
  id: number;
  tenantId: number;
  rewardId: number;
  pointCost: number;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
  reward?: { name: string; type: string; pointCost?: number };
  tenant?: { fullName: string };
}

export interface LoyaltyConfig {
  pointRupiahValue: number;
  pointValues: Record<string, number>;
}

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const res = await client.get<ApiEnvelope<LoyaltyConfig>>('/loyalty/config');
  return res.data.data;
}

// ── Tenant ──────────────────────────────────────────
export async function getMyLoyalty(): Promise<LoyaltyMine> {
  const res = await client.get<ApiEnvelope<LoyaltyMine>>('/me/loyalty');
  return res.data.data;
}

export async function getMyRedemptions(): Promise<Redemption[]> {
  const res = await client.get<ApiEnvelope<Redemption[]>>('/me/loyalty/redemptions');
  return res.data.data;
}

export async function requestRedemption(rewardId: number): Promise<{ id: number }> {
  const res = await client.post<ApiEnvelope<{ id: number }>>('/me/loyalty/redemptions', { rewardId });
  return res.data.data;
}

// ── Katalog (semua user auth) ───────────────────────
export async function getRewards(includeInactive = false): Promise<LoyaltyReward[]> {
  const res = await client.get<ApiEnvelope<LoyaltyReward[]>>('/loyalty/rewards', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return res.data.data;
}

// ── Admin / Owner ───────────────────────────────────
export interface RewardInput {
  name: string;
  description?: string;
  pointCost: number;
  type: string;
  valueRupiah?: number;
  stockQty?: number;
  isActive?: boolean;
}

export async function createReward(input: RewardInput): Promise<LoyaltyReward> {
  const res = await client.post<ApiEnvelope<LoyaltyReward>>('/loyalty/rewards', input);
  return res.data.data;
}

export async function updateReward(id: number, input: Partial<RewardInput>): Promise<LoyaltyReward> {
  const res = await client.patch<ApiEnvelope<LoyaltyReward>>(`/loyalty/rewards/${id}`, input);
  return res.data.data;
}

export async function getRedemptions(status?: string): Promise<Redemption[]> {
  const res = await client.get<ApiEnvelope<Redemption[]>>('/loyalty/redemptions', {
    params: status ? { status } : undefined,
  });
  return res.data.data;
}

export async function decideRedemption(id: number, decision: 'APPROVE' | 'REJECT', note?: string): Promise<Redemption> {
  const res = await client.post<ApiEnvelope<Redemption>>(`/loyalty/redemptions/${id}/decide`, { decision, note });
  return res.data.data;
}
