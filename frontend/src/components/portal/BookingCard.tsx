import { Alert, Button, Card } from 'react-bootstrap';
import type { PaymentSubmission, PaymentTargetType, TenantBooking } from '../../types';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import { formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { ExpiryBadge, getPortalBookingStatus, getPaymentTargetLabel } from './BookingStatusHelper';

interface BookingCardProps {
  booking: TenantBooking;
  submissions: PaymentSubmission[];
  pendingInvoiceSubmission: PaymentSubmission | null;
  pendingDepositSubmission: PaymentSubmission | null;
  onUploadClick: (booking: TenantBooking, targetType: PaymentTargetType) => void;
  onViewCatalog: () => void;
}

export default function BookingCard({
  booking,
  submissions,
  pendingInvoiceSubmission,
  pendingDepositSubmission,
  onUploadClick,
  onViewCatalog,
}: BookingCardProps) {
  const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
  const portalStatus = getPortalBookingStatus(booking);

  const invoicePaidAmount = Number(booking.invoicePaidAmountRupiah ?? 0);
  const invoiceTotalAmount = Number(
    booking.invoiceTotalAmountRupiah ?? booking.agreedRentAmountRupiah ?? 0,
  );
  const invoiceRemainingAmount = Math.max(
    Number(
      booking.invoiceRemainingAmountRupiah ?? invoiceTotalAmount - invoicePaidAmount,
    ),
    0,
  );

  const depositAmount = Number(booking.depositAmountRupiah ?? 0);
  const depositPaidAmount = Number(booking.depositPaidAmountRupiah ?? 0);
  const depositRemainingAmount = Math.max(depositAmount - depositPaidAmount, 0);

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
          <div>
            <div className="fw-semibold fs-5">
              {booking.room?.code ?? `Kamar #${booking.roomId}`}
            </div>
            <div className="text-muted small">
              {booking.room?.name || 'Nama kamar belum tersedia'}
              {booking.room?.floor ? ` · Lantai ${booking.room.floor}` : ''}
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <StatusBadge
              status={portalStatus.badgeStatus}
              customLabel={portalStatus.label}
            />
            <ExpiryBadge expiresAt={booking.expiresAt} />
          </div>
        </div>

        <div className="booking-summary-grid">
          <div>
            <div className="card-title-soft mb-1">Check-in</div>
            <div className="fw-semibold">
              {formatDateId(booking.checkInDate, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="card-title-soft mb-1">Pricing Term</div>
            <div className="fw-semibold">{getStatusLabel(booking.pricingTerm)}</div>
          </div>
          <div>
            <div className="card-title-soft mb-1">Tarif Disepakati</div>
            <div className="fw-semibold">
              <CurrencyDisplay amount={booking.agreedRentAmountRupiah} />
            </div>
            <div className="small text-muted">
              Deposit{' '}
              <CurrencyDisplay amount={booking.depositAmountRupiah} showZero={false} />
            </div>
            <div className="small text-muted">
              Total awal{' '}
              <CurrencyDisplay
                amount={
                  Number(booking.agreedRentAmountRupiah ?? 0) +
                  Number(booking.depositAmountRupiah ?? 0)
                }
                showZero={false}
              />
            </div>
          </div>
          <div>
            <div className="card-title-soft mb-1">Masa Berlaku Booking</div>
            <div className="fw-semibold">
              {formatDateId(booking.expiresAt, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <Alert
          variant={expiryMeta.isExpired ? 'warning' : 'secondary'}
          className="mt-3 mb-0 small"
        >
          <strong>{portalStatus.label}.</strong> {portalStatus.helper}{' '}
          {expiryMeta.helperText}
        </Alert>

        <div className="mt-3 small text-muted">
          {booking.latestInvoiceNumber
            ? `Invoice booking awal: ${booking.latestInvoiceNumber}. `
            : ''}
          {booking.plannedCheckOutDate
            ? `Rencana checkout ${formatDateId(booking.plannedCheckOutDate, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}.`
            : 'Belum ada rencana checkout.'}
          {booking.stayPurpose
            ? ` Tujuan tinggal: ${getStatusLabel(booking.stayPurpose)}.`
            : ''}
          {booking.notes ? ` Catatan: ${booking.notes}` : ''}
        </div>

        {Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId) ? (
          <div className="mt-1">
            <Card className="border h-100">
              <Card.Body>
                <div className="d-flex justify-content-between gap-3 flex-wrap mb-2">
                  <div>
                    <div className="fw-semibold">Pembayaran Awal</div>
                    <div className="small text-muted">
                      {booking.latestInvoiceNumber ??
                        `INV-${booking.latestInvoiceId ?? '-'}`}
                      {' · '}Sewa pertama + deposit digabung menjadi satu pembayaran
                    </div>
                  </div>
                  <StatusBadge status={booking.latestInvoiceStatus ?? 'ISSUED'} />
                </div>
                <div className="small text-muted mb-1">Rincian</div>
                <div className="d-flex gap-3 flex-wrap mb-2 small">
                  <span>
                    Sewa:{' '}
                    <strong>
                      <CurrencyDisplay amount={invoiceTotalAmount} />
                    </strong>
                  </span>
                  <span>
                    Deposit:{' '}
                    <strong>
                      <CurrencyDisplay amount={depositAmount} />
                    </strong>
                  </span>
                </div>
                <div className="small text-muted mb-1">Total yang harus dibayar</div>
                <div className="fw-semibold mb-3 fs-5">
                  <CurrencyDisplay
                    amount={invoiceRemainingAmount + depositRemainingAmount}
                  />
                </div>
                {Boolean(pendingInvoiceSubmission || pendingDepositSubmission) ? (
                  <Alert variant="warning" className="mb-0 small">
                    {pendingInvoiceSubmission
                      ? 'Bukti pembayaran sewa sedang menunggu review.'
                      : null}
                    {pendingDepositSubmission
                      ? ' Bukti pembayaran deposit sedang menunggu review.'
                      : null}{' '}
                    Tunggu hasil review admin sebelum mengirim ulang.
                  </Alert>
                ) : (
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      onClick={() => onUploadClick(booking, 'INVOICE')}
                      disabled={
                        expiryMeta.isExpired ||
                        (invoiceRemainingAmount <= 0 && depositRemainingAmount <= 0)
                      }
                    >
                      {invoiceRemainingAmount <= 0 && depositRemainingAmount <= 0
                        ? 'Lunas'
                        : 'Upload Bukti Pembayaran'}
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        ) : null}

        <div className="d-flex flex-wrap gap-2 mt-3">
          <Button variant="outline-secondary" onClick={onViewCatalog}>
            Lihat Katalog
          </Button>
        </div>

        {submissions.length ? (
          <div className="mt-4">
            <div className="card-title-soft mb-2">Riwayat bukti bayar</div>
            <div className="d-grid gap-2">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-3 p-3">
                  <div className="d-flex justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="fw-semibold">
                        {getPaymentTargetLabel(submission.targetType)} ·{' '}
                        <CurrencyDisplay amount={submission.amountRupiah} />
                      </div>
                      <div className="small text-muted">
                        {formatDateId(submission.paidAt)} · {submission.paymentMethod}
                      </div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap align-items-start">
                      <StatusBadge status={submission.status} />
                      {submission.fileUrl ? (
                        <Button
                          as="a"
                          href={resolveAbsoluteFileUrl(submission.fileUrl) ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          size="sm"
                          variant="outline-secondary"
                        >
                          Buka Bukti
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {submission.reviewNotes ? (
                    <div className="small text-muted mt-2">
                      Catatan review: {submission.reviewNotes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}