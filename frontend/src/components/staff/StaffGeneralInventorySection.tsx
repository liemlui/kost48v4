import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import StatusBadge from '../common/StatusBadge';
import PaginationControls from '../common/PaginationControls';
import type { InventoryItem } from '../../types';
import { getInventoryHealth, getInventoryPhysicalIssueLabel, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';
import StaffInventoryStatusModal from './StaffInventoryStatusModal';
import SegmentedTabs from '../common/SegmentedTabs';

type InventoryViewFilter = 'ALL' | 'ATTENTION' | 'OUT' | 'LOW' | 'PHYSICAL' | 'GOOD';

const STATUS_ICONS: Record<InventoryViewFilter, string> = {
  ALL: '📦', ATTENTION: '⚠️', OUT: '⛔', LOW: '🔻', PHYSICAL: '🔧', GOOD: '✅',
};

function priorityScore(item: InventoryItem) {
  const health = getInventoryHealth(item);
  const hasPhysicalIssue = isInventoryPhysicalIssue(item.status);
  if (hasPhysicalIssue) return 0;
  if (health.status === 'OUT_OF_STOCK') return 1;
  if (health.status === 'LOW_STOCK') return 2;
  return 3;
}

export default function StaffGeneralInventorySection({ embedded = false }: { embedded?: boolean }) {
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  // Default tampil SEMUA (hindari tabel kosong saat tidak ada yang perlu dicek).
  // Chip "Perlu dicek" tetap menonjol saat ada masalah.
  const [activeFilter, setActiveFilter] = useState<InventoryViewFilter>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const query = useQuery({
    queryKey: ['staff-general-inventory'],
    queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 200, isActive: 'true' }),
  });

  const items = useMemo(() => {
    const raw = query.data?.items ?? [];
    return raw
      .filter((item) => item.isActive !== false && String(item.category ?? '').toUpperCase() !== 'BARANG_KAMAR')
      .sort((a, b) => priorityScore(a) - priorityScore(b) || String(a.category ?? '').localeCompare(String(b.category ?? '')) || a.name.localeCompare(b.name));
  }, [query.data?.items]);

  const stockSummary = useMemo(() => {
    const out = items.filter((item) => getInventoryHealth(item).status === 'OUT_OF_STOCK').length;
    const low = items.filter((item) => getInventoryHealth(item).status === 'LOW_STOCK').length;
    const physical = items.filter((item) => isInventoryPhysicalIssue(item.status)).length;
    const attention = items.filter((item) => getInventoryHealth(item).status !== 'GOOD' || isInventoryPhysicalIssue(item.status)).length;
    const good = Math.max(0, items.length - attention);
    return { out, low, physical, attention, good };
  }, [items]);

  // Filter STATUS (kesehatan stok) — terpisah dari filter Kategori (jenis barang).
  const inventoryFilters: Array<{ id: InventoryViewFilter; label: string; count: number }> = [
    { id: 'ATTENTION', label: 'Perlu dicek', count: stockSummary.attention },
    { id: 'OUT', label: 'Habis', count: stockSummary.out },
    { id: 'LOW', label: 'Menipis', count: stockSummary.low },
    { id: 'PHYSICAL', label: 'Masalah fisik', count: stockSummary.physical },
    { id: 'GOOD', label: 'Stok aman', count: stockSummary.good },
    { id: 'ALL', label: 'Semua status', count: items.length },
  ];

  // Kategori = jenis barang (mis. Furnitur, Elektronik). Beda dari status di atas.
  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const item of items) {
      const cat = (item.category ?? 'Umum').trim() || 'Umum';
      set.set(cat, (set.get(cat) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const cat = (item.category ?? 'Umum').trim() || 'Umum';
      if (activeCategory !== 'ALL' && cat !== activeCategory) return false;
      const health = getInventoryHealth(item);
      const physical = isInventoryPhysicalIssue(item.status);
      if (activeFilter === 'OUT') return health.status === 'OUT_OF_STOCK';
      if (activeFilter === 'LOW') return health.status === 'LOW_STOCK';
      if (activeFilter === 'PHYSICAL') return physical;
      if (activeFilter === 'GOOD') return health.status === 'GOOD' && !physical;
      if (activeFilter === 'ATTENTION') return health.status !== 'GOOD' || physical;
      return true;
    });
  }, [activeFilter, activeCategory, items]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visibleItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className={embedded ? 'border-0 staff-general-inventory-card embedded' : 'content-card border-0 staff-general-inventory-card'}>
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="eyebrow mb-1">Barang umum & gudang</div>
            <h6 className="mb-1">Stok dihitung otomatis, staff cukup lapor masalah lapangan</h6>
            <div className="text-muted small">Habis/menipis dihitung dari jumlah dan minimal stok. Staff tidak perlu memilih status stok manual.</div>
          </div>
          <div className="staff-stock-summary-strip" aria-label="Ringkasan stok otomatis">
            <span className={stockSummary.out ? 'tone-danger' : ''}>{stockSummary.out} habis</span>
            <span className={stockSummary.low ? 'tone-warning' : ''}>{stockSummary.low} menipis</span>
            <span>{stockSummary.physical} masalah fisik</span>
          </div>
        </div>
        {!!items.length ? (
          <div className="staff-inventory-filters">
            <div className="staff-inventory-filter-group">
              <span className="staff-inventory-filter-label">Status stok</span>
              <SegmentedTabs
                ariaLabel="Filter status stok"
                rowClassName="staff-inventory-filter-row"
                size="md"
                value={activeFilter}
                onChange={setActiveFilter}
                items={inventoryFilters
                  .filter((f) => f.id === 'ALL' || f.count > 0)
                  .map((f) => ({ key: f.id, label: f.label, icon: STATUS_ICONS[f.id], count: f.count }))}
              />
            </div>
            {categories.length > 1 ? (
              <div className="staff-inventory-filter-group">
                <span className="staff-inventory-filter-label">Kategori barang</span>
                <SegmentedTabs
                  ariaLabel="Filter kategori barang"
                  rowClassName="staff-inventory-filter-row"
                  size="md"
                  value={activeCategory}
                  onChange={setActiveCategory}
                  items={[
                    { key: 'ALL', label: 'Semua kategori', icon: '📋', count: items.length },
                    ...categories.map(([cat, count]) => ({ key: cat, label: cat, icon: '🏷️', count })),
                  ]}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {query.isLoading ? <div className="py-4 text-center"><Spinner size="sm" /> Memuat barang gudang...</div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat barang umum/gudang.</Alert> : null}
        {!query.isLoading && !query.isError && !items.length ? <Alert variant="secondary" className="mb-0">Belum ada data barang umum atau gudang. Data barang akan muncul setelah master barang tersedia.</Alert> : null}
        {!!filteredItems.length ? (
          <Table responsive hover className="staff-compact-table mb-0">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Kategori</th>
                <th>Stok sistem</th>
                <th>Status otomatis</th>
                <th>Kondisi fisik</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const health = getInventoryHealth(item);
                const physicalIssue = getInventoryPhysicalIssueLabel(item.status);
                return (
                  <tr key={item.id} className={health.status !== 'GOOD' || physicalIssue ? 'staff-inventory-row-attention' : undefined}>
                    <td data-label="Barang">
                      <div className="fw-semibold">{item.name}</div>
                      <div className="small text-muted">{item.sku ?? `ID ${item.id}`}</div>
                    </td>
                    <td data-label="Kategori">{(item.category ?? 'Umum').trim() || 'Umum'}</td>
                    <td data-label="Stok sistem">
                      <div className="staff-stock-number">{health.qty} {health.unit}</div>
                      <small>Minimal {health.minQty || '-'} {health.minQty ? health.unit : ''}</small>
                    </td>
                    <td data-label="Status otomatis">
                      <StatusBadge status={health.status} />
                      <div className="small text-muted mt-1">{health.status === 'GOOD' ? 'otomatis aman' : 'otomatis dari qty'}</div>
                    </td>
                    <td data-label="Kondisi fisik">
                      {physicalIssue ? <span className="staff-badge staff-badge-warning">{physicalIssue}</span> : <span className="text-muted small">Tidak ada laporan fisik</span>}
                    </td>
                    <td data-label="Aksi"><Button size="sm" variant="outline-primary" onClick={() => setSelected(item)}>Laporkan masalah</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
        {!query.isLoading && !query.isError && !!items.length && !filteredItems.length ? (
          <Alert variant="secondary" className="mb-0">Tidak ada barang pada filter ini.</Alert>
        ) : null}
        {filteredItems.length > PAGE_SIZE ? (
          <div className="mt-3">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              isLoading={query.isLoading}
            />
          </div>
        ) : null}
      </Card.Body>
      <StaffInventoryStatusModal
        show={Boolean(selected)}
        target={selected ? { type: 'inventory-item', item: selected } : null}
        onHide={() => setSelected(null)}
      />
    </Card>
  );
}
