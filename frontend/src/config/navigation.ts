export type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT' | string;

export type NavigationLink = {
  to: string;
  label: string;
  icon: string;
  hint?: string;
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
      { to: '/rooms', label: 'Kamar', icon: '🚪', hint: 'Status kamar, tarif, dan akses ke detail inventaris.' },
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
    title: 'Command Center',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Antrean tindakan harian, status kamar, stay, dan invoice.' },
      { to: '/stays', label: 'Stay', icon: '🏠', hint: 'Booking, renew/keluar, perpanjangan, dan deposit.' },
      { to: '/rooms', label: 'Kamar', icon: '🚪', hint: 'Status kamar dan akses ke detail kamar.' },
      { to: '/tenants', label: 'Tenant', icon: '👥', hint: 'Data tenant dan pengelolaan akses portal.' },
    ],
  },
  {
    title: 'Keuangan',
    links: [
      { to: '/invoices', label: 'Tagihan', icon: '🧾', hint: 'Tagihan, item baris, dan status pembayaran.' },
      { to: '/payment-submissions/review', label: 'Review Pembayaran', icon: '💸', hint: 'Antrean review bukti bayar booking reserved tenant.' },
    ],
  },
  {
    title: 'Komunikasi & Kontrol',
    links: [
      { to: '/tickets', label: 'Tiket', icon: '🎫', hint: 'Triage, penugasan, progres, dan penyelesaian.' },
      { to: '/staff-routines', label: 'Checklist Staf', icon: '✅', hint: 'Atur pekerjaan harian, mingguan, dan bulanan staf.' },
      { to: '/renew-requests', label: 'Perpanjangan', icon: '🔄', hint: 'Tinjau dan proses permintaan perpanjangan tenant.' },
      { to: '/announcements', label: 'Pengumuman', icon: '📢', hint: 'Pengumuman tenant dan internal.' },
      { to: '/reminders', label: 'Pengingat WhatsApp', icon: '📲', hint: 'Pratinjau kandidat pengingat WhatsApp.' },
    ],
  },
  {
    title: 'Administrasi',
    links: [
      { to: '/users', label: 'Pengguna', icon: '👤', hint: 'Kelola akun pengguna: admin, staff, dan tenant.' },
    ],
  },
  {
    title: 'Akun Saya',
    links: [
      { to: '/profile', label: 'Profil Saya', icon: '🙍', hint: 'Lihat profil dan ganti password akun.' },
    ],
  },
];

const staffSections: NavigationSection[] = [
  {
    title: 'Pekerjaan Lapangan',
    links: [
      { to: '/dashboard', label: 'Beranda Staf', icon: '🛠️', hint: 'Lihat tugas yang harus dikerjakan hari ini.' },
      { to: '/tickets', label: 'Tiket Bantuan', icon: '🎫', hint: 'Kerjakan keluhan penghuni sampai selesai.' },
      { to: '/rooms', label: 'Cek Kamar', icon: '🚪', hint: 'Lihat kamar yang perlu dicek atau diperbaiki.' },
    ],
  },
  {
    title: 'Barang & Perbaikan',
    links: [
      { to: '/inventory-items', label: 'Stok Barang', icon: '📦', hint: 'Lihat barang yang tersedia dan barang yang hampir habis.' },
      { to: '/room-items', label: 'Barang di Kamar', icon: '🛏️', hint: 'Lihat barang yang ada di setiap kamar.' },
      { to: '/inventory-movements', label: 'Catatan Stok', icon: '🔄', hint: 'Lihat catatan barang masuk dan keluar.' },
    ],
  },
  {
    title: 'Akun Saya',
    links: [
      { to: '/profile', label: 'Profil Saya', icon: '🙍', hint: 'Lihat profil dan ganti password akun.' },
    ],
  },
];

function getTenantSections(stage: TenantPortalStage = 'occupied'): NavigationSection[] {
  if (stage === 'browsing') {
    return [{
      title: 'Portal Tenant',
      links: [
        { to: '/rooms', label: 'Pilih Kamar', icon: '🛏️', hint: 'Lihat kamar yang tersedia dan mulai booking.' },
        { to: '/portal/profile', label: 'Profil Saya', icon: '🙍', hint: 'Data akun portal dan ganti password.' },
        { to: '/notifications', label: 'Notifikasi', icon: '🔔', hint: 'Notifikasi dan pengingat dari pengelola kos.' },
      ],
    }];
  }

  if (stage === 'booking') {
    return [{
      title: 'Portal Tenant',
      links: [
        { to: '/rooms', label: 'Pilih Kamar', icon: '🛏️', hint: 'Cari kamar lain atau lihat katalog yang tersedia.' },
        { to: '/portal/bookings', label: 'Pemesanan Saya', icon: '🗓️', hint: 'Pantau booking, approval, dan pembayaran awal.' },
        { to: '/portal/invoices', label: 'Tagihan Saya', icon: '🧾', hint: 'Lihat tagihan awal hasil approval booking.' },
        { to: '/portal/profile', label: 'Profil Saya', icon: '🙍', hint: 'Data akun portal dan ganti password.' },
        { to: '/notifications', label: 'Notifikasi', icon: '🔔', hint: 'Notifikasi dan pengingat dari pengelola kos.' },
      ],
    }];
  }

  return [{
    title: 'Portal Tenant',
    links: [
      { to: '/portal/stay', label: 'Hunian Saya', icon: '🏠', hint: 'Ringkasan kamar, masa tinggal, dan konteks hunian.' },
      { to: '/portal/invoices', label: 'Tagihan Saya', icon: '🧾', hint: 'Tagihan, status, dan tindak lanjut pembayaran.' },
      { to: '/portal/tickets', label: 'Tiket Saya', icon: '🎫', hint: 'Ajukan tiket dan pantau progres bantuan.' },
      { to: '/portal/announcements', label: 'Pengumuman', icon: '📢', hint: 'Info terbaru dari pengelola kos.' },
      { to: '/portal/wifi', label: 'Pesan WiFi', icon: '📶', hint: 'Lihat prosedur pembelian paket WiFi melalui WhatsApp.' },
      { to: '/portal/profile', label: 'Profil Saya', icon: '🙍', hint: 'Data akun portal dan ganti password.' },
      { to: '/notifications', label: 'Notifikasi', icon: '🔔', hint: 'Notifikasi dan pengingat dari pengelola kos.' },
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
