import { NavLink } from 'react-router-dom';

interface AdminMobileBottomNavProps {
  onMoreClick: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/stays', label: 'Huni', icon: '🏠' },
  { to: '/invoices', label: 'Uang', icon: '🧾' },
  { to: '/tickets', label: 'Tiket', icon: '👷' },
];

export default function AdminMobileBottomNav({ onMoreClick }: AdminMobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav d-md-none" aria-label="Navigasi cepat admin">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          className={({ isActive }) =>
            `mobile-bottom-nav-item${isActive ? ' active' : ''}`
          }
          aria-label={item.label}
        >
          <span className="mobile-bottom-nav-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="mobile-bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        className="mobile-bottom-nav-item"
        onClick={onMoreClick}
        aria-label="Buka menu lainnya"
      >
        <span className="mobile-bottom-nav-icon" aria-hidden>
          📋
        </span>
        <span className="mobile-bottom-nav-label">Lainnya</span>
      </button>
    </nav>
  );
}
