import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { getResource, listResource } from '../../api/resources';
import { createRenewRequest, listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { ApiEnvelope, PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, RenewRequest, Stay } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
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

  const renewRequestsQuery = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['my-renew-requests', stay.id],
    queryFn: () => listMyRenewRequests(),
    refetchOnWindowFocus: true,
  });

  // ── Payment urgency gate ──────────────────────
  const invoicesQuery = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['my-invoices', stay.id],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const overdueInvoice = useMemo(() => {
    const items = invoicesQuery.data?.items ?? [];
    if (!items.length || invoicesQuery.isError) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const inv of items) {
      if (inv.status !== 'ISSUED' && inv.status !== 'PARTIAL') continue;
      if (!inv.dueDate) continue;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) return inv;
    }
    return null;
  }, [invoicesQuery.data, invoicesQuery.isError]);

  const dueSoonInvoice = useMemo(() => {
    const items = invoicesQuery.data?.items ?? [];
    if (!items.length || invoicesQuery.isError || overdueInvoice) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    for (const inv of items) {
      if (inv.status !== 'ISSUED' && inv.status !== 'PARTIAL') continue;
      if (!inv.dueDate) continue;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due >= today && due <= threeDaysFromNow) return inv;
    }
    return null;
  }, [invoicesQuery.data, invoicesQuery.isError, overdueInvoice]);

  const pendingRenewRequest = (renewRequestsQuery.data?.items ?? []).find(
    (rr: RenewRequest) => rr.stayId === stay.id && rr.status === 'PENDING',
  );

  const createRenewMutation = useMutation<RenewRequest>({
    mutationFn: (): Promise<RenewRequest> => createRenewRequest({ stayId: stay.id, requestedTerm: 'MONTHLY' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-renew-requests', stay.id] });
    },
  });

  const rejectedRequest = (renewRequestsQuery.data?.items ?? []).find(
    (rr: RenewRequest) => rr.stayId === stay.id && rr.status === 'REJECTED',
  );

  const renewData = createRenewMutation.data as RenewRequest | undefined;
  const showRenewButton =
    !pendingRenewRequest && !createRenewMutation.isSuccess && renewData?.status !== 'PENDING';
  const showRejectedMessage = renewData?.status === 'REJECTED' || rejectedRequest;

  // ── Checkout request ──────────────────────
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const checkoutRequestsQuery = useQuery<PaginatedResponse<CheckoutRequest>>({
    queryKey: ['my-checkout-requests', stay.id],
    queryFn: () => listMyCheckoutRequests(),
    refetchOnWindowFocus: true,
  });

  const pendingCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find(
    (cr: CheckoutRequest) => cr.stayId === stay.id && cr.status === 'PENDING',
  );

  const approvedCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find(
    (cr: CheckoutRequest) => cr.stayId === stay.id && cr.status === 'APPROVED',
  );

  const rejectedCheckoutRequest = (checkoutRequestsQuery.data?.items ?? []).find(
    (cr: CheckoutRequest) => cr.stayId === stay.id && cr.status === 'REJECTED',
  );

  const showCheckoutButton = !pendingCheckoutRequest && !approvedCheckoutRequest;

  const handleCheckoutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-checkout-requests', stay.id] });
  };

  return (
    <>
      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div className="d-flex flex-wrap gap-2">
              <StatusBadge status={stay.status} />
              {stay.depositStatus ? <StatusBadge status={stay.depositStatus} /> : null}
            </div>
            <div className="app-caption">Kamar {stay.room?.code ?? stay.roomId} · Check-in {formatDate(stay.checkInDate)}</div>
          </div>

          <div className="metric-grid">
            <div className="metric-tile">
              <div className="metric-tile-label">Sewa Bulanan</div>
              <div className="metric-tile-value"><CurrencyDisplay amount={stay.agreedRentAmountRupiah} /></div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Deposit</div>
              <div className="metric-tile-value"><CurrencyDisplay amount={stay.depositAmountRupiah} /></div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Rencana Checkout</div>
              <div className="metric-tile-value">{formatDate(stay.plannedCheckOutDate)}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Status Deposit</div>
              <div className="metric-tile-value">{getStatusLabel(stay.depositStatus)}</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Perpanjangan */}
      {showRenewButton ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <h5 className="mb-2">Ajukan Perpanjangan</h5>
            <p className="text-muted small mb-3">
              Ajukan permintaan perpanjangan masa tinggal Anda. Admin akan meninjau dan menyetujui permintaan Anda.
            </p>
            {overdueInvoice ? (
              <Alert variant="danger" className="small">
                Anda memiliki tagihan yang sudah lewat jatuh tempo. Silakan selesaikan pembayaran terlebih dahulu sebelum mengajukan perpanjangan.
              </Alert>
            ) : null}
            {!overdueInvoice && dueSoonInvoice ? (
              <Alert variant="warning" className="small">
                Anda memiliki tagihan yang akan jatuh tempo. Disarankan melunasi sebelum mengajukan perpanjangan.
              </Alert>
            ) : null}
            <Button
              variant="primary"
              onClick={() => createRenewMutation.mutate()}
              disabled={createRenewMutation.isPending || Boolean(overdueInvoice)}
            >
              {createRenewMutation.isPending ? 'Mengirim...' : 'Ajukan Perpanjangan'}
            </Button>
            {createRenewMutation.isError ? (
              <Alert variant="danger" className="mt-2 small">
                {(createRenewMutation.error as any)?.response?.data?.message ?? 'Gagal mengajukan perpanjangan.'}
              </Alert>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {pendingRenewRequest ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <h5 className="mb-2">Permintaan Perpanjangan</h5>
            <Alert variant="info" className="small">
              Permintaan perpanjangan Anda sedang <strong>Menunggu Persetujuan</strong> admin.
              {pendingRenewRequest.requestedCheckOutDate
                ? ` Tanggal checkout yang diajukan: ${formatDate(pendingRenewRequest.requestedCheckOutDate)}.`
                : ''}
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      {createRenewMutation.isSuccess && renewData?.status === 'APPROVED' ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <Alert variant="success" className="small">
              Permintaan perpanjangan Anda telah <strong>Disetujui</strong>. Masa tinggal Anda telah diperpanjang.
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      {showRejectedMessage ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <Alert variant="warning" className="small">
              Permintaan perpanjangan Anda telah <strong>Ditolak</strong>.
              {rejectedRequest?.reviewNotes ? ` Alasan: ${rejectedRequest.reviewNotes}` : ''}
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      {/* Checkout Lebih Awal */}
      {showCheckoutButton ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <h5 className="mb-2">Ajukan Checkout Lebih Awal</h5>
            <p className="text-muted small mb-3">
              Ingin checkout sebelum tanggal rencana? Ajukan permintaan checkout lebih awal. Admin akan meninjau dan memproses permintaan Anda.
            </p>
            {overdueInvoice ? (
              <Alert variant="danger" className="small">
                Anda memiliki tagihan yang sudah lewat jatuh tempo. Silakan selesaikan pembayaran terlebih dahulu sebelum mengajukan checkout.
              </Alert>
            ) : null}
            <Button
              variant="outline-warning"
              onClick={() => setShowCheckoutModal(true)}
              disabled={Boolean(overdueInvoice)}
            >
              Ajukan Checkout Lebih Awal
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      {pendingCheckoutRequest ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <h5 className="mb-2">Permintaan Checkout Lebih Awal</h5>
            <Alert variant="info" className="small">
              Permintaan checkout Anda sedang <strong>Menunggu Persetujuan</strong> admin.
              {pendingCheckoutRequest.requestedCheckOutDate
                ? ` Tanggal checkout yang diajukan: ${formatDate(pendingCheckoutRequest.requestedCheckOutDate)}.`
                : ''}
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      {approvedCheckoutRequest ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <Alert variant="success" className="small">
              Permintaan checkout Anda telah <strong>Disetujui</strong>. Admin akan memproses checkout Anda.
              {approvedCheckoutRequest.reviewNotes ? ` Catatan: ${approvedCheckoutRequest.reviewNotes}` : ''}
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      {rejectedCheckoutRequest ? (
        <Card className="content-card border-0 mb-4">
          <Card.Body>
            <Alert variant="warning" className="small">
              Permintaan checkout Anda telah <strong>Ditolak</strong>.
              {rejectedCheckoutRequest.reviewNotes ? ` Alasan: ${rejectedCheckoutRequest.reviewNotes}` : ''}
            </Alert>
          </Card.Body>
        </Card>
      ) : null}

      <CheckoutRequestModal
        show={showCheckoutModal}
        onHide={() => setShowCheckoutModal(false)}
        onSuccess={handleCheckoutSuccess}
        stay={stay}
      />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">Informasi Kamar</h5>
              <Row>
                <Col md={6}>
                  <DataField label="Kode Kamar" value={stay.room?.code ?? stay.roomId} />
                  <DataField label="Nama Kamar" value={stay.room?.name ?? '-'} />
                  <DataField label="Lantai" value={stay.room?.floor ?? '-'} />
                </Col>
                <Col md={6}>
                  <DataField label="Status Kamar" value={stay.room?.status ? <StatusBadge status={stay.room.status} /> : '-'} />
                  <DataField label="Tarif Disepakati" value={<CurrencyDisplay amount={stay.agreedRentAmountRupiah} />} />
                  <DataField label="Tarif Listrik / kWh" value={<CurrencyDisplay amount={stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} />} />
                  <DataField label="Tarif Air / m³" value={<CurrencyDisplay amount={stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} />} />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">Ketentuan Stay</h5>
              <Row>
                <Col md={6}>
                  <DataField label="Pricing Term" value={getStatusLabel(stay.pricingTerm)} />
                  <DataField label="Booking Source" value={stay.bookingSource ?? '-'} />
                </Col>
                <Col md={6}>
                  <DataField label="Tujuan Tinggal" value={stay.stayPurpose ?? '-'} />
                  <DataField label="Catatan" value={stay.notes ?? '-'} />
                </Col>
              </Row>
            </Card.Body>
          </Card>
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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
  });

  const stay = query.data;

  const stayBelongsToUser = stay
    ? stay.tenantId === tenantId
    : false;

  if (stay && !stayBelongsToUser && import.meta.env.DEV) {
    console.warn(
      '[MyStayPage] Returned stay tenantId mismatch:',
      { stayTenantId: stay.tenantId, currentUserTenantId: tenantId },
    );
  }

  const roomStatusOccupied = stay && stayBelongsToUser
    ? (stay.room?.status ?? '').toUpperCase() === 'OCCUPIED'
    : false;

  return (
    <div>
      <PageHeader title="Hunian Saya" description="Informasi kamar dan masa tinggal aktif Anda." />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? (() => {
        const error = query.error as any;
        const status = error?.response?.status;
        const message = error?.response?.data?.message;

        if (status === 404) {
          if (stage === 'booking') {
            return (
              <EmptyState
                icon="📅"
                title="Anda memiliki pemesanan aktif"
                description="Selesaikan proses booking Anda terlebih dahulu sebelum dapat mengakses halaman hunian."
                action={{ label: 'Lihat Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
              />
            );
          }
          return (
            <EmptyState
              icon="🛏️"
              title="Anda belum menempati kamar"
              description="Silakan pilih kamar dari katalog publik untuk memulai proses booking."
              action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }}
            />
          );
        }

        return (
          <Alert variant="danger" className="mt-4">
            <div className="fw-semibold">Gagal memuat data hunian</div>
            <div className="small mt-1">
              {message || 'Terjadi kesalahan saat mengambil data hunian Anda. Silakan coba lagi.'}
            </div>
          </Alert>
        );
      })() : null}

      {stay && !stayBelongsToUser ? (
        <EmptyState
          icon="🔒"
          title="Anda belum memiliki hunian"
          description="Silakan pilih kamar dari katalog publik untuk memulai proses booking."
          action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      {stay && stayBelongsToUser && !roomStatusOccupied ? (
        <EmptyState
          icon="📅"
          title="Booking Anda masih menunggu pembayaran atau verifikasi."
          description="Kamar Anda masih berstatus RESERVED / Dipesan. Selesaikan proses booking dan pembayaran awal dari halaman Pemesanan Saya sebelum mengakses halaman hunian."
          action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
        />
      ) : null}

      {stay && stayBelongsToUser && roomStatusOccupied ? (
        <ActiveStayContent stay={stay} />
      ) : null}
    </div>
  );
}