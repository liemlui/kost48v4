import { NavLink } from 'react-router-dom';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';

type Props = {
  stage: TenantPortalStage;
};

export default function MobileBottomNav({ stage }: Props) {
  const links = getNavigationLinks('TENANT', stage).slice(0, 5);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}
          title={link.hint}
          end={link.to === '/portal/stay'}
        >
          <span className="mobile-bottom-nav-icon" aria-hidden>{link.icon}</span>
          <span className="mobile-bottom-nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
