import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { getReminderPreviewAll, mockSendReminder } from '../../api/reminders';
import type {
  BookingExpiryCandidate,
  CheckoutCandidate,
  InvoiceDueCandidate,
  InvoiceOverdueCandidate,
  MockReminderType,
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

// ── Mock send button ─────────────────────────────

function SimulasiKirimButton({
  type,
  candidateId,
  phone,
  message,
  sendingId,
  onSend,
}: {
  type: MockReminderType;
  candidateId: string;
  phone: string | null;
  message: string;
  sendingId: string | null;
  onSend: (id: string) => void;
}) {
  const id = `${type}-${candidateId}`;
  const isSending = sendingId === id;
  const canSend = Boolean(phone && phone.trim() && message.trim());

  if (!canSend) {
    return (
      <Button variant="outline-secondary" size="sm" disabled title="Nomor HP/pesan belum tersedia.">
        Simulasi Kirim
      </Button>
    );
  }

  return (
    <Button
      variant="outline-primary"
      size="sm"
      disabled={isSending}
      onClick={() => onSend(id)}
    >
      {isSending ? (
        <>
          <Spinner animation="border" size="sm" className="me-1" />
          Mengirim...
        </>
      ) : (
        'Simulasi Kirim'
      )}
    </Button>
  );
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
          <th style={{ width: 130 }}>Aksi</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function BookingExpiryRow({
  item,
  sendingId,
  onSend,
}: {
  item: BookingExpiryCandidate;
  sendingId: string | null;
  onSend: (id: string) => void;
}) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>Stay #{item.stayId}</td>
      <td>{item.hoursRemaining} jam lagi</td>
      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
      <td>
        <SimulasiKirimButton
          type="BOOKING_EXPIRY"
          candidateId={String(item.stayId)}
          phone={item.phone}
          message={item.messagePreview}
          sendingId={sendingId}
          onSend={onSend}
        />
      </td>
    </tr>
  );
}

function InvoiceDueRow({
  item,
  sendingId,
  onSend,
}: {
  item: InvoiceDueCandidate;
  sendingId: string | null;
  onSend: (id: string) => void;
}) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Jatuh tempo {formatDate(item.dueDate)}</small></td>
      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
      <td>
        <SimulasiKirimButton
          type="INVOICE_DUE"
          candidateId={String(item.invoiceId)}
          phone={item.phone}
          message={item.messagePreview}
          sendingId={sendingId}
          onSend={onSend}
        />
      </td>
    </tr>
  );
}

function InvoiceOverdueRow({
  item,
  sendingId,
  onSend,
}: {
  item: InvoiceOverdueCandidate;
  sendingId: string | null;
  onSend: (id: string) => void;
}) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
      <td className="text-danger fw-semibold">Terlambat {item.daysOverdue} hari<br /><small className="text-muted">Jatuh tempo {formatDate(item.dueDate)}</small></td>
      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
      <td>
        <SimulasiKirimButton
          type="INVOICE_OVERDUE"
          candidateId={String(item.invoiceId)}
          phone={item.phone}
          message={item.messagePreview}
          sendingId={sendingId}
          onSend={onSend}
        />
      </td>
    </tr>
  );
}

