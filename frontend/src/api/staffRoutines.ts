import client from './client';
import type { ApiEnvelope } from '../types';

export type StaffRoutineFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type StaffRoutineAreaType = 'GENERAL' | 'BATHROOM' | 'ROOM' | 'INVENTORY' | 'METER' | 'SECURITY' | 'CLEANING';
export type StaffRoutineStatus = 'TODO' | 'DONE' | 'NEED_HELP' | 'MISSED' | 'SKIPPED';

export type StaffRoutineItem = {
  occurrenceKey: string;
  templateId: number;
  assignmentId?: number | null;
  title: string;
  description?: string | null;
  frequency: StaffRoutineFrequency;
  areaType: StaffRoutineAreaType;
  dueLabel?: string;
  dueDate: string;
  requiresPhoto?: boolean;
  requiresNote?: boolean;
  roomId?: number | null;
  room?: { id: number; code?: string; name?: string | null } | null;
  status: StaffRoutineStatus;
  completionId?: number | null;
  completedAt?: string | null;
  note?: string | null;
  photoUrl?: string | null;
};

export type StaffRoutineTodayResponse = {
  date: string;
  items: StaffRoutineItem[];
  summary: {
    total: number;
    completed: number;
    remaining: number;
    needHelp: number;
    completionPercent: number;
  };
};

export type StaffRoutineKpiResponse = {
  period: { from: string; to: string };
  completedRoutineCount: number;
  needHelpCount: number;
  roomAuditCount: number;
  meterCount: number;
  proofCompletionRate: number;
  message: string;
  weekPoints: { key: string; label: string; routinesDone: number }[];
};

export type StaffRoutineTemplatePayload = {
  title: string;
  description?: string;
  frequency: StaffRoutineFrequency;
  areaType?: StaffRoutineAreaType;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  requiresPhoto?: boolean;
  requiresNote?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  staffUserId?: number | null;
  roomId?: number | null;
};

export type StaffRoutineTemplate = StaffRoutineTemplatePayload & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
  assignments?: Array<{ id: number; staffUserId?: number | null; roomId?: number | null; room?: { code?: string; name?: string | null } | null; staffUser?: { fullName?: string } | null }>;
};

export async function fetchStaffRoutineToday() {
  const response = await client.get<ApiEnvelope<StaffRoutineTodayResponse>>('/staff-routines/today');
  return response.data.data;
}

export async function fetchMyStaffRoutineKpi() {
  const response = await client.get<ApiEnvelope<StaffRoutineKpiResponse>>('/staff-routines/kpi/me');
  return response.data.data;
}

export async function completeStaffRoutine(templateId: number, payload: { assignmentId?: number | null; roomId?: number | null; dueDate?: string; note?: string; photoUrl?: string }) {
  const response = await client.post<ApiEnvelope<unknown>>(`/staff-routines/${templateId}/complete`, payload);
  return response.data.data;
}

export async function sendStaffRoutineNeedHelp(templateId: number, payload: { assignmentId?: number | null; roomId?: number | null; dueDate?: string; note?: string; photoUrl?: string }) {
  const response = await client.post<ApiEnvelope<unknown>>(`/staff-routines/${templateId}/need-help`, payload);
  return response.data.data;
}

export async function fetchStaffRoutineTemplates() {
  const response = await client.get<ApiEnvelope<StaffRoutineTemplate[]>>('/admin/staff-routines/templates');
  return response.data.data;
}

export async function createStaffRoutineTemplate(payload: StaffRoutineTemplatePayload) {
  const response = await client.post<ApiEnvelope<StaffRoutineTemplate>>('/admin/staff-routines/templates', payload);
  return response.data.data;
}

export async function updateStaffRoutineTemplate(id: number, payload: Partial<StaffRoutineTemplatePayload>) {
  const response = await client.patch<ApiEnvelope<StaffRoutineTemplate>>(`/admin/staff-routines/templates/${id}`, payload);
  return response.data.data;
}

export async function deleteStaffRoutineTemplate(id: number) {
  const response = await client.delete<ApiEnvelope<StaffRoutineTemplate>>(`/admin/staff-routines/templates/${id}`);
  return response.data.data;
}

export async function fetchStaffRoutineProgress() {
  const response = await client.get<ApiEnvelope<any>>('/admin/staff-routines/progress');
  return response.data.data;
}
