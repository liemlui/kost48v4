import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import type { AccountingPeriod, AccountingReadiness } from '../../api/accounting';

const statusVariant: Record<string, string> = {
  OPEN: 'success',
  CLOSED: 'secondary',
  LOCKED: 'dark',
};

function periodKey(period: Pick<AccountingPeriod, 'year' | 'month' | 'key' | 'periodKey'>) {
  return period.periodKey ?? period.key ?? `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Props = {
  periods: AccountingPeriod[];
  readiness?: AccountingReadiness;
  isLoading?: boolean;
  canManage: boolean;
  reopenReason: string;
  isReopening?: boolean;
  onReopenReasonChange: (value: string) => void;
  onReopenCurrentPeriod: () => void;
  onFocusPeriodClose?: () => void;
};

export default function AccountingPeriodsPanel({ periods, readiness, isLoading, canManage, reopenReason, isReopening, onReopenReasonChange, onReopenCurrentPeriod, onFocusPeriodClose }: Props) {
  const postingPeriodId = readiness?.postingPeriod?.id ?? null;
  const currentPeriod = periods.find((period) => period.isCurrentPostingPeriod || (postingPeriodId && period.id === postingPeriodId));
  const postingBlocked = Boolean(readiness?.postingPeriod && !readiness.postingPeriod.ready);
  const latestPeriods = periods.slice(0, 12);
  const canSubmitReopen = Boolean(canManage && currentPeriod?.status === 'CLOSED' && reopenReason.trim().length >= 8 && !isReopening);

  return (
    <Card className="content-card border-0 mb-3 accounting-setup-card">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Periode Accounting</div>
            <h3 className="panel-title mb-1">Governance posting & auto-close</h3>
            <p className="text-muted mb-0">
              Daftar periode ini membantu Owner melihat bulan mana yang OPEN/CLOSED. Auto-close bulanan hanya menutup bulan lalu jika readiness aman; koreksi tetap lewat buka ulang periode.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-xl-end">
            {currentPeriod ? <Badge bg={currentPeriod.status === 'OPEN' ? 'success' : 'danger'}>Posting {periodKey(currentPeriod)} {currentPeriod.status}</Badge> : <Badge bg="warning">Posting period belum ditemukan</Badge>}
            <Badge bg={postingBlocked ? 'danger' : 'success'}>{postingBlocked ? 'Tagihan diblokir' : 'Posting tagihan siap'}</Badge>
          </div>
        </div>

        {postingBlocked && readiness?.postingPeriod?.warning ? (
          <Alert variant="danger" className="mb-3">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <strong>Tagihan belum bisa diterbitkan.</strong>
                <div className="mt-1">{readiness.postingPeriod.warning}</div>
                {readiness.postingPeriod.nextAction ? <small className="d-block mt-2">{readiness.postingPeriod.nextAction}</small> : null}
              </div>
              <Button variant="outline-light" size="sm" className="align-self-lg-start" onClick={onFocusPeriodClose}>Lihat workflow periode</Button>
            </div>
          </Alert>
        ) : null}

        {currentPeriod?.status === 'CLOSED' ? (
          <Alert variant={canManage ? 'warning' : 'info'} className="mb-3">
            <strong>{canManage ? 'Owner action tersedia:' : 'Perlu Owner:'}</strong> Periode posting berjalan sudah CLOSED. {canManage ? 'Buka ulang hanya jika ada alasan bisnis/audit yang jelas.' : 'Admin dapat memantau, tetapi hanya Owner yang boleh membuka ulang periode.'}
            {canManage ? (
              <div className="mt-3">
                <Form.Group controlId="currentPeriodReopenReason">
                  <Form.Label>Alasan buka ulang periode {periodKey(currentPeriod)}</Form.Label>
                  <Form.Control as="textarea" rows={2} value={reopenReason} onChange={(event) => onReopenReasonChange(event.target.value)} placeholder="Contoh: UAT invoice posting setelah periode ditutup untuk validasi accounting governance." />
                  <Form.Text>Minimal 8 karakter. Sistem akan membuat jurnal CLOSING_REVERSAL, bukan menghapus closing lama.</Form.Text>
                </Form.Group>
                <div className="d-flex justify-content-end mt-2">
                  <Button variant="danger" onClick={onReopenCurrentPeriod} disabled={!canSubmitReopen}>{isReopening ? 'Membuka ulang...' : 'Buka Ulang Periode Posting'}</Button>
                </div>
              </div>
            ) : null}
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Memuat periode accounting...</div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Status</th>
                  <th>Posting</th>
                  <th>Jurnal</th>
                  <th>Closing/Reopen</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {latestPeriods.length ? latestPeriods.map((period) => (
                  <tr key={period.id}>
                    <td>
                      <div className="fw-semibold">{periodKey(period)}</div>
                      <small className="text-muted">{formatDate(period.startDate)} – {formatDate(period.endDate)}</small>
                    </td>
                    <td><Badge bg={statusVariant[period.status] ?? 'secondary'}>{period.status}</Badge></td>
                    <td>{period.isCurrentPostingPeriod ? <Badge bg={period.isPostingOpen ? 'success' : 'danger'}>{period.isPostingOpen ? 'Periode berjalan OPEN' : 'Periode berjalan diblokir'}</Badge> : <span className="text-muted">Riwayat</span>}</td>
                    <td><span className="fw-semibold">{period.postedJournalCount ?? 0}</span> <small className="text-muted">posted</small>{period.draftJournalCount ? <small className="text-warning d-block">{period.draftJournalCount} draft</small> : null}</td>
                    <td>
                      <small className="d-block text-muted">Close V{period.closeVersion ?? 0} · Reopen V{period.reopenVersion ?? 0}</small>
                      {period.closingJournalEntryId ? <small className="d-block">Jurnal closing #{period.closingJournalEntryId}</small> : null}
                      {period.reopenJournalEntryId ? <small className="d-block">Jurnal reversal #{period.reopenJournalEntryId}</small> : null}
                    </td>
                    <td className="text-muted">{period.statusNarrative ?? period.notes ?? '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-muted">Belum ada accounting period.</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
