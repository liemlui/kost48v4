import client from './client';
import type { ApiEnvelope } from '../types';

const BASE = '/guest-preferences';

// --- Types ---

export interface GuestPreferenceRow {
  id: string;
  bathroom: string | null;
  cooling: string | null;
  roomSize: string | null;
  roomType: string | null;
  priorities: string | null;
  estimatedPriceRupiah: number | null;
  skipped: boolean;
  sessionId: string | null;
  userAgent: string | null;
  referrer: string | null;
  createdAt: string;
}

export interface GuestPreferencesListResponse {
  rows: GuestPreferenceRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GuestPreferencesStats {
  total: number;
  totalThisMonth: number;
  totalSkipped: number;
  totalCompleted: number;
  avgEstimatedPrice: number | null;
  preferenceCounts: {
    bathroom: Record<string, number>;
    cooling: Record<string, number>;
    roomSize: Record<string, number>;
    roomType: Record<string, number>;
  };
}

export interface GuestPreferencesQuery {
  page?: number;
  pageSize?: number;
  skipped?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// --- API functions ---

export async function fetchGuestPreferences(query: GuestPreferencesQuery = {}): Promise<GuestPreferencesListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.skipped !== undefined) params.set('skipped', String(query.skipped));
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);

  const qs = params.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;
  const res = await client.get<ApiEnvelope<GuestPreferencesListResponse>>(url);
  return res.data.data;
}

export async function fetchGuestPreferencesStats(): Promise<GuestPreferencesStats> {
  const res = await client.get<ApiEnvelope<GuestPreferencesStats>>(`${BASE}/stats`);
  return res.data.data;
}
