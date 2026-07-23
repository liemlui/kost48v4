// FILE: InventorySummaryPanel.tsx — ringkasan inventaris di atas tabs
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import { getResource } from '../../api/resources';

interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  damagedCount: number;
  totalQtyInWarehouse: number;
  totalQtyInRooms: number;
  lowStockItems: Array<{
    id: number;
    name: string;
    qtyOnHand: number;
    minQty: number;
    status: string;
  }>;
}

function normalizeSummary(raw: unknown): InventorySummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  return {
    totalItems: Number(d.totalItems ?? 0),
    lowStockCount: Number(d.lowStockCount ?? 0),
    outOfStockCount: Number(d.outOfStockCount ?? 0),
    damagedCount: Number(d.damagedCount ?? 0),
    totalQtyInWarehouse: Number(d.totalQtyInWarehouse ?? 0),
    totalQtyInRooms: Number(d.totalQtyInRooms ?? 0),
    lowStockItems: Array.isArray(d.lowStockItems) ? d.lowStockItems as InventorySummary['lowStockItems'] : [],
  };
}

export default function InventorySummaryPanel() {
  const summaryQuery = useQuery({
    queryKey: ['inventory-items', 'summary'],
    queryFn: async () => {
      const res = await getResource<unknown>('/inventory-items/summary');
      return normalizeSummary(res);
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="text-center py-2">
        <Spinner animation="border" size="sm" /> <span className="text-muted small">Memuat ringkasan stok...</span>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Alert variant="warning" className="py-2 px-3 small mb-0">
        Tidak dapat memuat ringkasan inventaris.
      </Alert>
    );
  }

  const s = summaryQuery.data;

  if (s.totalItems === 0) {
    return (
      <Alert variant="info" className="py-2 px-3 small mb-0">
        Belum ada barang di gudang. Mulai dengan menambah barang di tab <strong>Gudang</strong>.
      </Alert>
    );
  }

  const hasIssues = s.lowStockCount > 0 || s.outOfStockCount > 0 || s.damagedCount > 0;

  return (
    <div className="inventory-summary-panel mb-1">
      {hasIssues ? (
        <Alert variant="warning" className="py-2 px-3 small mb-2">
          <strong>⚠️ Perhatian:</strong>{' '}
          {s.lowStockCount > 0 && `${s.lowStockCount} stok menipis`}
          {s.lowStockCount > 0 && s.outOfStockCount > 0 && ', '}
          {s.outOfStockCount > 0 && `${s.outOfStockCount} stok habis`}
          {(s.lowStockCount > 0 || s.outOfStockCount > 0) && s.damagedCount > 0 && ', '}
          {s.damagedCount > 0 && `${s.damagedCount} barang bermasalah`}
          . Cek tab <strong>Gudang</strong> untuk detail.
        </Alert>
      ) : (
        <Alert variant="success" className="py-2 px-3 small mb-2">
          ✓ Semua stok dalam kondisi baik.
        </Alert>
      )}

      <Row className="g-2">
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className="summary-stat-card border-0 shadow-sm">
            <Card.Body className="p-2 text-center">
              <div className="summary-stat-value">{s.totalItems}</div>
              <div className="summary-stat-label">Total Barang</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className={`summary-stat-card border-0 shadow-sm ${s.lowStockCount > 0 ? 'border-warning' : ''}`}>
            <Card.Body className="p-2 text-center">
              <div className={`summary-stat-value ${s.lowStockCount > 0 ? 'text-warning' : ''}`}>
                {s.lowStockCount}
              </div>
              <div className="summary-stat-label">Stok Menipis</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className={`summary-stat-card border-0 shadow-sm ${s.outOfStockCount > 0 ? 'border-danger' : ''}`}>
            <Card.Body className="p-2 text-center">
              <div className={`summary-stat-value ${s.outOfStockCount > 0 ? 'text-danger' : ''}`}>
                {s.outOfStockCount}
              </div>
              <div className="summary-stat-label">Stok Habis</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className={`summary-stat-card border-0 shadow-sm ${s.damagedCount > 0 ? 'border-danger' : ''}`}>
            <Card.Body className="p-2 text-center">
              <div className={`summary-stat-value ${s.damagedCount > 0 ? 'text-danger' : ''}`}>
                {s.damagedCount}
              </div>
              <div className="summary-stat-label">Bermasalah</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className="summary-stat-card border-0 shadow-sm">
            <Card.Body className="p-2 text-center">
              <div className="summary-stat-value">{s.totalQtyInWarehouse}</div>
              <div className="summary-stat-label">Qty Gudang</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2}>
          <Card className="summary-stat-card border-0 shadow-sm">
            <Card.Body className="p-2 text-center">
              <div className="summary-stat-value">{s.totalQtyInRooms}</div>
              <div className="summary-stat-label">Qty Kamar</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
