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

const ownerSections: NavigationSection[] = [
  {
    title: 'Ringkasan',
    links: [
      { to: '/owner-dashboard', label: 'Kokpit Owner', icon: '📈', hint: 'KPI bisnis, sinyal risiko, dan tren 6 bulan.' },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', hint: 'Masa sewa aktif, booking, perpanjangan, keluar, dan data penghuni.', activePaths: ['/stays', '/tenants'] },
      { to: '/reports', label: 'Laporan Bisnis', icon: '📊', hint: 'Operasional, laba rugi, arus kas, neraca, dan rasio.' },
      { to: '/market-analysis', label: 'Analisa Pasar (AI)', icon: '🧭', hint: 'Ditemani AI DeepSeek: wawancara lalu susun SWOT/PESTLE/kompetitor yang bisa disimpan.' },
    ],
  },
  {
    // Satu alur keuangan: Tagihan → Pembayaran → Jurnal/Akuntansi → Laporan.
    title: 'Keuangan',
    links: [
      { to: '/invoices', label: 'Tagihan & Piutang', icon: '🧾', hint: 'Tagihan, pembayaran, dan keterlambatan. Tiap pembayaran otomatis tercatat ke jurnal akuntansi.', activePaths: ['/invoices', '/payment-submissions/review', '/invoice-payments'] },
      { to: '/expenses', label: 'Pengeluaran', icon: '💳', hint: 'Catat dan kategorikan biaya operasional (masuk ke laba rugi).' },
      { to: '/ancillary-revenue', label: 'Pendapatan Tambahan', icon: '➕', hint: 'Pendapatan non-sewa: laundry, cleaning, WiFi, dan layanan lain.', activePaths: ['/ancillary-revenue', '/wifi-sales'] },
      { to: '/finance/accounting-setup', label: 'Akuntansi (Bagan Akun & Jurnal)', icon: '📘', hint: 'Bagan Akun (COA), periode, saldo awal, dan jurnal — fondasi semua laporan keuangan.' },
      { to: '/loss-refunds', label: 'Refund Kalah-Cepat', icon: '↩️', hint: 'Kembalikan dana tenant yang kalah first-paid-wins padahal sudah transfer.' },
    ],
  },
  {
    // Inventaris & aset dijadikan satu kelompok — satu barang bisa jadi keduanya.
    title: 'Barang & Aset',
    links: [
      { to: '/rooms', label: 'Kamar & Inventaris', icon: '🚪', hint: 'Kamar, tarif, fasilitas, barang kamar, dan stok. Barang bernilai bisa dijadikan aset yang disusutkan.', activePaths: ['/rooms', '/room-items', '/inventory-items', '/inventory-movements'] },
      { to: '/finance/assets', label: 'Aset & Depresiasi', icon: '🏗️', hint: 'Aset tetap & penyusutan. Bisa ditautkan ke barang inventaris/kamar agar tidak dobel input.' },
    ],
  },
  {
    title: 'Operasional',
    links: [
      { to: '/staff-performance', label: 'Kinerja Staff', icon: '📋', hint: 'KPI staff, audit, review, tiket, dan rutinitas kerja.', activePaths: ['/staff-performance', '/staff-routines', '/tickets'] },
      { to: '/announcements', label: 'Pengumuman', icon: '📢', hint: 'Buat dan kelola pengumuman untuk penghuni.' },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Katalog reward, kelola poin, dan setujui penukaran tenant.' },
    ],
  },
  {
    title: 'Pengaturan',
    links: [
      { to: '/users', label: 'Akun User', icon: '👤', hint: 'Kelola akun owner, admin, staff, dan penghuni.' },
      { to: '/additional-services', label: 'Layanan Tambahan', icon: '🛎️', hint: 'Kelola daftar layanan tambahan (galon, TV, WiFi, dll) + tarif yang tampil ke penghuni.' },
      { to: '/settings', label: 'Pengaturan', icon: '⚙️', hint: 'FAQ publik, foto kamar, konten halaman tamu, dan tarif dasar.' },
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
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, dan mutasi stok.', activePaths: ['/rooms', '/room-items', '/inventory-items', '/inventory-movements'] },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Setujui penukaran reward tenant dan lihat katalog.' },
    ],
  },
];

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
