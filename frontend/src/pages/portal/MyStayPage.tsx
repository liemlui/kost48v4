import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { getResource } from '../../api/resources';
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
  const query = useQuery({
    queryKey: ['portal-stay'],
    queryFn: () => getResource<Stay>('/stays/me/current'),
  });

  const stay = query.data;

  return (
    <div>
      <PageHeader title="Hunian Saya" description="Informasi kamar dan masa tinggal aktif Anda." />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? (() => {
        // Bedakan antara error "tidak ada stay aktif" (404) dengan error operasional lain
        // Gunakan type assertion untuk mengakses properti response jika ada
        const error = query.error as any;
        const status = error?.response?.status;
        const message = error?.response?.data?.message;
        
        return status === 404 ? (
          <EmptyState icon="🏠" title="Anda belum memiliki hunian aktif" description="Silakan hubungi pengelola jika data stay Anda belum muncul." />
        ) : (
          <Alert variant="danger" className="mt-4">
            <div className="fw-semibold">Gagal memuat data hunian</div>
            <div className="small mt-1">
              {message || 'Terjadi kesalahan saat mengambil data hunian Anda. Silakan coba lagi.'}
            </div>
          </Alert>
        );
      })() : null}

      {stay ? (
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
