import client from './client';
import type { ApiEnvelope } from '../types';

export type SubmitSurveyPayload = {
  overallRating: number;
  cleanliness?: number;
  staffService?: number;
  facility?: number;
  valueForMoney?: number;
  wouldRecommend?: boolean;
  comment?: string;
};

export type SurveySummary = {
  count: number;
  avgOverall: number | null;
  avgCleanliness: number | null;
  avgStaffService: number | null;
  avgFacility: number | null;
  avgValueForMoney: number | null;
  recommendRate: number | null;
  recentComments: Array<{ id: number; comment: string | null; overallRating: number; createdAt: string }>;
};

export async function submitSurvey(payload: SubmitSurveyPayload): Promise<{ id: number }> {
  const res = await client.post<ApiEnvelope<{ id: number }>>('/surveys', payload);
  return res.data.data;
}

export type SurveyMineStatus = {
  submitted: boolean;
  eligible: boolean;
  reason?: 'min_stay_30_days' | 'cooldown_6_months';
  eligibleAt?: string;       // ISO — kapan form mulai tersedia (gate 30 hari)
  nextEligibleAt?: string;   // ISO — kapan bisa isi ulang (gate 6 bulan)
  last?: { id: number; overallRating: number; createdAt: string };
};

export async function getMySurveyStatus(): Promise<SurveyMineStatus> {
  const res = await client.get<ApiEnvelope<SurveyMineStatus>>('/surveys/mine');
  return res.data.data;
}

export async function getSurveySummary(): Promise<SurveySummary> {
  const res = await client.get<ApiEnvelope<SurveySummary>>('/surveys/summary');
  return res.data.data;
}

export type SurveyItem = {
  id: number;
  tenantId: number | null;
  overallRating: number;
  cleanliness: number | null;
  staffService: number | null;
  facility: number | null;
  valueForMoney: number | null;
  wouldRecommend: boolean | null;
  comment: string | null;
  createdById: number;
  createdAt: string;
};

export async function getAllSurveys(): Promise<SurveyItem[]> {
  const res = await client.get<ApiEnvelope<SurveyItem[]>>('/surveys');
  return res.data.data;
}
