import { createResource, getResource, listResource, postAction, updateResource } from './resources';
import type {
  ApproveBookingPayload,
  ApproveBookingResult,
  CreatePublicBookingPayload,
  CreateTenantBookingPayload,
  PaginatedResponse,
  PublicBookingResult,
  PublicRoom,
  TenantBooking,
} from '../types';

export async function listPublicRooms(params?: Record<string, unknown>) {
  return listResource<PublicRoom>('/public/rooms', params) as Promise<PaginatedResponse<PublicRoom>>;
}

function readAlias<T>(source: unknown, ...keys: string[]): T | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) return value as T;
  }
  return undefined;
}

function normalizeTenantBooking(raw: TenantBooking): TenantBooking {
  return {
    ...raw,
    checkInDate: readAlias<string>(raw, 'checkInDate', 'check_in_date') ?? raw.checkInDate,
    plannedCheckOutDate: readAlias<string | null>(raw, 'plannedCheckOutDate', 'planned_check_out_date') ?? raw.plannedCheckOutDate ?? null,
    expiresAt: readAlias<string | null>(raw, 'expiresAt', 'expires_at') ?? raw.expiresAt ?? null,
    bookingSource: readAlias<string | null>(raw, 'bookingSource', 'booking_source') ?? raw.bookingSource ?? null,
    stayPurpose: readAlias<string | null>(raw, 'stayPurpose', 'stay_purpose') ?? raw.stayPurpose ?? null,
    invoiceCount: Number(readAlias<number | string>(raw, 'invoiceCount', 'invoice_count') ?? raw.invoiceCount ?? 0),
    latestInvoiceId: readAlias<number | null>(raw, 'latestInvoiceId', 'latest_invoice_id') ?? raw.latestInvoiceId ?? null,
    latestInvoiceNumber: readAlias<string | null>(raw, 'latestInvoiceNumber', 'latest_invoice_number') ?? raw.latestInvoiceNumber ?? null,
    latestInvoiceStatus: readAlias<string | null>(raw, 'latestInvoiceStatus', 'latest_invoice_status') ?? raw.latestInvoiceStatus ?? null,
    invoiceTotalAmountRupiah: Number(readAlias<number | string>(raw, 'invoiceTotalAmountRupiah', 'invoice_total_amount_rupiah') ?? (raw as any).invoiceTotalAmountRupiah ?? 0) || undefined,
    invoicePaidAmountRupiah: Number(readAlias<number | string>(raw, 'invoicePaidAmountRupiah', 'invoice_paid_amount_rupiah') ?? (raw as any).invoicePaidAmountRupiah ?? 0) || undefined,
    invoiceRemainingAmountRupiah: Number(readAlias<number | string>(raw, 'invoiceRemainingAmountRupiah', 'invoice_remaining_amount_rupiah') ?? (raw as any).invoiceRemainingAmountRupiah ?? 0) || undefined,
    depositPaidAmountRupiah: Number(readAlias<number | string>(raw, 'depositPaidAmountRupiah', 'deposit_paid_amount_rupiah') ?? (raw as any).depositPaidAmountRupiah ?? 0) || 0,
    depositPaymentStatus: readAlias<string | null>(raw, 'depositPaymentStatus', 'deposit_payment_status') ?? (raw as any).depositPaymentStatus ?? 'UNPAID',
    room: raw.room
      ? {
          ...raw.room,
          status: readAlias<string>(raw.room, 'status', 'roomStatus', 'room_status') ?? raw.room.status,
        }
      : raw.room,
  };
}

export async function createTenantBooking(payload: CreateTenantBookingPayload) {
  const response = await createResource<TenantBooking>('/tenant/bookings', payload as unknown as Record<string, unknown>);
  return normalizeTenantBooking(response);
}

export async function listMyTenantBookings(params?: Record<string, unknown>) {
  const response = await listResource<TenantBooking>('/tenant/bookings/my', params) as PaginatedResponse<TenantBooking>;
  return {
    ...response,
    items: (response.items ?? []).map((item) => normalizeTenantBooking(item)),
  } satisfies PaginatedResponse<TenantBooking>;
}

export async function approveBooking(stayId: number | string, payload: ApproveBookingPayload) {
  return updateResource<ApproveBookingResult>(`/admin/bookings/${stayId}/approve`, payload as unknown as Record<string, unknown>);
}

export async function getPublicRoomDetail(roomId: number | string) {
  return getResource<PublicRoom>(`/public/rooms/${roomId}`);
}

export async function createPublicBooking(payload: CreatePublicBookingPayload) {
  return createResource<PublicBookingResult>('/public/bookings', payload as unknown as Record<string, unknown>);
}

export interface CancelTenantBookingPayload {
  cancelReason?: string;
}

export interface CancelTenantBookingResult {
  id: number;
  status: string;
  cancelReason?: string;
}

export async function cancelTenantBooking(
  stayId: number | string,
  payload?: CancelTenantBookingPayload,
) {
  return postAction<CancelTenantBookingResult>(
    `/tenant/bookings/${stayId}/cancel`,
    payload as Record<string, unknown> | undefined,
  );
}
