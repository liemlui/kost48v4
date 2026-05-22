import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import StatusBadge from '../common/StatusBadge';
import type { InventoryItem } from '../../types';
import StaffInventoryStatusModal from './StaffInventoryStatusModal';

function stockLabel(item: InventoryItem) {
  const qty = Number(item.qtyOnHand ?? 0);
  const min = Number(item.minQty ?? 0);
  if (item.status && item.status !== 'GOOD') return item.status;
  if (min > 0 && qty <= min) return 'LOW_STOCK';
  return 'GOOD';
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
      .sort((a, b) => {
        const aProblem = stockLabel(a) === 'GOOD' ? 1 : 0;
        const bProblem = stockLabel(b) === 'GOOD' ? 1 : 0;
        return aProblem - bProblem || String(a.category ?? '').localeCompare(String(b.category ?? '')) || a.name.localeCompare(b.name);
      });
  }, [query.data?.items]);

  return (
    <Card className={embedded ? 'border-0 staff-general-inventory-card embedded' : 'content-card border-0 staff-general-inventory-card'}>
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <div className="eyebrow mb-1">Barang umum & gudang</div>
            <h6 className="mb-1">Laporkan kondisi stok kebersihan, alat kerja, dan barang area umum</h6>
            <div className="text-muted small">Staff mengirim laporan lapangan. Jumlah stok resmi, mutasi barang, dan status final dikonfirmasi admin/owner.</div>
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
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                    <div className="small text-muted">{item.sku ?? `ID ${item.id}`}</div>
                  </td>
                  <td>{item.category ?? 'Gudang / umum'}</td>
                  <td>{Number(item.qtyOnHand ?? 0)} {item.unit ?? 'pcs'}</td>
                  <td><StatusBadge status={stockLabel(item)} /></td>
                  <td><Button size="sm" variant="outline-primary" onClick={() => setSelected(item)}>Laporkan</Button></td>
                </tr>
              ))}
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
