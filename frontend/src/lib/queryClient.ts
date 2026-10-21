import { QueryClient } from '@tanstack/react-query';

/**
 * Kebijakan cache data (arahan owner, 18 Okt 2026):
 *
 * - Data penting/operasional — keuangan, tagihan, pembayaran, hunian, laporan —
 *   TIDAK di-cache: `staleTime: 0` dan refetch saat tab kembali fokus/reconnect.
 *   Jangan menaikkan nilai ini secara global. Kebijakan lama (5 menit +
 *   refetchOnWindowFocus false) membuat daftar tagihan tampil basi setelah
 *   pembayaran dicatat.
 * - Data yang jarang berubah boleh memilih cache sendiri lewat `staleTime`
 *   per-query (mis. konfigurasi publik, ringkasan AI, inventaris).
 * - Service worker PWA tidak pernah menyimpan respons API: request ber-
 *   Authorization dan semua `/api/*` dilewati (lihat frontend/public/sw.js,
 *   dijaga oleh frontend/scripts/verify-pwa.mjs).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
        if (status && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});
