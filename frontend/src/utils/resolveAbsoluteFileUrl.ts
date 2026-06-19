export function resolveAbsoluteFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const origin = apiBase.replace(/\/api\/?$/, '');

  // Public room images are served through both /uploads/room-images and
  // /api/uploads/room-images. Prefer the /api alias so deployments that proxy
  // only /api/* still show room/logo assets correctly.
  const normalizedFileUrl = fileUrl.startsWith('/uploads/room-images/')
    ? `/api${fileUrl}`
    : fileUrl.startsWith('/uploads/ticket-images/')
      ? fileUrl.replace('/uploads/ticket-images/', '/api/tickets/images/')
      : fileUrl;

  return `${origin}${normalizedFileUrl.startsWith('/') ? '' : '/'}${normalizedFileUrl}`;
}
