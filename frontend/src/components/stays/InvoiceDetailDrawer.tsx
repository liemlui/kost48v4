import { useState } from 'react';
import { Alert, Button, Offcanvas, Spinner, Table } from 'react-bootstrap';
import { useInvoice } from '../../hooks/useInvoices';
import { usePayments } from '../../hooks/usePayments';
import { Invoice } from '../../types';
import AddPaymentModal from './AddPaymentModal';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '-';
  return `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

export default function InvoiceDetailDrawer({
  invoiceId,
  show,
  onHide,
}: {
  invoiceId?: number | null;
  show: boolean;
  onHide: () => void;
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const detailQuery = useInvoice(invoiceId ?? undefined, Boolean(invoiceId) && show);
  const paymentsQuery = usePayments(invoiceId ?? undefined, Boolean(invoiceId) && show);
  const invoice: Invoice | undefined = detailQuery.data;
  const payments = paymentsQuery.data?.items ?? invoice?.payments ?? [];

  return (
    <>
      <Offcanvas show={show} onHide={onHide} placement="end" style={{ width: 520 }}>
        <Offcanvas.Header closeButton closeLabel="Tutup drawer">
          <Offcanvas.Title>Detail Invoice</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {detailQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
          {detailQuery.isError ? <Alert variant="danger">Gagal mengambil detail invoice.</Alert> : null}
          {invoice ? (
            <>
              <div className="mb-4">
                <div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                <div className="text-muted small">Periode {formatPeriod(invoice.periodStart, invoice.periodEnd)}</div>
                <div className="mt-2"><StatusBadge status={invoice.status} /></div>
              </div>

              <h6>Line Items</h6>
              {!invoice.lines?.length ? <Alert variant="secondary">Belum ada line item.</Alert> : (
                <>
                  <Table hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>Tipe</th>
                        <th>Deskripsi</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{getStatusLabel(line.lineType)}</td>
                          <td>{line.description}</td>
                          <td>{line.qty}{line.unit ? ` ${line.unit}` : ''}</td>
                          <td><CurrencyDisplay amount={line.unitPriceRupiah ?? 0} /></td>
                          <td><CurrencyDisplay amount={line.lineAmountRupiah ?? 0} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="d-flex justify-content-between fw-bold mt-3 pt-3 border-top">
                    <span>Total</span>
                    <CurrencyDisplay amount={invoice.totalAmountRupiah ?? 0} />
                  </div>
                </>
              )}

              <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
                <h6 className="mb-0">Riwayat Pembayaran</h6>
                <Button size="sm" onClick={() => setShowPaymentModal(true)}>Catat Pembayaran</Button>
              </div>
              {paymentsQuery.isLoading ? <div className="py-3 text-center"><Spinner size="sm" /></div> : null}
              {paymentsQuery.isError && invoice?.payments?.length ? <Alert variant="warning">Daftar pembayaran live gagal dimuat. Menampilkan data pembayaran yang sudah ikut di detail invoice.</Alert> : null}
              {paymentsQuery.isError && !invoice?.payments?.length ? <Alert variant="danger">Gagal mengambil riwayat pembayaran.</Alert> : null}
              {!paymentsQuery.isLoading && !payments.length ? <Alert variant="secondary">Belum ada pembayaran.</Alert> : null}
              {!!payments.length ? (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Nominal</th>
                      <th>Metode</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDateTime(payment.paymentDate)}</td>
                        <td><CurrencyDisplay amount={payment.amountRupiah ?? 0} /></td>
                        <td>{getStatusLabel(payment.method)}</td>
                        <td>{payment.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : null}
            </>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>

      {invoice ? <AddPaymentModal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} invoice={{ ...invoice, payments }} /> : null}
    </>
  );
}
