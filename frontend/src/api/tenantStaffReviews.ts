import client from './client';
import type { ApiEnvelope } from '../types';

export type EligibleStaffReviewItem = {
  ticketId: number;
  ticketNumber?: string;
  title?: string;
  status: string;
  updatedAt?: string;
  room?: { id: number; code?: string; name?: string | null } | null;
  staff?: { id: number; fullName: string; role: string } | null;
};

export async function fetchEligibleStaffReviews() {
  const response = await client.get<ApiEnvelope<{ items: EligibleStaffReviewItem[] }>>('/tenant/staff-reviews/eligible');
  return response.data.data;
}

export async function submitTenantStaffReview(payload: { ticketId: number; rating: number; comment?: string }) {
  const response = await client.post<ApiEnvelope<any>>('/tenant/staff-reviews', payload);
  return response.data.data;
}
