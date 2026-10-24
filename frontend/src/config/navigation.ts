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

// ═══════════════════════════════════════════════════════════
//  S6 — PEMISAHAN CALON PENGHUNI DAN PENGHUNI (satu sumber)
//  Tahap (`stage`) berasal dari useTenantPortalStage (`/stays/me/current` +
//  `/tenant/bookings/my`). Di sini hanya DEFINISI, bukan sumber data:
//  - calon  = `browsing` (belum mengajukan) dan `booking` (sudah mengajukan, belum sewa)
//  - penghuni = `occupied` (punya stay aktif)
//  Guard rute (App.tsx) dan menu memakai definisi yang sama, supaya tidak ada
//  rute terkunci tanpa jalan masuk atau menu yang menolak saat dibuka.
// ═══════════════════════════════════════════════════════════

/** Tahap yang berarti "calon penghuni" — belum punya sewa aktif. */
export const TENANT_CANDIDATE_STAGES = ['browsing', 'booking'] as const;

/** Tahap yang berarti "penghuni" — sudah punya sewa aktif. */
export const TENANT_OCCUPANT_STAGE = 'occupied' as const;

export function isTenantCandidateStage(stage: TenantPortalStage): boolean {
  switch (stage) {
    case 'browsing':
    case 'booking':
      return true;
    default:
      return false;
  }
}

export function isTenantOccupantStage(stage: TenantPortalStage): boolean {
  return stage === TENANT_OCCUPANT_STAGE;
}

/** Nama tahap untuk manusia (laporan, judul, pesan penolakan). */
export const TENANT_STAGE_NAMES: Record<TenantPortalStage, string> = {
  browsing: 'Calon penghuni — belum mengajukan',
  booking: 'Calon penghuni — pengajuan berjalan',
  occupied: 'Penghuni — sewa aktif',
};

/**
 * Satu sumber izin rute portal tenant: tujuan → tahap yang mengizinkannya.
 * Dipakai `allowStages` di App.tsx DAN untuk menyusun menu (`getTenantSections`).
 * Tujuan yang tidak ada di sini berarti tidak dibatasi tahap (mis. `/portal/booking/:roomId`
 * yang punya gerbang sendiri, dan `/rooms` yang publik).
 */
export const TENANT_ROUTE_STAGES: Record<string, TenantPortalStage[]> = {
  // Status pengajuan + panduan terbuka untuk calon (§8.8: jangan kunci tanpa jalan keluar).
  '/portal/bookings': ['browsing', 'booking', 'occupied'],
  '/portal/manual': ['browsing', 'booking', 'occupied'],
  // Sisa portal = isi sewa aktif, hanya untuk penghuni.
  '/portal/stay': ['occupied'],
  '/portal/invoices': ['occupied'],
  '/portal/tickets': ['occupied'],
  '/portal/energy': ['occupied'],
  '/portal/announcements': ['occupied'],
  '/portal/wifi': ['occupied'],
  '/portal/loyalty': ['occupied'],
  '/portal/checkout': ['occupied'],
  '/portal/renewal': ['occupied'],
};

/** Tahap yang boleh membuka tujuan portal; `undefined` = tidak dibatasi tahap. */
export function getTenantRouteStages(to: string): TenantPortalStage[] | undefined {
  return TENANT_ROUTE_STAGES[to];
}

/** Apakah penghuni tahap ini boleh membuka tujuan portal tertentu. */
export function tenantStageAllowsRoute(stage: TenantPortalStage, to: string): boolean {
  const allowed = TENANT_ROUTE_STAGES[to];
  if (!allowed) return true;
  return allowed.includes(stage);
}

