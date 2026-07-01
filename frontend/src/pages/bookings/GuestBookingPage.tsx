import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { createPublicBooking, getPublicRoomDetail } from '../../api/bookings';
import { fetchPublicConfig } from '../../api/settings';
import EmptyState from '../../components/common/EmptyState';
import type { CreatePublicBookingPayload, PricingTerm, PublicBookingResult } from '../../types';
import { calculateRentByPricingTerm, calculateOccupantSurcharge } from '../../utils/pricing';
import type { GuestBookingFormState } from './guestBookingUtils';
import { INITIAL_FORM, validate, computeCheckOutDate } from './guestBookingUtils';
import GuestBookingForm from './GuestBookingForm';
import GuestBookingRoomSummary from './GuestBookingRoomSummary';
import GuestBookingSuccess from './GuestBookingSuccess';
import { getPublicRoomAvailabilityDisplay } from '../../utils/publicRoomDisplay';

function buildWaAvailabilityUrl(roomCode: string, isChecking = false) {
  const number = String(import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '').replace(/\D/g, '');
  const message = isChecking
    ? `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Saya lihat kamar sedang dicek. Boleh tanya estimasi kapan siap ditempati?`
    : `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Boleh tanya ketersediaan atau estimasi kapan kosong?`;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

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

  const configQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 10 * 60_000,
  });

  const room = roomQuery.data;
  const petDepositRupiah = configQuery.data?.petDepositRupiah ?? 100000;

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
    const base = calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, form.pricingTerm);
    const surcharge = calculateOccupantSurcharge(base, room.roomSize, form.occupantCount);
    return base + surcharge;
  }, [room, form.pricingTerm, form.occupantCount]);

  const initialTotal = useMemo(() => {
    const rent = Number(selectedRate ?? 0);
    const deposit = Number(room?.defaultDepositRupiah ?? 0);
    const pet = form.hasPet ? petDepositRupiah : 0;
    return rent + deposit + pet;
  }, [room, selectedRate, form.hasPet, petDepositRupiah]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!room) return;

    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});

    const checkOutDate = computeCheckOutDate(form.checkInDate, form.pricingTerm, form.leaseDurationCount);

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
    if (checkOutDate) payload.plannedCheckOutDate = checkOutDate;
    if (form.stayPurpose) payload.stayPurpose = form.stayPurpose as CreatePublicBookingPayload['stayPurpose'];
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.occupantCount > 1) payload.occupantCount = form.occupantCount;
    if (form.hasPet) payload.hasPet = true;
    if (form.paymentChoice) payload.paymentChoice = form.paymentChoice;

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
    return <Alert variant="warning">Kamar ini sedang tidak tersedia untuk dipesan. <a href="/katalog">Kembali ke katalog</a> atau hubungi admin via WhatsApp.</Alert>;
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
  const roomAvailability = getPublicRoomAvailabilityDisplay(room);
  if (!roomAvailability.canBook) {
    const availability = roomAvailability;
    const isChecking = String(room.status ?? '').toUpperCase() === 'MAINTENANCE';
    const roomCode = room.code || `Kamar #${room.id}`;
    const waUrl = buildWaAvailabilityUrl(roomCode, isChecking);

    return (
      <div className="public-page-shell">
        <div className="container py-5" style={{ maxWidth: 640 }}>
          <div className="content-card border-0 card">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="fs-1 mb-2">🚪</div>
                <h5 className="mb-1">{isChecking ? 'Kamar sedang dicek' : 'Kamar ini sedang terisi'}</h5>
                <div className="mb-2">
                  <span className={`room-market-status-badge ${availability.tone}`}>{availability.label}</span>
                </div>
                <p className="text-muted small mb-0">{availability.detailCopy}</p>
              </div>

              <Alert variant="info" className="small">
                {isChecking
                  ? 'Kamar sudah kosong, tetapi perlu dicek dulu sebelum ditawarkan kembali. Admin bisa bantu beri estimasi siap ditempati.'
                  : 'Anda masih bisa tanya estimasi kapan kamar ini kosong via WhatsApp. Admin akan bantu cek pilihan yang paling cocok.'}
              </Alert>

              <div className="d-grid gap-2">
                <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  💬 Tanya Ketersediaan via WhatsApp
                </a>
                <a href="/rooms" className="btn btn-outline-secondary">Lihat Kamar Lain</a>
              </div>
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

        <Row className="g-4">
          <Col lg={5}>
            <GuestBookingRoomSummary
              room={room}
              form={form}
              selectedRate={selectedRate != null ? String(selectedRate) : null}
              initialTotal={initialTotal}
              petDepositRupiah={petDepositRupiah}
            />
          </Col>
          <Col lg={7}>
            <GuestBookingForm
              room={room}
              form={form}
              errors={errors}
              selectedRate={selectedRate != null ? String(selectedRate) : null}
              initialTotal={initialTotal}
              isSubmitting={mutation.isPending}
              petDepositRupiah={petDepositRupiah}
              onChange={update}
              onSubmit={handleSubmit}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}
