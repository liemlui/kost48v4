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

export async function getMySurveyStatus(): Promise<{ submitted: boolean; last?: { id: number; overallRating: number; createdAt: string } }> {
  const res = await client.get<ApiEnvelope<{ submitted: boolean; last?: { id: number; overallRating: number; createdAt: string } }>>('/surveys/mine');
  return res.data.data;
}

export async function getSurveySummary(): Promise<SurveySummary> {
  const res = await client.get<ApiEnvelope<SurveySummary>>('/surveys/summary');
  return res.data.data;
}
