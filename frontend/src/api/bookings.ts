import { createResource, listResource } from './resources';
import type {
  CreateTenantBookingPayload,
  PaginatedResponse,
  PublicRoom,
  TenantBooking,
} from '../types';

export async function listPublicRooms(params?: Record<string, unknown>) {
  return listResource<PublicRoom>('/public/rooms', params) as Promise<PaginatedResponse<PublicRoom>>;
}

export async function createTenantBooking(payload: CreateTenantBookingPayload) {
  return createResource<TenantBooking>('/tenant/bookings', payload as unknown as Record<string, unknown>);
}

export async function listMyTenantBookings(params?: Record<string, unknown>) {
  return listResource<TenantBooking>('/tenant/bookings/my', params) as Promise<PaginatedResponse<TenantBooking>>;
}
