// FILE: mobileNav.ts — konfigurasi tab navigasi bawah mobile per role.
//
// W-OWN-010 (konsolidasi shell Admin): tiga pembungkus lama
// (`MobileBottomNav` tenant, `AdminMobileBottomNav`, `StaffMobileBottomNav`)
// hanya meneruskan daftar tab ke `RoleMobileBottomNav`. Daftar tabnya kini
// hidup di sini supaya AppLayout memakai SATU komponen + satu sumber data.
//
// Markup yang dihasilkan sengaja TIDAK berubah — dijaga test
// `mobileNavShell.test.tsx` terhadap baseline yang direkam sebelum konsolidasi.
import { getNavigationLinks, type TenantPortalStage } from './navigation';

export type MobileNavTab = {
  to: string;
  label: string;
  icon: string;
  /** Exact match untuk status aktif (default: prefix match). */
  end?: boolean;
};

/** Tab utama Area Admin (ADMIN + OWNER dalam mode Area Admin). "Lainnya" membuka sidebar. */
export const ADMIN_MOBILE_TABS: MobileNavTab[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/stays', label: 'Huni', icon: '🏠' },
  { to: '/invoices', label: 'Uang', icon: '🧾' },
  { to: '/tickets', label: 'Tiket', icon: '👷' },
];

/** Tab staff: 4 tab utama + 2 tab tambahan di popup "Lainnya". */
export const STAFF_MOBILE_TABS: { mainTabs: MobileNavTab[]; moreTabs: MobileNavTab[] } = {
  mainTabs: [
    { to: '/dashboard', label: 'Hari Ini', icon: '🛠️', end: true },
    { to: '/tickets', label: 'Tugas', icon: '🎫' },
    { to: '/rooms', label: 'Kamar', icon: '🚪' },
    { to: '/staff-warehouse', label: 'Gudang', icon: '🧰' },
  ],
  moreTabs: [
    { to: '/staff-report', label: 'Laporan', icon: '📋' },
    { to: '/profile', label: 'Profil', icon: '👤' },
  ],
};

/** Jumlah tautan navigasi tenant yang menjadi tab utama; sisanya masuk "Lainnya". */
export const TENANT_MAIN_TAB_COUNT = 3;

/**
 * Tab tenant mengikuti tahap portal (`browsing`/`booking`/`occupied`) supaya
 * navigasi bawah selalu sama dengan sidebar. Profil selalu ada di popup.
 */
export function tenantMobileTabs(stage: TenantPortalStage): {
  mainTabs: MobileNavTab[];
  moreTabs?: MobileNavTab[];
} {
  const allLinks = getNavigationLinks('TENANT', stage);
  const mainTabs = allLinks.slice(0, TENANT_MAIN_TAB_COUNT).map((link) => ({
    to: link.to,
    label: link.label,
    icon: link.icon,
    end: link.to === '/portal/stay',
  }));
  const moreTabs = [
    ...allLinks.slice(TENANT_MAIN_TAB_COUNT).map((link) => ({
      to: link.to,
      label: link.label,
      icon: link.icon,
    })),
    { to: '/profile', label: 'Profil', icon: '👤' },
  ];
  return { mainTabs, moreTabs: moreTabs.length > 1 ? moreTabs : undefined };
}
