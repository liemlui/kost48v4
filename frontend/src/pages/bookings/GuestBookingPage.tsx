import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { createPublicBooking, getPublicRoomDetail } from '../../api/bookings';
import EmptyState from '../../components/common/EmptyState';
import type { CreatePublicBookingPayload, PricingTerm, PublicBookingResult } from '../../types';
import { calculateRentByPricingTerm } from '../../utils/pricing';
import type { GuestBookingFormState } from './guestBookingUtils';
import { INITIAL_FORM, validate } from './guestBookingUtils';
import GuestBookingForm from './GuestBookingForm';
import GuestBookingRoomSummary from './GuestBookingRoomSummary';
import GuestBookingSuccess from './GuestBookingSuccess';

export default function GuestBookingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const id = Number(roomId);

  const [form, setForm] = useState<GuestBookingFormState>({ ...INITIAL_FORM });
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roomQuery = useQuery({
    queryKey: ['public-room-detail', id],
    queryFn: () => getPublicRoomDetail(id),
    enabled: Number.isFinite(id),
  });

  const room = roomQuery.data;

  const mutation = useMutation({
    mutationFn: (payload: CreatePublicBookingPayload) => createPublicBooking(payload),
    onSuccess: (data) => {
      setResult(data);
      setErrors({});
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
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
    return <GuestBookingSuccess result={result} />;
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
          <div className="content-card border-0 card">
            <div className="card-body text-center">
              <div className="fs-1 mb-3">&#x1f6aa;</div>
              <h5>Kamar ini sudah tidak tersedia untuk booking</h5>
              <p className="text-muted">Kamar mungkin sudah dibooking oleh tamu lain. Silakan pilih kamar lain dari katalog.</p>
              <a href="/rooms" className="btn btn-primary">Lihat Katalog Kamar</a>
            </div>
          </div>
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
      <GuestBookingRoomSummary room={room} form={form} selectedRate={selectedRate != null ? String(selectedRate) : null} initialTotal={initialTotal} />
          </Col>
          <Col lg={7}>
            <GuestBookingForm
              room={room}
              form={form}
              errors={errors}
              selectedRate={selectedRate != null ? String(selectedRate) : null}
              initialTotal={initialTotal}
              isSubmitting={mutation.isPending}
              onChange={update}
              onSubmit={handleSubmit}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}