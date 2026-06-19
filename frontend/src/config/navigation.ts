export type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT' | string;

export type NavigationLink = {
  to: string;
  label: string;
  icon: string;
  hint?: string;
  activePaths?: string[];
};

export type NavigationSection = {
  title: string;
  links: NavigationLink[];
};

export type TenantPortalStage = 'browsing' | 'booking' | 'occupied';

// OWN-STATUS-CARDS / FASE-H: Kokpit Owner dipadatkan jadi 1 grup strategis "Keputusan Owner" (7 item).
// Item operasional harian yang duplikat dengan sidebar Admin DIHAPUS — owner mengaksesnya via toggle
// 🔧 Area Admin. Beberapa route digabung lewat `activePaths` agar tetap reachable tanpa nambah item:
// - "Akuntansi & Aset" mencakup /finance/accounting-setup + /finance/assets + /loss-refunds (Refund Kalah-Cepat, OWNER-only).
// - "Akun & Layanan" mencakup /users + /tenants + /additional-services + /service-interests.
// Pengumuman (/announcements) diakses via tombol 📣 di topbar (sebelah lonceng), bukan sidebar.
const ownerSections: NavigationSection[] = [
  {
    title: 'Keputusan Owner',
    links: [
      { to: '/owner-dashboard', label: 'Kokpit Owner', icon: '📈', hint: 'KPI bisnis, status kokpit, sinyal risiko, dan tren.' },
      { to: '/reports', label: 'Laporan Bisnis', icon: '📊', hint: 'Operasional, laba rugi, arus kas, neraca, dan rasio keuangan.' },
      { to: '/market-analysis', label: 'Analisa Pasar (AI)', icon: '🧭', hint: 'Ditemani AI DeepSeek: SWOT, PESTLE, dan analisa kompetitor.' },
      { to: '/finance/accounting-setup', label: 'Akuntansi & Aset', icon: '📘', hint: 'Bagan Akun, periode, saldo awal, jurnal, aset & depresiasi, dan refund kalah-cepat.', activePaths: ['/finance/accounting-setup', '/finance/assets', '/loss-refunds'] },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Katalog reward, kelola poin, dan setujui penukaran tenant.' },
      { to: '/users', label: 'Akun & Layanan', icon: '👤', hint: 'Kelola akun owner/admin/staff/penghuni, layanan tambahan, dan minat tenant.', activePaths: ['/users', '/tenants', '/additional-services', '/service-interests'] },
      { to: '/settings', label: 'Pengaturan', icon: '⚙️', hint: 'FAQ publik, foto kamar, konten halaman tamu, tarif dasar, dan konfigurasi AI.' },
    ],
  },
];

export const adminSections: NavigationSection[] = [
  {
    title: 'Operasional Kos',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Command Center ringkas berisi prioritas paling penting dari semua menu.' },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', hint: 'Booking, masa sewa aktif, perpanjangan, keluar, dan daftar penghuni.', activePaths: ['/stays', '/tenants', '/renew-requests'] },
      { to: '/invoices', label: 'Keuangan', icon: '🧾', hint: 'Tagihan, review pembayaran, voucher WiFi, pendapatan tambahan, dan pengeluaran.', activePaths: ['/invoices', '/invoice-payments', '/payment-submissions/review', '/wifi-sales', '/ancillary-revenue', '/expenses', '/finance/accounting-setup', '/finance/assets'] },
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', hint: 'Tiket operasional, staff, checklist, laporan lapangan, dan kinerja.', activePaths: ['/tickets', '/staff-routines', '/staff-performance'] },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, mutasi stok, dan catatan meter.', activePaths: ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'] },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Setujui penukaran reward tenant dan lihat katalog.' },
    ],
  },
];

// OWN-ROUTE-SPLIT: OWNER dalam mode admin memakai route nyata `/admin-dashboard`
// (bukan `/dashboard` milik ADMIN/STAFF). Sama persis dengan adminSections,
// hanya tautan dashboard yang diarahkan ke route owner-admin.
export const ownerAdminSections: NavigationSection[] = adminSections.map((section) => ({
  ...section,
  links: section.links.map((link) => (link.to === '/dashboard' ? { ...link, to: '/admin-dashboard' } : link)),
}));

