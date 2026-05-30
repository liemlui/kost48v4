import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useInvoices } from '../../hooks/useInvoices';
import { Invoice, Stay } from '../../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceDetailDrawer from './InvoiceDetailDrawer';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import { formatDateSafe, formatPeriod } from '../../pages/resources/simpleCrudHelpers';
import { fetchAccountingReadiness } from '../../api/accounting';
import { DepositLedgerPanel } from '../deposit';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate) return false;
  const status = invoice.status;
  if (status === 'PAID' || status === 'CANCELLED') return false;
  return new Date(invoice.dueDate).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime();
}

function paidAmount(invoice: Invoice): number | null {
  if (typeof invoice.paidAmountRupiah === 'number' && !isNaN(invoice.paidAmountRupiah)) {
    return invoice.paidAmountRupiah;
  }

  if (Array.isArray(invoice.payments) && invoice.payments.length > 0) {
    const sum = invoice.payments.reduce((sum, item) => {
      const amount = Number(item?.amountRupiah ?? 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return sum > 0 ? sum : null;
  }

  return null;
}

export default function FinanceTab({ stay, enabled = true }: { stay: Stay; enabled?: boolean }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'ALL' | 'OPEN' | 'OVERDUE' | 'PAID'>('ALL');
  const [actionError, setActionError] = useState('');
  const [accountingNotice, setAccountingNotice] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const { data, isLoading, isError, cancelMutation, issueMutation } = useInvoices(stay.id, enabled);
  const accountingReadinessQuery = useQuery({ queryKey: ['accounting-readiness', 'stay-finance-tab'], queryFn: fetchAccountingReadiness, enabled, staleTime: 30_000 });
  const postingPeriod = accountingReadinessQuery.data?.postingPeriod;
  const postingPeriodBlocked = Boolean(postingPeriod && !postingPeriod.ready);
  const invoices = data?.items ?? [];
  const overdueCount = useMemo(() => invoices.filter(isOverdue).length, [invoices]);

  const openCancelInvoiceModal = (invoice: Invoice) => {
    setActionError('');
    setAccountingNotice('');
    setCancelTarget(invoice);
    setCancelReason('');
  };

  const handleConfirmCancelInvoice = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setActionError('Alasan pembatalan tagihan wajib diisi.');
      return;
    }

    setActionError('');
    setAccountingNotice('');
    try {
      await cancelMutation.mutateAsync({ invoiceId: cancelTarget.id, payload: { cancelReason: reason } });
      if (selectedInvoiceId === cancelTarget.id) {
        setSelectedInvoiceId(null);
      }
      setCancelTarget(null);
      setCancelReason('');
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error,'Gagal membatalkan tagihan.'));
    }
  };

  const handleIssueInvoice = async (invoice: Invoice) => {
    setActionError('');
    setAccountingNotice('');
    try {
      const result = await issueMutation.mutateAsync(invoice.id);
      if (result.accounting?.accountingWarning) {
        setAccountingNotice(result.accounting.accountingWarning);
      }
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error,'Gagal menerbitkan tagihan.'));
    }
  };

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesKeyword = !keyword || [
        invoice.invoiceNumber,
        invoice.notes,
        invoice.periodStart,
        invoice.periodEnd,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword));

      const matchesView =
        view === 'ALL'
          ? true
          : view === 'OVERDUE'
            ? isOverdue(invoice)
            : view === 'PAID'
              ? invoice.status === 'PAID'
              : ['DRAFT', 'ISSUED', 'PARTIAL'].includes(invoice.status) || isOverdue(invoice);

      return matchesKeyword && matchesView;
    });
  }, [invoices, search, view]);

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-1">Keuangan Masa Sewa</h5>
            <div className="text-muted">Tagihan, pembayaran, dan status tunggakan.</div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {overdueCount ? <StatusBadge status="OVERDUE" customLabel={`${overdueCount} jatuh tempo`} /> : null}
            <Button onClick={() => setShowCreateModal(true)}>➕ Buat Tagihan Baru</Button>
          </div>
        </div>

        <div className="summary-strip mb-3">
          <div className="summary-chip">
            <span className="summary-chip-label">Total</span>
            <span className="summary-chip-value">{invoices.length}</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-label">Terbuka</span>
            <span className="summary-chip-value">{invoices.filter((invoice) => ['DRAFT', 'ISSUED', 'PARTIAL'].includes(invoice.status)).length}</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-label">Overdue</span>
            <span className="summary-chip-value">{overdueCount}</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-label">Lunas</span>
            <span className="summary-chip-value">{invoices.filter((invoice) => invoice.status === 'PAID').length}</span>
          </div>
        </div>

        <DepositLedgerPanel stay={stay} enabled={enabled} />

        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div className="d-flex flex-wrap gap-2">
            <Button size="sm" variant={view === 'ALL' ? 'primary' : 'outline-secondary'} onClick={() => setView('ALL')}>Semua</Button>
            <Button size="sm" variant={view === 'OPEN' ? 'primary' : 'outline-secondary'} onClick={() => setView('OPEN')}>Terbuka</Button>
            <Button size="sm" variant={view === 'OVERDUE' ? 'danger' : 'outline-danger'} onClick={() => setView('OVERDUE')}>Overdue</Button>
            <Button size="sm" variant={view === 'PAID' ? 'success' : 'outline-success'} onClick={() => setView('PAID')}>Lunas</Button>
          </div>
          <Form.Control
            placeholder="Cari nomor tagihan / catatan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
        </div>

        <div className="table-meta-count mb-3">Menampilkan {filteredInvoices.length} dari {invoices.length} tagihan</div>

        {postingPeriodBlocked && postingPeriod?.warning ? (
          <Alert variant="danger" className="mb-3">
            <strong>Posting tagihan sedang terblokir.</strong> {postingPeriod.warning}
          </Alert>
        ) : null}
        {actionError ? <Alert variant="danger" className="mb-3">{actionError}</Alert> : null}
        {accountingNotice ? <Alert variant="warning" className="mb-3">{accountingNotice}</Alert> : null}
        {isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
        {isError ? <Alert variant="danger">Gagal mengambil data tagihan.</Alert> : null}
        {!isLoading && !isError && !filteredInvoices.length ? (
          <EmptyState
            icon="🧾"
            title="Belum ada tagihan"
            description="Buat tagihan baru untuk memulai pencatatan masa sewa ini."
            action={{ label: 'Buat Tagihan', onClick: () => setShowCreateModal(true) }}
          />
        ) : null}
        {!isLoading && !isError && filteredInvoices.length ? (
          <Table hover responsive className="responsive-data-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Total</th>
                <th>Dibayar</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const overdue = isOverdue(invoice);
                const periodDisplay = formatPeriod(invoice.periodStart, invoice.periodEnd);
                const dueDateDisplay = formatDateSafe(invoice.dueDate);

                return (
                  <tr key={invoice.id}>
                    <td data-label="Periode">
                      <div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                      <div className="small text-muted">{periodDisplay}</div>
                    </td>
                    <td data-label="Total"><CurrencyDisplay amount={getInvoiceTotalAmount(invoice)} /></td>
                    <td data-label="Dibayar"><CurrencyDisplay amount={paidAmount(invoice)} /></td>
                    <td data-label="Jatuh Tempo" className={overdue ? 'text-danger fw-semibold' : ''}>{dueDateDisplay}</td>
                    <td data-label="Status"><StatusBadge status={overdue ? 'OVERDUE' : invoice.status} customLabel={overdue ? 'Jatuh Tempo' : getStatusLabel(invoice.status, undefined, { domain: 'invoice' })} domain="invoice" /></td>
                    <td data-label="Aksi">
                      <div className="d-flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline-primary" onClick={() => setSelectedInvoiceId(invoice.id)}>Detail</Button>
                        {invoice.status === 'DRAFT' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => void handleIssueInvoice(invoice)}
                              disabled={issueMutation.isPending}
                            >
                              {issueMutation.isPending ? 'Menerbitkan...' : 'Terbitkan'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => openCancelInvoiceModal(invoice)}
                              disabled={cancelMutation.isPending}
                            >
                              Batalkan
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body>

      <CreateInvoiceModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        stay={stay}
        onAccountingNotice={(message) => setAccountingNotice(message)}
      />
      <InvoiceDetailDrawer invoiceId={selectedInvoiceId} show={selectedInvoiceId !== null} onHide={() => setSelectedInvoiceId(null)} />

      <Modal
        show={Boolean(cancelTarget)}
        onHide={() => {
          if (!cancelMutation.isPending) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Batalkan Tagihan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            Anda akan membatalkan invoice <strong>{cancelTarget?.invoiceNumber || (cancelTarget ? `INV-${cancelTarget.id}` : '-')}</strong>.
            Invoice yang dibatalkan tidak lagi menjadi tagihan aktif tenant.
          </p>
          <Form.Group>
            <Form.Label>Alasan Pembatalan</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Invoice salah periode, akan dibuat ulang."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setCancelTarget(null);
              setCancelReason('');
            }}
            disabled={cancelMutation.isPending}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirmCancelInvoice()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Membatalkan...' : 'Batalkan Tagihan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
