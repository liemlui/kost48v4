import client from './client';
import type { ApiEnvelope, InventoryItem, RoomItem } from '../types';

export type StaffInventoryPhotoPayload = {
  photoUrl?: string;
  photoFileKey?: string;
  photoOriginalFilename?: string;
  photoMimeType?: string;
  photoFileSizeBytes?: number;
};

export type StaffUpdateRoomItemStatusPayload = StaffInventoryPhotoPayload & {
  status: 'DAMAGED' | 'MAINTENANCE' | 'MISSING' | string;
  note?: string;
  requestsReplacement?: boolean;
  requestedInventoryItemId?: number;
  requestedQty?: string;
};

export type StaffUpdateInventoryItemStatusPayload = StaffInventoryPhotoPayload & {
  status: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DAMAGED' | 'MISSING' | 'NEEDS_REPAIR' | 'PENDING_CHECK' | string;
  note?: string;
  requestsReplacement?: boolean;
  requestedInventoryItemId?: number;
  requestedQty?: string;
};

export async function updateRoomItemFieldStatus(id: number, payload: StaffUpdateRoomItemStatusPayload) {
  const response = await client.patch<ApiEnvelope<{ updated: RoomItem; ticket?: unknown; fieldReport?: unknown; ticketAction?: string; reportedStatus?: string; appliedStatus?: string }>>(`/room-items/${id}/staff-status`, payload);
  return response.data.data;
}

export async function updateInventoryItemFieldStatus(id: number, payload: StaffUpdateInventoryItemStatusPayload) {
  const response = await client.patch<ApiEnvelope<{ updated: InventoryItem; ticket?: unknown; fieldReport?: unknown; ticketAction?: string; reportedStatus?: string; appliedStatus?: string }>>(`/inventory-items/${id}/staff-status`, payload);
  return response.data.data;
}
