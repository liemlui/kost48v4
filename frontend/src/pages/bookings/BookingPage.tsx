import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createTenantBooking, listPublicRooms } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { CreateTenantBookingPayload, PricingTerm, PublicRoom } from '../../types';

type BookingFormState = {
  roomId: number;
  checkInDate: string;
  pricingTerm: PricingTerm;
  plannedCheckOutDate: string;
  stayPurpose?: CreateTenantBookingPayload['stayPurpose'];
  notes: string;
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

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialRoom = (location.state as { room?: PublicRoom } | null)?.room ?? null;

  const [formState, setFormState] = useState<BookingFormState>({
    roomId: Number(roomId),
    checkInDate: todayString(),
    pricingTerm: initialRoom?.highlightedPricingTerm ?? initialRoom?.availablePricingTerms?.[0] ?? 'MONTHLY',
    plannedCheckOutDate: '',
    stayPurpose: undefined,
    notes: '',
  });
  const [error, setError] = useState('');

  const roomQuery = useQuery({
    queryKey: ['public-room-for-booking', roomId],
    queryFn: async () => {
      if (initialRoom) return initialRoom;
      const response = await listPublicRooms({ limit: 500 });
      return response.items.find((item) => String(item.id) === String(roomId)) ?? null;
    },
  });

  const room = roomQuery.data ?? initialRoom;
  const availableTerms = room?.availablePricingTerms?.length ? room.availablePricingTerms : ['MONTHLY'];

  useEffect(() => {
    if (!room) return;
    const nextTerm = availableTerms.includes(formState.pricingTerm) ? formState.pricingTerm : availableTerms[0];
    setFormState((prev) => ({
      ...prev,
      roomId: room.id,
      pricingTerm: nextTerm,
    }));
  }, [room, availableTerms, formState.pricingTerm]);

  const mutation = useMutation({
    mutationFn: (payload: CreateTenantBookingPayload) => createTenantBooking(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['public-rooms'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['stays'] });
      navigate('/portal/bookings', {
        replace: true,
        state: { successMessage: 'Booking kamar berhasil dibuat. Pantau masa berlaku booking Anda di halaman ini.' },
      });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Booking gagal dibuat.')
        : 'Booking gagal dibuat.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const selectedRate = useMemo(() => {
    if (!room) return null;
    const pricing = room.pricing;
    switch (formState.pricingTerm) {
      case 'DAILY':
        return pricing.dailyRateRupiah;
      case 'WEEKLY':
        return pricing.weeklyRateRupiah;
      case 'BIWEEKLY':
        return pricing.biWeeklyRateRupiah;
      default:
        return pricing.monthlyRateRupiah;
    }
  }, [room, formState.pricingTerm]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!room) {
      setError('Ringkasan kamar belum siap. Silakan muat ulang halaman ini.');
      return;
    }
    setError('');
    const payload: CreateTenantBookingPayload = {
      roomId: room.id,
      checkInDate: formState.checkInDate,
      pricingTerm: formState.pricingTerm,
      ...(formState.plannedCheckOutDate ? { plannedCheckOutDate: formState.plannedCheckOutDate } : {}),
      ...(formState.stayPurpose ? { stayPurpose: formState.stayPurpose } : {}),
      ...(formState.notes?.trim() ? { notes: formState.notes.trim() } : {}),
    };
    mutation.mutate(payload);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tenant booking"
        title="Form Booking Kamar"
        description="Booking mandiri tenant dibuat dari konteks kamar yang dipilih. Anda cukup melengkapi tanggal dan term yang diinginkan."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {roomQuery.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {roomQuery.isError ? <Alert variant="danger">Gagal memuat ringkasan kamar. Silakan kembali ke katalog kamar.</Alert> : null}
      {!roomQuery.isLoading && !room ? (
        <EmptyState
          icon="🚪"
          title="Kamar tidak ditemukan"
          description="Kamar yang ingin dipesan tidak tersedia di katalog publik saat ini."
          action={{ label: 'Kembali ke Katalog Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      {room ? (
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
                  <div className="small text-muted mt-1">Deposit default <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
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
                    <div className="app-caption">Listrik <CurrencyDisplay amount={room.electricityTariffPerKwhRupiah} /> / kWh · Air <CurrencyDisplay amount={room.waterTariffPerM3Rupiah} /> / m³</div>
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
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Tanggal Check-in</Form.Label>
                        <Form.Control
                          type="date"
                          min={todayString()}
                          value={formState.checkInDate}
                          onChange={(event) => setFormState((prev) => ({ ...prev, checkInDate: event.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Pricing Term</Form.Label>
                        <Form.Select
                          value={formState.pricingTerm}
                          onChange={(event) => setFormState((prev) => ({ ...prev, pricingTerm: event.target.value as PricingTerm }))}
                          required
                        >
                          {availableTerms.map((term) => <option key={term} value={term}>{getStatusLabel(term)}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Rencana Check-out</Form.Label>
                        <Form.Control
                          type="date"
                          min={formState.checkInDate || todayString()}
                          value={formState.plannedCheckOutDate ?? ''}
                          onChange={(event) => setFormState((prev) => ({ ...prev, plannedCheckOutDate: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Tujuan Tinggal</Form.Label>
                        <Form.Select
                          value={formState.stayPurpose ?? ''}
                          onChange={(event) => setFormState((prev) => ({
                            ...prev,
                            stayPurpose: (event.target.value || undefined) as BookingFormState['stayPurpose'],
                          }))}
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
                          value={formState.notes ?? ''}
                          onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                          placeholder="Contoh: butuh mulai masuk sore hari, atau catatan non-teknis lain yang relevan."
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Alert variant="light" className="small mt-4 mb-0">
                    Form ini hanya membuat booking tenant. Approval admin, pembayaran, dan aktivasi penuh tetap masuk fase berikutnya.
                  </Alert>

                  <div className="d-flex gap-2 justify-content-end mt-4 flex-wrap">
                    <Button type="button" variant="outline-secondary" onClick={() => navigate('/rooms')}>Kembali ke Katalog</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? 'Menyimpan Booking...' : 'Kirim Booking'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
