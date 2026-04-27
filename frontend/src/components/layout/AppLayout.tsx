import { type ReactNode, useMemo, useState } from 'react';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { Button, Offcanvas } from 'react-bootstrap';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import NotificationBell from '../notifications/NotificationBell';
import PaymentUrgencyChip from '../payment-urgency/PaymentUrgencyChip';
import {
  getDefaultRoute,
  getNavigationLinks,
  getNavigationSections,
  type NavigationLink,
  type NavigationSection,
} from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';

function getRoleLabel(role?: string) {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'ADMIN':
      return 'Admin';
    case 'STAFF':
      return 'Staff';
    case 'TENANT':
      return 'Tenant';
    default:
      return role || 'User';
  }
}

function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getWorkspaceTitle(role?: string) {
  switch (role) {
    case 'OWNER':
      return 'Workspace Owner';
    case 'ADMIN':
      return 'Workspace Admin';
    case 'STAFF':
      return 'Workspace Staff';
    case 'TENANT':
      return 'Portal Tenant';
    default:
      return 'Workspace';
  }
}

function getWorkspaceSummary(role?: string) {
  switch (role) {
    case 'OWNER':
      return 'Surface owner dipersempit untuk KPI, finance summary, dan arah keputusan bisnis.';
    case 'ADMIN':
      return 'Surface admin dipusatkan ke operasional harian, approval, dan kontrol data penting.';
    case 'STAFF':
      return 'Surface staff dipersempit untuk pekerjaan lapangan, ticket, dan inventory teknis.';
    case 'TENANT':
      return 'Portal tenant dijaga sederhana untuk hunian, tagihan, tiket, pengumuman, dan profil.';
    default:
      return 'Navigasi disusun ulang agar lebih ringkas, lebih fokus, dan lebih mudah dipakai.';
  }
}

function titleCaseSegment(segment: string) {
  return segment
    .split('-')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

const segmentLabelMap: Record<string, string> = {
  'notifications': 'Notifikasi',
  'reminders': 'Pengingat WhatsApp',
  'payment-submissions': 'Review Pembayaran',
  'invoice-payments': 'Pembayaran Manual',
  'inventory-items': 'Inventory Items',
  'inventory-movements': 'Inventory Movements',
  'room-items': 'Room Items',
  'wifi-sales': 'WiFi Sales',
  'meter-readings': 'Meter Readings',
  'announcements': 'Announcements',
  'expenses': 'Expenses',
};

function toLabel(segment: string): string {
  return segmentLabelMap[segment] ?? titleCaseSegment(segment);
}

function getBreadcrumbParts(pathname: string, links: NavigationLink[]) {
  const matched = links.find((link) => pathname === link.to || pathname.startsWith(`${link.to}/`));
  const parts: string[] = [];

  if (matched) {
    parts.push(matched.label);
  }

  const rawSegments = pathname.split('/').filter(Boolean);
  const linkSegments = matched?.to.split('/').filter(Boolean) ?? [];
  const remainingSegments = rawSegments.slice(linkSegments.length);

  remainingSegments.forEach((segment) => {
    if (/^\d+$/.test(segment)) {
      parts.push('Detail');
      return;
    }
    parts.push(toLabel(segment));
  });

  return parts.length ? parts : ['Dashboard'];
}

function SidebarContent({
  sections,
  links,
  userRole,
  onNavigate,
}: {
  sections: NavigationSection[];
  links: NavigationLink[];
  userRole?: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const activeLink = links.find((link) => location.pathname === link.to || location.pathname.startsWith(`${link.to}/`));

  return (
    <>
      <button type="button" className="brand-block border-0 bg-transparent text-start w-100" onClick={onNavigate}>
        <div className="brand-mark" aria-hidden="true">K48</div>
        <div>
          <div className="brand-title">Kost48 Surabaya</div>
          <div className="brand-subtitle">Role-based workspace</div>
        </div>
      </button>

      <div className="glass-card p-3 rounded-4 border-0 shadow-none">
        <div className="sidebar-section-label mb-2">{getWorkspaceTitle(userRole)}</div>
        <div className="fw-semibold">{activeLink?.label || 'Control Center'}</div>
        <div className="app-caption mt-1">{activeLink?.hint || getWorkspaceSummary(userRole)}</div>
      </div>

      <nav className="sidebar-nav-groups">
        {sections.map((section) => (
          <div className="sidebar-nav-group" key={section.title}>
            <div className="sidebar-section-label">{section.title}</div>
            <div className="d-grid gap-2">
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onNavigate}
                >
                  <span className="sidebar-link-label">
                    <span className="sidebar-link-icon" role="img" aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                  <span className="sidebar-link-arrow" aria-hidden="true">›</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <strong>{getWorkspaceTitle(userRole)}</strong>
        <div className="app-caption text-white-50">{getWorkspaceSummary(userRole)}</div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stage: tenantStage } = useTenantPortalStage();
  const sections = useMemo(() => getNavigationSections(user?.role, tenantStage), [user?.role, tenantStage]);
  const links = useMemo(() => getNavigationLinks(user?.role, tenantStage), [user?.role, tenantStage]);
  const breadcrumbParts = useMemo(() => getBreadcrumbParts(location.pathname, links), [location.pathname, links]);
  const defaultRoute = getDefaultRoute(user?.role, tenantStage);

  return (
    <div className="app-shell">
      <div className="app-shell-grid">
        <aside className="app-sidebar d-none d-xl-flex">
          <SidebarContent sections={sections} links={links} userRole={user?.role} onNavigate={() => navigate(defaultRoute)} />
        </aside>

        <Offcanvas show={sidebarOpen} onHide={() => setSidebarOpen(false)} placement="start" className="app-sidebar-offcanvas">
          <Offcanvas.Header closeButton closeLabel="Tutup navigasi">
            <Offcanvas.Title>Navigasi</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <div className="app-sidebar app-sidebar-mobile">
              <SidebarContent sections={sections} links={links} userRole={user?.role} onNavigate={() => { setSidebarOpen(false); navigate(defaultRoute); }} />
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        <main className="app-main">
          <section className="app-topbar">
            <div className="app-topbar-row gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-3">
                <Button variant="link" className="d-xl-none app-mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi">
                  ☰
                </Button>
                <nav aria-label="breadcrumb" className="app-topbar-breadcrumb">
                  {breadcrumbParts.map((part, index) => (
                    <span key={`${part}-${index}`}>
                      {index > 0 ? <span className="app-breadcrumb-separator"> / </span> : null}
                      <span>{part}</span>
                    </span>
                  ))}
                </nav>
              </div>

              <div className="d-flex align-items-center gap-3 flex-grow-1 justify-content-end flex-wrap">
                <GlobalSearch role={user?.role} />
                <NotificationBell />
                <PaymentUrgencyChip />
                <div className="topbar-user">
                  <div className="text-end">
                    <div className="fw-semibold">{user?.fullName}</div>
                    <div className="app-caption">{getRoleLabel(user?.role)}</div>
                  </div>
                  <div className="user-avatar" role="img" aria-label={`Avatar ${user?.fullName ?? 'User'}`}>
                    {getInitials(user?.fullName)}
                  </div>
                  <Button variant="outline-secondary" size="sm" onClick={() => navigate(user?.role === 'TENANT' ? '/portal/profile' : '/profile')}>
                    Profil
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
                </div>
              </div>
            </div>
            {location.pathname !== defaultRoute ? (
              <div className="app-caption mt-2">Navigasi saat ini disederhanakan sesuai role aktif untuk mengurangi menu yang tidak relevan.</div>
            ) : null}
          </section>

          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
