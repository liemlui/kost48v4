import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import type { PeriodClosePreview, PeriodCloseReadiness } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  year: number;
  month: number;
  readiness?: PeriodCloseReadiness;
  preview?: PeriodClosePreview;
  isLoading?: boolean;
  isPreviewing?: boolean;
  isPosting?: boolean;
  canPost: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onPreview: () => void;
  onPost: () => void;
};

function monthName(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function CheckBadge({ ready }: { ready: boolean }) {
  return <Badge bg={ready ? 'success' : 'warning'}>{ready ? 'OK' : 'Blokir'}</Badge>;
}

export default function PeriodClosePanel({
  year,
  month,
  readiness,
  preview,
  isLoading,
  isPreviewing,
  isPosting,
  canPost,
  notes,
  onNotesChange,
  onPreview,
  onPost,
}: Props) {
  const canSubmitClose = Boolean(canPost && readiness?.canPost && preview?.canPost && preview?.isBalanced && !isPosting);
  const periodLabel = readiness?.period ? `${readiness.period.year}-${String(readiness.period.month).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}`;
  const checks = readiness?.checks ?? [];
  const lines = preview?.lines ?? [];

  return (
    <Card className="content-card border-0 mb-3 accounting-setup-card">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">B7 Period Close · Retained Earnings</div>
            <h3 className="panel-title mb-1">Tutup periode {monthName(year, month)}</h3>
            <p className="text-muted mb-0">
              Owner menutup revenue, COGS, dan expense bulan ini ke Laba Ditahan. P&amp;L operasional tetap terbaca karena laporan mengecualikan jurnal closing.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-xl-end">
            <Badge bg={readiness?.period?.status === 'CLOSED' ? 'success' : readiness?.period?.status === 'OPEN' ? 'primary' : 'secondary'}>
              {readiness?.period?.status ?? 'Periode belum ada'}
            </Badge>
            <Badge bg={readiness?.canPost ? 'success' : 'warning'}>{readiness?.canPost ? 'Siap close' : 'Belum siap'}</Badge>
            <Badge bg={preview?.isBalanced ? 'success' : 'secondary'}>{preview?.isBalanced ? 'Preview balance' : 'Preview belum dibuat'}</Badge>
          </div>
        </div>

        <Alert variant="warning" className="mb-3">
          <strong>Jangan tutup periode sebelum data final.</strong> Pastikan invoice, pembayaran, pengeluaran, depresiasi, alignment aset, dan adjustment bulan ini sudah benar. Setelah ditutup, periode menjadi CLOSED dan duplicate close diblokir.
        </Alert>

        <Row className="g-2 mb-3">
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Periode</div><div className="fw-semibold">{periodLabel}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Revenue</div><div className="fw-semibold">{formatRupiah(readiness?.profitLoss?.revenueRupiah ?? preview?.totals.revenueRupiah ?? 0)}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">COGS + Expense</div><div className="fw-semibold">{formatRupiah((readiness?.profitLoss?.cogsRupiah ?? preview?.totals.cogsRupiah ?? 0) + (readiness?.profitLoss?.expenseRupiah ?? preview?.totals.expenseRupiah ?? 0))}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Net income</div><div className="fw-semibold">{formatRupiah(readiness?.profitLoss?.netIncomeRupiah ?? preview?.netIncomeRupiah ?? 0)}</div></div></Col>
        </Row>

        {isLoading ? (
          <div className="text-muted mb-3"><Spinner animation="border" size="sm" className="me-2" /> Memuat readiness tutup periode...</div>
        ) : checks.length ? (
          <div className="table-responsive mb-3">
            <Table hover size="sm" className="align-middle mb-0">
              <thead><tr><th>Gate</th><th>Status</th><th>Catatan</th></tr></thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.key}>
                    <td className="fw-semibold">{check.label}</td>
                    <td><CheckBadge ready={check.ready} /></td>
                    <td className="text-muted">{check.note ?? (check.count !== undefined ? `${check.count} data` : '-')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Alert variant="light" className="border mb-3">Readiness belum tersedia. Buat accounting period dulu jika belum ada.</Alert>
        )}

        {readiness?.blockedReasons?.length ? (
          <Alert variant="danger" className="mb-3">
            <strong>Close diblokir:</strong>
            <ul className="mb-0 mt-2">
              {readiness.blockedReasons.slice(0, 5).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </Alert>
        ) : null}

        {readiness?.warnings?.length ? (
          <Alert variant="info" className="mb-3">
            {readiness.warnings[0]}
          </Alert>
        ) : null}

        {preview ? (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="fw-semibold">Preview jurnal closing</div>
                <small className="text-muted">{preview.sourceId} · {preview.entryDate}</small>
              </div>
              <Badge bg={preview.isBalanced ? 'success' : 'danger'}>{preview.isBalanced ? 'Balanced' : 'Tidak balance'}</Badge>
            </div>
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead><tr><th>Akun</th><th>Deskripsi</th><th className="text-end">Debit</th><th className="text-end">Kredit</th></tr></thead>
                <tbody>
                  {lines.length ? lines.slice(0, 12).map((line) => (
                    <tr key={`${line.chartOfAccountId}-${line.sortOrder}`}>
                      <td><strong>{line.accountCode}</strong> · {line.accountName}</td>
                      <td className="text-muted">{line.description}</td>
                      <td className="text-end">{formatRupiah(line.debitRupiah)}</td>
                      <td className="text-end">{formatRupiah(line.creditRupiah)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} className="text-muted">Tidak ada line P&amp;L. Sistem akan membuat zero closing journal untuk mengunci periode.</td></tr>}
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="text-end"><strong>{formatRupiah(preview.totalDebitRupiah)}</strong></td>
                    <td className="text-end"><strong>{formatRupiah(preview.totalCreditRupiah)}</strong></td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        ) : null}

        <Form.Group className="mb-3" controlId="periodCloseNotes">
          <Form.Label>Catatan closing</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Contoh: Closing Mei 2026 setelah invoice, pembayaran, expense, depresiasi, dan asset alignment direview."
          />
        </Form.Group>

        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
          <Button variant="outline-primary" onClick={onPreview} disabled={isPreviewing || isPosting || !readiness?.period || readiness.period.status !== 'OPEN'}>
            {isPreviewing ? 'Preview...' : 'Preview Jurnal Closing'}
          </Button>
          <Button variant="primary" onClick={onPost} disabled={!canSubmitClose}>
            {isPosting ? 'Menutup periode...' : 'Tutup Periode'}
          </Button>
        </div>

        {!canPost ? <small className="text-muted d-block mt-2">Hanya OWNER yang boleh posting tutup periode. Admin dapat membaca readiness dan preview.</small> : null}
      </Card.Body>
    </Card>
  );
}
