import client from './client';
import { ApiEnvelope, AuthUser } from '../types';

export async function login(email: string, password: string) {
  const response = await client.post<ApiEnvelope<{ accessToken: string; user: AuthUser }>>('/auth/login', { email, password });
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
