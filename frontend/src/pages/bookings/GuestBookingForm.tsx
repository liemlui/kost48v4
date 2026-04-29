import { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { PublicRoom } from '../../types';
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm, ALL_PRICING_TERMS } from '../../utils/pricing';
import type { GuestBookingFormState, FormErrors } from './guestBookingUtils';
import { stayPurposeOptions, INITIAL_FORM } from './guestBookingUtils';

interface GuestBookingFormProps {
  room: PublicRoom;
  form: GuestBookingFormState;
  errors: FormErrors;
  selectedRate: string | null;
  initialTotal: number;
  isSubmitting: boolean;
  onChange: <K extends keyof GuestBookingFormState>(key: K, value: GuestBookingFormState[K]) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function GuestBookingForm({
  room,
  form,
  errors,
  selectedRate,
  initialTotal,
  isSubmitting,
  onChange,
  onSubmit,
}: GuestBookingFormProps) {
  const availableTerms = room.availablePricingTerms?.length ? room.availablePricingTerms : ['MONTHLY'];

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <Form onSubmit={onSubmit}>
          <div className="mb-3">
            <h6 className="fw-semibold">Data Diri</h6>
          </div>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Nama Lengkap <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  value={form.fullName}
                  onChange={(e) => onChange('fullName', e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  isInvalid={!!errors.fullName}
                  autoComplete="name"
                />
                <Form.Control.Feedback type="invalid">{errors.fullName}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Telepon <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  value={form.phone}
                  onChange={(e) => onChange('phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  isInvalid={!!errors.phone}
                  autoComplete="tel"
                  type="tel"
                />
                <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  placeholder="contoh@email.com"
                  isInvalid={!!errors.email}
                  autoComplete="email"
                  type="email"
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                <Form.Text muted>Email ini akan digunakan untuk login ke portal tenant.</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>No. KTP/NIK</Form.Label>
                <Form.Control
                  value={form.identityNumber}
                  onChange={(e) => onChange('identityNumber', e.target.value)}
                  placeholder="Opsional"
                  autoComplete="off"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nama Kontak Darurat</Form.Label>
                <Form.Control
                  value={form.emergencyContactName}
                  onChange={(e) => onChange('emergencyContactName', e.target.value)}
                  placeholder="Opsional"
                  autoComplete="off"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Telepon Kontak Darurat</Form.Label>
                <Form.Control
                  value={form.emergencyContactPhone}
                  onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
                  placeholder="Opsional"
                  autoComplete="off"
                  type="tel"
                />
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-4" />
          <div className="mb-3">
            <h6 className="fw-semibold">Detail Booking</h6>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tanggal Check-in <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="date"
                  min={INITIAL_FORM.checkInDate}
                  value={form.checkInDate}
                  onChange={(e) => onChange('checkInDate', e.target.value)}
                  isInvalid={!!errors.checkInDate}
                />
                <Form.Control.Feedback type="invalid">{errors.checkInDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Pricing Term <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={form.pricingTerm}
                  onChange={(e) => onChange('pricingTerm', e.target.value)}
                  isInvalid={!!errors.pricingTerm}
                >
                  {ALL_PRICING_TERMS.map((term) => {
                    const rent = room?.pricing?.monthlyRateRupiah ? calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, term) : null;
                    const incUtil = isUtilitiesIncludedForPricingTerm(term);
                    return (
                      <option key={term} value={term}>
                        {getStatusLabel(term)}{rent ? ` — ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rent)}` : ''}{incUtil ? ' (termasuk listrik & air)' : ''}
                      </option>
                    );
                  })}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.pricingTerm}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Rencana Check-out</Form.Label>
                <Form.Control
                  type="date"
                  min={form.checkInDate || INITIAL_FORM.checkInDate}
                  value={form.plannedCheckOutDate ?? ''}
                  onChange={(e) => onChange('plannedCheckOutDate', e.target.value)}
                  isInvalid={!!errors.plannedCheckOutDate}
                />
                <Form.Control.Feedback type="invalid">{errors.plannedCheckOutDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tujuan Tinggal</Form.Label>
                <Form.Select
                  value={form.stayPurpose ?? ''}
                  onChange={(e) => onChange('stayPurpose', e.target.value)}
                >
                  <option value="">Pilih bila relevan</option>
                  {stayPurposeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Catatan Tambahan</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={form.notes ?? ''}
                  onChange={(e) => onChange('notes', e.target.value)}
                  placeholder="Contoh: butuh mulai masuk sore hari, atau catatan non-teknis lain yang relevan."
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Honeypot — hidden from real users */}
          <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => onChange('website', e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <Alert variant="info" className="small mt-4 mb-0">
            <strong>Penting:</strong> Booking ini belum berarti kamar aktif. Admin akan memeriksa dan menyetujui booking terlebih dahulu. Setelah disetujui, Anda dapat login ke portal untuk melihat tagihan dan upload bukti pembayaran. Nominal final akan dikonfirmasi admin setelah booking disetujui.
          </Alert>

          <Alert variant="light" className="small mt-2 mb-0">
            Ringkasan awal: sewa sesuai term <strong><CurrencyDisplay amount={selectedRate} showZero={false} /></strong> + deposit <strong><CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></strong> = total awal <strong><CurrencyDisplay amount={initialTotal} showZero={false} /></strong>.
          </Alert>

          <div className="d-flex gap-2 justify-content-end mt-4 flex-wrap">
            <Link to="/rooms" className="btn btn-outline-secondary">Kembali ke Katalog</Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan Booking...' : 'Kirim Booking'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}