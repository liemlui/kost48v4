import client from './client';
import type { ApiEnvelope } from '../types';

// Analisa pasar (SWOT/PESTLE/kompetitor) via chat AI DeepSeek (owner). Riset web live = fase lanjutan.

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type AnalysisKind = 'SWOT' | 'PESTLE' | 'COMPETITOR' | 'OTHER';

export type MarketChatResult = {
  configured: boolean;
  mode: string;
  reply: string;
  done: boolean;
  result?: Record<string, unknown> | null;
};

export type MarketAnalysis = {
  id: number;
  kind: AnalysisKind | string;
  title: string;
  summary?: string | null;
  resultJson?: Record<string, unknown> | null;
  transcriptJson?: ChatTurn[] | null;
  createdAt: string;
  createdBy?: { id: number; fullName: string } | null;
};

export async function getMarketAnalysisStatus(): Promise<{ configured: boolean }> {
  const res = await client.get<ApiEnvelope<{ configured: boolean }>>('/market-analysis/status');
  return res.data.data;
}

export async function marketAnalysisChat(kind: string, messages: ChatTurn[]): Promise<MarketChatResult> {
  const res = await client.post<ApiEnvelope<MarketChatResult>>('/market-analysis/chat', { kind, messages });
  return res.data.data;
}

export async function saveMarketAnalysis(payload: {
  kind: string;
  title: string;
  summary?: string;
  resultJson?: Record<string, unknown>;
  transcript?: ChatTurn[];
}): Promise<MarketAnalysis> {
  const res = await client.post<ApiEnvelope<MarketAnalysis>>('/market-analysis', payload);
  return res.data.data;
}

export async function listMarketAnalyses(): Promise<MarketAnalysis[]> {
  const res = await client.get<ApiEnvelope<MarketAnalysis[]>>('/market-analysis');
  return res.data.data;
}

export async function getMarketAnalysis(id: number): Promise<MarketAnalysis> {
  const res = await client.get<ApiEnvelope<MarketAnalysis>>(`/market-analysis/${id}`);
  return res.data.data;
}

export async function deleteMarketAnalysis(id: number): Promise<void> {
  await client.delete(`/market-analysis/${id}`);
}
