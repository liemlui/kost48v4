import { type ReactNode, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import TenantGuidePanel from '../../components/tenant/TenantGuidePanel';
import { BlockedReasonCard, LifecycleTimeline, type AssistantItem, type MetricChip, type TimelineStep } from '../../components/command-center';
import { AssistantInsightLine, StatusStrip } from '../../components/workspace';
import { getResource, listResource } from '../../api/resources';
import { listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import RenewRequestModal from '../../components/tenant/RenewRequestModal';
import TenantPriorityBoard from '../../components/tenant/TenantPriorityBoard';
import { DepositLedgerPanel } from '../../components/deposit';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, RenewRequest, Stay, Ticket } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import { firstUsefulActions, limitRepeatedActions } from '../../utils/actionDedup';

function formatDate(value?: string | null) {
  return formatDateTimeWib(value);
}

function formatEndHelper(value?: string | null) {
  const meta = getDeadlineMeta(value, 'Akhir masa sewa');
  if (!meta.hasDate) return 'Tanggal dan jam akhir belum diisi';
  return meta.relativeLabel;
}

function DataField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="card-title-soft mb-1">{label}</div>
      <div className="fw-semibold">{value ?? '-'}</div>
    </div>
  );
}

function ActiveStayContent({ stay }: { stay: Stay }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const renewRequestsQuery = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['my-renew-requests', stay.id],
    queryFn: () => listMyRenewRequests(),
    refetchOnWindowFocus: true,
  });

  const invoicesQuery = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['my-invoices', stay.id],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const submissionsQuery = useQuery({
    queryKey: ['my-payment-submissions'],
    queryFn: () => listMyPaymentSubmissions(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const checkoutRequestsQuery = useQuery<PaginatedResponse<CheckoutRequest>>({
    queryKey: ['my-checkout-requests', stay.id],
    queryFn: () => listMyCheckoutRequests(),
    refetchOnWindowFocus: true,
  });

  const ticketsQuery = useQuery<PaginatedResponse<Ticket>>({
    queryKey: ['portal-tickets', stay.id],
    queryFn: () => listResource<Ticket>('/tickets/my'),
    staleTime: 45_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const invoices = invoicesQuery.data?.items ?? [];
  const paymentSubmissions = submissionsQuery.data?.items ?? [];
  const pendingReviewInvoiceIds = useMemo(() => getPendingReviewInvoiceIds(paymentSubmissions), [paymentSubmissions]);
  const openInvoices = useMemo(() => getOpenTenantInvoices(invoices), [invoices]);
  const payableInvoices = useMemo(() => openInvoices.filter((invoice) => isPayableInvoiceStatus(invoice.status)), [openInvoices]);
  const draftInvoices = openInvoices.filter((invoice) => invoice.status === 'DRAFT');
  const primaryInvoice = useMemo(() => getPrimaryTenantInvoice(openInvoices, pendingReviewInvoiceIds), [openInvoices, pendingReviewInvoiceIds]);
  const overdueInvoice = useMemo(() => openInvoices.find((invoice) => isTenantInvoiceOverdue(invoice)) ?? null, [openInvoices]);
  const hasPendingReviewForPrimary = Boolean(primaryInvoice && pendingReviewInvoiceIds.has(primaryInvoice.id));
  const reviewCount = openInvoices.filter((invoice) => pendingReviewInvoiceIds.has(invoice.id)).length;

  const renewRequests = renewRequestsQuery.data?.items ?? [];
  const checkoutRequests = checkoutRequestsQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const activeTickets = tickets.filter((ticket) => !['CLOSED', 'CANCELLED'].includes((ticket.status ?? '').toUpperCase()));
  const waitingAdminTickets = activeTickets.filter((ticket) => (ticket.status ?? '').toUpperCase() === 'DONE');
  const urgentTickets = activeTickets.filter((ticket) => ['HIGH', 'URGENT', 'EMERGENCY'].includes(String((ticket as { priority?: string }).priority ?? '').toUpperCase()));
  const pendingRenewRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'PENDING');
  const rejectedRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'REJECTED');
  const pendingCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'PENDING');
  const approvedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'APPROVED');
  const rejectedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'REJECTED');

  const handleRenewSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-renew-requests', stay.id] });
    queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
    queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
  };

  const handleCheckoutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-checkout-requests', stay.id] });
    queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
  };

  const endDays = getDaysUntilTenantDate(stay.plannedCheckOutDate);
  const endMeta = getDeadlineMeta(stay.plannedCheckOutDate, 'Akhir masa sewa');
  const endHelper = formatEndHelper(stay.plannedCheckOutDate);
  const nearEnd = endDays !== null && endDays >= 0 && endDays <= 10;
  const hasOpenInvoice = openInvoices.length > 0;
  const canRequestRenew = !pendingRenewRequest && !hasOpenInvoice && !approvedCheckoutRequest && !pendingCheckoutRequest;
  const canRequestCheckout = !pendingCheckoutRequest && !approvedCheckoutRequest && !hasOpenInvoice;

  const guide = (() => {
    if (reviewCount) {
      return {
        tone: 'info' as const,
        title: 'Bukti pembayaran kamu sedang diperiksa',
        message: TENANT_PAYMENT_REVIEW_MESSAGE,
        primaryLabel: 'Lihat Status Tagihan',
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (overdueInvoice) {
      return {
        tone: 'danger' as const,
        title: 'Selesaikan tagihan yang sudah terlambat',
        message: 'Tagihan terlambat. Bayar dan kirim bukti sekarang.',
        primaryLabel: 'Bayar & Kirim Bukti',
        primaryRoute: `/portal/invoices/${overdueInvoice.id}`,
      };
    }
    if (payableInvoices.length) {
      return {
        tone: 'warning' as const,
        title: 'Ada tagihan yang perlu kamu bayar',
        message: 'Selesaikan tagihan aktif dulu.',
        primaryLabel: 'Bayar & Kirim Bukti',
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (draftInvoices.length) {
      return {
        tone: 'info' as const,
        title: 'Ada tagihan yang sedang disiapkan admin',
        message: 'Belum perlu dibayar. Tunggu admin.',
        primaryLabel: 'Lihat Tagihan',
        primaryRoute: '/portal/invoices',
      };
    }
    if (pendingRenewRequest) {
      return {
        tone: 'info' as const,
        title: 'Perpanjangan menunggu admin',
        message: endMeta.hasDate ? `Tunggu admin. Akhir masa sewa ${endMeta.absoluteLabel}.` : 'Tidak perlu ajukan ulang. Tunggu admin catat meter.',
        primaryLabel: 'Lihat Status',
        primaryRoute: '/portal/stay',
      };
    }
    if (pendingCheckoutRequest) {
      return {
        tone: 'info' as const,
        title: 'Pengajuan keluar sedang diproses',
        message: 'Menunggu admin. Final keluar setelah tagihan beres.',
        primaryLabel: 'Lihat Status',
        primaryRoute: '/portal/stay',
      };
    }
    if (nearEnd) {
      return {
        tone: 'warning' as const,
        title: 'Masa sewa kamu akan segera berakhir',
        message: 'Pilih perpanjang atau keluar sebelum habis.',
        primaryLabel: 'Ajukan Perpanjangan',
        primaryRoute: '/portal/stay',
      };
    }
    return {
      tone: 'safe' as const,
      title: 'Masa sewa aktif dan tidak ada aksi mendesak',
      message: 'Tidak ada aksi mendesak.',
      primaryLabel: 'Lihat Tagihan',
      primaryRoute: '/portal/invoices',
    };
  })();

  const assistantItems: AssistantItem[] = [
    ...(reviewCount ? [{ id: 'payment-review', severity: 'INFO' as const, title: 'Bukti pembayaran sedang diperiksa', message: TENANT_PAYMENT_REVIEW_MESSAGE, source: 'Tagihan', count: reviewCount, actionLabel: 'Lihat Tagihan', actionTo: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices' }] : []),
    ...(overdueInvoice ? [{ id: 'pay-overdue', severity: 'BLOCKER' as const, title: 'Tagihan sudah lewat jatuh tempo', message: 'Tagihan terlambat. Bayar sekarang.', source: 'Tagihan', actionLabel: 'Bayar & Kirim Bukti', actionTo: `/portal/invoices/${overdueInvoice.id}` }] : []),
    ...(payableInvoices.length && !reviewCount ? [{ id: 'pay-invoice', severity: 'HIGH' as const, title: `${payableInvoices.length} tagihan perlu dibayar`, message: 'Bayar + kirim bukti dalam satu langkah.', source: 'Tagihan', actionLabel: 'Bayar & Kirim Bukti', actionTo: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices' }] : []),
    ...(draftInvoices.length ? [{ id: 'draft-invoice', severity: 'INFO' as const, title: 'Tagihan sedang disiapkan admin', message: 'Belum perlu bayar. Tunggu admin.', source: 'Tagihan' }] : []),
    ...(nearEnd && !pendingRenewRequest && !pendingCheckoutRequest ? [{ id: 'lease-ending', severity: 'WARNING' as const, title: 'Akhir masa sewa dekat', message: `Akhir masa sewa: ${formatDate(stay.plannedCheckOutDate)}. Pilih perpanjang atau keluar.`, source: 'Masa sewa' }] : []),
    ...(pendingRenewRequest ? [{ id: 'renew-pending', severity: 'MEDIUM' as const, title: 'Perpanjangan menunggu admin', message: endMeta.hasDate ? `Tunggu admin. Akhir masa sewa ${endMeta.absoluteLabel}.` : 'Tunggu admin catat meter.', source: 'Perpanjangan' }] : []),
    ...(pendingCheckoutRequest ? [{ id: 'checkout-pending', severity: 'MEDIUM' as const, title: 'Pengajuan keluar sedang diproses', message: 'Admin sedang meninjau tanggal keluar yang kamu ajukan.', source: 'Ajukan keluar' }] : []),
    ...(approvedCheckoutRequest ? [{ id: 'checkout-approved', severity: 'INFO' as const, title: 'Tanggal keluar disetujui', message: 'Admin finalkan setelah tagihan beres.', source: 'Ajukan keluar' }] : []),
    ...(activeTickets.length ? [{ id: 'active-ticket', severity: urgentTickets.length ? 'WARNING' as const : waitingAdminTickets.length ? 'INFO' as const : 'MEDIUM' as const, title: waitingAdminTickets.length ? 'Laporan menunggu admin' : 'Laporan sedang ditangani', message: waitingAdminTickets.length ? 'Menunggu cek admin.' : 'Pantau di Laporan Saya.', source: 'Laporan', count: activeTickets.length, actionLabel: 'Lihat Laporan', actionTo: '/portal/tickets' }] : []),
    ...(!hasOpenInvoice && !pendingRenewRequest && !pendingCheckoutRequest && !approvedCheckoutRequest && !nearEnd && !activeTickets.length ? [{ id: 'stable', severity: 'SUCCESS' as const, title: 'Semua aman', message: 'Tidak ada aksi mendesak.', source: 'Status sewa' }] : []),
  ];

  const metrics: MetricChip[] = [
    { id: 'room', label: 'Kamar', value: stay.room?.code ?? stay.roomId, helper: stay.room?.name ?? 'Kamar aktif', status: 'SUCCESS', icon: '🏠' },
    { id: 'end', label: 'Akhir Masa Sewa', value: formatDate(stay.plannedCheckOutDate), helper: endHelper, status: nearEnd ? 'WARNING' : 'INFO', icon: '📅' },
    { id: 'invoice', label: 'Tagihan Aktif', value: openInvoices.length, helper: reviewCount ? 'Bukti sedang diperiksa' : openInvoices.length ? 'Perlu ditindaklanjuti' : 'Tidak ada tagihan aktif', status: openInvoices.length ? (reviewCount ? 'INFO' : 'WARNING') : 'SUCCESS', icon: '🧾', to: '/portal/invoices' },
    { id: 'deposit', label: 'Deposit', value: <CurrencyDisplay amount={stay.depositAmountRupiah} /> as any, helper: getStatusLabel(stay.depositStatus, undefined, { tone: 'tenant', domain: 'deposit' }), status: stay.depositStatus ?? 'INFO', icon: '💙' },
    { id: 'tickets', label: 'Laporan Aktif', value: activeTickets.length, helper: activeTickets.length ? 'Sedang dipantau' : 'Tidak ada laporan aktif', status: activeTickets.length ? 'INFO' : 'SUCCESS', icon: '🎫', to: '/portal/tickets' },
  ];

  const guideActions = firstUsefulActions([
    { label: guide.primaryLabel, onClick: () => navigate(guide.primaryRoute), variant: guide.tone === 'danger' ? 'danger' : 'primary' },
    canRequestRenew ? { label: 'Ajukan Perpanjangan', onClick: () => setShowRenewModal(true), variant: 'outline-primary' } : null,
    canRequestCheckout ? { label: 'Ajukan Keluar', onClick: () => setShowCheckoutModal(true), variant: 'outline-warning' } : null,
  ].filter(Boolean) as { label: string; onClick: () => void; variant: string; disabled?: boolean; helper?: string }[], 2);

  const compactAssistantItems = limitRepeatedActions(assistantItems, 2);

  const timelineSteps: TimelineStep[] = [
    { id: 'checkin', label: 'Masuk kamar', description: `Masuk kamar ${formatDate(stay.checkInDate)}`, status: 'done' },
    { id: 'active', label: 'Masa sewa aktif', description: `Status: ${getStatusLabel(stay.status, undefined, { tone: 'tenant', domain: 'stay' })}`, status: 'active' },
    { id: 'billing', label: 'Tagihan', description: openInvoices.length ? `${openInvoices.length} tagihan masih perlu ditindaklanjuti.` : 'Tidak ada tagihan aktif.', status: openInvoices.length ? 'pending' : 'done' },
    { id: 'future', label: 'Perpanjang atau keluar', description: pendingRenewRequest ? 'Perpanjangan menunggu admin mencatat meter dan membuat tagihan baru.' : pendingCheckoutRequest ? 'Ada pengajuan keluar yang sedang menunggu keputusan admin.' : 'Pilih aksi sesuai rencana tinggalmu.', status: approvedCheckoutRequest ? 'active' : 'pending' },
  ];

  return (
    <>
      <TenantGuidePanel
        title={guide.title}
        message={compactText(guide.message, 90)}
        tone={guide.tone}
actions={guideActions}
      />

      <AssistantInsightLine
        title="My Stay Guide"
        tone={assistantItems[0]?.severity === 'BLOCKER' || assistantItems[0]?.severity === 'HIGH' ? 'warning' : assistantItems[0]?.severity === 'SUCCESS' ? 'success' : 'info'}
        message={assistantItems[0] ? compactText(`${assistantItems[0].title}. ${assistantItems[0].message}`, 110) : 'Tidak ada aksi mendesak.'}
        actionLabel={assistantItems[0]?.actionLabel}
        actionTo={assistantItems[0]?.actionTo}
        onAction={assistantItems[0]?.onAction}
      />
      <StatusStrip
        items={metrics.map((metric) => ({
          id: metric.id,
          label: metric.label,
          value: metric.value,
          helper: metric.helper,
          tone: metric.status === 'DANGER' ? 'danger' : metric.status === 'WARNING' ? 'warning' : metric.status === 'SUCCESS' ? 'success' : 'info',
          to: metric.to,
          onClick: metric.onClick,
        }))}
      />

      <DepositLedgerPanel stay={stay} tenantView compact />

      <TenantPriorityBoard items={compactAssistantItems} />

      {hasOpenInvoice ? (
        <BlockedReasonCard
          title={reviewCount ? 'Bukti pembayaran sedang diperiksa' : 'Ada tagihan yang perlu ditindaklanjuti'}
          reason={reviewCount ? TENANT_PAYMENT_REVIEW_MESSAGE : 'Tagihan harus selesai dulu.'}
          actionLabel="Lihat Tagihan"
          actionTo={primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices'}
          variant={reviewCount ? 'INFO' : 'DANGER'}
        />
      ) : null}

      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <div className="command-eyebrow">Status Masa Sewa</div>
              <h3 className="mb-1">Kamar {stay.room?.code ?? stay.roomId}</h3>
              <div className="app-caption">Masa sewa aktif sejak {formatDate(stay.checkInDate)}</div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <StatusBadge status={stay.status} tone="tenant" domain="stay" />
              {stay.depositStatus ? <StatusBadge status={stay.depositStatus} tone="tenant" domain="deposit" /> : null}
            </div>
          </div>
          <div className="tenant-single-secondary-action">
            <span>Butuh bantuan kamar atau fasilitas?</span>
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/portal/tickets')}>Lapor Masalah</Button>
          </div>
                  </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={7}><LifecycleTimeline title="Alur Masa Sewa" subtitle="Ringkasan proses yang sedang berjalan." steps={timelineSteps} /></Col>
        <Col lg={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="panel-title mb-1">Status Pengajuan</div>
              <div className="panel-subtitle mb-3">Ringkasan perpanjangan dan ajukan keluar.</div>
              <Alert variant="danger" className="urgent-policy-alert small">
                <div className="urgent-policy-title">Tidak ada sistem hutang</div>
                <div>Jika masa sewa habis dan tagihan belum dibayar, kamar dapat ditawarkan kembali. Jika ada tenant baru yang valid mengambil kamar, kamu wajib mengosongkan kamar sesuai jam deadline yang ditetapkan admin.</div>
              </Alert>
              <div className="kpi-list">
                <div className="kpi-item"><span>Perpanjangan</span><strong>{pendingRenewRequest ? 'Menunggu keputusan admin' : rejectedRequest ? 'Ditolak' : 'Belum ada'}</strong></div>
                <div className="kpi-item"><span>Ajukan keluar</span><strong>{approvedCheckoutRequest ? 'Disetujui' : pendingCheckoutRequest ? 'Menunggu keputusan admin' : rejectedCheckoutRequest ? 'Ditolak' : 'Belum ada'}</strong></div>
                <div className="kpi-item"><span>Akhir masa sewa</span><strong>{formatDate(stay.plannedCheckOutDate)}</strong></div>
              </div>
              {pendingRenewRequest ? <Alert variant="info" className="small mt-3 mb-0"><strong>Perpanjangan menunggu admin.</strong>{pendingRenewRequest.requestedCheckOutDate ? ` Tanggal yang diajukan: ${formatDate(pendingRenewRequest.requestedCheckOutDate)}.` : ''}<div className="mt-1">Admin akan mencatat meter terbaru terlebih dahulu. Jika disetujui, tagihan perpanjangan berisi sewa baru + pemakaian listrik/air. Tagihan wajib dibayar sesuai jam deadline; jika masa sewa habis dan kamar sudah diambil tenant baru, perpanjangan tidak dapat dilanjutkan.</div></Alert> : null}
              {approvedCheckoutRequest ? <Alert variant="info" className="small mt-3 mb-0">Tanggal keluar disetujui. Proses keluar selesai hanya setelah admin menyelesaikan proses akhir dan semua tagihan beres.</Alert> : null}
              {rejectedCheckoutRequest ? <Alert variant="warning" className="small mt-3 mb-0">Pengajuan keluar ditolak.{rejectedCheckoutRequest.reviewNotes ? ` Alasan: ${rejectedCheckoutRequest.reviewNotes}` : ''}</Alert> : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <RenewRequestModal show={showRenewModal} onHide={() => setShowRenewModal(false)} onSuccess={handleRenewSuccess} stay={stay} />
      <CheckoutRequestModal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} onSuccess={handleCheckoutSuccess} stay={stay} />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="content-card border-0 h-100"><Card.Body><h5 className="mb-3">Informasi Kamar</h5><Row><Col md={6}><DataField label="Kode Kamar" value={stay.room?.code ?? stay.roomId} /><DataField label="Nama Kamar" value={stay.room?.name ?? '-'} /><DataField label="Lantai" value={stay.room?.floor ?? '-'} /></Col><Col md={6}><DataField label="Status Kamar" value={stay.room?.status ? <StatusBadge status={stay.room.status} /> : '-'} /><DataField label="Tarif Disepakati" value={<CurrencyDisplay amount={stay.agreedRentAmountRupiah} />} /><DataField label="Tarif Listrik / kWh" value={<CurrencyDisplay amount={stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} />} /><DataField label="Tarif Air / m³" value={<CurrencyDisplay amount={stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} />} /></Col></Row></Card.Body></Card>
        </Col>
        <Col lg={6}>
          <Card className="content-card border-0 h-100"><Card.Body><h5 className="mb-3">Detail Masa Sewa</h5><Row><Col md={6}><DataField label="Jenis masa sewa" value={tenantPricingTermLabel(stay.pricingTerm)} /><DataField label="Sumber pemesanan" value={stay.bookingSource ?? '-'} /></Col><Col md={6}><DataField label="Tujuan tinggal" value={stay.stayPurpose ? getStatusLabel(stay.stayPurpose) : '-'} /><DataField label="Catatan" value={stay.notes ?? '-'} /></Col></Row></Card.Body></Card>
        </Col>
      </Row>
    </>
  );
}

export default function MyStayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const userId = user?.id;
  const tenantId = user?.tenantId;

  const query = useQuery({
    queryKey: ['portal-stay', { userId, tenantId }],
    queryFn: () => getResource<Stay>('/stays/me/current'),
    enabled: Boolean(userId) && stage === 'occupied',
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });

  const stay = query.data;
  const stayBelongsToUser = stay ? stay.tenantId === tenantId : false;

  if (stay && !stayBelongsToUser && import.meta.env.DEV) {
    console.warn('[MyStayPage] Returned stay tenantId mismatch:', { stayTenantId: stay.tenantId, currentUserTenantId: tenantId });
  }

  const roomStatusOccupied = stay && stayBelongsToUser ? (stay.room?.status ?? '').toUpperCase() === 'OCCUPIED' : false;

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="My Stay Guide"
        description="Panduan masa sewa, tagihan, bukti pembayaran, dan pengajuan yang sedang berjalan."
      />
      {stage !== 'occupied' ? <EmptyState icon="🏠" title="Kamu belum memiliki masa sewa aktif" description="Pilih kamar atau lanjutkan pemesanan yang sedang berjalan sebelum masuk ke panduan masa sewa." action={{ label: stage === 'booking' ? 'Buka Pemesanan Saya' : 'Lihat Kamar', onClick: () => navigate(stage === 'booking' ? '/portal/bookings' : '/rooms') }} /> : null}
      {stage === 'occupied' && query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {stage === 'occupied' && query.isError ? (() => {
        const err = query.error as any;
        const status = err?.response?.status ?? err?.response?.data?.statusCode;
        const message = err?.response?.data?.message;
        if (status === 404) {
          return <EmptyState icon="🏠" title="Kamu belum memiliki masa sewa aktif" description="Kalau kamu sedang booking, buka halaman Pemesanan Saya. Kalau belum booking, pilih kamar dari katalog." action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} />;
        }
        return <Alert variant="danger" className="mt-4"><div className="fw-semibold">Gagal memuat data masa sewa</div><div className="small mt-1">{message || 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.'}</div></Alert>;
      })() : null}
      {stay && !stayBelongsToUser ? <EmptyState icon="🔒" title="Kamu belum memiliki masa sewa aktif" description="Pilih kamar dari katalog publik untuk memulai proses booking." action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }} /> : null}
      {stay && stayBelongsToUser && !roomStatusOccupied ? <EmptyState icon="📅" title="Pemesanan kamu masih menunggu pembayaran atau verifikasi" description="Kamar masih berstatus dipesan. Selesaikan pembayaran awal dari halaman Pemesanan Saya sebelum masuk ke panduan masa sewa." action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} /> : null}
      {stay && stayBelongsToUser && roomStatusOccupied ? <ActiveStayContent stay={stay} /> : null}
    </div>
  );
}
