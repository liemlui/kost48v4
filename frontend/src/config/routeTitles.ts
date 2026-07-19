import { matchPath } from 'react-router-dom';

// AUDIT-OWNER (A2): peta rute → judul ringkas (Bahasa Indonesia) untuk
// document.title app-wide. Hook useDocumentTitle menambah suffix " · KOST48".
// Rute publik/landing (mis. "/", "/rooms" tamu) sengaja tanpa judul → pakai
// judul marketing default. Pola spesifik ditaruh sebelum yang generik.
const ROUTE_TITLES: Array<{ pattern: string; title: string }> = [
  { pattern: '/login', title: 'Masuk' },
  { pattern: '/forgot-password', title: 'Lupa Kata Sandi' },
  { pattern: '/reset-password', title: 'Atur Ulang Kata Sandi' },

  { pattern: '/rooms/:roomId/detail', title: 'Detail Kamar' },
  { pattern: '/rooms/:id', title: 'Detail Kamar' },
  { pattern: '/rooms', title: 'Kamar' },
  { pattern: '/booking/:roomId', title: 'Booking Kamar' },
  { pattern: '/panduan', title: 'Panduan & FAQ' },
  { pattern: '/reviews', title: 'Ulasan Penghuni' },

  { pattern: '/dashboard', title: 'Dashboard' },
  { pattern: '/owner-dashboard', title: 'Dashboard Owner' },
  { pattern: '/admin-dashboard', title: 'Area Admin (Owner)' },
  { pattern: '/market-analysis', title: 'Analisa Pasar' },
  { pattern: '/profile', title: 'Profil' },

  { pattern: '/renew-requests', title: 'Permintaan Perpanjangan' },
  { pattern: '/loss-refunds', title: 'Refund Kalah-Cepat' },
  { pattern: '/users', title: 'Pengguna' },
  { pattern: '/tenants', title: 'Penghuni' },

  { pattern: '/stays/check-in', title: 'Check-in' },
  { pattern: '/stays/:id', title: 'Detail Masa Sewa' },
  { pattern: '/stays', title: 'Masa Sewa' },

  { pattern: '/invoices/:id', title: 'Detail Tagihan' },
  { pattern: '/invoices', title: 'Tagihan' },
  { pattern: '/invoice-payments', title: 'Pembayaran Tagihan' },
  { pattern: '/payment-submissions/review', title: 'Review Pembayaran' },

  { pattern: '/announcements', title: 'Pengumuman' },
  { pattern: '/meter-readings', title: 'Catatan Meter' },
  { pattern: '/iot', title: 'IoT Listrik & Air' },
  { pattern: '/tickets', title: 'Tiket' },
  { pattern: '/staff-routines', title: 'Rutinitas Staf' },
  { pattern: '/staff-performance', title: 'Kinerja Staf' },
  { pattern: '/surveys', title: 'Survei Penghuni' },
  { pattern: '/guest-preferences', title: 'Preferensi Tamu' },
  { pattern: '/staff-report', title: 'Laporan Staf' },
  { pattern: '/staff-warehouse', title: 'Gudang' },
  { pattern: '/inventory/gudang', title: 'Inventaris · Gudang' },
  { pattern: '/inventory/barang-kamar', title: 'Inventaris · Barang Kamar' },
  { pattern: '/inventory/mutasi', title: 'Inventaris · Mutasi' },
  { pattern: '/inventory', title: 'Inventaris' },
  { pattern: '/inventory-items', title: 'Inventaris' },
  { pattern: '/room-items', title: 'Barang Kamar' },
  { pattern: '/inventory-movements', title: 'Mutasi Inventaris' },
  { pattern: '/ac-maintenance', title: 'Perawatan AC' },
  { pattern: '/wifi-sales', title: 'Penjualan WiFi' },
  { pattern: '/ancillary-revenue', title: 'Pendapatan Tambahan' },
  { pattern: '/finance/accounting-setup', title: 'Akuntansi' },
  { pattern: '/finance/assets', title: 'Aset' },
  { pattern: '/expenses', title: 'Pembelian & Operasional' },
  { pattern: '/reminders', title: 'Pengingat' },
  { pattern: '/reports', title: 'Laporan' },
  { pattern: '/settings', title: 'Pengaturan' },
  { pattern: '/notifications', title: 'Notifikasi' },
  { pattern: '/loyalty', title: 'Kelola Reward' },

  { pattern: '/portal/booking/:roomId', title: 'Booking Kamar' },
  { pattern: '/portal/announcements/:id', title: 'Detail Pengumuman' },
  { pattern: '/portal/announcements', title: 'Pengumuman' },
  { pattern: '/portal/stay', title: 'Panduan Kos Saya' },
  { pattern: '/portal/bookings', title: 'Booking Saya' },
  { pattern: '/portal/invoices/:id', title: 'Detail Tagihan' },
  { pattern: '/portal/invoices', title: 'Bayar Tagihan' },
  { pattern: '/portal/tickets', title: 'Lapor Masalah' },
  { pattern: '/portal/loyalty', title: 'Poin & Reward' },
  { pattern: '/portal/manual', title: 'Panduan' },
  { pattern: '/profile', title: 'Profil' },
  { pattern: '/portal/wifi', title: 'Pesan WiFi' },
];

/** Cari judul untuk pathname; undefined = pakai judul marketing default. */
export function resolveRouteTitle(pathname: string): string | undefined {
  for (const { pattern, title } of ROUTE_TITLES) {
    if (matchPath({ path: pattern, end: true }, pathname)) return title;
  }
  return undefined;
}
