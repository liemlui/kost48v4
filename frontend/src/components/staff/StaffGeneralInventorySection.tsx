import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import StatusBadge from '../common/StatusBadge';
import type { InventoryItem } from '../../types';
import { getInventoryHealth, getInventoryPhysicalIssueLabel, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';
import StaffInventoryStatusModal from './StaffInventoryStatusModal';

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
    return { out, low, physical };
  }, [items]);

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
        {query.isLoading ? <div className="py-4 text-center"><Spinner size="sm" /> Memuat barang gudang...</div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat barang umum/gudang.</Alert> : null}
        {!query.isLoading && !query.isError && !items.length ? <Alert variant="secondary" className="mb-0">Belum ada data barang umum atau gudang. Admin/owner bisa menambahkan master barang terlebih dahulu.</Alert> : null}
        {!!items.length ? (
          <Table responsive hover className="staff-compact-table mb-0">
            <thead>
              <tr>
                <th>Barang</th>
                <th>Area</th>
                <th>Stok sistem</th>
                <th>Status otomatis</th>
                <th>Kondisi fisik</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const health = getInventoryHealth(item);
                const physicalIssue = getInventoryPhysicalIssueLabel(item.status);
                return (
                  <tr key={item.id} className={health.status !== 'GOOD' || physicalIssue ? 'staff-inventory-row-attention' : undefined}>
                    <td>
                      <div className="fw-semibold">{item.name}</div>
                      <div className="small text-muted">{item.sku ?? `ID ${item.id}`}</div>
                    </td>
                    <td>{item.category ?? 'Gudang / umum'}</td>
                    <td>
                      <div className="staff-stock-number">{health.qty} {health.unit}</div>
                      <small>Minimal {health.minQty || '-'} {health.minQty ? health.unit : ''}</small>
                    </td>
                    <td>
                      <StatusBadge status={health.status} />
                      <div className="small text-muted mt-1">{health.status === 'GOOD' ? 'otomatis aman' : 'otomatis dari qty'}</div>
                    </td>
                    <td>
                      {physicalIssue ? <span className="staff-badge staff-badge-warning">{physicalIssue}</span> : <span className="text-muted small">Tidak ada laporan fisik</span>}
                    </td>
                    <td><Button size="sm" variant="outline-primary" onClick={() => setSelected(item)}>Laporkan masalah</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
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
