import client from './client';
import type { ApiEnvelope } from '../types';

// F4-2 PWA Web Push — API client.

export interface VapidPublicKeyResponse {
  publicKey: string | null;
  enabled: boolean;
}

export async function getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
  const res = await client.get<ApiEnvelope<VapidPublicKeyResponse>>('/push/vapid-public-key');
  return res.data.data;
}

export async function subscribePush(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<{ id: number }> {
  const res = await client.post<ApiEnvelope<{ id: number }>>('/push/subscribe', payload);
  return res.data.data;
}

export async function unsubscribePush(endpoint: string): Promise<{ affected: number }> {
  const res = await client.post<ApiEnvelope<{ affected: number }>>('/push/unsubscribe', { endpoint });
  return res.data.data;
}