function CheckoutRow({
  item,
  sendingId,
  onSend,
}: {
  item: CheckoutCandidate;
  sendingId: string | null;
  onSend: (id: string) => void;
}) {
  return (
    <tr>
      <td>{item.tenantName}</td>
      <td>{item.phone ?? '-'}</td>
      <td>{item.roomCode ?? '-'}</td>
      <td>Stay #{item.stayId}</td>
      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Checkout {formatDate(item.plannedCheckOutDate)}</small></td>
      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
      <td>
        <SimulasiKirimButton
          type="CHECKOUT"
          candidateId={String(item.stayId)}
          phone={item.phone}
          message={item.messagePreview}
          sendingId={sendingId}
          onSend={onSend}
        />
      </td>
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

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null);

  const handleMockSend = async (id: string) => {
    setSendingId(id);
    setFeedback(null);

    // Parse type and candidateId from the composite id
    const prefix = id.split('-')[0];
    const candidateId = id.slice(prefix.length + 1);

    let type: MockReminderType;
    let phone: string | null = null;
    let message = '';

    // Find the candidate data from the query result
    if (!data) return;

    if (prefix === 'BOOKING_EXPIRY') {
      type = 'BOOKING_EXPIRY';
      const item = data.bookingExpiry.find((c) => String(c.stayId) === candidateId);
      if (item) { phone = item.phone; message = item.messagePreview; }
    } else if (prefix === 'INVOICE_DUE') {
      type = 'INVOICE_DUE';
      const item = data.invoiceDue.find((c) => String(c.invoiceId) === candidateId);
      if (item) { phone = item.phone; message = item.messagePreview; }
    } else if (prefix === 'INVOICE_OVERDUE') {
      type = 'INVOICE_OVERDUE';
      const item = data.invoiceOverdue.find((c) => String(c.invoiceId) === candidateId);
      if (item) { phone = item.phone; message = item.messagePreview; }
    } else if (prefix === 'CHECKOUT') {
      type = 'CHECKOUT';
      const item = data.checkout.find((c) => String(c.stayId) === candidateId);
      if (item) { phone = item.phone; message = item.messagePreview; }
    } else {
      setSendingId(null);
      return;
    }

    if (!phone || !message) {
      setFeedback({ variant: 'danger', message: 'Nomor HP atau pesan tidak tersedia untuk kandidat ini.' });
      setSendingId(null);
      return;
    }

    try {
      await mockSendReminder({ type, candidateId, phone, message });
      setFeedback({ variant: 'success', message: 'Simulasi pengingat berhasil. WhatsApp belum dikirim sungguhan.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengirim simulasi.';
      setFeedback({ variant: 'danger', message: msg });
    } finally {
      setSendingId(null);
    }
  };

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

      {feedback && (
        <Alert
          variant={feedback.variant}
          dismissible
          onClose={() => setFeedback(null)}
          className="mb-3"
        >
          {feedback.message}
        </Alert>
      )}

      <Row>
        <Col xs={12}>
          {/* A. Booking hampir kadaluarsa */}
          <ReminderCard title="Booking Hampir Kadaluarsa" variant="warning" count={bookingExpiry.length}>
            <CandidateTable>
              {bookingExpiry.map((item) => (
                <BookingExpiryRow key={`booking-${item.stayId}`} item={item} sendingId={sendingId} onSend={handleMockSend} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* B. Invoice jatuh tempo */}
          <ReminderCard title="Invoice Jatuh Tempo (H-3)" variant="info" count={invoiceDue.length}>
            <CandidateTable>
              {invoiceDue.map((item) => (
                <InvoiceDueRow key={`due-${item.invoiceId}`} item={item} sendingId={sendingId} onSend={handleMockSend} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* C. Invoice terlambat */}
          <ReminderCard title="Invoice Terlambat" variant="danger" count={invoiceOverdue.length}>
            <CandidateTable>
              {invoiceOverdue.map((item) => (
                <InvoiceOverdueRow key={`overdue-${item.invoiceId}`} item={item} sendingId={sendingId} onSend={handleMockSend} />
              ))}
            </CandidateTable>
          </ReminderCard>

          {/* D. Checkout mendekat */}
          <ReminderCard title="Checkout Mendekat (H-10)" variant="info" count={checkout.length}>
            <CandidateTable>
              {checkout.map((item) => (
                <CheckoutRow key={`checkout-${item.stayId}`} item={item} sendingId={sendingId} onSend={handleMockSend} />
              ))}
            </CandidateTable>
          </ReminderCard>
        </Col>
      </Row>
    </>
  );
}
