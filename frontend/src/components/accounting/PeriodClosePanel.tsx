import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import type { PeriodClosePreview, PeriodCloseReadiness, PeriodReopenPreview } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';
import PaginationControls from '../common/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';
import { formatDateTimeWib } from '../../utils/dateTime';

type Props = {
  year: number;
  month: number;
  readiness?: PeriodCloseReadiness;
  preview?: PeriodClosePreview;
  reopenPreview?: PeriodReopenPreview;
  isLoading?: boolean;
  isPreviewing?: boolean;
  isPosting?: boolean;
  isReopenPreviewing?: boolean;
  isReopening?: boolean;
  canPost: boolean;
  notes: string;
  reopenReason: string;
  onNotesChange: (value: string) => void;
  onReopenReasonChange: (value: string) => void;
  onPreview: () => void;
  onPost: () => void;
  onPreviewReopen: () => void;
  onReopen: () => void;
};

function monthName(year: number, month: number) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function formatDateTime(value?: string | null) {
  return formatDateTimeWib(value);
}

function CheckBadge({ ready }: { ready: boolean }) {
  return <Badge bg={ready ? 'success' : 'warning'}>{ready ? 'OK' : 'Blokir'}</Badge>;
}

function JournalPreviewTable({ lines, totalDebit, totalCredit }: { lines: PeriodClosePreview['lines']; totalDebit: number; totalCredit: number }) {
  const linePagination = useClientPagination(lines, [lines.length], 10);
  return (
    <div className="table-responsive">
      <Table hover size="sm" className="align-middle mb-0">
        <thead><tr><th>Akun</th><th>Deskripsi</th><th className="text-end">Debit</th><th className="text-end">Kredit</th></tr></thead>
        <tbody>
          {lines.length ? linePagination.pagedItems.map((line) => (
            <tr key={`${line.chartOfAccountId}-${line.sortOrder}-${line.debitRupiah}-${line.creditRupiah}`}>
              <td><strong>{line.accountCode}</strong> · {line.accountName}</td>
              <td className="text-muted">{line.description}</td>
              <td className="text-end">{formatRupiah(line.debitRupiah)}</td>
              <td className="text-end">{formatRupiah(line.creditRupiah)}</td>
            </tr>
          )) : <tr><td colSpan={4} className="text-muted">Tidak ada line jurnal.</td></tr>}
          {linePagination.hasPagination ? (
            <tr>
              <td colSpan={4}>
                <PaginationControls
                  currentPage={linePagination.page}
                  totalPages={linePagination.totalPages}
                  totalItems={linePagination.totalItems}
                  pageSize={linePagination.pageSize}
                  onPageChange={linePagination.setPage}
                />
              </td>
            </tr>
          ) : null}
          <tr>
            <td colSpan={2}><strong>Total</strong></td>
            <td className="text-end"><strong>{formatRupiah(totalDebit)}</strong></td>
            <td className="text-end"><strong>{formatRupiah(totalCredit)}</strong></td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

export default function PeriodClosePanel({
  year,
  month,
  readiness,
  preview,
  reopenPreview,
  isLoading,
  isPreviewing,
  isPosting,
  isReopenPreviewing,
  isReopening,
  canPost,
  notes,
  reopenReason,
  onNotesChange,
  onReopenReasonChange,
  onPreview,
  onPost,
  onPreviewReopen,
  onReopen,
}: Props) {
  const status = readiness?.period?.status;
  const isClosed = status === 'CLOSED';
  const closeNoteReady = notes.trim().length >= 8;
  const canSubmitClose = Boolean(canPost && readiness?.canPost && preview?.canPost && preview?.isBalanced && closeNoteReady && !isPosting);
  const canSubmitReopen = Boolean(canPost && isClosed && reopenPreview?.canReopen && reopenPreview?.isBalanced && reopenReason.trim().length >= 8 && !isReopening);
  const periodLabel = readiness?.period ? `${readiness.period.year}-${String(readiness.period.month).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}`;
  const checks = readiness?.checks ?? [];
  const closeLines = preview?.lines ?? [];
  const reopenLines = reopenPreview?.lines ?? [];

  return (
    <Card className="content-card border-0 mb-3 accounting-setup-card">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Governance Periode</div>
            <h3 className="panel-title mb-1">Controlled close periode {monthName(year, month)}</h3>
            <p className="text-muted mb-0">
              Auto-close bulanan akan menutup bulan yang sudah lewat saat data siap. Manual close tetap tersedia untuk Owner sebagai fallback audit, bukan edit/hapus jurnal lama.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-xl-end">
            <Badge bg={isClosed ? 'success' : status === 'OPEN' ? 'primary' : 'secondary'}>{status ?? 'Periode belum ada'}</Badge>
            <Badge bg={readiness?.canPost ? 'success' : isClosed ? 'info' : 'warning'}>{readiness?.canPost ? 'Siap close' : isClosed ? 'Sudah close' : 'Belum siap'}</Badge>
            <Badge bg={preview?.isBalanced || reopenPreview?.isBalanced ? 'success' : 'secondary'}>{preview?.isBalanced || reopenPreview?.isBalanced ? 'Preview balance' : 'Preview belum dibuat'}</Badge>
          </div>
        </div>

        {isClosed ? (
          <Alert variant="info" className="mb-3">
            <strong>Periode sudah ditutup.</strong> Laba/rugi sudah dipindahkan ke Laba Ditahan lewat jurnal closing #{readiness?.period?.closingJournalEntryId ?? '-'}. Buka ulang hanya untuk koreksi serius dan akan membuat jurnal reversal.
          </Alert>
        ) : (
          <Alert variant="warning" className="mb-3">
            <strong>Jangan tutup periode sebelum data final.</strong> Pastikan invoice, pembayaran, pengeluaran, depresiasi, alignment aset, dan adjustment bulan ini sudah benar. Setelah ditutup, periode menjadi CLOSED dan posting baru ke bulan ini akan diblokir.
          </Alert>
        )}

        <Row className="g-2 mb-3">
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Periode</div><div className="fw-semibold">{periodLabel}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Revenue</div><div className="fw-semibold">{formatRupiah(readiness?.profitLoss?.revenueRupiah ?? preview?.totals.revenueRupiah ?? 0)}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">COGS + Expense</div><div className="fw-semibold">{formatRupiah((readiness?.profitLoss?.cogsRupiah ?? preview?.totals.cogsRupiah ?? 0) + (readiness?.profitLoss?.expenseRupiah ?? preview?.totals.expenseRupiah ?? 0))}</div></div></Col>
          <Col md={3}><div className="p-3 rounded-3 border bg-light h-100"><div className="small text-muted">Net income</div><div className="fw-semibold">{formatRupiah(readiness?.profitLoss?.netIncomeRupiah ?? preview?.netIncomeRupiah ?? 0)}</div></div></Col>
        </Row>

        {isClosed && readiness?.period ? (
          <Row className="g-2 mb-3">
            <Col md={3}><div className="p-3 rounded-3 border bg-white h-100"><div className="small text-muted">Ditutup pada</div><div className="fw-semibold">{formatDateTime(readiness.period.closedAt)}</div></div></Col>
            <Col md={3}><div className="p-3 rounded-3 border bg-white h-100"><div className="small text-muted">Jurnal closing</div><div className="fw-semibold">#{readiness.period.closingJournalEntryId ?? '-'}</div></div></Col>
            <Col md={3}><div className="p-3 rounded-3 border bg-white h-100"><div className="small text-muted">Versi closing</div><div className="fw-semibold">V{readiness.period.closeVersion ?? 1}</div></div></Col>
            <Col md={3}><div className="p-3 rounded-3 border bg-white h-100"><div className="small text-muted">Reopen terakhir</div><div className="fw-semibold">{readiness.period.reopenedAt ? formatDateTime(readiness.period.reopenedAt) : '-'}</div></div></Col>
          </Row>
        ) : null}

        {isLoading ? (
          <div className="text-muted mb-3"><Spinner animation="border" size="sm" className="me-2" /> Memuat readiness periode...</div>
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

        {readiness?.blockedReasons?.length && !isClosed ? (
          <Alert variant="danger" className="mb-3">
            <strong>Close diblokir:</strong>
            <ul className="mb-0 mt-2">{readiness.blockedReasons.slice(0, 5).map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </Alert>
        ) : null}

        {readiness?.warnings?.length ? <Alert variant="info" className="mb-3">{readiness.warnings[0]}</Alert> : null}

        {!isClosed && preview ? (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div><div className="fw-semibold">Preview jurnal closing</div><small className="text-muted">{preview.entryNumber ?? preview.sourceId} · {preview.entryDate}</small></div>
              <Badge bg={preview.isBalanced ? 'success' : 'danger'}>{preview.isBalanced ? 'Balanced' : 'Tidak balance'}</Badge>
            </div>
            <JournalPreviewTable lines={closeLines} totalDebit={preview.totalDebitRupiah} totalCredit={preview.totalCreditRupiah} />
          </div>
        ) : null}

        {isClosed ? (
          <div className="mb-3">
            <Form.Group className="mb-3" controlId="periodReopenReason">
              <Form.Label>Alasan buka ulang periode</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={reopenReason}
                onChange={(event) => onReopenReasonChange(event.target.value)}
                placeholder="Contoh: Koreksi jurnal expense yang ditemukan setelah closing."
              />
              <Form.Text>Minimal 8 karakter. Sistem akan membuat jurnal pembatalan penutupan dan periode kembali terbuka.</Form.Text>
            </Form.Group>
            {reopenPreview ? (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div><div className="fw-semibold">Preview reversal reopen</div><small className="text-muted">{reopenPreview.entryNumber ?? reopenPreview.sourceId} · membalik {reopenPreview.closingJournalEntry?.entryNumber ?? 'closing journal'}</small></div>
                  <Badge bg={reopenPreview.isBalanced ? 'success' : 'danger'}>{reopenPreview.isBalanced ? 'Balanced' : 'Tidak balance'}</Badge>
                </div>
                {reopenPreview.blockedReasons?.length ? (
                  <Alert variant="danger"><strong>Reopen diblokir:</strong><ul className="mb-0 mt-2">{reopenPreview.blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></Alert>
                ) : null}
                <JournalPreviewTable lines={reopenLines} totalDebit={reopenPreview.totalDebitRupiah} totalCredit={reopenPreview.totalCreditRupiah} />
              </div>
            ) : null}
          </div>
        ) : (
          <Form.Group className="mb-3" controlId="periodCloseNotes">
            <Form.Label>Alasan tutup periode</Form.Label>
            <Form.Control as="textarea" rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Contoh: Closing Mei 2026 setelah invoice, pembayaran, expense, depresiasi, dan asset alignment direview." />
            <Form.Text>Minimal 8 karakter untuk manual close. Auto-close akan memakai catatan otomatis jika semua readiness aman.</Form.Text>
          </Form.Group>
        )}

        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
          {isClosed ? (
            <>
              <Button variant="outline-danger" onClick={onPreviewReopen} disabled={isReopenPreviewing || isReopening || !canPost || reopenReason.trim().length < 8}>
                {isReopenPreviewing ? 'Preview...' : 'Preview Buka Ulang'}
              </Button>
              <Button variant="danger" onClick={onReopen} disabled={!canSubmitReopen}>
                {isReopening ? 'Membuka ulang...' : 'Buka Ulang Periode'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline-primary" onClick={onPreview} disabled={isPreviewing || isPosting || !readiness?.period || readiness.period.status !== 'OPEN'}>
                {isPreviewing ? 'Preview...' : 'Preview Jurnal Closing'}
              </Button>
              <Button variant="primary" onClick={onPost} disabled={!canSubmitClose}>
                {isPosting ? 'Menutup periode...' : 'Tutup Periode Manual'}
              </Button>
            </>
          )}
        </div>

        {!canPost ? <small className="text-muted d-block mt-2">Hanya OWNER yang boleh menjalankan manual close, auto-close run, atau buka ulang. Admin dapat membaca readiness dan preview.</small> : null}
        {canPost && !isClosed && !closeNoteReady ? <small className="text-muted d-block mt-2">Isi alasan minimal 8 karakter sebelum posting manual. Auto-close bulanan tetap bisa berjalan otomatis jika semua readiness aman.</small> : null}
      </Card.Body>
    </Card>
  );
}