// OWN-STATUS-CARDS / FASE-H: Kokpit Owner dipadatkan jadi 1 grup strategis "Keputusan Owner".
// Item operasional harian yang duplikat dengan sidebar Admin DIHAPUS — owner mengaksesnya via toggle
// 🔧 Area Admin. Beberapa route digabung lewat `activePaths` agar tetap reachable tanpa nambah item:
// - "Akuntansi & Aset" mencakup /finance/accounting-setup + /finance/assets + /loss-refunds (Refund Kalah-Cepat, OWNER-only).
// - "Akun & Layanan" mencakup /users + /tenants + /additional-services + /service-interests.
export const ownerSections: NavigationSection[] = [
  {
    title: 'Utama',
    links: [
      { to: '/owner-dashboard', label: 'Kokpit Owner', icon: '📈', hint: 'KPI bisnis, prioritas, dan tren.' },
      { to: '/reports', label: 'Laporan Bisnis', icon: '📊', hint: 'Operasional, laba rugi, arus kas, neraca, dan rasio keuangan.' },
      { to: '/finance/accounting-setup', label: 'Akuntansi & Aset', icon: '📘', hint: 'Bagan Akun, jurnal, aset, depresiasi, dan refund.', activePaths: ['/finance/accounting-setup', '/finance/assets', '/loss-refunds'] },
      { to: '/settings', label: 'Pengaturan', icon: '⚙️', hint: 'Tarif, foto kamar, konten halaman tamu, FAQ, dan AI.' },
    ],
  },
  {
    title: 'Lainnya',
    links: [
      { to: '/users', label: 'Akun & Layanan', icon: '👤', hint: 'Akun pengguna, layanan tambahan, dan minat tenant.', activePaths: ['/users', '/tenants', '/additional-services', '/service-interests'] },
      { to: '/iot', label: 'IoT Listrik & Air', icon: '⚡', hint: 'Meter kWh Tuya dan sensor air ESP32.' },
      { to: '/market-analysis', label: 'Analisa Pasar (AI)', icon: '🧭', hint: 'SWOT, PESTLE, dan analisa kompetitor dengan AI.' },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Katalog reward, poin, dan penukaran tenant.' },
    ],
  },
];

export const adminSections: NavigationSection[] = [
  {
    title: 'Utama',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Prioritas hari ini: booking, bayar, perpanjangan, keluar, tiket, dan stok.' },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', hint: 'Booking, penghuni aktif, perpanjangan, keluar, dan data penghuni.', activePaths: ['/stays', '/tenants', '/renew-requests'] },
      { to: '/invoices', label: 'Keuangan', icon: '🧾', hint: 'Tagihan, review pembayaran, WiFi, pendapatan tambahan, dan pengeluaran.', activePaths: ['/invoices', '/invoice-payments', '/payment-submissions/review', '/wifi-sales', '/ancillary-revenue', '/expenses', '/finance/accounting-setup', '/finance/assets'] },
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', hint: 'Tiket, checklist staff, laporan lapangan, dan kinerja.', activePaths: ['/tickets', '/staff-routines', '/staff-performance'] },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, dan catatan meter.', activePaths: ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'] },
    ],
  },
  {
    title: 'Lainnya',
    links: [
      { to: '/stays/assist', label: 'Bantu Penghuni', icon: '🤝', hint: 'Catat meter, terima tunai, dan tutup tagihan atas nama tenant.' },
      { to: '/announcements', label: 'Pengumuman', icon: '📣', hint: 'Buat dan kelola pengumuman untuk penghuni dan staff.' },
      { to: '/iot', label: 'IoT Listrik & Air', icon: '⚡', hint: 'Meter kWh Tuya dan sensor air ESP32.' },
      { to: '/ac-maintenance', label: 'Perawatan AC', icon: '❄️', hint: 'Pantau pemakaian AC dan jadwalkan cuci AC.' },
      { to: '/guest-preferences', label: 'Preferensi Tamu', icon: '🎯', hint: 'Preferensi kamar dari wizard publik.' },
      { to: '/surveys', label: 'Survei Penghuni', icon: '⭐', hint: 'Rating, komentar, dan ringkasan survei.' },
      { to: '/loyalty', label: 'Reward', icon: '🎁', hint: 'Penukaran reward tenant dan katalog.' },
    ],
  },
];

// OWN-ROUTE-SPLIT: OWNER dalam mode admin memakai route nyata `/admin-dashboard`
// (bukan `/dashboard` milik ADMIN/STAFF). Sama seperti adminSections,
// tetapi tautan dashboard diarahkan ke route owner-admin dan label tertentu disesuaikan.
export const ownerAdminSections: NavigationSection[] = adminSections.map((section) => ({
  ...section,
  links: section.links.map((link) => {
    const withDashboard = link.to === '/dashboard' ? { ...link, to: '/admin-dashboard' } : link;
    return mapOwnerAdminLabel(withDashboard);
  }),
}));

