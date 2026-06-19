import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// OWN-ROUTE-SPLIT: base dashboard bisa `/dashboard` (ADMIN/STAFF) atau `/admin-dashboard` (OWNER mode admin).
// FASE-H: dipadatkan dari 6 → 3 area (Ringkasan · Penghuni & Uang · Operasional).
function buildAdminTabs(base: string) {
  return [
    { id: 'overview', label: 'Ringkasan', to: base, match: (path: string, search: URLSearchParams) => path === base && !search.get('area') },
    { id: 'stays-finance', label: 'Penghuni & Uang', to: `${base}?area=stays-finance`, match: (path: string, search: URLSearchParams) => ['/stays', '/tenants', '/renew-requests', '/invoices', '/payment-submissions', '/invoice-payments', '/expenses'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'stays-finance') },
    { id: 'ops', label: 'Operasional', to: `${base}?area=ops`, match: (path: string, search: URLSearchParams) => ['/tickets', '/staff', '/staff-routines', '/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'ops') },
  ];
}

// FASE-H: tab Kokpit Owner dipadatkan jadi 3, dengan match yang mencakup SEMUA route owner agar
// tidak ada halaman yang tak menyorot tab (loss-refunds, market-analysis, loyalty, layanan, dst).
const OWNER_TABS = [
  { id: 'overview', label: 'Ringkasan', to: '/owner-dashboard', match: (path: string) => path === '/owner-dashboard' },
  { id: 'stays-finance', label: 'Penghuni & Uang', to: '/stays', match: (path: string) => ['/stays', '/tenants', '/renew-requests', '/invoices', '/payment-submissions', '/invoice-payments', '/expenses', '/wifi-sales', '/ancillary-revenue'].some((prefix) => path.startsWith(prefix)) },
  { id: 'ops', label: 'Laporan & Aset', to: '/reports', match: (path: string) => ['/reports', '/finance', '/loss-refunds', '/market-analysis', '/loyalty', '/staff', '/tickets', '/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings', '/users', '/settings', '/announcements', '/service-interests', '/additional-services'].some((prefix) => path.startsWith(prefix)) },
];

// OWN-ROLE-TABS-MODE: mode eksplisit, bukan hack role. OWNER + ownerViewMode='admin'
// memakai tab admin di route nyata `/admin-dashboard`; ADMIN memakai `/dashboard`.
export default function RoleWorkspaceTabs({ role, ownerViewMode }: { role?: string; ownerViewMode?: 'owner' | 'admin' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminView = role === 'ADMIN' || (role === 'OWNER' && ownerViewMode === 'admin');
  const tabs = useMemo(() => {
    if (role === 'OWNER') return ownerViewMode === 'admin' ? buildAdminTabs('/admin-dashboard') : OWNER_TABS;
    if (role === 'ADMIN') return buildAdminTabs('/dashboard');
    return [];
  }, [role, ownerViewMode]);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  if (!tabs.length) return null;

  return (
    <nav className="role-workspace-tabs" aria-label={`Navigasi workspace ${isAdminView ? 'admin' : 'owner'}`}>
      <span className="role-workspace-tabs-label">Menu area</span>
      {tabs.map((tab) => {
        const active = tab.match(location.pathname, searchParams);
        return (
          <button type="button" key={tab.id} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => navigate(tab.to)}>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
