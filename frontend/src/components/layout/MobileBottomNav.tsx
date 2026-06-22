import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';

type Props = {
  stage: TenantPortalStage;
};

// R-15: tab utama mobile (4 item) + tombol "Lainnya" untuk sisa menu.
// Hanya berpengaruh pada mobile ≤768px — desktop tidak berubah.
const MAIN_TAB_COUNT = 3; // 3 tab dari nav + 1 slot Profil

export default function MobileBottomNav({ stage }: Props) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const allLinks = getNavigationLinks('TENANT', stage);

  // 3 tab utama dari navigasi (Beranda / Tagihan / Laporan)
  const mainLinks = allLinks.slice(0, MAIN_TAB_COUNT);
  // sisa link masuk ke menu Lainnya (Poin & Reward, Panduan & Aturan, Pesan WiFi, dll)
  const moreLinks = allLinks.slice(MAIN_TAB_COUNT);

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
        <nav className="mobile-bottom-nav-more-menu" aria-label="Menu lainnya">
          {moreLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `mobile-bottom-nav-more-item${isActive ? ' active' : ''}`}
              onClick={() => setShowMore(false)}
            >
              <span className="mobile-bottom-nav-icon" aria-hidden>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            className={({ isActive }) => `mobile-bottom-nav-more-item${isActive ? ' active' : ''}`}
            onClick={() => setShowMore(false)}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden>👤</span>
            <span>Profil</span>
          </NavLink>
        </nav>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
        {mainLinks.map((link) => (
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

        {/* Slot Profil (selalu tampil) */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}
          title="Profil saya"
        >
          <span className="mobile-bottom-nav-icon" aria-hidden>👤</span>
          <span className="mobile-bottom-nav-label">Profil</span>
        </NavLink>

        {/* Tombol Lainnya (tampil jika ada link tambahan) */}
        {moreLinks.length > 0 && (
          <button
            type="button"
            className={`mobile-bottom-nav-item${showMore ? ' active' : ''}`}
            onClick={() => setShowMore((v) => !v)}
            aria-label="Menu lainnya"
            aria-expanded={showMore}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden>···</span>
            <span className="mobile-bottom-nav-label">Lainnya</span>
          </button>
        )}
      </nav>
    </>
  );
}
