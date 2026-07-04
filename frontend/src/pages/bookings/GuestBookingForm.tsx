// FILE: GuestBookingForm.tsx — form booking publik: pilih kamar + durasi + data diri
import { FormEvent, Fragment, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import { getStatusLabel } from '../../components/common/StatusBadge';
import type { PublicRoom } from '../../types';
import {
  calculateRentByPricingTerm,
  calculateOccupantSurcharge,
  isUtilitiesIncludedForPricingTerm,
  ALL_PRICING_TERMS,
  ROOM_MAX_FREE_OCCUPANTS,
  ROOM_MAX_OCCUPANTS,
} from '../../utils/pricing';
import { parseKtpText } from '../../utils/ktpOcr';
import type { GuestBookingFormState, FormErrors } from './guestBookingUtils';
import {
  stayPurposeOptions,
  INITIAL_FORM,
  validateStep1,
  validateStep2,
  getDurationOptions,
  computeCheckOutDate,
  formatDate,
} from './guestBookingUtils';
import { formatRupiah } from '../../utils/formatCurrency';

interface GuestBookingFormProps {
  room: PublicRoom;
  form: GuestBookingFormState;
  errors: FormErrors;
  selectedRate: string | null;
  initialTotal: number;
  isSubmitting: boolean;
  petDepositRupiah: number;
  onChange: <K extends keyof GuestBookingFormState>(key: K, value: GuestBookingFormState[K]) => void;
  onSubmit: (event: FormEvent) => void;
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT: GuestBookingForm — Wizard Steps & Main
// ═══════════════════════════════════════════════════════════

function WizardSteps({ step }: { step: number }) {
  const steps = ['Data Diri', 'Booking', 'Preferensi', 'Ringkasan'];
  return (
    <div className="d-flex align-items-center mb-4" style={{ gap: 4 }}>
      {steps.flatMap((label, idx) => {
        const n = idx + 1;
        const done = n < step;
        const active = n === step;
        const els = [
          <div key={`step-${n}`} className="d-flex align-items-center gap-1 flex-shrink-0">
            <span
              className="rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{
                width: 26, height: 26, fontSize: 12, fontWeight: 600,
                background: done ? '#22c55e' : active ? '#0ea5e9' : '#e2e8f0',
                color: done || active ? '#fff' : '#64748b',
              }}
            >
              {done ? '✓' : n}
            </span>
            <span className={`small d-none d-sm-inline ${active ? 'fw-semibold' : done ? 'text-success' : 'text-muted'}`}>
              {label}
            </span>
          </div>,
        ];
        if (idx < steps.length - 1) {
          els.push(
            <div key={`sep-${n}`} className="flex-grow-1" style={{ height: 2, minWidth: 8, background: done ? '#22c55e' : '#e2e8f0' }} />,
          );
        }
        return els;
      })}
    </div>
  );
}

