import { Alert, Badge, Button, Card } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import type { PaymentSubmission, TenantBooking } from '../../types';
import { formatDateId } from '../../utils/bookingExpiry';
import {
  getTenantBookingGuideCopy,
  getTenantBookingGuideState,
} from '../../utils/tenantBookingRules';
import { canCancelBooking } from '../portal/BookingStatusHelper';
import { getBookingInvoiceRemaining } from '../../utils/invoiceTotals';

export default function TenantBookingWaitingRoom({
  booking,
  submissions = [],
  compact = false,
  onViewBooking,
  onPayInvoice,
  onCancelBooking,
  onPickRoom,
}: {
  booking?: TenantBooking | null;
  submissions?: PaymentSubmission[];
  compact?: boolean;
  onViewBooking?: () => void;
  onPayInvoice?: () => void;
  onCancelBooking?: () => void;
  onPickRoom?: () => void;
}) {
  const state = getTenantBookingGuideState(booking, submissions);
  const copy = getTenantBookingGuideCopy(state);
  const hasInvoice = Boolean(booking?.latestInvoiceId);
  const canCancel = Boolean(booking && canCancelBooking(booking) && onCancelBooking);
  const invoiceRemaining = getBookingInvoiceRemaining(booking);
  const depositRemaining = Math.max(
    Number(booking?.depositAmountRupiah ?? 0) - Number(booking?.depositPaidAmountRupiah ?? 0),
    0,
  );
  const totalEstimate = booking?.latestInvoiceId
    ? invoiceRemaining + depositRemaining
    : Number(booking?.agreedRentAmountRupiah ?? 0) + Number(booking?.depositAmountRupiah ?? 0);

  const primaryAction = (() => {
    if (state === 'PAY_INITIAL_INVOICE' && hasInvoice && onPayInvoice) {
      return { label: 'Bayar & kirim bukti sekarang', onClick: onPayInvoice, variant: 'danger' as const };
    }
    if (state === 'PAYMENT_UNDER_REVIEW' && onPayInvoice) {
      return { label: 'Lihat status pembayaran', onClick: onPayInvoice, variant: 'primary' as const };
    }
    if (state === 'READY_TO_STAY' && onViewBooking) {
      return { label: 'Buka My Stay Guide', onClick: onViewBooking, variant: 'primary' as const };
    }
    if (booking && onViewBooking) {
      return { label: 'Lihat status pemesanan', onClick: onViewBooking, variant: 'outline-primary' as const };
    }
    if (!booking && onPickRoom) {
      return { label: 'Pilih kamar', onClick: onPickRoom, variant: 'primary' as const };
    }
    return null;
  })();

  return (
    <Card className={`content-card border-0 tenant-waiting-room-card ${compact ? 'compact' : ''}`}>
      <Card.Body>
        <div className="tenant-waiting-room-grid">
          <div>
            <div className="tenant-guide-icon" aria-hidden="true">{copy.icon}</div>
            <div className="page-eyebrow mb-2">Status Pemesanan</div>
            <h1 className={compact ? 'h4 mb-2' : 'mb-3'}>{copy.title}</h1>
            <p className="text-muted mb-3">{copy.description}</p>

            {state === 'WAITING_ADMIN' || state === 'PAY_INITIAL_INVOICE' ? (
              <Alert variant="danger" className="urgent-policy-alert mb-3">
                <div className="urgent-policy-title">Prioritas kamar mengikuti pembayaran valid pertama</div>
                <div>Booking saja belum mengunci kamar. Jika tagihan sudah dibuka, bayar dan kirim bukti sebelum jam deadline yang tampil agar kamar tidak dilepas untuk calon tenant lain.</div>
              </Alert>
            ) : null}

            {state === 'PAYMENT_UNDER_REVIEW' ? (
              <Alert variant="info" className="mb-3">
                Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.
              </Alert>
            ) : null}

            {booking ? (
              <div className="tenant-booking-steps" aria-label="Alur pemesanan">
                <div className="tenant-booking-step done">
                  <span>1</span>
                  <strong>Ajukan pemesanan</strong>
                  <em>Kamar dipilih</em>
                </div>
                <div className={`tenant-booking-step ${state !== 'WAITING_ADMIN' ? 'done' : 'active'}`}>
                  <span>2</span>
                  <strong>Admin review</strong>
                  <em>Cek kamar & tagihan awal</em>
                </div>
                <div className={`tenant-booking-step ${state === 'PAY_INITIAL_INVOICE' ? 'active' : state === 'PAYMENT_UNDER_REVIEW' || state === 'READY_TO_STAY' ? 'done' : ''}`}>
                  <span>3</span>
                  <strong>Bayar & kirim bukti</strong>
                  <em>Satu langkah, sesuai jam deadline</em>
                </div>
                <div className={`tenant-booking-step ${state === 'PAYMENT_UNDER_REVIEW' ? 'active' : state === 'READY_TO_STAY' ? 'done' : ''}`}>
                  <span>4</span>
                  <strong>Bukti diperiksa</strong>
                  <em>Tunggu keputusan admin</em>
                </div>
              </div>
            ) : (
              <Alert variant="warning" className="mb-0">
                Status pemesanan belum terbaca. Refresh halaman atau pilih kamar dari katalog jika kamu memang belum membuat pemesanan.
              </Alert>
            )}
          </div>

          <div className="tenant-waiting-summary-card">
            <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
              <div>
                <div className="small text-muted">Kamar dipilih</div>
                <div className="fw-semibold fs-5">{booking?.room?.code ?? (booking ? `Kamar #${booking.roomId}` : 'Belum ada')}</div>
                <div className="small text-muted">{booking?.room?.name ?? (booking ? 'Detail kamar akan muncul setelah admin melengkapi data.' : 'Kamu belum memiliki kamar yang dipilih.')}</div>
              </div>
              <Badge bg={copy.tone === 'warning' ? 'warning' : copy.tone === 'success' ? 'success' : copy.tone === 'secondary' ? 'secondary' : 'info'} className="status-badge">
                {copy.title}
              </Badge>
            </div>

            <div className="d-grid gap-2 small mb-3">
              <div className="d-flex justify-content-between gap-3">
                <span className="text-muted">Tanggal masuk</span>
                <strong>{booking?.checkInDate ? formatDateId(booking.checkInDate) : '-'}</strong>
              </div>
              <div className="d-flex justify-content-between gap-3">
                <span className="text-muted">Masa sewa</span>
                <strong>{booking?.pricingTerm ? <StatusBadge status={booking.pricingTerm} /> : '-'}</strong>
              </div>
              <div className="d-flex justify-content-between gap-3">
                <span className="text-muted">Tagihan awal</span>
                <strong>{booking?.latestInvoiceNumber ?? (booking ? 'Menunggu admin' : '-')}</strong>
              </div>
              <div className="d-flex justify-content-between gap-3">
                <span className="text-muted">Total bayar awal</span>
                <strong>
                  <CurrencyDisplay amount={totalEstimate || null} showZero={false} />
                </strong>
              </div>
            </div>

            <div className="d-grid gap-2">
              {primaryAction ? (
                <Button variant={primaryAction.variant} onClick={primaryAction.onClick}>{primaryAction.label}</Button>
              ) : null}
              {canCancel ? (
                <Button variant="outline-danger" onClick={onCancelBooking}>Batalkan pemesanan</Button>
              ) : null}
            </div>

            {canCancel ? (
              <div className="app-caption mt-3">
                Mau pilih kamar lain? Batalkan pemesanan ini dulu. Kamar tidak terkunci sampai pembayaran disetujui.
              </div>
            ) : null}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
