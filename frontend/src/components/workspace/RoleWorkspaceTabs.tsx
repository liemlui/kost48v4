import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// OWN-ROUTE-SPLIT: base dashboard bisa `/dashboard` (ADMIN/STAFF) atau `/admin-dashboard` (OWNER mode admin).
function buildAdminTabs(base: string) {
  return [
    { id: 'today', label: 'Hari Ini', to: base, match: (path: string, search: URLSearchParams) => path === base && !search.get('area') },
    { id: 'stays', label: 'Masa Sewa', to: `${base}?area=stays`, match: (path: string, search: URLSearchParams) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') || (path === base && search.get('area') === 'stays') },
    { id: 'finance', label: 'Keuangan', to: `${base}?area=finance`, match: (path: string, search: URLSearchParams) => ['/invoices', '/payment-submissions', '/invoice-payments', '/expenses'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'finance') },
    { id: 'tickets', label: 'Tiket', to: `${base}?area=tickets`, match: (path: string, search: URLSearchParams) => path.startsWith('/tickets') || (path === base && search.get('area') === 'tickets') },
    { id: 'staff', label: 'Staff', to: `${base}?area=staff`, match: (path: string, search: URLSearchParams) => path.startsWith('/staff') || path.startsWith('/staff-routines') || (path === base && search.get('area') === 'staff') },
    { id: 'rooms', label: 'Kamar & Stok', to: `${base}?area=rooms`, match: (path: string, search: URLSearchParams) => ['/rooms', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'rooms') },
  ];
}

const OWNER_TABS = [
  { id: 'overview', label: 'Ringkasan', to: '/owner-dashboard', match: (path: string) => path === '/owner-dashboard' },
  { id: 'stays', label: 'Masa Sewa', to: '/stays', match: (path: string) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') },
  { id: 'finance', label: 'Keuangan', to: '/invoices', match: (path: string) => ['/invoices', '/payment-submissions', '/invoice-payments', '/expenses', '/wifi-sales', '/ancillary-revenue', '/finance/accounting-setup', '/loss-refunds'].some((prefix) => path.startsWith(prefix)) },
  { id: 'reports', label: 'Laporan', to: '/reports', match: (path: string) => path.startsWith('/reports') },
  { id: 'staff', label: 'Staff', to: '/staff-performance', match: (path: string) => path.startsWith('/staff') || path.startsWith('/tickets') },
  { id: 'rooms', label: 'Barang & Aset', to: '/rooms', match: (path: string) => ['/rooms', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings', '/finance/assets'].some((prefix) => path.startsWith(prefix)) },
  { id: 'settings', label: 'Pengaturan', to: '/settings', match: (path: string) => path.startsWith('/settings') || path.startsWith('/users') || path.startsWith('/announcements') },
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
