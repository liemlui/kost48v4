import client from './client';
import axios from 'axios';

const BASE = '/faqs';

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateFaqPayload = {
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateFaqPayload = Partial<CreateFaqPayload>;

// Public endpoint — no auth, uses absolute URL to backend
const BACKEND_BASE = (import.meta.env.VITE_API_BASE_URL || '/api');
export async function fetchPublicFaqs(): Promise<FaqItem[]> {
  const res = await axios.get<{ data: FaqItem[] }>(`${BACKEND_BASE}/faqs/public`);
  return res.data.data ?? [];
}

export async function fetchAllFaqs(): Promise<FaqItem[]> {
  const res = await client.get<{ data: FaqItem[] }>(BASE);
  return res.data.data ?? [];
}

export async function createFaq(payload: CreateFaqPayload): Promise<FaqItem> {
  const res = await client.post<{ data: FaqItem }>(BASE, payload);
  return res.data.data;
}

export async function updateFaq(id: number, payload: UpdateFaqPayload): Promise<FaqItem> {
  const res = await client.patch<{ data: FaqItem }>(`${BASE}/${id}`, payload);
  return res.data.data;
}

export async function deleteFaq(id: number): Promise<void> {
  await client.delete(`${BASE}/${id}`);
}
