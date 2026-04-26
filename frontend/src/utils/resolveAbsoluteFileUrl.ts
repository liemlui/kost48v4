export function resolveAbsoluteFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}