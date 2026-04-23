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

const ownerSections: NavigationSection[] = [
  {
    title: 'Owner Surface',
    links: [
      { to: '/dashboard', label: 'Dashboard Owner', icon: '📈', hint: 'KPI properti, koleksi, dan arah keputusan bisnis.' },
      { to: '/invoices', label: 'Tagihan & Koleksi', icon: '🧾', hint: 'Pantau billed, collected, overdue, dan follow-up utama.' },
      { to: '/payment-submissions/review', label: 'Verifikasi Bayar', icon: '💸', hint: 'Review bukti bayar booking tenant sebelum aktivasi kamar.' },
      { to: '/expenses', label: 'Pengeluaran', icon: '💸', hint: 'Ringkasan biaya operasional dan kategori biaya.' },
      { to: '/announcements', label: 'Announcements', icon: '📢', hint: 'Komunikasi tenant dan operasional.' },
      { to: '/users', label: 'Users', icon: '🧑‍💼', hint: 'Kelola akun, role, dan akses.' },
    ],
  },
  {
    title: 'Operasional Harian',
    links: [
      { to: '/stays', label: 'Stays', icon: '🏠', hint: 'Lihat stay aktif, detail, dan follow-up operasional.' },
      { to: '/rooms', label: 'Rooms', icon: '🚪', hint: 'Status kamar, tarif, dan akses ke detail inventaris.' },
      { to: '/tenants', label: 'Tenants', icon: '👥', hint: 'Data tenant, status aktif, dan portal access.' },
      { to: '/tickets', label: 'Tickets', icon: '🎫', hint: 'Pantau ticket tenant dan progres tindak lanjut.' },
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
    title: 'Operasional Harian',
    links: [
      { to: '/dashboard', label: 'Dashboard Admin', icon: '📊', hint: 'Queue penting, status kamar, stay, dan invoice.' },
      { to: '/stays', label: 'Stays', icon: '🏠', hint: 'Check-in, checkout, perpanjangan, dan deposit.' },
      { to: '/rooms', label: 'Rooms', icon: '🚪', hint: 'Status kamar dan akses ke detail room.' },
      { to: '/tenants', label: 'Tenants', icon: '👥', hint: 'Data tenant dan pengelolaan portal access.' },
      { to: '/tickets', label: 'Tickets', icon: '🎫', hint: 'Triage, assignment, progress, dan closure.' },
    ],
  },
  {
    title: 'Keuangan & Kontrol',
    links: [
      { to: '/invoices', label: 'Invoices', icon: '💳', hint: 'Tagihan, line item, dan status pembayaran.' },
      { to: '/invoice-payments', label: 'Invoice Payments', icon: '💰', hint: 'Pencatatan pembayaran invoice.' },
      { to: '/payment-submissions/review', label: 'Verifikasi Bayar', icon: '💸', hint: 'Queue review bukti bayar booking reserved tenant.' },
      { to: '/wifi-sales', label: 'WiFi Sales', icon: '📶', hint: 'Penjualan paket WiFi tenant.' },
      { to: '/expenses', label: 'Expenses', icon: '🧮', hint: 'Pengeluaran operasional harian.' },
      { to: '/announcements', label: 'Announcements', icon: '📢', hint: 'Pengumuman tenant dan internal.' },
      { to: '/users', label: 'Users', icon: '🧑‍💼', hint: 'Kelola akun admin, staff, dan tenant portal.' },
    ],
  },
  {
    title: 'Inventory & Maintenance',
    links: [
      { to: '/inventory-items', label: 'Inventory Items', icon: '📦', hint: 'Master stok barang global.' },
      { to: '/room-items', label: 'Room Items', icon: '🛏️', hint: 'Inventaris barang yang terpasang per kamar.' },
      { to: '/inventory-movements', label: 'Inventory Movements', icon: '🔄', hint: 'Arus stok masuk, keluar, dan assignment kamar.' },
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
      { to: '/dashboard', label: 'Dashboard Staff', icon: '🛠️', hint: 'Pekerjaan aktif, stok, dan konteks teknis harian.' },
      { to: '/tickets', label: 'Tickets', icon: '🎫', hint: 'Assignment, progress, dan penyelesaian pekerjaan.' },
      { to: '/rooms', label: 'Rooms', icon: '🚪', hint: 'Lihat konteks kamar untuk pekerjaan teknis.' },
    ],
  },
  {
    title: 'Inventory & Maintenance',
    links: [
      { to: '/inventory-items', label: 'Inventory Items', icon: '📦', hint: 'Cek stok dan low stock.' },
      { to: '/room-items', label: 'Room Items', icon: '🛏️', hint: 'Inventaris kamar dan kondisinya.' },
      { to: '/inventory-movements', label: 'Inventory Movements', icon: '🔄', hint: 'Riwayat pergerakan stok barang.' },
    ],
  },
  {
    title: 'Akun Saya',
    links: [
      { to: '/profile', label: 'Profil Saya', icon: '🙍', hint: 'Lihat profil dan ganti password akun.' },
    ],
  },
];

const tenantSections: NavigationSection[] = [
  {
    title: 'Portal Tenant',
    links: [
      { to: '/portal/stay', label: 'Hunian Saya', icon: '🏠', hint: 'Ringkasan kamar, masa tinggal, dan konteks hunian.' },
      { to: '/portal/bookings', label: 'Pemesanan Saya', icon: '🗓️', hint: 'Pantau booking kamar yang masih reserved dan masa berlakunya.' },
      { to: '/portal/invoices', label: 'Tagihan Saya', icon: '🧾', hint: 'Tagihan, status, dan tindak lanjut pembayaran.' },
      { to: '/portal/tickets', label: 'Tiket Saya', icon: '🎫', hint: 'Ajukan tiket dan pantau progres bantuan.' },
      { to: '/portal/announcements', label: 'Pengumuman', icon: '📢', hint: 'Info terbaru dari pengelola kos.' },
      { to: '/portal/profile', label: 'Profil Saya', icon: '🙍', hint: 'Data akun portal dan ganti password.' },
    ],
  },
];

export function getNavigationSections(role?: Role): NavigationSection[] {
  switch (role) {
    case 'OWNER':
      return ownerSections;
    case 'ADMIN':
      return adminSections;
    case 'STAFF':
      return staffSections;
    case 'TENANT':
      return tenantSections;
    default:
      return adminSections;
  }
}

export function getNavigationLinks(role?: Role): NavigationLink[] {
  return getNavigationSections(role).flatMap((section) => section.links);
}

export function getDefaultRoute(role?: Role): string {
  return role === 'TENANT' ? '/portal/stay' : '/dashboard';
}
