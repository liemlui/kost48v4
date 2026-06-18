import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { resolveAbsoluteFileUrl } from '../utils/resolveAbsoluteFileUrl';

function pathnameOf(value: string) {
  try {
    return new URL(value, window.location.origin).pathname;
  } catch {
    return value;
  }
}

export function isProtectedMediaUrl(value?: string | null) {
  if (!value) return false;
  const pathname = pathnameOf(value);
  return pathname.startsWith('/api/payment-submissions/proofs/')
    || pathname.startsWith('/api/tickets/images/')
    || pathname.startsWith('/api/announcements/images/')
    || pathname.startsWith('/uploads/ticket-images/')
    // PUB-FOTO-PROFIL-KTP: avatar tenant disajikan terproteksi (butuh Authorization).
    || /^\/api\/tenants\/\d+\/profile-photo\/image$/.test(pathname);
}

function toApiClientPath(value: string) {
  const parsed = new URL(value, window.location.origin);
  if (parsed.pathname.startsWith('/api/')) {
    return `${parsed.pathname.slice('/api'.length)}${parsed.search}`;
  }
  return value;
}

export function useAuthenticatedMediaUrl(value?: string | null) {
  const resolved = useMemo(
    () => resolveAbsoluteFileUrl(value) ?? value ?? null,
    [value],
  );
  const protectedMedia = isProtectedMediaUrl(resolved);
  const [objectUrl, setObjectUrl] = useState<string | null>(
    protectedMedia ? null : resolved,
  );
  const [loadedFor, setLoadedFor] = useState<string | null>(
    protectedMedia ? null : resolved,
  );
  const [loading, setLoading] = useState(Boolean(resolved && protectedMedia));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!resolved) {
      setObjectUrl(null);
      setLoadedFor(null);
      setLoading(false);
      return undefined;
    }

    if (!protectedMedia) {
      setObjectUrl(resolved);
      setLoadedFor(resolved);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let createdUrl: string | null = null;
    setObjectUrl(null);
    setLoadedFor(null);
    setLoading(true);

    void apiClient.get<Blob>(toApiClientPath(resolved), {
      responseType: 'blob',
      signal: controller.signal,
    }).then((response) => {
      createdUrl = URL.createObjectURL(response.data);
      setObjectUrl(createdUrl);
      setLoadedFor(resolved);
    }).catch((error) => {
      if (error?.code !== 'ERR_CANCELED') setFailed(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [protectedMedia, resolved]);

  const safeUrl = protectedMedia
    ? (loadedFor === resolved ? objectUrl : null)
    : resolved;

  return { url: safeUrl, loading, failed, protectedMedia };
}
