import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * FASE SEO-1: satu sumber URL kanonik untuk seluruh aplikasi.
 * Domain utama adalah `kost48surabaya.com`; host `app.` sudah mati (Index of /),
 * jadi semua sinyal SEO (canonical, sitemap, robots, og/twitter, JSON-LD) menunjuk ke sini.
 */
export const CANONICAL_ORIGIN = 'https://kost48surabaya.com';

/**
 * Bangun URL kanonik dari pathname: origin + path, tanpa query/hash
 * dan tanpa garis miring akhir (root tetap `/`).
 */
export function canonicalUrlForPath(pathname: string): string {
  const pathOnly = (pathname || '/').split(/[?#]/, 1)[0] || '/';
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const normalized = withLeadingSlash.replace(/\/+$/, '');
  return `${CANONICAL_ORIGIN}${normalized === '' ? '/' : normalized}`;
}

/**
 * Setel `<link rel="canonical">` yang sudah ada (atau buat bila belum ada)
 * ke URL kanonik pathname. Mengembalikan href yang dipasang.
 */
export function applyCanonicalUrl(pathname: string, doc: Document = document): string {
  const href = canonicalUrlForPath(pathname);
  let link = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    doc.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
  return href;
}

/**
 * Dipasang sekali di router (App) agar canonical mengikuti rute aktif.
 * Idempoten: render ulang/StrictMode tidak membuat link ganda.
 */
export function useCanonicalUrl(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    applyCanonicalUrl(pathname);
  }, [pathname]);
}
