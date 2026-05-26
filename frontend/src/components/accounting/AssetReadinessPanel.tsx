import { Alert, Badge, Card, Col, Row, Table } from 'react-bootstrap';
import type { AssetReadiness } from '../../api/accounting';

type Props = {
  readiness?: AssetReadiness;
  isLoading?: boolean;
};

function formatRupiah(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

function tone(ready?: boolean) {
  return ready ? 'success' : 'warning';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
}

export default function AssetReadinessPanel({ readiness, isLoading }: Props) {
  const proof = readiness?.runtimeProof.requiredSources ?? [];
  const scan = readiness?.operationalScan;
  const candidates = scan?.capexReviewCandidateExpenses ?? [];

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
          <div>
            <div className="small text-uppercase text-muted fw-semibold mb-1">B4 Asset Register Readiness</div>
            <h3 className="h5 mb-1">Fondasi aset & depresiasi aktif</h3>
            <p className="text-muted mb-0">
              Panel ini membaca kesiapan akun aset, runtime proof auto journal, dan kandidat aset dari inventory/expense. Schema B4 sudah aktif; register aset tersedia di Finance → Asset Register.
            </p>
          </div>
          <div className="text-lg-end">
            <Badge bg={readiness?.readyForAssetSchemaAct ? 'success' : 'warning'}>
              {isLoading ? 'Memuat...' : readiness?.status ?? 'Belum dicek'}
            </Badge>
            <div className="small text-muted mt-1">Score: {readiness?.score ?? 0}/100</div>
          </div>
        </div>

        {readiness?.noSchemaChangePatch ? (
          <Alert variant="info" className="mb-3">
            Schema additive B4 sudah tersedia. Tambahkan aset sebagai disclosure/opening dulu agar tidak double-count acquisition journal.
          </Alert>
        ) : null}

        <Row className="g-2 mb-3">
          <Col md={3}>
            <div className="p-3 rounded-3 border bg-light h-100">
              <div className="small text-muted">Inventory aktif</div>
              <div className="h5 mb-0">{scan?.inventoryItemCount ?? 0}</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="p-3 rounded-3 border bg-light h-100">
              <div className="small text-muted">Room item</div>
              <div className="h5 mb-0">{scan?.roomItemCount ?? 0}</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="p-3 rounded-3 border bg-light h-100">
              <div className="small text-muted">Movement masuk/assign</div>
              <div className="h5 mb-0">{scan?.inboundOrAssignedMovementCount ?? 0}</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="p-3 rounded-3 border bg-light h-100">
              <div className="small text-muted">Expense kandidat CAPEX</div>
              <div className="h5 mb-0">{scan?.capexReviewCandidateExpenseCount ?? 0}</div>
            </div>
          </Col>
        </Row>

        <Row className="g-3">
          <Col lg={6}>
            <div className="border rounded-3 p-3 h-100">
              <div className="fw-semibold mb-2">Gate kesiapan</div>
              <div className="d-flex flex-column gap-2">
                {(readiness?.gates ?? []).map((gate) => (
                  <div key={gate.key} className="d-flex gap-2 align-items-start">
                    <Badge bg={tone(gate.ready)}>{gate.ready ? 'OK' : 'Review'}</Badge>
                    <div>
                      <div className="fw-semibold">{gate.label}</div>
                      <small className="text-muted">{gate.note}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
          <Col lg={6}>
            <div className="border rounded-3 p-3 h-100">
              <div className="fw-semibold mb-2">Runtime proof B3 sebelum B4</div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {proof.map((item) => (
                  <Badge key={item.sourceType} bg={item.proven ? 'success' : 'secondary'}>
                    {item.sourceType}: {item.postedJournalCount}
                  </Badge>
                ))}
              </div>
              <small className="text-muted">
                {readiness?.runtimeProof.ready
                  ? 'Auto journal inti sudah terbukti oleh JournalEntry POSTED.'
                  : 'Buat transaksi nyata invoice/payment/expense/WiFi sampai semua source punya journal POSTED.'}
              </small>
            </div>
          </Col>
        </Row>

        {candidates.length ? (
          <div className="mt-3">
            <div className="fw-semibold mb-2">Expense besar yang perlu owner review</div>
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Deskripsi</th>
                    <th>Nilai</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.expenseDate)}</td>
                      <td><Badge bg="light" text="dark" className="border">{expense.category}</Badge></td>
                      <td>{expense.description}</td>
                      <td>{formatRupiah(expense.amountRupiah)}</td>
                      <td><small className="text-muted">{expense.reason}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        ) : null}

        {readiness?.warnings?.length ? (
          <Alert variant="warning" className="mt-3 mb-0">
            <div className="fw-semibold mb-1">Guard penting</div>
            <ul className="mb-0 ps-3">
              {readiness.warnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
}
