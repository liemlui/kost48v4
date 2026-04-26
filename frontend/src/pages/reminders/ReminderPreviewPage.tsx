import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { getReminderPreviewAll } from '../../api/reminders';
import type {
  BookingExpiryCandidate,
  CheckoutCandidate,
  InvoiceDueCandidate,
  InvoiceOverdueCandidate,
} from '../../api/reminders';

// ── Helpers ──────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

function formatRupiah(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

// ── Card sub-components ──────────────────────────

function CandidateTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.85rem' }}>
      <thead className="table-light">
        <tr>
          <th>Nama</th>
          <th>No. HP</th>
          <th>Kamar</th>
          <th>Detail</th>
          <th>Waktu</th>
          <th>Pratinjau Pesan</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function BookingExpiryRow({ item }: { item: BookingExpiryCandidate }) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>Stay #{item.stayId}</td>
      <td>{item.hoursRemaining} jam lagi</td>
      <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
    </tr>
  );
}

function InvoiceDueRow({ item }: { item: InvoiceDueCandidate }) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Jatuh tempo {formatDate(item.dueDate)}</small></td>
      <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
    </tr>
  );
}

function InvoiceOverdueRow({ item }: { item: InvoiceOverdueCandidate }) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
      <td className="text-danger fw-semibold">Terlambat {item.daysOverdue} hari<br /><small className="text-muted">Jatuh tempo {formatDate(item.dueDate)}</small></td>
      <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
    </tr>
  );
}

function CheckoutRow({ item }: { item: CheckoutCandidate }) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>Stay #{item.stayId}</td>
      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Checkout {formatDate(item.plannedCheckOutDate)}</small></td>
      <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
    </tr>
  );
}

// ── Card wrapper ─────────────────────────────────

function ReminderCard({
  title,
  variant,
  count,
  children,
}: {
  title: string;
  variant: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className={`bg-${variant} text-white d-flex justify-content-between align-items-center`}>
        <strong>{title}</strong>
        <span className="badge bg-light text-dark">{count} kandidat</span>
      </Card.Header>
      <Card.Body className="p-0">
        {count === 0 ? (
          <div className="p-3">
            <EmptyState title="Tidak ada pengingat untuk kategori ini." />
          </div>
        ) : (
          <div className="table-responsive">{children}</div>
        )}
      </Card.Body>
    </Card>
  );
}

// ── Main page ────────────────────────────────────

export default function ReminderPreviewPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reminder-preview-all'],
    queryFn: getReminderPreviewAll,
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Pratinjau Pengingat WhatsApp" description="Lihat kandidat pengingat sebelum pengiriman WhatsApp diaktifkan." />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Memuat data pengingat...</p>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Pratinjau Pengingat WhatsApp" description="Lihat kandidat pengingat sebelum pengiriman WhatsApp diaktifkan." />
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Gagal memuat data pengingat: {error instanceof Error ? error.message : 'Terjadi kesalahan'}</span>
          <Button variant="outline-danger" size="sm" onClick={() => refetch()}>
            Coba Lagi
          </Button>
        </Alert>
      </>
    );
  }

  const { bookingExpiry, invoiceDue, invoiceOverdue, checkout } = data!;

  return (
    <>
      <PageHeader title="Pratinjau Pengingat WhatsApp" description="Lihat kandidat pengingat sebelum pengiriman WhatsApp diaktifkan." />

      <Row>
        <Col xs={12}>
          {/* A. Booking hampir kadaluarsa */}
          <ReminderCard title="Booking Hampir Kadaluarsa" variant="warning" count={bookingExpiry.length}>
            <CandidateTable>
              {bookingExpiry.map((item) => (
                <BookingExpiryRow key={`booking-${item.stayId}`} item={item} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* B. Invoice jatuh tempo */}
          <ReminderCard title="Invoice Jatuh Tempo (H-3)" variant="info" count={invoiceDue.length}>
            <CandidateTable>
              {invoiceDue.map((item) => (
                <InvoiceDueRow key={`due-${item.invoiceId}`} item={item} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* C. Invoice terlambat */}
          <ReminderCard title="Invoice Terlambat" variant="danger" count={invoiceOverdue.length}>
            <CandidateTable>
              {invoiceOverdue.map((item) => (
                <InvoiceOverdueRow key={`overdue-${item.invoiceId}`} item={item} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* D. Checkout mendekat */}
          <ReminderCard title="Checkout Mendekat (H-10)" variant="info" count={checkout.length}>
            <CandidateTable>
              {checkout.map((item) => (
                <CheckoutRow key={`checkout-${item.stayId}`} item={item} />
              ))}
            </CandidateTable>
          </ReminderCard>
        </Col>
      </Row>
    </>
  );
}
