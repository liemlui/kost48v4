import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// OWN-ROUTE-SPLIT: base dashboard bisa `/dashboard` (ADMIN/STAFF) atau `/admin-dashboard` (OWNER mode admin).
// FASE-H: dipadatkan dari 6 → 3 area (Ringkasan · Penghuni & Uang · Operasional).
// N-04: hapus tab Ringkasan (sidebar sudah punya item Dashboard → base) agar tidak ada rute ganda.
function buildAdminTabs(base: string) {
  return [
    { id: 'stays-finance', label: 'Penghuni & Uang', to: `${base}?area=stays-finance`, match: (path: string, search: URLSearchParams) => ['/stays', '/tenants', '/renew-requests', '/invoices', '/payment-submissions', '/invoice-payments', '/expenses'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'stays-finance') },
    { id: 'ops', label: 'Operasional', to: `${base}?area=ops`, match: (path: string, search: URLSearchParams) => ['/tickets', '/staff', '/staff-routines', '/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'ops') },
  ];
}

// N-04: hapus tab yang duplikat dengan sidebar owner:
// - 'Ringkasan' → /owner-dashboard (sudah ada di sidebar sebagai 'Kokpit Owner')
// - 'Laporan & Aset' → /reports (sudah ada di sidebar sebagai 'Laporan Bisnis')
// Sisa: hanya 'Penghuni & Uang' → /stays (tidak ada di sidebar owner).
const OWNER_TABS = [
  { id: 'stays-finance', label: 'Penghuni & Uang', to: '/stays', match: (path: string) => ['/stays', '/tenants', '/renew-requests', '/invoices', '/payment-submissions', '/invoice-payments', '/expenses', '/wifi-sales', '/ancillary-revenue'].some((prefix) => path.startsWith(prefix)) },
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
