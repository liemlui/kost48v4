import { useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { listMyTenantBookings } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import type { TenantBooking } from '../../types';

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

function daysLeft(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const remaining = daysLeft(expiresAt);
  if (remaining === null) return <StatusBadge status="SECONDARY" customLabel="Tanpa Batas Waktu" />;
  if (remaining < 0) return <StatusBadge status="DANGER" customLabel="Masa Berlaku Lewat" />;
  if (remaining === 0) return <StatusBadge status="DANGER" customLabel="Berakhir Hari Ini" />;
  if (remaining <= 3) return <StatusBadge status="WARNING" customLabel={`Berakhir ${remaining} hari lagi`} />;
  return <StatusBadge status="INFO" customLabel={`Berlaku ${remaining} hari lagi`} />;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;

  const query = useQuery({
    queryKey: ['tenant-bookings'],
    queryFn: () => listMyTenantBookings({ limit: 100 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const errorMessage = useMemo(() => {
    if (!query.error) return null;

    if (axios.isAxiosError(query.error)) {
      const message = query.error.response?.data?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string' && message.trim()) return message;
    }

    return 'Gagal memuat daftar booking Anda. Silakan coba lagi.';
  }, [query.error]);

  return (
    <div>
      <PageHeader
        title="Pemesanan Saya"
        description="Pantau booking kamar Anda secara jujur selama masih berada di fase reserved dan belum masuk approval admin."
        secondaryAction={<Button onClick={() => navigate('/rooms')}>Cari Kamar Lagi</Button>}
      />

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      <Alert variant="info" className="small">
        Halaman ini hanya menampilkan status booking dasar pada <strong>Fase 4.0</strong>. Approval admin, invoice awal booking, dan pembayaran mandiri belum dibuka di surface ini.
      </Alert>
      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">{errorMessage}</Alert> : null}
      {!query.isLoading && !query.isError && !items.length ? (
        <EmptyState
          icon="📅"
          title="Belum ada booking aktif"
          description="Setelah Anda memesan kamar dari katalog publik, booking yang masih reserved akan muncul di halaman ini."
          action={{ label: 'Lihat Katalog Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      <div className="d-grid gap-3">
        {items.map((booking: TenantBooking) => (
          <Card className="content-card border-0" key={booking.id}>
            <Card.Body>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="fw-semibold fs-5">{booking.room?.code ?? `Kamar #${booking.roomId}`}</div>
                  <div className="text-muted small">{booking.room?.name || 'Nama kamar belum tersedia'}{booking.room?.floor ? ` · Lantai ${booking.room.floor}` : ''}</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <StatusBadge status={booking.status} customLabel="Booking Aktif" />
                  <StatusBadge status={booking.room?.status ?? 'RESERVED'} />
                  <StatusBadge status="WARNING" customLabel="Menunggu Fase 4.1" />
                  <ExpiryBadge expiresAt={booking.expiresAt} />
                </div>
              </div>

              <div className="booking-summary-grid">
                <div>
                  <div className="card-title-soft mb-1">Check-in</div>
                  <div className="fw-semibold">{formatDate(booking.checkInDate)}</div>
                </div>
                <div>
                  <div className="card-title-soft mb-1">Pricing Term</div>
                  <div className="fw-semibold">{getStatusLabel(booking.pricingTerm)}</div>
                </div>
                <div>
                  <div className="card-title-soft mb-1">Tarif Disepakati</div>
                  <div className="fw-semibold"><CurrencyDisplay amount={booking.agreedRentAmountRupiah} /></div>
                </div>
                <div>
                  <div className="card-title-soft mb-1">Masa Berlaku Booking</div>
                  <div className="fw-semibold">{formatDate(booking.expiresAt)}</div>
                </div>
              </div>

              <Alert variant="secondary" className="mt-3 mb-0 small">
                <strong>Booking Anda masih berada pada fase reserved.</strong> Saat ini belum ada approval admin maupun tagihan booking awal yang aktif di portal tenant.
              </Alert>

              <div className="mt-3 small text-muted">
                {booking.plannedCheckOutDate ? `Rencana checkout ${formatDate(booking.plannedCheckOutDate)}.` : 'Belum ada rencana checkout.'}
                {booking.stayPurpose ? ` Tujuan tinggal: ${getStatusLabel(booking.stayPurpose)}.` : ''}
                {booking.notes ? ` Catatan: ${booking.notes}` : ''}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
