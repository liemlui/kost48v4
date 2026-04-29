import { Card, Row, Col, Alert } from 'react-bootstrap';
import type { UseFormReturn } from 'react-hook-form';
import type { WizardFormValues } from './types';

interface StepReviewConfirmProps {
  form: UseFormReturn<WizardFormValues>;
  selectedTenantName: string;
  selectedRoomName: string;
  estimatedElectricityThreshold: number;
  estimatedWaterThreshold: number;
}

export default function StepReviewConfirm({
  form,
  selectedTenantName,
  selectedRoomName,
  estimatedElectricityThreshold,
  estimatedWaterThreshold,
}: StepReviewConfirmProps) {
  const values = form.getValues();

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <h5 className="mb-3">Konfirmasi Check-In</h5>
        <Alert variant="warning" className="mb-3">
          <strong>Konfirmasi Akhir:</strong> Pastikan semua data di bawah sudah benar sebelum submit. Check-in akan membuat room OCCUPIED.
        </Alert>
        <Row className="g-3">
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Tenant:</span>
              <br />
              <strong>{selectedTenantName || '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Kamar:</span>
              <br />
              <strong>{selectedRoomName || '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Tanggal Masuk:</span>
              <br />
              <strong>{values.checkInDate || '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Termin Harga:</span>
              <br />
              <strong>{values.pricingTerm === 'MONTHLY' ? 'Bulanan' : values.pricingTerm === 'WEEKLY' ? 'Mingguan' : values.pricingTerm === 'DAILY' ? 'Harian' : values.pricingTerm}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Harga Sewa:</span>
              <br />
              <strong>{values.agreedRentAmountRupiah ? `Rp ${Number(values.agreedRentAmountRupiah).toLocaleString('id-ID')}` : '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Deposit:</span>
              <br />
              <strong>{values.depositAmountRupiah ? `Rp ${Number(values.depositAmountRupiah).toLocaleString('id-ID')}` : 'Rp 0'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Meter Listrik Awal:</span>
              <br />
              <strong>{values.initialElectricityKwh ? `${values.initialElectricityKwh} kWh` : '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Meter Air Awal:</span>
              <br />
              <strong>{values.initialWaterM3 ? `${values.initialWaterM3} m³` : '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Tujuan Tinggal:</span>
              <br />
              <strong>{values.stayPurpose || '—'}</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <span className="text-muted">Sumber Booking:</span>
              <br />
              <strong>{values.bookingSource || '—'}</strong>
            </div>
          </Col>
          {values.notes ? (
            <Col md={12}>
              <div className="mb-2">
                <span className="text-muted">Catatan:</span>
                <br />
                <strong>{values.notes}</strong>
              </div>
            </Col>
          ) : null}
        </Row>
      </Card.Body>
    </Card>
  );
}