export default function GuestBookingForm({
  room, form, errors: serverErrors, selectedRate: _sr, initialTotal, isSubmitting, petDepositRupiah, onChange, onSubmit,
}: GuestBookingFormProps) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepErrors, setStepErrors] = useState<FormErrors>({});
  const [showEmergency, setShowEmergency] = useState(false);
  const [ktpScanning, setKtpScanning] = useState(false);
  const [ktpScanMsg, setKtpScanMsg] = useState<string | null>(null);

  const availableTerms: string[] = room.availablePricingTerms?.length ? room.availablePricingTerms : [];

  async function handleKtpScan(file?: File) {
    if (!file) return;
    setKtpScanning(true);
    setKtpScanMsg('Memindai KTP di perangkat Anda (offline)…');
    try {
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(file, 'ind');
      const { nik, name } = parseKtpText(data.text || '');
      if (nik) onChange('identityNumber', nik);
      if (name && !form.fullName.trim()) onChange('fullName', name);
      const filled = [nik ? 'NIK' : '', name ? 'Nama' : ''].filter(Boolean);
      setKtpScanMsg(
        filled.length
          ? `Terisi otomatis (${filled.join(' & ')}). Periksa & koreksi bila ada yang salah.`
          : 'Teks KTP tidak terbaca jelas. Silakan isi data manual.',
      );
    } catch {
      setKtpScanMsg('Gagal memindai. Isi data manual.');
    } finally {
      setKtpScanning(false);
    }
  }

  function goNext() {
    if (wizardStep === 1) {
      const errs = validateStep1(form);
      if (Object.keys(errs).length) { setStepErrors(errs); return; }
    } else if (wizardStep === 2) {
      const errs = validateStep2(form);
      if (Object.keys(errs).length) { setStepErrors(errs); return; }
    }
    setStepErrors({});
    setWizardStep((s) => (s < 4 ? (s + 1) as 1 | 2 | 3 | 4 : s));
  }

  function goBack() {
    setStepErrors({});
    setWizardStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 | 4 : s));
  }

  function goToStep4() {
    setStepErrors({});
    setWizardStep(4);
  }

  const fmt = formatRupiah;

  const roomSizeKey = String(room.roomSize ?? '').toUpperCase();
  const maxFree = ROOM_MAX_FREE_OCCUPANTS[roomSizeKey] ?? 2;
  const hardCap = ROOM_MAX_OCCUPANTS[roomSizeKey] ?? (maxFree + 2);

  const baseRent = room.pricing?.monthlyRateRupiah
    ? calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, form.pricingTerm)
    : 0;
  const occupantSurcharge = baseRent > 0 ? calculateOccupantSurcharge(baseRent, room.roomSize, form.occupantCount) : 0;
  const totalRent = baseRent + occupantSurcharge;
  const depositJaminan = Number(room.defaultDepositRupiah ?? 0);
  const depositHewan = form.hasPet ? petDepositRupiah : 0;
  const dpAmount = Math.round(totalRent * 0.3);

  const durationOptions = getDurationOptions(form.pricingTerm);
  const computedCheckOut = computeCheckOutDate(form.checkInDate, form.pricingTerm, form.leaseDurationCount);

  const allErrors = { ...stepErrors, ...serverErrors };

  const honeypot = (
    <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input
        id="website" type="text" name="website" value={form.website}
        onChange={(e) => onChange('website', e.target.value)}
        tabIndex={-1} autoComplete="off"
      />
    </div>
  );

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <WizardSteps step={wizardStep} />

        {/* ─── STEP 1: DATA DIRI ─── */}
        {wizardStep === 1 && (
          <Form onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <h6 className="fw-semibold mb-3">Data Diri</h6>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Nama Lengkap <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={form.fullName}
                    onChange={(e) => onChange('fullName', e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    isInvalid={!!allErrors.fullName}
                    autoComplete="name"
                    autoFocus
                  />
                  <Form.Control.Feedback type="invalid">{allErrors.fullName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Telepon <span className="text-muted small">(minimal salah satu)</span></Form.Label>
                  <Form.Control
                    value={form.phone}
                    onChange={(e) => onChange('phone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    isInvalid={!!allErrors.phone}
                    autoComplete="tel"
                    type="tel"
                  />
                  <Form.Control.Feedback type="invalid">{allErrors.phone}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email <span className="text-muted small">(minimal salah satu)</span></Form.Label>
                  <Form.Control
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    placeholder="contoh@email.com"
                    isInvalid={!!allErrors.email}
                    autoComplete="email"
                    type="email"
                  />
                  <Form.Control.Feedback type="invalid">{allErrors.email}</Form.Control.Feedback>
                  <Form.Text muted>Dipakai untuk akses portal tenant jika booking disetujui.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>No. KTP/NIK <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={form.identityNumber}
                    onChange={(e) => onChange('identityNumber', e.target.value)}
                    placeholder="16 digit NIK dari KTP"
                    isInvalid={!!allErrors.identityNumber}
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={16}
                  />
                  <Form.Control.Feedback type="invalid">{allErrors.identityNumber}</Form.Control.Feedback>
                  <div className="mt-2 d-flex align-items-center flex-wrap gap-2">
                    <label
                      className={`btn btn-outline-secondary btn-sm mb-0${ktpScanning ? ' disabled' : ''}`}
                      style={{ cursor: ktpScanning ? 'wait' : 'pointer' }}
                    >
                      {ktpScanning ? '⏳ Memindai…' : '📷 Isi otomatis dari foto KTP'}
                      <input
                        type="file" accept="image/*" capture="environment" hidden disabled={ktpScanning}
                        onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; void handleKtpScan(f); }}
                      />
                    </label>
                    <span className="text-muted small">Foto diproses di perangkat, tidak diunggah.</span>
                  </div>
                  {ktpScanMsg && <div className="small mt-1 text-info">{ktpScanMsg}</div>}
                </Form.Group>
              </Col>
              <Col xs={12}>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-muted"
                  onClick={() => setShowEmergency(!showEmergency)}
                >
                  {showEmergency ? '▾ Sembunyikan' : '▸ Tambah'} kontak darurat (opsional)
                </button>
                {showEmergency && (
                  <Row className="g-3 mt-1">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Nama Kontak Darurat</Form.Label>
                        <Form.Control
                          value={form.emergencyContactName}
                          onChange={(e) => onChange('emergencyContactName', e.target.value)}
                          placeholder="Nama keluarga / kerabat"
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
                          placeholder="08xxxxxxxxxx"
                          autoComplete="off"
                          type="tel"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>
            {honeypot}
            <div className="d-flex justify-content-between mt-4">
              <Link to="/rooms" className="btn btn-outline-secondary">← Katalog</Link>
              <Button type="submit">Lanjut →</Button>
            </div>
          </Form>
        )}

        {/* ─── STEP 2: DETAIL BOOKING ─── */}
        {wizardStep === 2 && (
          <Form onSubmit={(e) => { e.preventDefault(); goNext(); }}>
            <h6 className="fw-semibold mb-3">Detail Booking</h6>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tanggal masuk <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    min={INITIAL_FORM.checkInDate}
                    value={form.checkInDate}
                    onChange={(e) => onChange('checkInDate', e.target.value)}
                    isInvalid={!!allErrors.checkInDate}
                  />
                  <Form.Control.Feedback type="invalid">{allErrors.checkInDate}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Pilihan masa sewa <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={form.pricingTerm}
                    onChange={(e) => {
                      onChange('pricingTerm', e.target.value as GuestBookingFormState['pricingTerm']);
                      onChange('leaseDurationCount', 1);
                    }}
                    isInvalid={!!allErrors.pricingTerm}
                  >
                    {ALL_PRICING_TERMS.map((term) => {
                      if (availableTerms.length > 0 && !availableTerms.includes(term)) return null;
                      const rent = room.pricing?.monthlyRateRupiah
                        ? calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, term)
                        : null;
                      const incUtil = isUtilitiesIncludedForPricingTerm(term);
                      return (
                        <option key={term} value={term}>
                          {getStatusLabel(term)}{rent ? ` — ${fmt(rent)}` : ''}{incUtil ? ' (termasuk utilitas)' : ''}
                        </option>
                      );
                    })}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{allErrors.pricingTerm}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Label className="d-block mb-1">
                  Berapa lama? <span className="text-muted small">(opsional, bisa disesuaikan bersama admin)</span>
                </Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm ${form.leaseDurationCount === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                      style={{ borderRadius: 999 }}
                      onClick={() => onChange('leaseDurationCount', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {computedCheckOut && (
                  <div className="small text-muted mt-2">
                    Perkiraan checkout: <strong>{formatDate(computedCheckOut)}</strong> (bisa disesuaikan nanti).
                  </div>
                )}
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Jumlah penghuni</Form.Label>
                  <Form.Select
                    value={form.occupantCount}
                    onChange={(e) => onChange('occupantCount', Number(e.target.value))}
                  >
                    {Array.from({ length: hardCap }, (_, i) => i + 1).map((n) => {
                      const sc = baseRent > 0 ? calculateOccupantSurcharge(baseRent, room.roomSize, n) : 0;
                      const suffix = n > maxFree
                        ? ` (+${fmt(sc)}/term) ⚠️`
                        : n === maxFree ? ' (maks gratis)' : '';
                      return <option key={n} value={n}>{n} orang{suffix}</option>;
                    })}
                  </Form.Select>
                  <Form.Text muted>
                    {roomSizeKey === 'LARGE' ? 'Kamar besar' : 'Kamar standar'}: {maxFree} orang gratis, maks {hardCap} (+20%/ekstra).
                  </Form.Text>
                  {occupantSurcharge > 0 && (
                    <div className="small text-warning mt-1">Biaya ekstra: <strong>+{fmt(occupantSurcharge)}/term</strong></div>
                  )}
                  {form.occupantCount > maxFree && (
                    <div className="small text-danger mt-1">
                      ⚠️ Tidak direkomendasikan. Extra bed memenuhi hampir seluruh lantai. Pertimbangkan kamar lebih besar.
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-between mt-4">
              <Button variant="outline-secondary" type="button" onClick={goBack}>← Kembali</Button>
              <Button type="submit">Lanjut →</Button>
            </div>
          </Form>
        )}

        {/* ─── STEP 3: PREFERENSI ─── */}
        {wizardStep === 3 && (
          <div>
            <h6 className="fw-semibold mb-1">Preferensi</h6>
            <p className="small text-muted mb-3">Semua opsional — klik <strong>Lewati</strong> jika tidak relevan.</p>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tujuan Tinggal</Form.Label>
                  <Form.Select
                    value={form.stayPurpose ?? ''}
                    onChange={(e) => onChange('stayPurpose', e.target.value)}
                  >
                    <option value="">Pilih bila relevan</option>
                    {stayPurposeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Hewan Peliharaan</Form.Label>
                  <div>
                    <Form.Check
                      type="checkbox"
                      id="has-pet"
                      label="Saya akan membawa hewan peliharaan"
                      checked={form.hasPet}
                      onChange={(e) => onChange('hasPet', e.target.checked)}
                    />
                  </div>
                  {form.hasPet && (
                    <div className="small mt-1 p-2 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                      Deposit hewan peliharaan <strong>{fmt(petDepositRupiah)}</strong> (refundable saat checkout bila tidak ada kerusakan) ditambahkan ke estimasi tagihan.
                    </div>
                  )}
                  <Form.Text muted>Hewan peliharaan diperbolehkan dengan pemberitahuan kepada admin.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Catatan Tambahan</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.notes ?? ''}
                    onChange={(e) => onChange('notes', e.target.value)}
                    placeholder="Contoh: masuk sore hari, punya motor."
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-between mt-4">
              <Button variant="outline-secondary" type="button" onClick={goBack}>← Kembali</Button>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" type="button" onClick={goToStep4}>Lewati</Button>
                <Button type="button" onClick={goToStep4}>Lanjut →</Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: RINGKASAN & PEMBAYARAN ─── */}
        {wizardStep === 4 && (
          <Form onSubmit={onSubmit}>
            <h6 className="fw-semibold mb-3">Ringkasan & Pembayaran</h6>

            {/* Booking recap */}
            <div className="p-3 rounded mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              <div className="row g-1">
                <div className="col-5 text-muted">Nama</div>
                <div className="col-7 fw-semibold">{form.fullName}</div>
                <div className="col-5 text-muted">KTP/NIK</div>
                <div className="col-7">{form.identityNumber}</div>
                <div className="col-5 text-muted">Kamar</div>
                <div className="col-7">{room.code}{room.name ? ` — ${room.name}` : ''}</div>
                <div className="col-5 text-muted">Check-in</div>
                <div className="col-7">{form.checkInDate ? formatDate(form.checkInDate) : '-'}</div>
                <div className="col-5 text-muted">Durasi</div>
                <div className="col-7">
                  {durationOptions.find((d) => d.value === form.leaseDurationCount)?.label ?? `${form.leaseDurationCount}×`}
                  {computedCheckOut && <span className="text-muted ms-1">(s/d {formatDate(computedCheckOut)})</span>}
                </div>
                <div className="col-5 text-muted">Penghuni</div>
                <div className="col-7">{form.occupantCount} orang</div>
                {form.hasPet && (
                  <Fragment>
                    <div className="col-5 text-muted">Hewan</div>
                    <div className="col-7">Ya</div>
                  </Fragment>
                )}
                {form.stayPurpose && (
                  <Fragment>
                    <div className="col-5 text-muted">Tujuan</div>
                    <div className="col-7">{stayPurposeOptions.find((o) => o.value === form.stayPurpose)?.label ?? form.stayPurpose}</div>
                  </Fragment>
                )}
              </div>
            </div>

            {/* Estimasi tagihan */}
            <div className="p-3 rounded mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.875rem' }}>
              <div className="fw-semibold mb-2">Rincian Tagihan</div>
              <div className="d-flex flex-column gap-1">
                <div className="d-flex justify-content-between">
                  <span>Sewa ({getStatusLabel(form.pricingTerm)})</span>
                  <strong>{fmt(baseRent)}</strong>
                </div>
                {occupantSurcharge > 0 && (
                  <div className="d-flex justify-content-between" style={{ color: '#b45309' }}>
                    <span>Surcharge penghuni ekstra</span>
                    <strong>+{fmt(occupantSurcharge)}</strong>
                  </div>
                )}
                <div className="d-flex justify-content-between">
                  <span>Deposit jaminan (refundable)</span>
                  <strong>{fmt(depositJaminan)}</strong>
                </div>
                {form.hasPet && (
                  <div className="d-flex justify-content-between" style={{ color: '#0369a1' }}>
                    <span>Deposit hewan (refundable)</span>
                    <strong>{fmt(depositHewan)}</strong>
                  </div>
                )}
                <hr className="my-1" />
                <div className="d-flex justify-content-between" style={{ color: '#64748b' }}>
                  <span>Total tagihan</span>
                  <span><CurrencyDisplay amount={initialTotal} /></span>
                </div>
                <div className="d-flex justify-content-between fw-bold" style={{ fontSize: '1rem', color: '#059669' }}>
                  <span>{form.paymentChoice === 'FULL' ? 'Bayar sekarang (LUNAS)' : 'Bayar sekarang (DP 30%)'}</span>
                  <span><CurrencyDisplay amount={form.paymentChoice === 'FULL' ? initialTotal : dpAmount} /></span>
                </div>
                {form.paymentChoice === 'DP' && (
                  <div className="small text-muted mt-1">
                    Sisa <strong>{fmt(totalRent - dpAmount)}</strong> + deposit dilunasi sebelum check-in.
                  </div>
                )}
              </div>
            </div>

            {/* Payment choice */}
            <div className="mb-3">
              <div className="fw-semibold mb-2 small">Pilihan Pembayaran Awal</div>
              <div className="d-flex flex-column gap-2">
                <label
                  className={`p-3 rounded border d-flex align-items-start gap-2`}
                  style={{
                    cursor: 'pointer',
                    borderColor: form.paymentChoice === 'DP' ? '#0ea5e9' : '#cbd5e1',
                    background: form.paymentChoice === 'DP' ? 'rgba(14,165,233,0.06)' : 'transparent',
                  }}
                >
                  <input
                    type="radio" name="paymentChoice" value="DP"
                    checked={form.paymentChoice === 'DP'}
                    onChange={() => onChange('paymentChoice', 'DP')}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <div>
                    <div className="fw-semibold">DP 30% — {fmt(dpAmount)} sekarang</div>
                    <div className="small text-muted">
                      Booking sah & kamar ditahan setelah DP disetujui admin. Sisa <strong>{fmt(totalRent - dpAmount)}</strong> + deposit dilunasi saat check-in.
                    </div>
                  </div>
                </label>
                <label
                  className={`p-3 rounded border d-flex align-items-start gap-2`}
                  style={{
                    cursor: 'pointer',
                    borderColor: form.paymentChoice === 'FULL' ? '#0ea5e9' : '#cbd5e1',
                    background: form.paymentChoice === 'FULL' ? 'rgba(14,165,233,0.06)' : 'transparent',
                  }}
                >
                  <input
                    type="radio" name="paymentChoice" value="FULL"
                    checked={form.paymentChoice === 'FULL'}
                    onChange={() => onChange('paymentChoice', 'FULL')}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <div>
                    <div className="fw-semibold">Bayar Lunas — <CurrencyDisplay amount={initialTotal} /></div>
                    <div className="small text-muted">
                      Semua lunas sekaligus. Tidak ada tagihan saat check-in. Booking langsung sah & kamar ditahan.
                    </div>
                  </div>
                </label>
              </div>

              {/* Info penting: DP vs belum bayar */}
              <Alert variant="warning" className="small py-2 mt-2 mb-0">
                <strong>⏳ Penting:</strong> DP atau LUNAS mengamankan kamar Anda. Tanpa pembayaran, kamar bisa dipesan orang lain (first-paid-wins). Booking kedaluwarsa dalam 3 jam jika tidak ada pembayaran.
              </Alert>
            </div>

            {serverErrors.server && <Alert variant="danger">{serverErrors.server}</Alert>}
            <Alert variant="warning" className="small py-2">
              Jangan transfer sebelum tagihan resmi muncul di portal penghuni.
            </Alert>

            <div className="d-flex justify-content-between mt-3">
              <Button variant="outline-secondary" type="button" onClick={goBack}>← Kembali</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Mengajukan...' : '🏠 Ajukan Booking'}
              </Button>
            </div>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
}
