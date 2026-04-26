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

// ── API calls ────────────────────────────────────

export async function getReminderPreviewAll(): Promise<AllPreviewsResponse> {
  const response = await client.get<ApiEnvelope<AllPreviewsResponse>>('/admin/reminders/preview/all');
  return response.data.data;
}
