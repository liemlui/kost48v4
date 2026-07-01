import apiClient from './client';
import { createResource, listResource, postAction } from './resources';
import type {
  BatchPaymentSubmissionPayload,
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


export async function submitPaymentWithProof(payload: CreatePaymentSubmissionPayload, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('stayId', String(payload.stayId));
  formData.append('invoiceId', String(payload.invoiceId));
  formData.append('targetType', payload.targetType);
  formData.append('amountRupiah', String(payload.amountRupiah));
  formData.append('paidAt', payload.paidAt);
  formData.append('paymentMethod', payload.paymentMethod);
  if (payload.senderName) formData.append('senderName', payload.senderName);
  if (payload.senderBankName) formData.append('senderBankName', payload.senderBankName);
  if (payload.referenceNumber) formData.append('referenceNumber', payload.referenceNumber);
  if (payload.notes) formData.append('notes', payload.notes);
  const { data } = await apiClient.post('/payment-submissions/submit-with-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as PaymentSubmission;
}

/** M-4: Legacy JSON batch endpoint; proof metadata is not accepted. */
export async function createBatchPaymentSubmission(payload: BatchPaymentSubmissionPayload) {
  const { data } = await apiClient.post('/payment-submissions/batch', payload);
  return data.data as PaymentSubmission[];
}

export async function submitBatchPaymentWithProof(payload: BatchPaymentSubmissionPayload, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('stayId', String(payload.stayId));
  formData.append('invoiceIds', JSON.stringify(payload.invoiceIds));
  formData.append('paidAt', payload.paidAt);
  formData.append('paymentMethod', payload.paymentMethod);
  if (payload.senderName) formData.append('senderName', payload.senderName);
  if (payload.senderBankName) formData.append('senderBankName', payload.senderBankName);
  if (payload.referenceNumber) formData.append('referenceNumber', payload.referenceNumber);
  if (payload.notes) formData.append('notes', payload.notes);

  const { data } = await apiClient.post('/payment-submissions/submit-batch-with-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as PaymentSubmission[];
}
