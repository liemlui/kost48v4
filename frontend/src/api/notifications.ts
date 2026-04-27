import client from './client';
import type { ApiEnvelope } from '../types';

// ── Types ────────────────────────────────────────

export interface AppNotificationItem {
  id: number;
  recipientUserId?: number;
  title: string;
  body: string;
  linkTo: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  items: AppNotificationItem[];
  total: number;
  unreadCount: number;
}

// ── API calls ────────────────────────────────────

export async function getMyNotifications(): Promise<NotificationsListResponse> {
  const response = await client.get<ApiEnvelope<NotificationsListResponse>>('/me/notifications');
  return response.data.data;
}

export async function markNotificationRead(id: number): Promise<AppNotificationItem> {
  const response = await client.patch<ApiEnvelope<AppNotificationItem>>(`/me/notifications/${id}/read`, {});
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<{ affected: number }> {
  const response = await client.patch<ApiEnvelope<{ affected: number }>>('/me/notifications/read-all', {});
  return response.data.data;
}