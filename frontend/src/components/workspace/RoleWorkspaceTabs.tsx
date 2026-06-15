import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ADMIN_TABS = [
  { id: 'today', label: 'Hari Ini', to: '/dashboard', match: (path: string, search: URLSearchParams) => path === '/dashboard' && !search.get('area') },
  { id: 'stays', label: 'Masa Sewa', to: '/dashboard?area=stays', match: (path: string, search: URLSearchParams) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') || (path === '/dashboard' && search.get('area') === 'stays') },
  { id: 'finance', label: 'Keuangan', to: '/dashboard?area=finance', match: (path: string, search: URLSearchParams) => ['/invoices', '/payment-submissions', '/invoice-payments', '/expenses'].some((prefix) => path.startsWith(prefix)) || (path === '/dashboard' && search.get('area') === 'finance') },
  { id: 'tickets', label: 'Tiket', to: '/dashboard?area=tickets', match: (path: string, search: URLSearchParams) => path.startsWith('/tickets') || (path === '/dashboard' && search.get('area') === 'tickets') },
  { id: 'staff', label: 'Staff', to: '/dashboard?area=staff', match: (path: string, search: URLSearchParams) => path.startsWith('/staff') || path.startsWith('/staff-routines') || (path === '/dashboard' && search.get('area') === 'staff') },
  { id: 'rooms', label: 'Kamar & Stok', to: '/dashboard?area=rooms', match: (path: string, search: URLSearchParams) => ['/rooms', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'].some((prefix) => path.startsWith(prefix)) || (path === '/dashboard' && search.get('area') === 'rooms') },
];

const OWNER_TABS = [
  { id: 'overview', label: 'Ringkasan', to: '/owner-dashboard', match: (path: string) => path === '/owner-dashboard' },
  { id: 'stays', label: 'Masa Sewa', to: '/stays', match: (path: string) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') },
  { id: 'finance', label: 'Keuangan', to: '/invoices', match: (path: string) => ['/invoices', '/payment-submissions', '/invoice-payments', '/expenses', '/wifi-sales', '/ancillary-revenue', '/finance/accounting-setup', '/loss-refunds'].some((prefix) => path.startsWith(prefix)) },
  { id: 'reports', label: 'Laporan', to: '/reports', match: (path: string) => path.startsWith('/reports') },
  { id: 'staff', label: 'Staff', to: '/staff-performance', match: (path: string) => path.startsWith('/staff') || path.startsWith('/tickets') },
  { id: 'rooms', label: 'Barang & Aset', to: '/rooms', match: (path: string) => ['/rooms', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings', '/finance/assets'].some((prefix) => path.startsWith(prefix)) },
  { id: 'settings', label: 'Pengaturan', to: '/settings', match: (path: string) => path.startsWith('/settings') || path.startsWith('/users') || path.startsWith('/announcements') },
];

export default function RoleWorkspaceTabs({ role }: { role?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = role === 'ADMIN' ? ADMIN_TABS : role === 'OWNER' ? OWNER_TABS : [];
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  if (!tabs.length) return null;

  return (
    <nav className="role-workspace-tabs" aria-label={`Navigasi workspace ${role === 'OWNER' ? 'owner' : 'admin'}`}>
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
