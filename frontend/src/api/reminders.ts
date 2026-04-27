import client from './client';
import type { ApiEnvelope } from '../types';

// ── Types ────────────────────────────────────────

export interface BookingExpiryCandidate {
  stayId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  expiresAt: string;
  hoursRemaining: number;
  messagePreview: string;
}

export interface InvoiceDueCandidate {
  invoiceId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  invoiceNumber: string | null;
  amountRupiah: number;
  dueDate: string;
  daysRemaining: number;
  messagePreview: string;
}

export interface InvoiceOverdueCandidate {
  invoiceId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  invoiceNumber: string | null;
  amountRupiah: number;
  dueDate: string;
  daysOverdue: number;
  messagePreview: string;
}

export interface CheckoutCandidate {
  stayId: number;
  tenantId: number;
  tenantName: string;
  phone: string | null;
  roomCode: string | null;
  plannedCheckOutDate: string;
  daysRemaining: number;
  messagePreview: string;
}

export interface AllPreviewsResponse {
  bookingExpiry: BookingExpiryCandidate[];
  invoiceDue: InvoiceDueCandidate[];
  invoiceOverdue: InvoiceOverdueCandidate[];
  checkout: CheckoutCandidate[];
}

// ── Mock send types ──────────────────────────────

export type MockReminderType = 'BOOKING_EXPIRY' | 'INVOICE_DUE' | 'INVOICE_OVERDUE' | 'CHECKOUT';

export interface MockSendPayload {
  type: MockReminderType;
  candidateId: string;
  phone: string;
  message: string;
}

export interface MockSendResult {
  mock: true;
  status: 'MOCK_SENT';
  type: MockReminderType;
  candidateId: string;
  phone: string;
  messagePreview: string;
  sentAt: string;
}

// ── API calls ────────────────────────────────────

export async function getReminderPreviewAll(): Promise<AllPreviewsResponse> {
  const response = await client.get<ApiEnvelope<AllPreviewsResponse>>('/admin/reminders/preview/all');
  return response.data.data;
}

export async function mockSendReminder(payload: MockSendPayload): Promise<MockSendResult> {
  const response = await client.post<ApiEnvelope<MockSendResult>>('/admin/reminders/mock-send', payload);
  return response.data.data;
}
