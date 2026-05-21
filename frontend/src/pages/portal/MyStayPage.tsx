import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { AssistantPanel, BlockedReasonCard, CompactMetrics, LifecycleTimeline, type AssistantItem, type MetricChip, type TimelineStep } from '../../components/command-center';
import { getResource, listResource } from '../../api/resources';
import { createRenewRequest, listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, RenewRequest, Stay } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const invoices = invoicesQuery.data?.items ?? [];
  const openInvoices = useMemo(() => invoices.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'), [invoices]);
  const anyUnpaidInvoice = openInvoices.find((inv) => inv.status === 'ISSUED' || inv.status === 'PARTIAL') ?? openInvoices[0] ?? null;
  const overdueInvoice = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return openInvoices.find((inv) => {
      if (!inv.dueDate) return false;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }) ?? null;
  }, [openInvoices]);

  const hasPendingReviewForUnpaid = useMemo(() => {
    if (!anyUnpaidInvoice) return false;
    const items = submissionsQuery.data?.items ?? [];
    return items.some((s: any) => s.invoiceId === anyUnpaidInvoice.id && s.status === 'PENDING_REVIEW');
  }, [submissionsQuery.data, anyUnpaidInvoice]);

  const pendingRenewRequest = (renewRequestsQuery.data?.items ?? []).find((rr) => rr.stayId === stay.id && rr.status === 'PENDING');
  const rejectedRequest = (renewRequestsQuery.data?.items ?? []).find((rr) => rr.stayId === stay.id && rr.status === 'REJECTED');
  const pendingCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find((cr) => cr.stayId === stay.id && cr.status === 'PENDING');
  const approvedCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find((cr) => cr.stayId === stay.id && cr.status === 'APPROVED');
  const rejectedCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find((cr) => cr.stayId === stay.id && cr.status === 'REJECTED');

  const createRenewMutation = useMutation({
    mutationFn: () => createRenewRequest({ stayId: stay.id, requestedTerm: 'MONTHLY' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-renew-requests', stay.id] }),
  });

  const handleCheckoutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-checkout-requests', stay.id] });
  };

  const endDays = daysUntil(stay.plannedCheckOutDate);
  const endHelper = endDays === null ? 'Tanggal akhir belum diisi' : endDays < 0 ? `Lewat ${Math.abs(endDays)} hari` : endDays === 0 ? 'Berakhir hari ini' : `${endDays} hari lagi`;
  const canRequestRenew = !pendingRenewRequest && !anyUnpaidInvoice && !approvedCheckoutRequest && !pendingCheckoutRequest;
  const canRequestCheckout = !pendingCheckoutRequest && !approvedCheckoutRequest && !anyUnpaidInvoice;

  const assistantItems: AssistantItem[] = [
    ...(hasPendingReviewForUnpaid ? [{ id: 'payment-review', severity: 'INFO' as const, title: 'Bukti pembayaran kamu sedang diperiksa', message: 'Tidak perlu upload ulang. Admin akan memeriksa bukti pembayaranmu terlebih dahulu.', source: 'Tagihan', actionLabel: 'Lihat Tagihan', actionTo: `/portal/invoices/${anyUnpaidInvoice?.id}` }] : []),
    ...(anyUnpaidInvoice && !hasPendingReviewForUnpaid ? [{ id: 'pay-invoice', severity: overdueInvoice ? 'HIGH' as const : 'MEDIUM' as const, title: overdueInvoice ? 'Tagihan sudah lewat jatuh tempo' : 'Kamu punya tagihan yang perlu dibayar', message: 'Selesaikan tagihan agar perpanjangan atau proses keluar tidak terblokir.', source: 'Tagihan', actionLabel: 'Bayar Tagihan', actionTo: `/portal/invoices/${anyUnpaidInvoice.id}` }] : []),
    ...(pendingRenewRequest ? [{ id: 'renew-pending', severity: 'MEDIUM' as const, title: 'Pengajuan perpanjangan sedang diperiksa', message: 'Admin sedang meninjau permintaan perpanjangan masa sewamu.', source: 'Perpanjangan' }] : []),
    ...(pendingCheckoutRequest ? [{ id: 'checkout-pending', severity: 'MEDIUM' as const, title: 'Pengajuan keluar sedang diperiksa', message: 'Admin sedang meninjau tanggal keluar yang kamu ajukan.', source: 'Ajukan keluar' }] : []),
    ...(approvedCheckoutRequest ? [{ id: 'checkout-approved', severity: 'INFO' as const, title: 'Jadwal keluar sudah disetujui', message: 'Kamu masih tercatat sebagai penghuni sampai admin menyelesaikan proses keluar.', source: 'Ajukan keluar' }] : []),
    ...(!anyUnpaidInvoice && !pendingRenewRequest && !pendingCheckoutRequest && !approvedCheckoutRequest ? [{ id: 'stable', severity: 'SUCCESS' as const, title: 'Masa sewa aktif dan tidak ada aksi mendesak', message: 'Kamu bisa melihat tagihan, mengajukan perpanjangan, mengajukan keluar, atau melapor masalah kapan saja.', source: 'Status sewa' }] : []),
  ];

  const metrics: MetricChip[] = [
    { id: 'room', label: 'Kamar', value: stay.room?.code ?? stay.roomId, helper: stay.room?.name ?? 'Kamar aktif', status: 'SUCCESS', icon: '🏠' },
    { id: 'end', label: 'Akhir Masa Sewa', value: formatDate(stay.plannedCheckOutDate), helper: endHelper, status: endDays !== null && endDays <= 7 ? 'WARNING' : 'INFO', icon: '📅' },
    { id: 'invoice', label: 'Tagihan aktif', value: openInvoices.length, helper: hasPendingReviewForUnpaid ? 'Bukti sedang diperiksa' : openInvoices.length ? 'Perlu diselesaikan' : 'Tidak ada tagihan open', status: openInvoices.length ? (hasPendingReviewForUnpaid ? 'INFO' : 'WARNING') : 'SUCCESS', icon: '🧾', to: '/portal/invoices' },
    { id: 'deposit', label: 'Deposit', value: <CurrencyDisplay amount={stay.depositAmountRupiah} /> as any, helper: getStatusLabel(stay.depositStatus, undefined, { tone: 'tenant', domain: 'deposit' }), status: stay.depositStatus ?? 'INFO', icon: '💙' },
  ];

  const timelineSteps: TimelineStep[] = [
    { id: 'checkin', label: 'Masuk kamar', description: `Check-in ${formatDate(stay.checkInDate)}`, status: 'done' },
    { id: 'active', label: 'Masa sewa aktif', description: `Status: ${getStatusLabel(stay.status, undefined, { tone: 'tenant', domain: 'stay' })}`, status: 'active' },
    { id: 'billing', label: 'Tagihan', description: openInvoices.length ? `${openInvoices.length} tagihan masih perlu diselesaikan.` : 'Tidak ada tagihan open.', status: openInvoices.length ? 'pending' : 'done' },
    { id: 'future', label: 'Perpanjang atau keluar', description: 'Pilih aksi sesuai rencana tinggalmu.', status: approvedCheckoutRequest ? 'active' : 'pending' },
  ];

  return (
    <>
      <AssistantPanel title="My Stay Guide" subtitle="Asisten sederhana untuk melihat status sewa, tagihan, dan aksi berikutnya." items={assistantItems} maxItems={4} />
      <CompactMetrics metrics={metrics} />

      {anyUnpaidInvoice ? (
        <BlockedReasonCard
          title={hasPendingReviewForUnpaid ? 'Bukti pembayaran sedang diperiksa' : 'Ada tagihan yang perlu diselesaikan'}
          reason={hasPendingReviewForUnpaid ? 'Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.' : 'Perpanjangan dan pengajuan keluar sebaiknya dilakukan setelah tagihan diselesaikan agar proses tidak terblokir.'}
          actionLabel="Lihat Tagihan"
          actionTo={`/portal/invoices/${anyUnpaidInvoice.id}`}
          variant={hasPendingReviewForUnpaid ? 'INFO' : 'DANGER'}
        />
      ) : null}

      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <div className="command-eyebrow">Status tinggal</div>
              <h3 className="mb-1">Kamar {stay.room?.code ?? stay.roomId}</h3>
              <div className="app-caption">Masa sewa aktif sejak {formatDate(stay.checkInDate)}</div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <StatusBadge status={stay.status} tone="tenant" domain="stay" />
              {stay.depositStatus ? <StatusBadge status={stay.depositStatus} tone="tenant" domain="deposit" /> : null}
            </div>
          </div>
          <div className="tenant-action-grid">
            <Button variant="primary" onClick={() => navigate('/portal/invoices')}>Lihat Tagihan</Button>
            <Button variant="outline-primary" onClick={() => anyUnpaidInvoice ? navigate(`/portal/invoices/${anyUnpaidInvoice.id}`) : navigate('/portal/invoices')} disabled={!anyUnpaidInvoice || hasPendingReviewForUnpaid}>{hasPendingReviewForUnpaid ? 'Sedang Diperiksa' : 'Bayar Tagihan'}</Button>
            <Button variant="outline-primary" onClick={() => createRenewMutation.mutate()} disabled={!canRequestRenew || createRenewMutation.isPending}>{createRenewMutation.isPending ? 'Mengirim...' : 'Ajukan Perpanjangan'}</Button>
            <Button variant="outline-warning" onClick={() => setShowCheckoutModal(true)} disabled={!canRequestCheckout}>Ajukan Keluar</Button>
            <Button variant="outline-secondary" onClick={() => navigate('/portal/tickets')}>Lapor Masalah</Button>
          </div>
          {createRenewMutation.isError ? <Alert variant="danger" className="mt-3 small">{(createRenewMutation.error as any)?.response?.data?.message ?? 'Gagal mengajukan perpanjangan.'}</Alert> : null}
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        <Col lg={7}><LifecycleTimeline title="Alur Masa Sewa" subtitle="Ringkasan proses yang sedang berjalan." steps={timelineSteps} /></Col>
        <Col lg={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="panel-title mb-1">Status Pengajuan</div>
              <div className="panel-subtitle mb-3">Ringkasan perpanjangan dan ajukan keluar.</div>
              <div className="kpi-list">
                <div className="kpi-item"><span>Perpanjangan</span><strong>{pendingRenewRequest ? 'Sedang diperiksa' : rejectedRequest ? 'Ditolak' : 'Belum ada'}</strong></div>
                <div className="kpi-item"><span>Ajukan keluar</span><strong>{approvedCheckoutRequest ? 'Disetujui' : pendingCheckoutRequest ? 'Sedang diperiksa' : rejectedCheckoutRequest ? 'Ditolak' : 'Belum ada'}</strong></div>
                <div className="kpi-item"><span>Akhir masa sewa</span><strong>{formatDate(stay.plannedCheckOutDate)}</strong></div>
              </div>
              {pendingRenewRequest ? <Alert variant="info" className="small mt-3 mb-0">Pengajuan perpanjangan sedang diperiksa admin.{pendingRenewRequest.requestedCheckOutDate ? ` Tanggal yang diajukan: ${formatDate(pendingRenewRequest.requestedCheckOutDate)}.` : ''}</Alert> : null}
              {approvedCheckoutRequest ? <Alert variant="info" className="small mt-3 mb-0">Jadwal keluar disetujui. Proses keluar selesai hanya setelah admin finalisasi dan tagihan clear.</Alert> : null}
              {rejectedCheckoutRequest ? <Alert variant="warning" className="small mt-3 mb-0">Pengajuan keluar ditolak.{rejectedCheckoutRequest.reviewNotes ? ` Alasan: ${rejectedCheckoutRequest.reviewNotes}` : ''}</Alert> : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <CheckoutRequestModal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} onSuccess={handleCheckoutSuccess} stay={stay} />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="content-card border-0 h-100"><Card.Body><h5 className="mb-3">Informasi Kamar</h5><Row><Col md={6}><DataField label="Kode Kamar" value={stay.room?.code ?? stay.roomId} /><DataField label="Nama Kamar" value={stay.room?.name ?? '-'} /><DataField label="Lantai" value={stay.room?.floor ?? '-'} /></Col><Col md={6}><DataField label="Status Kamar" value={stay.room?.status ? <StatusBadge status={stay.room.status} /> : '-'} /><DataField label="Tarif Disepakati" value={<CurrencyDisplay amount={stay.agreedRentAmountRupiah} />} /><DataField label="Tarif Listrik / kWh" value={<CurrencyDisplay amount={stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} />} /><DataField label="Tarif Air / m³" value={<CurrencyDisplay amount={stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} />} /></Col></Row></Card.Body></Card>
        </Col>
        <Col lg={6}>
          <Card className="content-card border-0 h-100"><Card.Body><h5 className="mb-3">Detail Masa Sewa</h5><Row><Col md={6}><DataField label="Jenis sewa" value={getStatusLabel(stay.pricingTerm)} /><DataField label="Sumber booking" value={stay.bookingSource ?? '-'} /></Col><Col md={6}><DataField label="Tujuan tinggal" value={stay.stayPurpose ? getStatusLabel(stay.stayPurpose) : '-'} /><DataField label="Catatan" value={stay.notes ?? '-'} /></Col></Row></Card.Body></Card>
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
    enabled: Boolean(userId),
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
      <PageHeader title="My Stay Guide" description="Panduan status masa sewa, tagihan, dan aksi yang bisa kamu lakukan." />
      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? (() => {
        const error = query.error as any;
        const status = error?.response?.status;
        const message = error?.response?.data?.message;
        if (status === 404) {
          if (stage === 'booking') return <EmptyState icon="📅" title="Kamu memiliki pemesanan aktif" description="Selesaikan proses booking dulu sebelum masuk ke panduan masa sewa." action={{ label: 'Lihat Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} />;
          return <EmptyState icon="🛏️" title="Kamu belum menempati kamar" description="Pilih kamar dari katalog publik untuk memulai proses booking." action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }} />;
        }
        return <Alert variant="danger" className="mt-4"><div className="fw-semibold">Gagal memuat data masa sewa</div><div className="small mt-1">{message || 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.'}</div></Alert>;
      })() : null}
      {stay && !stayBelongsToUser ? <EmptyState icon="🔒" title="Kamu belum memiliki masa sewa aktif" description="Pilih kamar dari katalog publik untuk memulai proses booking." action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }} /> : null}
      {stay && stayBelongsToUser && !roomStatusOccupied ? <EmptyState icon="📅" title="Booking kamu masih menunggu pembayaran atau verifikasi" description="Kamar masih berstatus dipesan. Selesaikan pembayaran awal dari halaman Pemesanan Saya sebelum masuk ke panduan masa sewa." action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} /> : null}
      {stay && stayBelongsToUser && roomStatusOccupied ? <ActiveStayContent stay={stay} /> : null}
    </div>
  );
}
