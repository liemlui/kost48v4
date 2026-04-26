import client from './client';
import { ApiEnvelope, AuthUser } from '../types';

export async function login(identifier: string, password: string) {
  const response = await client.post<ApiEnvelope<{ accessToken: string; user: AuthUser }>>('/auth/login', { identifier, password });
  return response.data.data;
}

export async function me() {
  const response = await client.get<ApiEnvelope<AuthUser>>('/auth/me');
  return response.data.data;
}

export async function changePassword(payload: {
  currentPassword?: string;
  newPassword: string;
}) {
  const response = await client.post<ApiEnvelope<{ success: boolean }>>('/auth/change-password', payload);
  return response.data.data;
}

export async function forgotPassword(payload: { identifier: string }) {
  const response = await client.post<ApiEnvelope<{ success: boolean; resetTokenPreview?: string; expiresAt?: string; channel?: string; destination?: string | null }>>('/auth/forgot-password', payload);
  return response.data.data;
}

export async function resetPassword(payload: { token: string; newPassword: string }) {
  const response = await client.post<ApiEnvelope<{ success: boolean; userId?: number }>>('/auth/reset-password', payload);
  return response.data.data;
}
