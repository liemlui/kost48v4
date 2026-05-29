import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { Button, Offcanvas } from 'react-bootstrap';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import StaffTopWorkspaceNav from '../staff/StaffTopWorkspaceNav';
import TenantWorkspaceTabs from '../tenant/TenantWorkspaceTabs';
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
      return 'Staf';
    case 'TENANT':
      return 'Penghuni';
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
      return 'Pekerjaan Staf';
    case 'TENANT':
      return 'Portal Penghuni';
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
      return 'Kerjakan tugas yang terlihat di daftar. Yang penting: cek kamar, kerjakan tiket, dan catat hasilnya.';
    case 'TENANT':
      return 'Portal sederhana untuk kamar, tagihan, tiket, pengumuman, dan profil.';
    default:
      return 'Menu utama workspace.';
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
  'inventory-items': 'Stok Barang',
  'inventory-movements': 'Riwayat Stok',
  'room-items': 'Inventaris Kamar',
  'wifi-sales': 'Penjualan WiFi',
  'meter-readings': 'Catatan Meter',
  'announcements': 'Pengumuman',
  'expenses': 'Pengeluaran',
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
  onBrandClick,
}: {
  sections: NavigationSection[];
  links: NavigationLink[];
  userRole?: string;
  onNavigate?: () => void;
  onBrandClick?: () => void;
}) {
  const location = useLocation();
  const isLinkActive = (link: NavigationLink) => {
    const paths = [link.to, ...(link.activePaths ?? [])];
    return paths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  };
  const activeLink = links.find(isLinkActive);
  const isAdmin = userRole === 'ADMIN';
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (title: string) => setCollapsedSections((current) => ({ ...current, [title]: !current[title] }));

  return (
    <>
      <button type="button" className="brand-block border-0 bg-transparent text-start w-100" onClick={onBrandClick}>
        <div className="brand-mark" aria-hidden="true">K48</div>
        <div>
          <div className="brand-title">Kost48 Surabaya</div>
          <div className="brand-subtitle">{userRole === 'STAFF' ? 'Pusat Kerja' : 'Command Center'}</div>
        </div>
      </button>

      <div className={`sidebar-context-card ${isAdmin ? 'sidebar-context-card-admin' : ''}`}>
        <div className="sidebar-context-topline">
          <span>{isAdmin ? 'Admin Command Center' : getWorkspaceTitle(userRole)}</span>
          <strong>{activeLink?.label || 'Dashboard'}</strong>
        </div>
        <div className="app-caption mt-1">{activeLink?.hint || getWorkspaceSummary(userRole)}</div>
      </div>

      <nav className="sidebar-nav-groups">
        {sections.map((section) => {
          const collapsed = collapsedSections[section.title] ?? false;
          return (
            <div className="sidebar-nav-group" key={section.title}>
              <button type="button" className="sidebar-section-toggle" onClick={() => toggleSection(section.title)} aria-expanded={!collapsed}>
                <span>{section.title}</span>
                <em>{collapsed ? '+' : '−'}</em>
              </button>
              {!collapsed ? (
                <div className="d-grid gap-2">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      title={link.hint ?? link.label}
                      className={() => `sidebar-link ${isLinkActive(link) ? 'active' : ''}`}
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
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className={`sidebar-footer sidebar-footer-compact ${isAdmin ? 'sidebar-footer-admin' : ''}`}>
        <strong>{getRoleLabel(userRole)}</strong>
        <div className="app-caption text-white-50">{isAdmin ? 'Sidebar adalah navigasi utama · detail tetap di halaman area' : userRole === 'STAFF' ? 'Lihat tugas, lalu kerjakan satu per satu' : 'Menu ringkas · detail ada di dashboard'}</div>
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
  const isStaff = user?.role === 'STAFF';
  const isTenant = user?.role === 'TENANT';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('offcanvas-open');
    } else {
      document.body.classList.remove('offcanvas-open');
    }
    return () => {
      document.body.classList.remove('offcanvas-open');
    };
  }, [sidebarOpen]);

  if (isStaff) {
    return (
      <div className="staff-workspace-shell">
        <main className="staff-workspace-main">
          <section className="staff-workspace-topbar">
            <button type="button" className="staff-workspace-brand" onClick={() => navigate('/dashboard')}>
              <span className="brand-mark small" aria-hidden="true">K48</span>
              <span>
                <strong>KOST48 Staff Workspace</strong>
                <em>Kerja harian, kamar, gudang, dan laporan</em>
              </span>
            </button>

            <div className="staff-workspace-userbar">
              <NotificationBell />
              <button type="button" className="staff-user-profile-trigger" onClick={() => navigate('/profile')} title="Buka profil">
                <span className="text-end">
                  <strong>{user?.fullName}</strong>
                  <em>{getRoleLabel(user?.role)}</em>
                </span>
                <span className="user-avatar" role="img" aria-label={`Avatar ${user?.fullName ?? 'User'}`}>
                  {getInitials(user?.fullName)}
                </span>
              </button>
              <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
            </div>
          </section>

          <StaffTopWorkspaceNav />

          <section className="staff-workspace-content">
            {children ?? <Outlet />}
          </section>
        </main>
      </div>
    );
  }


  if (isTenant) {
    return (
      <div className="tenant-workspace-shell">
        <main className="tenant-workspace-main">
          <TenantWorkspaceTabs
            stage={tenantStage}
            fullName={user?.fullName}
            initials={getInitials(user?.fullName)}
            onLogout={logout}
          />

          <section className="tenant-workspace-content">
            {children ?? <Outlet />}
          </section>
        </main>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <div className="app-shell-grid">
        <aside className="app-sidebar d-none d-xl-flex">
          <SidebarContent sections={sections} links={links} userRole={user?.role} onBrandClick={() => navigate(defaultRoute)} />
        </aside>

        <Offcanvas show={sidebarOpen} onHide={() => setSidebarOpen(false)} placement="start" className="app-sidebar-offcanvas">
          <Offcanvas.Header closeButton closeLabel="Tutup navigasi">
            <Offcanvas.Title>{getWorkspaceTitle(user?.role)}</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <div className="app-sidebar app-sidebar-mobile">
              <SidebarContent sections={sections} links={links} userRole={user?.role} onBrandClick={() => { setSidebarOpen(false); navigate(defaultRoute); }} onNavigate={() => setSidebarOpen(false)} />
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        <main className="app-main">
          <section className="app-topbar">
            <div className="app-topbar-row app-topbar-row--simple">
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

              <div className="topbar-actions-simple">
                <NotificationBell />
                {isAdmin ? (
                  <Button variant="outline-primary" size="sm" className="admin-icon-action" onClick={() => navigate('/announcements')} title="Buka pengumuman">
                    📣 <span>Pengumuman</span>
                  </Button>
                ) : null}
                {user?.role === 'TENANT' && <PaymentUrgencyChip />}
                <div className="topbar-user">
                  <button type="button" className="topbar-profile-trigger" onClick={() => navigate(user?.role === 'TENANT' ? '/portal/profile' : '/profile')} title="Buka profil">
                    <span className="text-end">
                      <strong>{user?.fullName}</strong>
                      <em>{getRoleLabel(user?.role)}</em>
                    </span>
                    <span className="user-avatar" role="img" aria-label={`Avatar ${user?.fullName ?? 'User'}`}>
                      {getInitials(user?.fullName)}
                    </span>
                  </button>
                  <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
                </div>
              </div>
            </div>
          </section>

          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
