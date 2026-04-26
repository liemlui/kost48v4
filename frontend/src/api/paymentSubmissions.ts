import apiClient from './client';
import { createResource, listResource, postAction } from './resources';
import type {
  CreatePaymentSubmissionPayload,
  PaginatedResponse,
  PaymentSubmission,
  ReviewQueueQuery,
} from '../types';

export async function createPaymentSubmission(payload: CreatePaymentSubmissionPayload) {
  return createResource<PaymentSubmission>('/payment-submissions', payload as unknown as Record<string, unknown>);
}

export async function listMyPaymentSubmissions(params?: ReviewQueueQuery) {
  return listResource<PaymentSubmission>('/payment-submissions/my', params as Record<string, unknown>) as Promise<PaginatedResponse<PaymentSubmission>>;
}

export async function listPaymentReviewQueue(params?: ReviewQueueQuery) {
  return listResource<PaymentSubmission>('/payment-submissions/review-queue', params as Record<string, unknown>) as Promise<PaginatedResponse<PaymentSubmission>>;
}

export async function approvePaymentSubmission(id: number | string) {
  return postAction<PaymentSubmission>(`/payment-submissions/${id}/approve`);
}

export async function rejectPaymentSubmission(id: number | string, reviewNotes: string) {
  return postAction<PaymentSubmission>(`/payment-submissions/${id}/reject`, { reviewNotes });
}

export async function runPaymentSubmissionExpiryCheck() {
  return postAction<{ expiredCount: number; stayIds: number[] }>(`/payment-submissions/internal/run-expiry-check`);
}


export async function expireReservedBooking(stayId: number | string) {
  return postAction<{ expiredCount: number; stayIds: number[] }>(`/payment-submissions/internal/expire-booking/${stayId}`);
}


export async function uploadPaymentProof(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/payment-submissions/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as { fileKey: string; fileUrl: string; originalFilename: string; mimeType: string; fileSizeBytes: number };
}
