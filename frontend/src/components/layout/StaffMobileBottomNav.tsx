import RoleMobileBottomNav from './RoleMobileBottomNav';

const MAIN_TABS = [
  { to: '/dashboard', label: 'Hari Ini', icon: '🛠️', end: true },
  { to: '/tickets', label: 'Tugas', icon: '🎫' },
  { to: '/rooms', label: 'Kamar', icon: '🚪' },
  { to: '/staff-warehouse', label: 'Gudang', icon: '🧰' },
];

const MORE_TABS = [
  { to: '/staff-report', label: 'Laporan', icon: '📋' },
  { to: '/profile', label: 'Profil', icon: '👤' },
];

/**
 * Staff mobile bottom nav — thin wrapper around RoleMobileBottomNav.
 * 4 main tabs + 2 more tabs (Laporan, Profil) in popup.
 * Only visible on mobile ≤768px.
 */
export default function StaffMobileBottomNav() {
  return (
    <RoleMobileBottomNav
      mainTabs={MAIN_TABS}
      moreTabs={MORE_TABS}
      ariaLabel="Navigasi bawah staff"
    />
  );
}
