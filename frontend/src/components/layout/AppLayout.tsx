import { type ReactNode, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { Button, Offcanvas } from 'react-bootstrap';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_VERSION, APP_PHASE } from '../../config/version';
import NotificationBell from '../notifications/NotificationBell';
import StaffTopWorkspaceNav from '../staff/StaffTopWorkspaceNav';
import TenantWorkspaceTabs from '../tenant/TenantWorkspaceTabs';
import MobileBottomNav from './MobileBottomNav';
const CommandPalette = lazy(() => import('../common/CommandPalette'));
import RoleWorkspaceTabs from '../workspace/RoleWorkspaceTabs';
import GlobalSearch from './GlobalSearch';
import PaymentUrgencyChip from '../payment-urgency/PaymentUrgencyChip';
import Kost48LogoMark from '../common/Kost48LogoMark';
import TenantAvatar from '../common/TenantAvatar';
import {
  getDefaultRoute,
  getNavigationLinks,
  getNavigationSections,
  ownerAdminSections,
  type NavigationLink,
  type NavigationSection,
} from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../common/ConfirmProvider';

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

function getWorkspaceTitle(role?: string, ownerViewMode?: 'owner' | 'admin') {
  switch (role) {
    case 'OWNER':
      return ownerViewMode === 'admin' ? 'Area Admin (Owner)' : 'Kokpit Owner';
    case 'ADMIN':
      return 'Command Center Admin';
    case 'STAFF':
      return 'Operasional KOST48';
    case 'TENANT':
      return 'Portal Penghuni';
    default:
      return 'Workspace';
  }
}

