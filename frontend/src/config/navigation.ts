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
    title: 'Command Center',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📈', hint: 'Ringkasan KPI properti, antrean tindakan, koleksi, dan arah keputusan bisnis.' },
      { to: '/stays', label: 'Stay', icon: '🏠', hint: 'Lihat stay aktif, booking, masa sewa due, dan tindakan operasional.' },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🚪', hint: 'Status kamar, tarif, dan akses ke detail inventaris.' },
      { to: '/tenants', label: 'Tenant', icon: '👥', hint: 'Data tenant, status aktif, dan akses portal.' },
    ],
  },
  {
    title: 'Keuangan',
    links: [
      { to: '/invoices', label: 'Tagihan & Koleksi', icon: '🧾', hint: 'Pantau tagihan, pembayaran, tunggakan, dan follow-up utama.' },
      { to: '/payment-submissions/review', label: 'Review Pembayaran', icon: '💸', hint: 'Review bukti bayar booking tenant sebelum aktivasi kamar.' },
    ],
  },
  {
    title: 'Komunikasi & Kontrol',
    links: [
      { to: '/tickets', label: 'Tiket', icon: '🎫', hint: 'Pantau tiket tenant dan progres tindak lanjut.' },
      { to: '/staff-routines', label: 'Staff Checklist', icon: '✅', hint: 'Set routine checklist and staff work progress.' },
      { to: '/staff-performance', label: 'Staff Performance', icon: '📋', hint: 'Audit kinerja staff, bukti kerja, review tenant, dan KPI negatif.' },
      { to: '/renew-requests', label: 'Perpanjangan', icon: '🔄', hint: 'Tinjau dan proses permintaan perpanjangan tenant.' },
      { to: '/announcements', label: 'Pengumuman', icon: '📢', hint: 'Komunikasi tenant dan operasional.' },
      { to: '/reminders', label: 'Pengingat WhatsApp', icon: '📲', hint: 'Pratinjau kandidat pengingat WhatsApp sebelum dikirim.' },
    ],
  },
  {
    title: 'Administrasi',
    links: [
      { to: '/users', label: 'Pengguna', icon: '👤', hint: 'Kelola akun pengguna: admin, staff, tenant, dan owner.' },
    ],
  },
  {
    title: 'Akun Saya',
    links: [
      { to: '/profile', label: 'Profil Saya', icon: '🙍', hint: 'Lihat profil dan ganti password akun.' },
    ],
  },
];

const adminSections: NavigationSection[] = [
  {
    title: 'Admin Menu',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Command Center ringkas berisi prioritas paling penting dari semua menu.' },
      { to: '/stays', label: 'Stays & Tenant', icon: '🏠', hint: 'Booking, masa sewa aktif, perpanjangan, checkout, dan daftar tenant.', activePaths: ['/stays', '/tenants', '/renew-requests'] },
      { to: '/invoices', label: 'Finance', icon: '🧾', hint: 'Tagihan, review pembayaran, voucher WiFi, pendapatan tambahan, dan pengeluaran.', activePaths: ['/invoices', '/invoice-payments', '/payment-submissions/review', '/wifi-sales', '/ancillary-revenue', '/expenses'] },
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', hint: 'Tiket operasional, staff, checklist, laporan lapangan, dan kinerja.', activePaths: ['/tickets', '/staff-routines', '/staff-performance'] },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, dan mutasi stok.', activePaths: ['/rooms', '/room-items', '/inventory-items', '/inventory-movements'] },
    ],
  },
];

const staffSections: NavigationSection[] = [
  {
    title: 'Staff Workspace',
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
      title: 'Portal Tenant',
      links: [
        { to: '/rooms', label: 'Pilih Kamar', icon: '🛏️', hint: 'Lihat kamar yang tersedia dan mulai pemesanan.' },
      ],
    }];
  }

  if (stage === 'booking') {
    return [{
      title: 'Portal Tenant',
      links: [
        { to: '/portal/bookings', label: 'Status Pemesanan', icon: '🗓️', hint: 'Pantau review admin, tagihan awal, dan bukti pembayaran.' },
        { to: '/portal/invoices', label: 'Tagihan Awal', icon: '🧾', hint: 'Bayar tagihan awal setelah pemesanan disetujui.' },
      ],
    }];
  }

  return [{
    title: 'Portal Tenant',
    links: [
      { to: '/portal/stay', label: 'My Stay Guide', icon: '🏠', hint: 'Panduan kamar, masa sewa, tagihan, dan aksi berikutnya.' },
      { to: '/portal/invoices', label: 'Tagihan Saya', icon: '🧾', hint: 'Tagihan, status, dan tindak lanjut pembayaran.' },
      { to: '/portal/tickets', label: 'Laporan Saya', icon: '🎫', hint: 'Buat laporan bantuan dan pantau progresnya.' },
      { to: '/portal/announcements', label: 'Pengumuman', icon: '📢', hint: 'Info terbaru dari pengelola kos.' },
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
  return '/dashboard';
}
