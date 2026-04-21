import type { ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import { Stay } from '../../types';
import { getStatusLabel } from '../common/StatusBadge';

function valueOrDash(value: ReactNode) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

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

const DataField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="mb-3">
    <div className="card-title-soft mb-1">{label}</div>
    <div className="fw-semibold">{valueOrDash(value)}</div>
  </div>
);

export default function InfoTab({ stay }: { stay: Stay }) {
  const tenant = stay.tenant;
  const room = stay.room;

  return (
    <Row className="g-4">
      <Col xl={6}>
        <Card className="content-card h-100 border-0">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Data Tenant</h5>
              <span className="surface-pill">Read Only</span>
            </div>
            <Row>
              <Col md={6}>
                <DataField label="Nama Lengkap" value={tenant?.fullName} />
                <DataField label="No. HP" value={tenant?.phone} />
                <DataField label="Email" value={tenant?.email} />
                <DataField label="Jenis Kelamin" value={tenant?.gender ? getStatusLabel(tenant.gender) : '-'} />
              </Col>
              <Col md={6}>
                <DataField label="Kota Asal" value={tenant?.originCity} />
                <DataField label="Pekerjaan" value={tenant?.occupation} />
                <DataField label="Instansi / Kampus" value={tenant?.companyOrCampus} />
                <DataField label="Catatan Tenant" value={tenant?.notes} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col xl={6}>
        <Card className="content-card h-100 border-0">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Data Kamar</h5>
              <span className="surface-pill">Kamar {room?.code ?? stay.roomId}</span>
            </div>
            <Row>
              <Col md={6}>
                <DataField label="Kode Kamar" value={room?.code ?? stay.roomId} />
                <DataField label="Nama Kamar" value={room?.name} />
                <DataField label="Lantai" value={room?.floor} />
                <DataField label="Status Kamar" value={room?.status ? <StatusBadge status={room.status} /> : '-'} />
              </Col>
              <Col md={6}>
                <DataField label="Tarif Harian" value={<CurrencyDisplay amount={room?.dailyRateRupiah} />} />
                <DataField label="Tarif Mingguan" value={<CurrencyDisplay amount={room?.weeklyRateRupiah} />} />
                <DataField label="Tarif Bulanan" value={<CurrencyDisplay amount={room?.monthlyRateRupiah} />} />
                <DataField label="Tarif Listrik / kWh" value={<CurrencyDisplay amount={room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} />} />
                <DataField label="Tarif Air / m³" value={<CurrencyDisplay amount={room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} />} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12}>
        <Card className="content-card border-0">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Detail Stay</h5>
              <StatusBadge status={stay.depositStatus ?? 'HELD'} />
            </div>
            <Row>
              <Col md={6}>
                <DataField label="Pricing Term" value={getStatusLabel(stay.pricingTerm)} />
                <DataField label="Booking Source" value={stay.bookingSource} />
                <DataField label="Tujuan Tinggal" value={stay.stayPurpose} />
                <DataField label="Sewa Disepakati" value={<CurrencyDisplay amount={stay.agreedRentAmountRupiah} />} />
              </Col>
              <Col md={6}>
                <DataField label="Check-in" value={formatDate(stay.checkInDate)} />
                <DataField label="Rencana Checkout" value={formatDate(stay.plannedCheckOutDate)} />
                <DataField label="Checkout Aktual" value={formatDate(stay.actualCheckOutDate)} />
                <DataField label="Deposit" value={<CurrencyDisplay amount={stay.depositAmountRupiah} />} />
                {stay.status === 'CANCELLED' ? (
                  <DataField label="Alasan Pembatalan" value={stay.cancelReason ?? stay.checkoutReason ?? '-'} />
                ) : stay.status === 'COMPLETED' ? (
                  <DataField label="Alasan Checkout" value={stay.checkoutReason ?? '-'} />
                ) : null}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