function getWorkspaceSummary(role?: string, ownerViewMode?: 'owner' | 'admin') {
  switch (role) {
    case 'OWNER':
      return ownerViewMode === 'admin' ? 'Kelola keputusan harian, pembayaran, kamar, dan laporan operasional.' : 'Pantau kesehatan bisnis, kamar, dan laporan keuangan utama.';
    case 'ADMIN':
      return 'Kelola keputusan harian, pembayaran, kamar, dan laporan operasional.';
    case 'STAFF':
      return 'Mulai dari pekerjaan hari ini, lalu catat hasil kerja dengan rapi.';
    case 'TENANT':
      return 'Portal sederhana untuk kamar, tagihan, laporan, WiFi, dan profil.';
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
  ownerViewMode,
  onNavigate,
  onBrandClick,
}: {
  sections: NavigationSection[];
  links: NavigationLink[];
  userRole?: string;
  ownerViewMode?: 'owner' | 'admin';
  onNavigate?: () => void;
  onBrandClick?: () => void;
}) {
  const location = useLocation();
  const isLinkActive = (link: NavigationLink) => {
    const paths = [link.to, ...(link.activePaths ?? [])];
    return paths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  };
  const activeLink = links.find(isLinkActive);
  // OWNER dalam mode admin diperlakukan sebagai konteks admin untuk title/subtitle/footer.
  const isAdmin = userRole === 'ADMIN' || (userRole === 'OWNER' && ownerViewMode === 'admin');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (title: string) => setCollapsedSections((current) => ({ ...current, [title]: !current[title] }));

  return (
    <>
      <button type="button" className="brand-block border-0 bg-transparent text-start w-100" onClick={onBrandClick}>
        <Kost48LogoMark />
        <div>
          <div className="brand-title">Kost48 Surabaya</div>
          <div className="brand-subtitle">{userRole === 'STAFF' ? 'Pusat Kerja' : 'Command Center'}</div>
        </div>
      </button>

      <div className={`sidebar-context-card ${isAdmin ? 'sidebar-context-card-admin' : ''}`}>
        <div className="sidebar-context-topline">
          <span>{getWorkspaceTitle(userRole, ownerViewMode)}</span>
          <strong>{activeLink?.label || 'Dashboard'}</strong>
        </div>
        <div className="app-caption mt-1">{activeLink?.hint || getWorkspaceSummary(userRole, ownerViewMode)}</div>
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
        <div className="app-caption text-white-50">{isAdmin ? 'Gunakan menu untuk membuka area kerja' : userRole === 'STAFF' ? 'Mulai dari tugas hari ini' : 'Menu ringkas · detail ada di dashboard'}</div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const handleLogoutClick = async () => {
    const ok = await confirm({ title: 'Keluar', message: 'Yakin ingin keluar?', confirmLabel: 'Keluar', variant: 'danger' });
    if (!ok) return;
    logout();
  };
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<'expanded' | 'collapsed'>(() => {
    try {
      const saved = localStorage.getItem('kost48_sidebar_collapsed');
      return saved === 'collapsed' ? 'collapsed' : 'expanded';
    } catch { return 'expanded'; }
  });
  const { stage: tenantStage, isLoading: tenantStageLoading } = useTenantPortalStage();

  const isStaff = user?.role === 'STAFF';
  const isTenant = user?.role === 'TENANT';
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.role === 'OWNER';

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = prev === 'expanded' ? 'collapsed' : 'expanded';
      localStorage.setItem('kost48_sidebar_collapsed', next);
      return next;
    });
  };

  // Owner view mode: 'owner' = Kokpit Owner, 'admin' = Area Admin (operasional)
  const [ownerViewMode, setOwnerViewMode] = useState<'owner' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem('kost48_owner_view_mode');
      return saved === 'admin' ? 'admin' : 'owner';
    } catch {
      return 'owner';
    }
  });

  // Persist ownerViewMode to localStorage
  useEffect(() => {
    if (isOwner) {
      try {
        localStorage.setItem('kost48_owner_view_mode', ownerViewMode);
      } catch { /* ignore quota errors */ }
    }
  }, [ownerViewMode, isOwner]);

  useEffect(() => {
    function handleCmdK(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', handleCmdK);
    return () => document.removeEventListener('keydown', handleCmdK);
  }, []);

  // OWN-ROUTE-GUARD: mode mengikuti route dashboard nyata. Membuka /admin-dashboard
  // (mis. via URL langsung atau tab) menyalakan mode admin; /owner-dashboard kembali ke mode owner.
  useEffect(() => {
    if (!isOwner) return;
    if (location.pathname === '/admin-dashboard' && ownerViewMode !== 'admin') setOwnerViewMode('admin');
    else if (location.pathname === '/owner-dashboard' && ownerViewMode !== 'owner') setOwnerViewMode('owner');
  }, [location.pathname, isOwner, ownerViewMode]);

  // OWN-ROUTE-SPLIT: ganti mode = pindah ke route dashboard yang sesuai (bukan render inline).
  const changeOwnerViewMode = (mode: 'owner' | 'admin') => {
    setOwnerViewMode(mode);
    setSidebarOpen(false);
    navigate(mode === 'admin' ? '/admin-dashboard' : '/owner-dashboard');
  };

  const sections = useMemo(() => {
    if (isOwner && ownerViewMode === 'admin') return ownerAdminSections;
    return getNavigationSections(user?.role, tenantStage);
  }, [user?.role, tenantStage, isOwner, ownerViewMode]);

  const links = useMemo(() => {
    if (isOwner && ownerViewMode === 'admin') return ownerAdminSections.flatMap((s) => s.links);
    return getNavigationLinks(user?.role, tenantStage);
  }, [user?.role, tenantStage, isOwner, ownerViewMode]);

  const breadcrumbParts = useMemo(() => {
    const parts = getBreadcrumbParts(location.pathname, links);
    // OWN-BREADCRUMB-MODE: root hard-label sesuai mode owner aktif.
    if (isOwner) {
      const root = ownerViewMode === 'admin' ? 'Area Admin' : 'Kokpit Owner';
      if (parts[0] !== root) return [root, ...parts];
    }
    return parts;
  }, [location.pathname, links, isOwner, ownerViewMode]);
  const defaultRoute = getDefaultRoute(user?.role, tenantStage);

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
              <Kost48LogoMark size="small" />
              <span>
                <strong>Operasional KOST48</strong>
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
                <TenantAvatar tenantId={user?.tenantId} fullName={user?.fullName} enabled={user?.role === 'TENANT'} />
              </button>
              <Button variant="outline-danger" size="sm" onClick={handleLogoutClick}>Logout</Button>
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
            stageLoading={tenantStageLoading}
            fullName={user?.fullName}
            initials={getInitials(user?.fullName)}
            onLogout={logout}
          />

          <section className="tenant-workspace-content">
            {children ?? <Outlet />}
          </section>
        </main>
        <MobileBottomNav stage={tenantStage} />
      </div>
    );
  }
  return (
    <>
    <a href="#main-content" className="skip-to-content">Loncat ke konten utama</a>
    <div className="app-shell">
      <div className={`app-shell-grid ${sidebarCollapsed === 'collapsed' ? 'sidebar-collapsed' : ''}`}>
        <aside className={`app-sidebar d-none d-xl-flex ${sidebarCollapsed === 'collapsed' ? 'sidebar-collapsed' : ''}`}>
          <button type="button" className={`sidebar-collapse-toggle ${sidebarCollapsed === 'collapsed' ? 'collapsed' : ''}`} onClick={toggleSidebarCollapsed} aria-label={sidebarCollapsed === 'collapsed' ? 'Perluas sidebar' : 'Ciutkan sidebar'} title={sidebarCollapsed === 'collapsed' ? 'Perluas' : 'Ciutkan'}>
            ◀
          </button>
          <SidebarContent sections={sections} links={links} userRole={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} onBrandClick={() => navigate(defaultRoute)} />
        </aside>

        <Offcanvas show={sidebarOpen} onHide={() => setSidebarOpen(false)} placement="start" className="app-sidebar-offcanvas">
          <Offcanvas.Header closeButton closeLabel="Tutup navigasi">
            <Offcanvas.Title>{getWorkspaceTitle(user?.role, isOwner ? ownerViewMode : undefined)}</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <div className="app-sidebar app-sidebar-mobile">
              {isOwner ? (
                <div className="owner-view-toggle owner-view-toggle-mobile" role="group" aria-label="Mode tampilan owner">
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'owner'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('owner')}
                  >
                    <span aria-hidden="true">📈</span> Kokpit Owner
                  </button>
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'admin'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('admin')}
                  >
                    <span aria-hidden="true">🔧</span> Area Admin
                  </button>
                </div>
              ) : null}
              <SidebarContent sections={sections} links={links} userRole={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} onBrandClick={() => { setSidebarOpen(false); navigate(defaultRoute); }} onNavigate={() => setSidebarOpen(false)} />
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        <main className="app-main" id="main-content">
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
                      {index === 0 ? <NavLink to={defaultRoute} className="app-breadcrumb-link">{part}</NavLink> : <span>{part}</span>}
                    </span>
                  ))}
                </nav>
              </div>

              {isOwner ? (
                <div className="owner-view-toggle-wrap d-none d-xl-flex">
                  <span className="topbar-divider" aria-hidden="true" />
                  <div className="owner-view-toggle">
                    <button
                      type="button"
                      aria-pressed={ownerViewMode === 'owner'}
                      className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('owner')}
                    >
                      <span aria-hidden="true">📈</span> Kokpit Owner
                    </button>
                    <button
                      type="button"
                      aria-pressed={ownerViewMode === 'admin'}
                      className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('admin')}
                    >
                      <span aria-hidden="true">🔧</span> Area Admin
                    </button>
                  </div>
                  <span className="topbar-divider" aria-hidden="true" />
                </div>
              ) : null}

              <div className="topbar-actions-simple">
                <div className="d-none d-lg-block">
                  <GlobalSearch role={user?.role} />
                </div>
                <NotificationBell />
                {isAdmin || isOwner ? (
                  <Button variant="outline-primary" size="sm" className="admin-icon-action" onClick={() => navigate('/announcements')} title="Buka pengumuman" aria-label="Buka pengumuman">
                    <span aria-hidden="true">📣</span> <span>Pengumuman</span>
                  </Button>
                ) : null}
                {user?.role === 'TENANT' && <PaymentUrgencyChip />}
                <div className="topbar-user">
                  <button type="button" className="topbar-profile-trigger" onClick={() => navigate(user?.role === 'TENANT' ? '/portal/profile' : '/profile')} title="Buka profil">
                    <span className="text-end">
                      <strong>{user?.fullName}</strong>
                      <em>{getRoleLabel(user?.role)}</em>
                    </span>
                    <TenantAvatar tenantId={user?.tenantId} fullName={user?.fullName} enabled={user?.role === 'TENANT'} />
                  </button>
                  <Button variant="outline-danger" size="sm" onClick={handleLogoutClick}>Logout</Button>
                </div>
              </div>
            </div>
            <div className="d-lg-none mt-2">
              <GlobalSearch role={user?.role} />
            </div>
            {isOwner ? (
              <div className="d-xl-none mt-1">
                <div className="owner-view-toggle owner-view-toggle-topbar-mobile" role="group" aria-label="Mode tampilan owner">
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'owner'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('owner')}
                  >
                    <span aria-hidden="true">📈</span> Kokpit Owner
                  </button>
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'admin'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('admin')}
                  >
                    <span aria-hidden="true">🔧</span> Area Admin
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {isAdmin || isOwner ? <RoleWorkspaceTabs role={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} /> : null}
          {children ?? <Outlet />}
        </main>

        <footer className="app-footer">
          <span>KOST48 v{APP_VERSION}</span>
          <span className="app-footer-phase">{APP_PHASE}</span>
        </footer>
      </div>
    </div>
    <Suspense fallback={null}>
      {isCommandOpen && <CommandPalette onClose={() => setIsCommandOpen(false)} />}
    </Suspense>
    </>
  );
}
