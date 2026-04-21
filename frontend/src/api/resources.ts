import client from './client';
import { ApiEnvelope, PaginatedResponse } from '../types';

const IS_ACTIVE_FILTER_PATHS = new Set([
  '/users',
  '/tenants',
  '/rooms',
  '/inventory-items',
  '/expenses',
  '/announcements',
]);

function sanitizeListParams(path: string, params?: Record<string, unknown>) {
  if (!params) return params;

  const nextParams = { ...params };
  if (!IS_ACTIVE_FILTER_PATHS.has(path)) {
    delete nextParams.isActive;
  }

  return nextParams;
}

export async function listResource<T>(path: string, params?: Record<string, unknown>) {
  const response = await client.get<ApiEnvelope<PaginatedResponse<T>>>(path, {
    params: sanitizeListParams(path, params),
  });
  return response.data.data;
}

export async function getResource<T>(path: string) {
  const response = await client.get<ApiEnvelope<T>>(path);
  return response.data.data;
}

export async function createResource<T>(path: string, payload: Record<string, unknown>) {
  const response = await client.post<ApiEnvelope<T>>(path, payload);
  return response.data.data;
}

export async function updateResource<T>(path: string, payload: Record<string, unknown>) {
  const response = await client.patch<ApiEnvelope<T>>(path, payload);
  return response.data.data;
}

export async function deleteResource<T>(path: string) {
  const response = await client.delete<ApiEnvelope<T>>(path);
  return response.data.data;
}

export async function postAction<T>(path: string, payload?: Record<string, unknown>) {
  const response = await client.post<ApiEnvelope<T>>(path, payload ?? {});
  return response.data.data;
}
