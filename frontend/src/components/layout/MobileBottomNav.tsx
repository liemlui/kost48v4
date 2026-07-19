import RoleMobileBottomNav from './RoleMobileBottomNav';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';

type Props = { stage: TenantPortalStage };

const MAIN_TAB_COUNT = 3;

/**
 * Tenant mobile bottom nav — thin wrapper around RoleMobileBottomNav.
 * First 3 nav links go to main tabs; remaining links + profile go to "Lainnya" popup.
 */
export default function MobileBottomNav({ stage }: Props) {
  const allLinks = getNavigationLinks('TENANT', stage);

  const mainTabs = allLinks.slice(0, MAIN_TAB_COUNT).map((link) => ({
    to: link.to,
    label: link.label,
    icon: link.icon,
    end: link.to === '/portal/stay',
  }));

  const moreTabs = [
    ...allLinks.slice(MAIN_TAB_COUNT).map((link) => ({
      to: link.to,
      label: link.label,
      icon: link.icon,
    })),
    { to: '/profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <RoleMobileBottomNav
      mainTabs={mainTabs}
      moreTabs={moreTabs.length > 1 ? moreTabs : undefined}
      ariaLabel="Navigasi bawah tenant"
    />
  );
}
