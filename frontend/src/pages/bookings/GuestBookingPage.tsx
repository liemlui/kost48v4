import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPublicBooking, getPublicRoomDetail } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { CreatePublicBookingPayload, PricingTerm, PublicBookingResult } from '../../types';
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm, ALL_PRICING_TERMS } from '../../utils/pricing';

type GuestBookingFormState = {
  fullName: string;
  phone: string;
  email: string;
  checkInDate: string;
  pricingTerm: PricingTerm;
  identityNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  plannedCheckOutDate: string;
  stayPurpose: string;
  notes: string;
  website: string;
};

const INITIAL_FORM: GuestBookingFormState = {
  fullName: '',
  phone: '',
  email: '',
  checkInDate: new Date().toISOString().slice(0, 10),
  pricingTerm: 'MONTHLY',
  identityNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  plannedCheckOutDate: '',
  stayPurpose: '',
  notes: '',
  website: '',
};

const stayPurposeOptions: Array<{ value: string; label: string }> = [
  { value: 'WORK', label: 'Kerja' },
  { value: 'STUDY', label: 'Studi' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'FAMILY', label: 'Keluarga' },
  { value: 'MEDICAL', label: 'Medis' },
  { value: 'PROJECT', label: 'Proyek' },
  { value: 'OTHER', label: 'Lainnya' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

type FormErrors = Partial<Record<keyof GuestBookingFormState | 'server', string>>;

function validate(form: GuestBookingFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
  if (!form.phone.trim()) errors.phone = 'Nomor telepon wajib diisi.';
  if (!form.email.trim()) {
    errors.email = 'Email wajib diisi.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!form.checkInDate) errors.checkInDate = 'Tanggal check-in wajib diisi.';
  if (!form.pricingTerm) errors.pricingTerm = 'Pilih term harga.';
  if (form.plannedCheckOutDate && form.plannedCheckOutDate < form.checkInDate) {
    errors.plannedCheckOutDate = 'Rencana check-out tidak boleh sebelum check-in.';
  }
  return errors;
}

export default function GuestBookingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const id = Number(roomId);

  const [form, setForm] = useState<GuestBookingFormState>({ ...INITIAL_FORM });
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const roomQuery = useQuery({
    queryKey: ['public-room-detail', id],
    queryFn: () => getPublicRoomDetail(id),
    enabled: Number.isFinite(id),
  });

  const room = roomQuery.data;
  const availableTerms = room?.availablePricingTerms?.length ? room.availablePricingTerms : ['MONTHLY'];

  const mutation = useMutation({
    mutationFn: (payload: CreatePublicBookingPayload) => createPublicBooking(payload),
    onSuccess: (data) => {
      setResult(data);
      setErrors({});
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Booking gagal dibuat.')
        : 'Booking gagal dibuat.';
      setErrors({ server: Array.isArray(message) ? message.join(', ') : message });
    },
  });

  const selectedRate = useMemo(() => {
    if (!room || !room.pricing?.monthlyRateRupiah) return null;
    return calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, form.pricingTerm);
  }, [room, form.pricingTerm]);

  const initialTotal = useMemo(() => {
    const rent = Number(selectedRate ?? 0);
    const deposit = Number(room?.defaultDepositRupiah ?? 0);
    return rent + deposit;
  }, [room, selectedRate]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!room) return;

    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});

    const payload: CreatePublicBookingPayload = {
      roomId: room.id,
      checkInDate: form.checkInDate,
      pricingTerm: form.pricingTerm as PricingTerm,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: '',
    };
    if (form.identityNumber.trim()) payload.identityNumber = form.identityNumber.trim();
    if (form.emergencyContactName.trim()) payload.emergencyContactName = form.emergencyContactName.trim();
    if (form.emergencyContactPhone.trim()) payload.emergencyContactPhone = form.emergencyContactPhone.trim();
    if (form.plannedCheckOutDate) payload.plannedCheckOutDate = form.plannedCheckOutDate;
    if (form.stayPurpose) payload.stayPurpose = form.stayPurpose as CreatePublicBookingPayload['stayPurpose'];
    if (form.notes.trim()) payload.notes = form.notes.trim();

    mutation.mutate(payload);
  };

  const update = <K extends keyof GuestBookingFormState>(key: K, value: GuestBookingFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ---- SUCCESS SCREEN ----
  if (result) {
    const tempPwd = result.portalAccess.temporaryPassword;
    return (
      <div className="public-page-shell">
        <div className="container py-5" style={{ maxWidth: 640 }}>
          <Card className="content-card border-0">
            <Card.Body>
              <div className="text-center mb-4">
                <div className="fs-1 mb-2">&#x2705;</div>
                <h4>Booking berhasil dibuat</h4>
                <p className="text-muted">{result.message}</p>
              </div>

              <div className="border rounded-4 p-3 mb-3 bg-light-subtle">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="small text-muted">Kode Kamar</div>
                    <div className="fw-semibold">{result.booking.roomCode}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Status</div>
                    <StatusBadge status={result.booking.status} customLabel="Menunggu Approval" />
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Check-in</div>
                    <div className="fw-semibold">{formatDate(result.booking.checkInDate)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-muted">Term</div>
                    <div className="fw-semibold">{getStatusLabel(result.booking.pricingTerm)}</div>
                  </div>
                  {result.booking.expiresAt ? (
                    <div className="col-12">
                      <div className="small text-muted">Booking berlaku hingga</div>
                      <div className="fw-semibold">{formatDate(result.booking.expiresAt)}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              {tempPwd ? (
                <Alert variant="warning" className="small">
                  <strong>Password portal sementara Anda:</strong>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <code className="fs-5 bg-white px-2 py-1 rounded">{showPassword ? tempPwd : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</code>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </Button>
                  </div>
                  <div className="mt-2">
                    <strong>Simpan password ini.</strong> Password sementara hanya ditampilkan di halaman ini dan tidak akan dikirim melalui email atau SMS.
                  </div>
                </Alert>
              ) : (
                <Alert variant="info" className="small">
                  Gunakan akun portal yang sudah pernah dibuat untuk login. Email: <strong>{result.portalAccess.email}</strong>
                </Alert>
              )}

              <Alert variant="light" className="small mb-0">
                {result.portalAccess.instructions}
              </Alert>

              <div className="d-flex gap-2 justify-content-center mt-4 flex-wrap">
                <Link to="/rooms" className="btn btn-outline-secondary">Lihat Kamar Lain</Link>
                <Link to="/login" className="btn btn-primary">Masuk ke Portal</Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  // ---- LOADING / ERROR / EMPTY STATES ----
  if (roomQuery.isLoading) {
    return <div className="py-5 text-center"><Spinner animation="border" /></div>;
  }
  if (roomQuery.isError) {
    return <Alert variant="danger">Gagal memuat detail kamar. Silakan kembali ke katalog.</Alert>;
  }
  if (!room) {
    return (
      <EmptyState
        icon="🚪"
        title="Kamar tidak ditemukan"
        description="Kamar yang ingin dipesan tidak tersedia di katalog publik."
        action={{ label: 'Kembali ke Katalog Kamar', onClick: () => navigate('/rooms') }}
      />
    );
  }
  if (!room.isAvailable) {
    return (
      <div className="public-page-shell">
        <div className="container py-5" style={{ maxWidth: 640 }}>
          <Card className="content-card border-0">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">&#x1f6aa;</div>
              <h5>Kamar ini sudah tidak tersedia untuk booking</h5>
              <p className="text-muted">Kamar mungkin sudah dibooking oleh tamu lain. Silakan pilih kamar lain dari katalog.</p>
              <Link to="/rooms" className="btn btn-primary">Lihat Katalog Kamar</Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  // ---- BOOKING FORM ----
  return (
    <div className="public-page-shell">
      <div className="container py-4 py-lg-5" style={{ maxWidth: 960 }}>
        <div className="mb-4">
          <div className="page-eyebrow">✦ Booking tamu publik</div>
          <h1 className="mb-1">Form Booking — {room.code}</h1>
          <div className="text-muted">Lengkapi data diri dan pilih tanggal check-in. Admin akan memeriksa dan menyetujui booking Anda.</div>
        </div>

        {errors.server ? <Alert variant="danger">{errors.server}</Alert> : null}

        <Row className="g-4">
          <Col lg={5}>
            <Card className="content-card border-0 h-100">
              <Card.Body>
                <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                  <div>
                    <div className="fw-semibold fs-4">{room.code}</div>
                    <div className="text-muted">{room.name || 'Nama kamar belum tersedia'}</div>
                  </div>
                  <StatusBadge status="RESERVED" customLabel="Siap Dibooking" />
                </div>

                <div className="border rounded-4 p-3 mb-3 bg-light-subtle">
                  <div className="small text-muted mb-1">Tarif yang dipilih</div>
                  <div className="fs-4 fw-bold"><CurrencyDisplay amount={selectedRate} /></div>
                  <div className="small text-muted mt-1">Deposit booking <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
                  <div className="small text-muted mt-1">Total awal booking <strong><CurrencyDisplay amount={initialTotal} showZero={false} /></strong></div>
                </div>

                <div className="d-grid gap-3">
                  <div>
                    <div className="card-title-soft mb-1">Lantai</div>
                    <div className="fw-semibold">{room.floor || '-'}</div>
                  </div>
                  <div>
                    <div className="card-title-soft mb-1">Pilihan term</div>
                    <div className="d-flex flex-wrap gap-2">
                      {availableTerms.map((term) => <StatusBadge key={term} status={term} />)}
                    </div>
                  </div>
                  <div>
                    <div className="card-title-soft mb-1">Utilitas</div>
                    {isUtilitiesIncludedForPricingTerm(form.pricingTerm) ? (
                      <div className="app-caption text-success fw-medium">Listrik & air sudah termasuk dalam tarif {getStatusLabel(form.pricingTerm).toLowerCase()} (flat)</div>
                    ) : (
                      <div className="app-caption">Listrik <CurrencyDisplay amount={room.electricityTariffPerKwhRupiah} /> / kWh &middot; Air <CurrencyDisplay amount={room.waterTariffPerM3Rupiah} /> / m&sup3; (meteran terpisah)</div>
                    )}
                  </div>
                  {room.notes ? (
                    <Alert variant="light" className="mb-0">
                      <strong>Catatan kamar:</strong> {room.notes}
                    </Alert>
                  ) : null}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="content-card border-0">
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <h6 className="fw-semibold">Data Diri</h6>
                  </div>
                  <Row className="g-3">
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Nama Lengkap <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          value={form.fullName}
                          onChange={(e) => update('fullName', e.target.value)}
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
                          onChange={(e) => update('phone', e.target.value)}
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
                          onChange={(e) => update('email', e.target.value)}
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
                          onChange={(e) => update('identityNumber', e.target.value)}
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
                          onChange={(e) => update('emergencyContactName', e.target.value)}
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
                          onChange={(e) => update('emergencyContactPhone', e.target.value)}
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
                          onChange={(e) => update('checkInDate', e.target.value)}
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
                          onChange={(e) => update('pricingTerm', e.target.value)}
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
                          onChange={(e) => update('plannedCheckOutDate', e.target.value)}
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
                          onChange={(e) => update('stayPurpose', e.target.value)}
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
                          onChange={(e) => update('notes', e.target.value)}
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
                      onChange={(e) => update('website', e.target.value)}
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
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? 'Menyimpan Booking...' : 'Kirim Booking'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}