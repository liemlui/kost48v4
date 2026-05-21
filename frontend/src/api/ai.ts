import client from './client';
import type { ApiEnvelope } from '../types';

export type AiResult<T = Record<string, unknown>> = T & {
  mode?: 'RULE_FALLBACK' | 'PROVIDER_READY_BUT_DISABLED';
  cached?: boolean;
  disclaimer?: string;
};

export type PaymentProofAiResult = AiResult<{
  submissionId: number | null;
  detectedAmountRupiah: number | null;
  detectedDate: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matches: string[];
  warnings: string[];
  recommendedAction: string;
}>;

export async function analyzePaymentProof(payload: {
  submissionId?: number;
  expectedAmountRupiah?: number;
  submittedAmountRupiah?: number;
  paidAt?: string;
  senderName?: string | null;
  senderBankName?: string | null;
  referenceNumber?: string | null;
  fileName?: string | null;
  notes?: string | null;
}) {
  const response = await client.post<ApiEnvelope<PaymentProofAiResult>>('/ai/payment-proof/analyze', payload);
  return response.data.data;
}

export async function createBusinessNarrative(payload: {
  period?: string;
  context?: string;
  metrics?: Record<string, unknown>;
  signals?: unknown[];
}) {
  const response = await client.post<ApiEnvelope<AiResult<{ title: string; summary: string; recommendations: string[] }>>>('/ai/business-narrative', payload);
  return response.data.data;
}
