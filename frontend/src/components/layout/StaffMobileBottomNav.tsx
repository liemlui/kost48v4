import { useState } from 'react';
import { NavLink } from 'react-router-dom';

// R-15: mobile bottom nav untuk staff — 4 tab utama + "Lainnya" popup overlay.
// Hanya tampil di mobile ≤768px; desktop tetap pakai StaffTopWorkspaceNav.

const MAIN_TABS = [
  { to: '/dashboard', label: 'Hari Ini', icon: '🛠️' },
  { to: '/tickets', label: 'Tugas', icon: '🎫' },
  { to: '/rooms', label: 'Kamar', icon: '🚪' },
  { to: '/staff-warehouse', label: 'Gudang', icon: '🧰' },
];

const MORE_TABS = [
  { to: '/staff-report', label: 'Laporan', icon: '📋' },
  { to: '/profile', label: 'Profil', icon: '👤' },
];

export default function StaffMobileBottomNav() {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Overlay backdrop saat menu Lainnya terbuka */}
      {showMore && (
        <div
          className="mobile-bottom-nav-overlay"
          onClick={() => setShowMore(false)}
          aria-hidden="true"
        />
      )}

      {/* Popup menu Lainnya */}
      {showMore && (
        <nav className="mobile-bottom-nav-more-menu" aria-label="Menu lainnya staff">
          {MORE_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/dashboard'}
              className={({ isActive }) =>
                `mobile-bottom-nav-more-item${isActive ? ' active' : ''}`
              }
              onClick={() => setShowMore(false)}
            >
              <span className="mobile-bottom-nav-icon" aria-hidden>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <nav className="mobile-bottom-nav d-md-none" aria-label="Navigasi bawah staff">
        {MAIN_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/dashboard'}
            className={({ isActive }) =>
              `mobile-bottom-nav-item${isActive ? ' active' : ''}`
            }
            aria-label={tab.label}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden>
              {tab.icon}
            </span>
            <span className="mobile-bottom-nav-label">{tab.label}</span>
          </NavLink>
        ))}

        {/* Tombol Lainnya */}
        <button
          type="button"
          className={`mobile-bottom-nav-item${showMore ? ' active' : ''}`}
          onClick={() => setShowMore((v) => !v)}
          aria-label="Menu lainnya"
          aria-expanded={showMore}
        >
          <span className="mobile-bottom-nav-icon" aria-hidden>
            ···
          </span>
          <span className="mobile-bottom-nav-label">Lainnya</span>
        </button>
      </nav>
    </>
  );
}
