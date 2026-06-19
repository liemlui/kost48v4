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

// ── Fase G: Owner AI ──────────────────────────────────────────────────────────

export type OwnerAiStatus = {
  configured: boolean;
  enabled: boolean;
  defaultModel: string;
  financeModel: string;
  manualOnly: boolean;
  ownerAdminOnly: boolean;
  dailyLimit: number;
  dailyRemaining: number;
  logUsage: boolean;
};

export async function getOwnerAiStatus() {
  const response = await client.get<ApiEnvelope<OwnerAiStatus>>('/owner-ai/status');
  return response.data.data;
}

export type BriefResult = {
  mode: string;
  model: string;
  fallback: boolean;
  warnings: string[];
  missingData: string[];
  result: {
    summary: string;
    priorityActions: Array<{ title: string; reason: string; route?: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
    risks: Array<{ title: string; impact: string; mitigation: string }>;
    numbersToWatch: Array<{ label: string; value: string; why: string }>;
  };
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
};

export async function generateBrief() {
  const response = await client.post<ApiEnvelope<BriefResult>>('/owner-ai/brief');
  return response.data.data;
}

export type FinanceResult = {
  mode: string;
  model: string;
  fallback: boolean;
  warnings: string[];
  missingData: string[];
  result: {
    executiveSummary: string;
    healthScore: number;
    findings: Array<{
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      area: string;
      finding: string;
      evidence: string;
      recommendedAction: string;
      route?: string;
    }>;
    ownerQuestions: string[];
    doNotTouch: string[];
  };
  usage?: { total_tokens?: number };
  snapshotHash?: string;
};

export type PaymentReviewResult = {
  mode: string;
  model?: string;
  fallback: boolean;
  warnings: string[];
  missingData: string[];
  result: {
    recommendation: 'APPROVE' | 'REJECT' | 'ASK_MORE_INFO';
    confidence: number;
    reason: string;
    riskFlags: string[];
    reviewNoteDraft: string;
    requiredHumanChecks: string[];
  };
  usage?: { total_tokens?: number };
  snapshotHash?: string;
};

export async function reviewPaymentSubmission(submissionId: number) {
  const response = await client.post<ApiEnvelope<PaymentReviewResult>>(`/owner-ai/payment-submissions/${submissionId}/review-draft`);
  return response.data.data;
}

export async function analyzeFinance() {
  const response = await client.post<ApiEnvelope<FinanceResult>>('/owner-ai/finance/analyze');
  return response.data.data;
}

export type ExpenseReceiptDraft = {
  expenseDate: string | null;
  vendorName: string | null;
  amountRupiah: number;
  category: string;
  type: string;
  description: string;
  note: string;
  confidence: number;
  needsReview: string[];
};

export type ExpenseReceiptDraftResult = {
  mode: string;
  model: string;
  fallback: boolean;
  warnings: string[];
  result: ExpenseReceiptDraft;
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
};

export async function draftExpenseReceiptFromOcr(ocrText: string) {
  const response = await client.post<ApiEnvelope<ExpenseReceiptDraftResult>>('/owner-ai/expenses/receipt-draft', { ocrText });
  return response.data.data;
}

// ── G5: KTP OCR Validator ──────────────────────────────────────────────────────

export type KtpOcrValidateResult = {
  mode: 'DEEPSEEK' | 'RULE_FALLBACK';
  model?: string;
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
  fallback?: boolean;
  confidence?: number;
  warnings: string[];
  result: {
    extracted: {
      nik?: string | null;
      name?: string | null;
      birthPlace?: string | null;
      birthDate?: string | null;
      gender?: 'MALE' | 'FEMALE' | null;
      address?: string | null;
    };
    nikFormatValid: boolean;
    demographicsFromNik: { birthDate: string | null; gender: 'MALE' | 'FEMALE' | null };
    match: { nameMatchesTenant: boolean | null; nikMatchesTenant: boolean; warnings: string[] };
    recommendation: 'VERIFY' | 'REVIEW_MANUALLY' | 'REJECT';
  };
  missingData: string[];
};

/** Kirim TEKS OCR KTP (BUKAN gambar) untuk divalidasi vs data tenant. */
export async function validateKtpOcr(tenantId: number, ocrText: string) {
  const response = await client.post<ApiEnvelope<KtpOcrValidateResult>>(
    `/owner-ai/tenants/${tenantId}/ktp-ocr-validate`,
    { ocrText },
  );
  return response.data.data;
}

// G6: Operations & inventory AI drafts. Semua hasil hanya saran manual.

export type TicketActionDraftResult = {
  mode: 'DEEPSEEK' | 'RULE_FALLBACK';
  model?: string;
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
  fallback?: boolean;
  warnings: string[];
  result: {
    summary: string;
    recommendedAction: 'ASSIGN_STAFF' | 'CREATE_EXPENSE_DRAFT' | 'REQUEST_PHOTO' | 'CLOSE' | 'KEEP_OPEN';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedNote: string;
    riskFlags: string[];
  };
  missingData: string[];
};

export async function draftTicketAction(ticketId: number) {
  const response = await client.post<ApiEnvelope<TicketActionDraftResult>>(`/owner-ai/tickets/${ticketId}/action-draft`);
  return response.data.data;
}

export type InventoryReorderDraftResult = {
  mode: 'DEEPSEEK' | 'RULE_FALLBACK';
  model?: string;
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
  fallback?: boolean;
  warnings: string[];
  result: {
    lowStockItems: Array<{
      inventoryItemId: number;
      name: string;
      currentQty: number;
      suggestedMinQty: number;
      reason: string;
    }>;
    purchaseSuggestions: Array<{
      name: string;
      qty: number;
      estimatedBudgetRupiah: number;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    warnings: string[];
  };
  missingData: string[];
};

export async function draftInventoryReorder() {
  const response = await client.post<ApiEnvelope<InventoryReorderDraftResult>>('/owner-ai/inventory/reorder-draft');
  return response.data.data;
}

export type FieldReportReviewDraftResult = {
  mode: 'DEEPSEEK' | 'RULE_FALLBACK';
  model?: string;
  usage?: { total_tokens?: number };
  snapshotHash?: string;
  promptHash?: string;
  fallback?: boolean;
  warnings: string[];
  result: {
    summary: string;
    recommendedDecision: 'APPROVE' | 'REJECT' | 'NEEDS_MORE_INFO';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedAdminNote: string;
    suggestedMovement: { needed: boolean; movementType: 'ASSIGN_TO_ROOM' | 'OUT' | null; reason: string };
    riskFlags: string[];
  };
  missingData: string[];
};

export async function reviewFieldReportWithAi(reportId: number) {
  const response = await client.post<ApiEnvelope<FieldReportReviewDraftResult>>(`/owner-ai/staff-field-reports/${reportId}/review-draft`);
  return response.data.data;
}

// ── G7: AI Settings, Budget & Observability ─────────────────────────────────────

export type OwnerAiAuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorName: string | null;
  ai: {
    feature?: string;
    mode?: string;
    model?: string;
    confidence?: number;
    humanDecision?: string;
    usage?: { total_tokens?: number };
  } | null;
};

export type OwnerAiUsage = {
  enabled: boolean;
  dailyLimit: number;
  todayTotal: number;
  remainingDaily: number;
  byFeature: Record<string, number>;
  recentAudit: OwnerAiAuditEntry[];
};

export type OwnerAiTestResult = {
  configured: boolean;
  ok: boolean;
  model?: string;
  latencyMs?: number;
  usage?: { total_tokens?: number };
  message: string;
};

export async function getOwnerAiUsage() {
  const response = await client.get<ApiEnvelope<OwnerAiUsage>>('/owner-ai/usage');
  return response.data.data;
}

export async function testOwnerAiConnection() {
  const response = await client.post<ApiEnvelope<OwnerAiTestResult>>('/owner-ai/test-connection');
  return response.data.data;
}