function mapOwnerAdminLabel(link: NavigationLink): NavigationLink {
  if (link.label === 'Reward' && link.to === '/loyalty') {
    return { ...link, label: 'Loyalitas & Reward', hint: 'Katalog reward, kelola poin, dan setujui penukaran tenant.' };
  }
  return link;
}

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

export type TenantFeatures = { loyaltyEnabled?: boolean };

/**
 * Judul baku grup jalan keluar menu (P37 a / §8.8). WAJIB muncul di setiap tahap:
 * calon maupun penghuni tidak boleh kehilangan jalan ke fitur lain.
 */
export const TENANT_ALL_MENU_TITLE = 'Lihat semua menu';

type TenantMenuItem = {
  to: string;
  icon: string;
  hint: string;
  /**
   * Tahap yang MENAMPILKAN item di menu. Bila kosong, dipakai izin guard
   * (`TENANT_ROUTE_STAGES`). Menu tidak pernah boleh lebih luas dari izin guard.
   * Dipakai untuk menyembunyikan menu yang secara teknis boleh dibuka tetapi
   * menjadi jalan buntu bagi tahap itu — mis. "Cari kamar" untuk penghuni, atau
   * "Pengajuan saya" untuk penghuni (halaman itu mengalihkan ke /portal/stay).
   */
  menuStages?: TenantPortalStage[];
  /** Tujuan yang hanya muncul bila fitur aktif (dari `/settings/public-config`). */
  feature?: keyof TenantFeatures;
};

const TENANT_ALL_STAGES: TenantPortalStage[] = ['browsing', 'booking', 'occupied'];

/**
 * Inventaris menu portal tenant — tujuan, ikon, hint. SENGAJA tanpa label:
 * label per tahap ada di satu tabel `TENANT_STAGE_LABELS` supaya calon dan penghuni
 * tidak pernah memakai dua pola penamaan.
 */
const TENANT_MENU_ITEMS: TenantMenuItem[] = [
  { to: '/rooms', icon: '🛏️', hint: 'Lihat kamar yang tersedia dan mulai pengajuan.', menuStages: ['browsing', 'booking'] },
  { to: '/portal/bookings', icon: '🗓️', hint: 'Pantau pengajuan, tagihan awal, dan bukti pembayaran.', menuStages: ['browsing', 'booking'] },
  { to: '/portal/stay', icon: '🏠', hint: 'Kamar, masa sewa, tagihan, dan aksi berikutnya.' },
  { to: '/portal/invoices', icon: '💳', hint: 'Tagihan sewa, status, dan tindak lanjut pembayaran.' },
  { to: '/portal/tickets', icon: '🛠️', hint: 'Laporkan kerusakan atau kebutuhan bantuan dan pantau progresnya.' },
  { to: '/portal/energy', icon: '⚡', hint: 'Pantau pembacaan listrik & air terbaru dari meter otomatis.' },
  { to: '/portal/announcements', icon: '📢', hint: 'Info terbaru dari pengelola KOST48.' },
  { to: '/portal/manual', icon: '📖', hint: 'Aturan, pembayaran, dan layanan kos.' },
  { to: '/portal/wifi', icon: '📶', hint: 'Lihat prosedur pembelian paket WiFi melalui WhatsApp.' },
  { to: '/portal/loyalty', icon: '🎁', hint: 'Poin kebaikan, leaderboard, katalog reward, dan referral.', feature: 'loyaltyEnabled' },
];

/** Tahap yang menampilkan item menu; tidak pernah lebih luas dari izin guard. */
export function getTenantMenuItemStages(to: string): TenantPortalStage[] {
  const item = TENANT_MENU_ITEMS.find((candidate) => candidate.to === to);
  const allowedByGuard = TENANT_ROUTE_STAGES[to] ?? TENANT_ALL_STAGES;
  if (!item || !item.menuStages) return allowedByGuard;
  return item.menuStages.filter((stage) => allowedByGuard.includes(stage));
}

