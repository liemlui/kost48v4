import RoleMobileBottomNav from './RoleMobileBottomNav';

interface AdminMobileBottomNavProps {
  onMoreClick: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/stays', label: 'Huni', icon: '🏠' },
  { to: '/invoices', label: 'Uang', icon: '🧾' },
  { to: '/tickets', label: 'Tiket', icon: '👷' },
];

/**
 * Admin mobile bottom nav — thin wrapper around RoleMobileBottomNav.
 * 4 main tabs + "Lainnya" button that triggers sidebar offcanvas.
 */
export default function AdminMobileBottomNav({ onMoreClick }: AdminMobileBottomNavProps) {
  return (
    <RoleMobileBottomNav
      mainTabs={NAV_ITEMS}
      onMoreClick={onMoreClick}
      ariaLabel="Navigasi cepat admin"
    />
  );
}
