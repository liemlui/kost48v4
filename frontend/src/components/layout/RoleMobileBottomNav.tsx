import { useState } from 'react';
import { NavLink } from 'react-router-dom';

type NavTab = {
  to: string;
  label: string;
  icon: string;
  /** Use exact match for active state (default: false = prefix match) */
  end?: boolean;
};

type RoleMobileBottomNavProps = {
  /** Main tabs visible in the bottom bar */
  mainTabs: NavTab[];
  /** Additional tabs shown in popup "Lainnya" menu. Omit to hide "Lainnya" button. */
  moreTabs?: NavTab[];
  /** If provided, "Lainnya" triggers this callback instead of opening popup (e.g. admin sidebar). */
  onMoreClick?: () => void;
  /** Aria label for the nav */
  ariaLabel?: string;
};

/**
 * Unified mobile bottom navigation bar for all roles.
 * 
 * Renders up to 4 main tabs + an optional "Lainnya" button.
 * "Lainnya" can either open a popup overlay (tenant/staff) or 
 * delegate to an external handler (admin sidebar).
 * 
 * Only visible on mobile (≤768px) via CSS `.d-md-none`.
 * 
 * Usage per role:
 * - Tenant:  mainTabs = first 3 nav links, moreTabs = remaining links + profile
 * - Staff:   mainTabs = 4 hardcoded tabs, moreTabs = 2 extra tabs (profile hidden in more)
 * - Admin:   mainTabs = 4 hardcoded tabs, onMoreClick triggers sidebar offcanvas
 */
export default function RoleMobileBottomNav({
  mainTabs,
  moreTabs,
  onMoreClick,
  ariaLabel = 'Navigasi bawah',
}: RoleMobileBottomNavProps) {
  const [showMore, setShowMore] = useState(false);
  const hasMore = (moreTabs && moreTabs.length > 0) || onMoreClick;

  const handleMoreClick = () => {
    if (onMoreClick) {
      onMoreClick();
    } else {
      setShowMore((v) => !v);
    }
  };

  return (
    <>
      {/* Overlay backdrop — only when popup mode (no onMoreClick) */}
      {showMore && !onMoreClick && (
        <div
          className="mobile-bottom-nav-overlay"
          onClick={() => setShowMore(false)}
          aria-hidden="true"
        />
      )}

      {/* Popup menu Lainnya — only when popup mode */}
      {showMore && !onMoreClick && moreTabs && (
        <nav className="mobile-bottom-nav-more-menu" aria-label="Menu lainnya">
          {moreTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `mobile-bottom-nav-more-item${isActive ? ' active' : ''}`
              }
              onClick={() => setShowMore(false)}
            >
              <span className="mobile-bottom-nav-icon" aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <nav className="mobile-bottom-nav d-md-none" aria-label={ariaLabel}>
        {mainTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `mobile-bottom-nav-item${isActive ? ' active' : ''}`
            }
            title={tab.label}
            aria-label={tab.label}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden>{tab.icon}</span>
            <span className="mobile-bottom-nav-label">{tab.label}</span>
          </NavLink>
        ))}

        {hasMore ? (
          <button
            type="button"
            className={`mobile-bottom-nav-item${showMore ? ' active' : ''}`}
            onClick={handleMoreClick}
            aria-label="Menu lainnya"
            aria-expanded={showMore}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden>···</span>
            <span className="mobile-bottom-nav-label">Lainnya</span>
          </button>
        ) : null}
      </nav>
    </>
  );
}
