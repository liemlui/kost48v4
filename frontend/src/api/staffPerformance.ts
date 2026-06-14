import client from './client';
import type { ApiEnvelope } from '../types';

export type StaffPerformanceCategory = {
  label: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Dibantu' | 'Perlu Diawasi' | string;
  tone: string;
  copy: string;
};

export type StaffPerformanceSummary = {
  period: { month: string; from: string; to: string };
  staff: { id: number; fullName: string; email?: string; role?: string; isActive?: boolean; createdAt?: string };
  category: StaffPerformanceCategory;
  score: { base: number; positiveValue: number; negativeValue: number; raw?: number; final: number; netKpi?: number };
  monthlyKpi: {
    routineDone: number;
    routineNeedHelp: number;
    ticketsDone: number;
    meterCount: number;
    stockReports: number;
    roomChecks: number;
    auditPass: number;
    auditNeedsFix: number;
    auditFailed: number;
    proofCompletionRate: number;
  };
  tenantReviews: { count: number; averageRating: number | null; highReviewCount: number; lowReviewCount: number; items?: any[] };
  audits?: any[];
  assistant: { title: string; summary: string; strengths: string[]; recommendations: string[] };
  evidence?: { routines: any[]; tickets: any[]; meters: any[]; events: any[] };
};

export type AdminStaffPerformanceResponse = {
  period: { month: string; from: string; to: string };
  items: StaffPerformanceSummary[];
  summary: { totalStaff: number; veryGood: number; good: number; needWatch: number; negativeValue: number; tenantReviewCount: number };
};

export type StaffAuditPayload = {
  staffId: number;
  sourceType: 'ROUTINE' | 'TICKET' | 'METER' | 'ROOM_CHECK' | 'STOCK_REPORT' | 'INVENTORY_REPORT' | 'TENANT_REVIEW' | 'MANUAL_AUDIT';
  sourceId?: number | null;
  result: 'PASS' | 'NEEDS_FIX' | 'FAILED' | 'NOT_DONE';
  notes?: string;
  photoUrl?: string;
};


export type StaffAuditSuggestion = {
  id: string;
  staff: { id: number; fullName: string; email?: string };
  sourceType: StaffAuditPayload['sourceType'];
  sourceId?: number | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  riskScore: number;
  title: string;
  reason: string;
  recommendedAction: string;
  location?: string | null;
  status?: string | null;
  evidenceState?: string | null;
  createdAt?: string | null;
};

export type StaffAuditSuggestionResponse = {
  period: { month: string; from: string; to: string };
  brief: { title: string; summary: string; recommendations: string[] };
  summary: { totalSuggestions: number; high: number; medium: number; low: number; staffWithRisk: number };
  items: StaffAuditSuggestion[];
};

export async function fetchMyStaffPerformance(month?: string) {
  const response = await client.get<ApiEnvelope<StaffPerformanceSummary>>('/staff-performance/me/monthly', { params: { month } });
  return response.data.data;
}

export async function fetchMyStaffPerformanceEvidence(month?: string) {
  const response = await client.get<ApiEnvelope<StaffPerformanceSummary>>('/staff-performance/me/evidence', { params: { month } });
  return response.data.data;
}

export interface StaffLeaderboard {
  active: boolean;
  totalStaff: number;
  period: { month: string };
  items: Array<{ staffId: number; fullName: string; score: number; rank: number; category?: { label: string; tone: string } }>;
}

export async function fetchStaffLeaderboard(month?: string) {
  const response = await client.get<ApiEnvelope<StaffLeaderboard>>('/admin/staff-performance/leaderboard', { params: { month } });
  return response.data.data;
}

export async function fetchAdminStaffPerformance(month?: string) {
  const response = await client.get<ApiEnvelope<AdminStaffPerformanceResponse>>('/admin/staff-performance/monthly', { params: { month } });
  return response.data.data;
}

export async function fetchAdminStaffPerformanceDetail(staffId: number, month?: string) {
  const response = await client.get<ApiEnvelope<StaffPerformanceSummary>>(`/admin/staff-performance/${staffId}/monthly`, { params: { month } });
  return response.data.data;
}

export async function createStaffWorkAudit(payload: StaffAuditPayload) {
  const response = await client.post<ApiEnvelope<any>>('/admin/staff-performance/audits', payload);
  return response.data.data;
}


export async function fetchAdminStaffAuditSuggestions(month?: string) {
  const response = await client.get<ApiEnvelope<StaffAuditSuggestionResponse>>('/admin/staff-performance/audit-suggestions', { params: { month } });
  return response.data.data;
}
