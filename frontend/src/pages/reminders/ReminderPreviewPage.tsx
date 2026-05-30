import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { AssistantPanel, CompactMetrics, type AssistantItem, type MetricChip } from '../../components/command-center';
import { getReminderPreviewAll, mockSendReminder } from '../../api/reminders';
import type {
  BookingExpiryCandidate,
  CheckoutCandidate,
  InvoiceDueCandidate,
  InvoiceOverdueCandidate,
  MockReminderType,
} from '../../api/reminders';

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '-'; }
}

function formatRupiah(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

type ReminderTab = 'BOOKING_EXPIRY' | 'INVOICE_DUE' | 'INVOICE_OVERDUE' | 'CHECKOUT';

function SimulasiKirimButton({ type, candidateId, phone, message, sendingId, onSend }: {
  type: MockReminderType; candidateId: string; phone: string | null; message: string;
  sendingId: string | null; onSend: (id: string) => void;
}) {
  const id = `${type}-${candidateId}`;
  const isSending = sendingId === id;
  const canSend = Boolean(phone?.trim() && message.trim());
  if (!canSend) return <Button variant="outline-secondary" size="sm" disabled>Simulasi Kirim</Button>;
  return (
    <Button variant="outline-primary" size="sm" disabled={isSending} onClick={() => onSend(id)}>
      {isSending ? <><Spinner animation="border" size="sm" className="me-1" />Mengirim...</> : 'Simulasi Kirim'}
    </Button>
  );
}

function CandidateTable({ children }: { children: ReactNode }) {
  return (
    <Table size="sm" hover responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
      <thead>
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
    </Table>
  );
}

export default function ReminderPreviewPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reminder-preview-all'],
    queryFn: getReminderPreviewAll,
  });

  const [activeTab, setActiveTab] = useState<ReminderTab>('INVOICE_OVERDUE');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'danger'; message: string } | null>(null);

  const handleMockSend = async (id: string) => {
    setSendingId(id);
    setFeedback(null);
    const prefix = id.split('-')[0];
    const candidateId = id.slice(prefix.length + 1);
    let type: MockReminderType;
    let phone: string | null = null;
    let message = '';
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
    } else { setSendingId(null); return; }

    if (!phone || !message) {
      setFeedback({ variant: 'danger', message: 'Nomor HP atau pesan tidak tersedia.' });
      setSendingId(null);
      return;
    }
    try {
      await mockSendReminder({ type, candidateId, phone, message });
      setFeedback({ variant: 'success', message: 'Simulasi pengingat berhasil. WhatsApp belum dikirim sungguhan.' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal mengirim simulasi.';
      setFeedback({ variant: 'danger', message: msg });
    } finally { setSendingId(null); }
  };

  if (isLoading) return (
    <>
      <PageHeader title="Pratinjau Pengingat WhatsApp" description="Lihat kandidat pengingat sebelum pengiriman WhatsApp diaktifkan." />
      <div className="text-center py-5"><Spinner animation="border" /><p className="mt-2 text-muted">Memuat...</p></div>
    </>
  );

  if (isError) return (
    <>
      <PageHeader title="Pratinjau Pengingat WhatsApp" description="Lihat kandidat pengingat sebelum pengiriman WhatsApp diaktifkan." />
      <Alert variant="danger" className="d-flex justify-content-between align-items-center">
        <span>Gagal memuat: {error instanceof Error ? error.message : 'Terjadi kesalahan'}</span>
        <Button variant="outline-danger" size="sm" onClick={() => refetch()}>Coba Lagi</Button>
      </Alert>
    </>
  );

  const { bookingExpiry, invoiceDue, invoiceOverdue, checkout } = data!;

  const assistantItems: AssistantItem[] = [
    invoiceOverdue.length ? {
      id: 'overdue',
      severity: 'BLOCKER',
      title: `${invoiceOverdue.length} tagihan terlambat perlu diingatkan`,
      message: 'Prioritaskan pengingat overdue karena dapat memblokir checkout dan mengganggu cashflow.',
      source: 'Reminder',
      count: invoiceOverdue.length,
      actionLabel: 'Lihat terlambat',
      onAction: () => setActiveTab('INVOICE_OVERDUE'),
    } : null,
    invoiceDue.length ? {
      id: 'due',
      severity: 'WARNING',
      title: `${invoiceDue.length} tagihan mendekati jatuh tempo`,
      message: 'Kirim pengingat sebelum berubah menjadi overdue.',
      source: 'Tagihan',
      count: invoiceDue.length,
      actionLabel: 'Lihat due',
      onAction: () => setActiveTab('INVOICE_DUE'),
    } : null,
    bookingExpiry.length ? {
      id: 'booking',
      severity: 'MEDIUM',
      title: `${bookingExpiry.length} booking hampir kedaluwarsa`,
      message: 'Follow-up booking reserved supaya kamar tidak tertahan tanpa pembayaran.',
      source: 'Booking',
      count: bookingExpiry.length,
      actionLabel: 'Lihat booking',
      onAction: () => setActiveTab('BOOKING_EXPIRY'),
    } : null,
    checkout.length ? {
      id: 'checkout',
      severity: 'INFO',
      title: `${checkout.length} masa sewa mendekati renew/keluar`,
      message: 'Bantu tenant mengambil keputusan perpanjangan atau keluar sebelum hari terakhir.',
      source: 'Masa sewa',
      count: checkout.length,
      actionLabel: 'Lihat renew/keluar',
      onAction: () => setActiveTab('CHECKOUT'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'overdue', label: 'Tagihan terlambat', value: invoiceOverdue.length, helper: 'Prioritas follow-up', icon: '🔴', status: invoiceOverdue.length ? 'DANGER' : 'SUCCESS', onClick: () => setActiveTab('INVOICE_OVERDUE') },
    { id: 'due', label: 'Jatuh tempo dekat', value: invoiceDue.length, helper: 'Dalam 24 jam', icon: '🟡', status: invoiceDue.length ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('INVOICE_DUE') },
    { id: 'booking', label: 'Booking expiry', value: bookingExpiry.length, helper: 'Ikuti jam deadline per booking', icon: '⏳', status: bookingExpiry.length ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('BOOKING_EXPIRY') },
    { id: 'checkout', label: 'Perpanjangan/Keluar', value: checkout.length, helper: 'H-3/H-1', icon: '📅', status: checkout.length ? 'INFO' : 'SUCCESS', onClick: () => setActiveTab('CHECKOUT') },
  ];

  const tabs: { key: ReminderTab; label: string; count: number; cls?: string }[] = [
    { key: 'INVOICE_OVERDUE', label: '🔴 Terlambat', count: invoiceOverdue.length, cls: 'tab-danger' },
    { key: 'INVOICE_DUE', label: '🟡 Jatuh Tempo', count: invoiceDue.length, cls: 'tab-warn' },
    { key: 'BOOKING_EXPIRY', label: '⏳ Booking Expiry', count: bookingExpiry.length },
    { key: 'CHECKOUT', label: '📅 Perpanjangan/Keluar', count: checkout.length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Reminder Command Center"
        title="Pratinjau Pengingat WhatsApp"
        description="Prioritaskan tagihan terlambat, jatuh tempo, booking expiry, dan akhir masa sewa sebelum pesan sungguhan diaktifkan."
      />

      {feedback && (
        <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)} className="mb-3">
          {feedback.message}
        </Alert>
      )}

      <AssistantPanel
        title="Asisten Pengingat"
        subtitle="Mengurutkan kandidat reminder berdasarkan dampak ke cashflow dan operasional kamar."
        items={assistantItems}
        emptyTitle="Tidak ada reminder urgent"
        emptyMessage="Tidak ada tagihan terlambat, jatuh tempo dekat, booking expiry, atau renew/keluar mendekat."
      />
      <CompactMetrics metrics={metrics} />

      <Card className="content-card border-0 mb-3">
        <Card.Body className="py-3">
          <div className="table-meta mb-3">
            <div>
              <div className="panel-title">Queue pengingat</div>
              <div className="panel-subtitle">Satu tab dan satu tabel aktif; tidak ada accordion panjang.</div>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => refetch()}>Refresh</Button>
          </div>
          <div className="status-tab-bar compact-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`status-tab${tab.cls ? ` ${tab.cls}` : ''}${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body className="p-0">
          {activeTab === 'INVOICE_OVERDUE' && (
            invoiceOverdue.length === 0
              ? <div className="p-4"><EmptyState icon="✅" title="Tidak ada tagihan terlambat" description="Semua tagihan masih dalam tenggat waktu." /></div>
              : <CandidateTable>
                  {invoiceOverdue.map((item: InvoiceOverdueCandidate) => (
                    <tr key={`overdue-${item.invoiceId}`}>
                      <td>{item.tenantName}</td>
                      <td>{item.phone ?? '-'}</td>
                      <td>{item.roomCode ?? '-'}</td>
                      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
                      <td className="text-danger fw-semibold">Terlambat {item.daysOverdue} hari<br /><small className="text-muted">{formatDate(item.dueDate)}</small></td>
                      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
                      <td><SimulasiKirimButton type="INVOICE_OVERDUE" candidateId={String(item.invoiceId)} phone={item.phone} message={item.messagePreview} sendingId={sendingId} onSend={handleMockSend} /></td>
                    </tr>
                  ))}
                </CandidateTable>
          )}

          {activeTab === 'INVOICE_DUE' && (
            invoiceDue.length === 0
              ? <div className="p-4"><EmptyState icon="✅" title="Tidak ada tagihan mendekati jatuh tempo" description="Tidak ada invoice yang jatuh tempo dalam 24 jam ke depan." /></div>
              : <CandidateTable>
                  {invoiceDue.map((item: InvoiceDueCandidate) => (
                    <tr key={`due-${item.invoiceId}`}>
                      <td>{item.tenantName}</td>
                      <td>{item.phone ?? '-'}</td>
                      <td>{item.roomCode ?? '-'}</td>
                      <td>{item.invoiceNumber ?? '-'}<br /><small className="text-muted">{formatRupiah(item.amountRupiah)}</small></td>
                      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Jatuh tempo {formatDate(item.dueDate)}</small></td>
                      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
                      <td><SimulasiKirimButton type="INVOICE_DUE" candidateId={String(item.invoiceId)} phone={item.phone} message={item.messagePreview} sendingId={sendingId} onSend={handleMockSend} /></td>
                    </tr>
                  ))}
                </CandidateTable>
          )}

          {activeTab === 'BOOKING_EXPIRY' && (
            bookingExpiry.length === 0
              ? <div className="p-4"><EmptyState icon="✅" title="Tidak ada booking hampir kadaluarsa" description="Semua booking reserved masih dalam batas waktu." /></div>
              : <CandidateTable>
                  {bookingExpiry.map((item: BookingExpiryCandidate) => (
                    <tr key={`booking-${item.stayId}`}>
                      <td>{item.tenantName}</td>
                      <td>{item.phone ?? '-'}</td>
                      <td>{item.roomCode ?? '-'}</td>
                      <td>Masa sewa #{item.stayId}</td>
                      <td>{item.hoursRemaining} jam lagi</td>
                      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
                      <td><SimulasiKirimButton type="BOOKING_EXPIRY" candidateId={String(item.stayId)} phone={item.phone} message={item.messagePreview} sendingId={sendingId} onSend={handleMockSend} /></td>
                    </tr>
                  ))}
                </CandidateTable>
          )}

          {activeTab === 'CHECKOUT' && (
            checkout.length === 0
              ? <div className="p-4"><EmptyState icon="✅" title="Tidak ada renew/keluar mendekat" description="Tidak ada tenant yang renew/keluar dalam 3 hari ke depan." /></div>
              : <CandidateTable>
                  {checkout.map((item: CheckoutCandidate) => (
                    <tr key={`checkout-${item.stayId}`}>
                      <td>{item.tenantName}</td>
                      <td>{item.phone ?? '-'}</td>
                      <td>{item.roomCode ?? '-'}</td>
                      <td>Masa sewa #{item.stayId}</td>
                      <td>{item.daysRemaining} hari lagi<br /><small className="text-muted">Akhir masa sewa {formatDate(item.plannedCheckOutDate)}</small></td>
                      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
                      <td><SimulasiKirimButton type="CHECKOUT" candidateId={String(item.stayId)} phone={item.phone} message={item.messagePreview} sendingId={sendingId} onSend={handleMockSend} /></td>
                    </tr>
                  ))}
                </CandidateTable>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
