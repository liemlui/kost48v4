import { useEffect } from 'react';

// Judul default (marketing) — selaras dengan <title> di index.html.
const DEFAULT_TITLE = 'KOST48 Surabaya Barat | Kost Dekat Pakuwon Mall & PTC';
const SUFFIX = 'KOST48';

/**
 * AUDIT-OWNER (A2): set document.title per-rute agar tab browser & riwayat jelas
 * lintas role. Beri judul ringkas (mis. "Laporan"); hook menambah suffix " · KOST48".
 * Saat unmount, judul dikembalikan ke default marketing. Tanpa argumen = pakai default.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : DEFAULT_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;
