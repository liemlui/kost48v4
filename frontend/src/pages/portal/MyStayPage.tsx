import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { getResource } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { Stay } from '../../types';
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

  // Validate that returned stay belongs to current user
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
          // Tidak ada stay aktif — tampilkan CTA sesuai stage tenant
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
      ) : null}
    </div>
  );
}