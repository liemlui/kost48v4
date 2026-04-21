import { useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useInvoices } from '../../hooks/useInvoices';
import { Invoice, Stay } from '../../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceDetailDrawer from './InvoiceDetailDrawer';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import { formatDateSafe, formatPeriod } from '../../pages/resources/simpleCrudHelpers';

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate) return false;
  const status = invoice.status;
  if (status === 'PAID' || status === 'CANCELLED') return false;
  return new Date(invoice.dueDate).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime();
}

function paidAmount(invoice: Invoice): number | null {
  // Prioritas 1: pakai paidAmountRupiah jika tersedia dan valid
  if (typeof invoice.paidAmountRupiah === 'number' && !isNaN(invoice.paidAmountRupiah)) {
    return invoice.paidAmountRupiah;
  }
  
  // Prioritas 2: hitung dari payments jika ada dan valid
  if (Array.isArray(invoice.payments) && invoice.payments.length > 0) {
    const sum = invoice.payments.reduce((sum, item) => {
      const amount = Number(item?.amountRupiah ?? 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    // Hanya kembalikan sum jika > 0 atau ada data payments yang valid
    return sum > 0 ? sum : null;
  }
  
  // Prioritas 3: tidak ada data yang cukup untuk menghitung
  return null;
}

export default function FinanceTab({ stay, enabled = true }: { stay: Stay; enabled?: boolean }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'ALL' | 'OPEN' | 'OVERDUE' | 'PAID'>('ALL');
  const { data, isLoading, isError } = useInvoices(stay.id, enabled);
  const invoices = data?.items ?? [];
  const overdueCount = useMemo(() => invoices.filter(isOverdue).length, [invoices]);
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
              : ['ISSUED', 'PARTIAL'].includes(invoice.status) || isOverdue(invoice);

      return matchesKeyword && matchesView;
    });
  }, [invoices, search, view]);

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-1">Keuangan Stay</h5>
            <div className="text-muted">Invoice, pembayaran, dan status tunggakan.</div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {overdueCount ? <StatusBadge status="OVERDUE" customLabel={`${overdueCount} jatuh tempo`} /> : null}
            <Button onClick={() => setShowCreateModal(true)}>➕ Buat Invoice Baru</Button>
          </div>
        </div>

        <div className="summary-strip mb-3">
          <div className="summary-chip">
            <span className="summary-chip-label">Total</span>
            <span className="summary-chip-value">{invoices.length}</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-label">Terbuka</span>
            <span className="summary-chip-value">{invoices.filter((invoice) => ['ISSUED', 'PARTIAL'].includes(invoice.status)).length}</span>
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

        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div className="d-flex flex-wrap gap-2">
            <Button size="sm" variant={view === 'ALL' ? 'primary' : 'outline-secondary'} onClick={() => setView('ALL')}>Semua</Button>
            <Button size="sm" variant={view === 'OPEN' ? 'primary' : 'outline-secondary'} onClick={() => setView('OPEN')}>Terbuka</Button>
            <Button size="sm" variant={view === 'OVERDUE' ? 'danger' : 'outline-danger'} onClick={() => setView('OVERDUE')}>Overdue</Button>
            <Button size="sm" variant={view === 'PAID' ? 'success' : 'outline-success'} onClick={() => setView('PAID')}>Lunas</Button>
          </div>
          <Form.Control
            placeholder="Cari nomor invoice / catatan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
        </div>

        <div className="table-meta-count mb-3">Menampilkan {filteredInvoices.length} dari {invoices.length} invoice</div>

        {isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
        {isError ? <Alert variant="danger">Gagal mengambil data invoice.</Alert> : null}
        {!isLoading && !isError && !filteredInvoices.length ? (
          <EmptyState
            icon="🧾"
            title="Belum ada invoice"
            description="Buat invoice baru untuk memulai pencatatan tagihan stay ini."
            action={{ label: 'Buat Invoice', onClick: () => setShowCreateModal(true) }}
          />
        ) : null}
        {!isLoading && !isError && filteredInvoices.length ? (
          <Table hover responsive>
            <thead>
              <tr>
                <th>Periode</th>
                <th>Total</th>
                <th>Dibayar</th>
                <th>Due Date</th>
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
                    <td>
                      <div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                      <div className="small text-muted">{periodDisplay}</div>
                    </td>
                    <td><CurrencyDisplay amount={invoice.totalAmountRupiah} /></td>
                    <td><CurrencyDisplay amount={paidAmount(invoice)} /></td>
                    <td className={overdue ? 'text-danger fw-semibold' : ''}>{dueDateDisplay}</td>
                    <td><StatusBadge status={overdue ? 'OVERDUE' : invoice.status} customLabel={overdue ? 'Jatuh Tempo' : getStatusLabel(invoice.status)} /></td>
                    <td><Button size="sm" variant="outline-primary" onClick={() => setSelectedInvoiceId(invoice.id)}>Detail</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body>

      <CreateInvoiceModal show={showCreateModal} onHide={() => setShowCreateModal(false)} stay={stay} />
      <InvoiceDetailDrawer invoiceId={selectedInvoiceId} show={selectedInvoiceId !== null} onHide={() => setSelectedInvoiceId(null)} />
    </Card>
  );
}
