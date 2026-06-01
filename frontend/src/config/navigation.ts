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
    title: 'Dashboard',
    links: [
      { to: '/owner-dashboard', label: 'Owner Dashboard', icon: '📈', hint: 'Business KPI, signals, and 6-month trends.' },
      { to: '/stays', label: 'Stays & Tenants', icon: '🏠', hint: 'Active stays, bookings, renew, checkout, and tenant data.', activePaths: ['/stays', '/tenants'] },
      { to: '/rooms', label: 'Rooms & Inventory', icon: '🚪', hint: 'Room status, rates, facilities, inventory items.' },
    ],
  },
  {
    title: 'Finance',
    links: [
      { to: '/invoices', label: 'Invoices & Receivables', icon: '🧾', hint: 'Monitor invoices, payments, overdue, and follow-ups.', activePaths: ['/invoices', '/payment-submissions/review'] },
      { to: '/reports', label: 'Reports & Financials', icon: '📊', hint: 'Operations report, balance sheet, P&L, cash flow, ratios.' },
      { to: '/finance/accounting-setup', label: 'Accounting Setup', icon: '📘', hint: 'Chart of accounts, periods, opening balance, journal entries.', activePaths: ['/finance/accounting-setup', '/finance/assets'] },
      { to: '/finance/assets', label: 'Fixed Assets', icon: '🏗️', hint: 'Asset register, depreciation run, ledger alignment.' },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/staff-performance', label: 'Staff Performance', icon: '📋', hint: 'Staff KPIs, audits, reviews, tickets, and routines.', activePaths: ['/staff-performance', '/staff-routines', '/tickets'] },
      { to: '/expenses', label: 'Expenses', icon: '💳', hint: 'Record and categorize operational expenses.' },
      { to: '/wifi-sales', label: 'WiFi Sales', icon: '📶', hint: 'Voucher WiFi sales records.' },
      { to: '/ancillary-revenue', label: 'Ancillary Revenue', icon: '➕', hint: 'Additional revenue sources (laundry, cleaning, etc).' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: '/users', label: 'Users', icon: '👤', hint: 'Manage accounts: admin, staff, tenants.' },
      { to: '/settings', label: 'Settings', icon: '⚙️', hint: 'Public FAQ, room photos, guest page content.' },
    ],
  },
  {
    title: 'My Account',
    links: [
      { to: '/profile', label: 'My Profile', icon: '🙍', hint: 'View profile and change password.' },
    ],
  },
];

const adminSections: NavigationSection[] = [
  {
    title: 'Operasional Kos',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Command Center ringkas berisi prioritas paling penting dari semua menu.' },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', hint: 'Booking, masa sewa aktif, perpanjangan, keluar, dan daftar penghuni.', activePaths: ['/stays', '/tenants', '/renew-requests'] },
      { to: '/invoices', label: 'Keuangan', icon: '🧾', hint: 'Tagihan, review pembayaran, voucher WiFi, pendapatan tambahan, dan pengeluaran.', activePaths: ['/invoices', '/invoice-payments', '/payment-submissions/review', '/wifi-sales', '/ancillary-revenue', '/expenses', '/finance/accounting-setup', '/finance/assets'] },
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', hint: 'Tiket operasional, staff, checklist, laporan lapangan, dan kinerja.', activePaths: ['/tickets', '/staff-routines', '/staff-performance'] },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, dan mutasi stok.', activePaths: ['/rooms', '/room-items', '/inventory-items', '/inventory-movements'] },
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