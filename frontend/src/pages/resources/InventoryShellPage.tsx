import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import SegmentedTabs, { type SegmentedTabItem } from '../../components/common/SegmentedTabs';

// FASE B-2: shell Inventaris terpadu. Tab berbasis PATH (`/inventory/<key>`) supaya
// pembersihan query param prefill di SimpleCrudPage tidak menghapus tab aktif.
const TABS = [
  { key: 'gudang', label: 'Gudang', icon: '🧰' },
  { key: 'barang-kamar', label: 'Barang Kamar', icon: '🪑' },
  { key: 'mutasi', label: 'Mutasi', icon: '🔄' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function InventoryShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const active: TabKey = TABS.find((tab) => location.pathname.startsWith(`/inventory/${tab.key}`))?.key ?? 'gudang';
  const items: SegmentedTabItem<TabKey>[] = TABS.map((tab) => ({ key: tab.key, label: tab.label, icon: tab.icon }));

  return (
    <div className="inventory-shell">
      <div className="inventory-shell-head">
        <span className="owner-section-kicker">Inventaris terpadu</span>
        <p className="app-caption mb-2">Stok gudang, barang per kamar, dan mutasi resmi dalam satu tempat.</p>
      </div>
      <SegmentedTabs
        items={items}
        value={active}
        onChange={(key) => navigate(`/inventory/${key}`)}
        ariaLabel="Area inventaris"
        size="md"
      />
      <div className="mt-3">
        <Outlet />
      </div>
    </div>
  );
}
