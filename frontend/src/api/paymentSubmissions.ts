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