/**
 * SATU tabel label per tahap (S6). Kunci = tujuan kanonik di `TENANT_MENU_ITEMS`.
 * Calon memakai kata kerja mencari/mengajukan; penghuni memakai kata kepemilikan/tagihan.
 */
const TENANT_STAGE_LABELS: Record<TenantPortalStage, Record<string, string>> = {
  browsing: {
    '/rooms': 'Cari kamar',
    '/portal/bookings': 'Pengajuan saya',
    '/portal/manual': 'Panduan',
  },
  booking: {
    '/portal/bookings': 'Pengajuan saya',
    '/rooms': 'Lihat kamar',
    '/portal/manual': 'Panduan',
  },
  occupied: {
    '/portal/stay': 'Kamar saya',
    '/portal/invoices': 'Tagihan',
    '/portal/tickets': 'Lapor masalah',
    '/portal/energy': 'Energi',
    '/portal/announcements': 'Pengumuman',
    '/portal/manual': 'Panduan',
    '/portal/wifi': 'Pesan WiFi',
    '/portal/loyalty': 'Poin & Reward',
  },
};

/** Tautan utama tiap tahap; sisanya masuk grup "Lihat semua menu". */
const TENANT_STAGE_PRIMARY: Record<TenantPortalStage, string[]> = {
  browsing: ['/rooms', '/portal/bookings'],
  booking: ['/portal/bookings', '/rooms'],
  occupied: ['/portal/stay', '/portal/invoices', '/portal/tickets'],
};

/** Semua tujuan tenant yang boleh dibuka pada tahap ini (menurut `TENANT_ROUTE_STAGES`). */
export function getTenantMenuLinks(
  stage: TenantPortalStage = 'occupied',
  features?: TenantFeatures,
): NavigationLink[] {
  const labels = TENANT_STAGE_LABELS[stage];
  return TENANT_MENU_ITEMS
    .filter((item) => getTenantMenuItemStages(item.to).includes(stage))
    .filter((item) => (item.feature ? Boolean(features?.[item.feature]) : true))
    .map((item) => ({
      to: item.to,
      // Label wajib ada di tabel per tahap; jatuh ke tujuan hanya untuk mencegah menu kosong.
      label: labels[item.to] ?? item.to,
      icon: item.icon,
      hint: item.hint,
    }));
}

function getTenantSections(stage: TenantPortalStage = 'occupied', features?: TenantFeatures): NavigationSection[] {
  const allLinks = getTenantMenuLinks(stage, features);
  const primaryOrder = TENANT_STAGE_PRIMARY[stage] ?? [];
  const primaryLinks = primaryOrder
    .map((to) => allLinks.find((link) => link.to === to))
    .filter((link): link is NavigationLink => Boolean(link));
  const restLinks = allLinks.filter((link) => !primaryLinks.some((primary) => primary.to === link.to));

  const sections: NavigationSection[] = [];
  if (primaryLinks.length > 0) {
    sections.push({
      title: isTenantCandidateStage(stage) ? 'Calon penghuni' : 'Menu utama',
      links: primaryLinks,
    });
  }
  // §8.8: grup "Lihat semua menu" selalu ada — inilah jalan keluar yang tidak boleh hilang,
  // bukan tautan palsu: isinya tepat semua tujuan yang boleh dibuka tahap ini.
  sections.push({ title: TENANT_ALL_MENU_TITLE, links: restLinks });
  return sections;
}

export function getNavigationSections(role?: Role, tenantStage: TenantPortalStage = 'occupied', features?: TenantFeatures): NavigationSection[] {
  switch (role) {
    case 'OWNER':
      return ownerSections;
    case 'ADMIN':
      return adminSections;
    case 'STAFF':
      return staffSections;
    case 'TENANT':
      return getTenantSections(tenantStage, features);
    default:
      return adminSections;
  }
}

export function getNavigationLinks(role?: Role, tenantStage: TenantPortalStage = 'occupied', features?: TenantFeatures): NavigationLink[] {
  return getNavigationSections(role, tenantStage, features).flatMap((section) => section.links);
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
