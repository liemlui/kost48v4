import client from './client';
import type { ApiEnvelope } from '../types';

// G9: antrean draft AI lintas sesi (OWNER/ADMIN).

export type AiDraftStatus = 'DRAFT' | 'APPLIED' | 'REJECTED' | 'EXPIRED';

export type AiDraft = {
  id: number;
  feature: string;
  targetType: string | null;
  targetId: string | null;
  status: AiDraftStatus;
  mode: string;
  model: string | null;
  snapshotHash: string | null;
  promptHash: string | null;
  confidence: number | null;
  resultJson: Record<string, unknown>;
  usageJson: Record<string, unknown> | null;
  createdById: number | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveAiDraftPayload = {
  feature: string;
  targetType?: string;
  targetId?: string;
  mode: string;
  model?: string;
  snapshotHash?: string;
  promptHash?: string;
  confidence?: number;
  resultJson: Record<string, unknown>;
  usageJson?: Record<string, unknown>;
};

export async function saveAiDraft(payload: SaveAiDraftPayload) {
  const res = await client.post<ApiEnvelope<AiDraft>>('/owner-ai/drafts', payload);
  return res.data.data;
}

export async function listAiDrafts(query?: { feature?: string; status?: AiDraftStatus; targetType?: string; targetId?: string }) {
  const res = await client.get<ApiEnvelope<AiDraft[]>>('/owner-ai/drafts', { params: query });
  return res.data.data;
}

export async function reviewAiDraft(id: number, decision: 'APPLIED' | 'REJECTED', reviewNote?: string) {
  const res = await client.post<ApiEnvelope<AiDraft>>(`/owner-ai/drafts/${id}/review`, { decision, reviewNote });
  return res.data.data;
}

export async function expireAiDrafts() {
  const res = await client.post<ApiEnvelope<{ expired: number }>>('/owner-ai/drafts/run/expire');
  return res.data.data;
}
