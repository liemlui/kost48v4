import client from './client';
import type { ApiEnvelope, StaffFieldReport, StaffFieldReportReviewQueue } from '../types';

export type CreateStaffFieldReportPayload = {
  ticketId?: number;
  roomId?: number;
  roomItemId?: number;
  inventoryItemId?: number;
  reportedCondition: string;
  conditionNotes?: string;
  photoUrl?: string;
  photoFileKey?: string;
  photoOriginalFilename?: string;
  photoMimeType?: string;
  photoFileSizeBytes?: number;
  requestsReplacement?: boolean;
  requestedInventoryItemId?: number;
  requestedQty?: string;
};

export type AdminReviewStaffFieldReportPayload = {
  adminDecision: 'APPROVE' | 'REJECT' | 'NEEDS_MORE_INFO';
  adminNotes?: string;
  createMovement?: {
    inventoryItemId: number;
    movementType: 'ASSIGN_TO_ROOM' | 'OUT';
    qty: string;
    roomId?: number;
    movementDate?: string;
    note?: string;
  };
};

export async function createStaffFieldReport(payload: CreateStaffFieldReportPayload) {
  const response = await client.post<ApiEnvelope<{ report: StaffFieldReport; ticket: unknown }>>('/staff-field-reports', payload);
  return response.data.data;
}

export async function listStaffFieldReports(params?: Record<string, string | number | boolean | undefined>) {
  const response = await client.get<ApiEnvelope<{ items: StaffFieldReport[] }>>('/staff-field-reports', { params });
  return response.data.data;
}

export async function getStaffFieldReportReviewQueue() {
  const response = await client.get<ApiEnvelope<StaffFieldReportReviewQueue>>('/staff-field-reports/review-queue');
  return response.data.data;
}

export async function reviewStaffFieldReport(id: number, payload: AdminReviewStaffFieldReportPayload) {
  const response = await client.patch<ApiEnvelope<{ report: StaffFieldReport; movement?: unknown }>>(`/staff-field-reports/${id}/admin-review`, payload);
  return response.data.data;
}
