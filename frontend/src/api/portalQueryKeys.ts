import type { QueryKey } from '@tanstack/react-query';

/**
 * T-06 (audit UI/UX 12 Sep 2026) — sumber tunggal query key portal tenant.
 *
 * Latar masalah: sebelum ini lima tempat menarik data yang sama dengan key BERBEDA,
 * sehingga TanStack Query tidak dapat melakukan deduplikasi/berbagi cache dan satu
 * kunjungan `/portal/stay` menghasilkan 23 request untuk 16 endpoint unik:
 *
 *   - `/stays/me/current`        3x  → `useTenantPortalStage` (portal-stage/stay),
 *                                      `MyStayPage` (portal-stay), `usePaymentUrgency`
 *                                      (payment-urgency/stay)
 *   - `/announcements/active`    2x  → `TenantWorkspaceTabs` (portal-announcements) dan
 *                                      `StayAnnouncementBanner` (portal-announcements,
 *                                      tetapi staleTime berbeda)
 *   - `/payment-submissions/my`  2x  → `ActiveStayContent` dan `usePaymentUrgency`
 *
 * Semua key di bawah sengaja mempertahankan PREFIX lama (`portal-stay`, `portal-invoices`,
 * `portal-payments`, `portal-renew-requests`, `portal-checkout-requests`, `portal-tickets`,
 * `portal-room-items`, `portal-meter-readings`, `portal-announcements`, `public-config`)
 * agar seluruh `invalidateQueries({ queryKey: ['portal-...'] })` yang tersebar di
 * halaman admin/owner tetap bekerja tanpa perubahan.
 *
 * Catatan bentuk key: elemen `id` selalu string (id nyata bila sudah diketahui, `'current'`
 * bila belum) supaya key TIDAK berubah saat data stay selesai dimuat — key yang berubah
 * akan memicu fetch kedua dan mengembalikan masalah duplikasi.
 */
export const PORTAL_QUERY_KEYS = {
  /** `/stays/me/current` — satu-satunya key untuk stay aktif TENANT. */
  currentStay: ['portal-stay', 'current'] as QueryKey,
  /** `/tenant/bookings/my` — dipakai stage portal dan chip urgensi pembayaran. */
  myBookings: ['portal-bookings', 'my'] as QueryKey,
  /** `/invoices/my` */
  myInvoices: ['portal-invoices', 'my'] as QueryKey,
  /** `/payment-submissions/my` */
  mySubmissions: ['portal-payments', 'my'] as QueryKey,
  /** `/tenant/renew-requests/my` */
  myRenewRequests: ['portal-renew-requests', 'my'] as QueryKey,
  /** `/tenant/checkout-requests/my` */
  myCheckoutRequests: ['portal-checkout-requests', 'my'] as QueryKey,
  /** `/tickets/my` */
  myTickets: ['portal-tickets', 'my'] as QueryKey,
  /** `/room-items/my-room` */
  myRoomItems: ['portal-room-items', 'my-room'] as QueryKey,
  /** `/meter-readings?roomId=…` — parameter jendela waktu tetap disertakan. */
  meterReadings: (roomId: number | string, from?: string, to?: string) =>
    ['portal-meter-readings', String(roomId ?? 'none'), from ?? '', to ?? ''] as QueryKey,
  /** `/announcements/active` */
  activeAnnouncements: ['portal-announcements', 'active'] as QueryKey,
  /** `/settings/public-config` */
  publicConfig: ['public-config'] as QueryKey,
} as const;