const staffSections: NavigationSection[] = [
  {
    title: 'Pekerjaan Staff',
    links: [
      { to: '/dashboard', label: 'Hari Ini', icon: '🛠️', hint: 'Checklist dan prioritas hari ini.' },
      { to: '/tickets', label: 'Tugas', icon: '🎫', hint: 'Mulai, selesaikan, dan kirim bukti pekerjaan lapangan.' },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🚪', hint: 'Cek kondisi kamar, barang kamar, dan angka meter listrik/air.' },
      { to: '/staff-warehouse', label: 'Gudang', icon: '🧰', hint: 'Laporkan kondisi stok kebersihan, alat kerja, dan barang area umum.' },
      { to: '/staff-report', label: 'Laporan', icon: '📋', hint: 'Bukti kerja bulanan, rating tenant, audit, dan kategori kinerja.' },
    ],
  },
];

function getTenantSections(stage: TenantPortalStage = 'occupied'): NavigationSection[] {
  if (stage === 'browsing') {
    return [{
      title: 'Portal Penghuni',
      links: [
        { to: '/rooms', label: 'Pilih Kamar', icon: '🛏️', hint: 'Lihat kamar yang tersedia dan mulai pemesanan.' },
      ],
    }];
  }

  if (stage === 'booking') {
    return [{
      title: 'Portal Penghuni',
      links: [
        { to: '/portal/bookings', label: 'Status Pemesanan', icon: '🗓️', hint: 'Pantau review admin, tagihan awal, dan bukti pembayaran.' },
        { to: '/portal/invoices', label: 'Tagihan Awal', icon: '🧾', hint: 'Bayar tagihan awal setelah pemesanan disetujui.' },
      ],
    }];
  }

  return [{
    title: 'Portal Penghuni',
    links: [
      { to: '/portal/stay', label: 'Panduan Kos Saya', icon: '🏠', hint: 'Kamar, masa sewa, tagihan, dan aksi berikutnya.' },
      { to: '/portal/invoices', label: 'Tagihan Saya', icon: '🧾', hint: 'Tagihan, status, dan tindak lanjut pembayaran.' },
      { to: '/portal/tickets', label: 'Laporan Saya', icon: '🎫', hint: 'Buat laporan bantuan dan pantau progresnya.' },
      { to: '/portal/loyalty', label: 'Poin & Reward', icon: '🎁', hint: 'Kumpulkan poin loyalitas dan tukar dengan reward.' },
      { to: '/portal/manual', label: 'Panduan & Aturan', icon: '📖', hint: 'Manual lengkap aturan, pembayaran, dan layanan kos.' },
      { to: '/portal/wifi', label: 'Pesan WiFi', icon: '📶', hint: 'Lihat prosedur pembelian paket WiFi melalui WhatsApp.' },
    ],
  }];
}

export function getNavigationSections(role?: Role, tenantStage: TenantPortalStage = 'occupied'): NavigationSection[] {
  switch (role) {
    case 'OWNER':
      return ownerSections;
    case 'ADMIN':
      return adminSections;
    case 'STAFF':
      return staffSections;
    case 'TENANT':
      return getTenantSections(tenantStage);
    default:
      return adminSections;
  }
}

export function getNavigationLinks(role?: Role, tenantStage: TenantPortalStage = 'occupied'): NavigationLink[] {
  return getNavigationSections(role, tenantStage).flatMap((section) => section.links);
}

export function getDefaultRoute(role?: Role, tenantStage: TenantPortalStage = 'occupied'): string {
  if (role === 'TENANT') {
    if (tenantStage === 'browsing') return '/rooms';
    if (tenantStage === 'booking') return '/portal/bookings';
    return '/portal/stay';
  }
  if (!role) return '/rooms';
  if (role === 'OWNER') return '/owner-dashboard';
  return '/dashboard';
}
