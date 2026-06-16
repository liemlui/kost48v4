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
  totalEarned?: number;
  totalRedeemed?: number;
  items: LoyaltyHistoryItem[];
}

export interface LoyaltyLeaderboardEntry {
  rank: number;
  roomCode: string;
  points: number;
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
  fulfillmentTaskCategory?: string | null;
  fulfillmentTaskTitle?: string | null;
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

export async function getLoyaltyLeaderboard(): Promise<LoyaltyLeaderboardEntry[]> {
  const res = await client.get<ApiEnvelope<LoyaltyLeaderboardEntry[]>>('/me/loyalty/leaderboard');
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
  fulfillmentTaskCategory?: string;
  fulfillmentTaskTitle?: string;
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

// ── F4-13 referral ──────────────────────────────────
export async function getReferralCode(): Promise<{ code: string | null }> {
  const res = await client.get<ApiEnvelope<{ code: string | null }>>('/me/loyalty/referral-code');
  return res.data.data;
}

// ── F4-13c peer behavior reports ────────────────────
export interface PeerReport {
  id: number;
  category: string;
  description: string;
  status: string;
  acknowledgedAt?: string | null;
  improvedAt?: string | null;
  confirmedAt?: string | null;
  reporter?: { fullName: string };
  reportee?: { fullName: string };
}

export interface CoTenant { id: number; fullName: string; room: string | null }

export async function getCoTenants(): Promise<CoTenant[]> {
  const res = await client.get<ApiEnvelope<CoTenant[]>>('/me/peer-reports/co-tenants');
  return res.data.data;
}

export async function createPeerReport(payload: { reporteeTenantId: number; category: string; description: string }): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>('/me/peer-reports', payload);
  return res.data.data;
}

export async function getMyPeerReportsMade(): Promise<PeerReport[]> {
  const res = await client.get<ApiEnvelope<PeerReport[]>>('/me/peer-reports/made');
  return res.data.data;
}

export async function getMyPeerReportsAboutMe(): Promise<PeerReport[]> {
  const res = await client.get<ApiEnvelope<PeerReport[]>>('/me/peer-reports/about-me');
  return res.data.data;
}

export async function markPeerReportImproved(id: number): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>(`/me/peer-reports/${id}/improved`, {});
  return res.data.data;
}

export async function getPeerReportsAdmin(status?: string): Promise<PeerReport[]> {
  const res = await client.get<ApiEnvelope<PeerReport[]>>('/peer-reports', { params: status ? { status } : undefined });
  return res.data.data;
}

export async function moderatePeerReport(id: number, decision: 'ACKNOWLEDGE' | 'DISMISS'): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>(`/peer-reports/${id}/moderate`, { decision });
  return res.data.data;
}

export async function confirmPeerReport(id: number): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>(`/peer-reports/${id}/confirm`, {});
  return res.data.data;
}
