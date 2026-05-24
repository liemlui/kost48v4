import { Badge, Button, Card } from 'react-bootstrap';
import type { PaymentSubmission, PaymentTargetType, TenantBooking } from '../../types';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import { formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';
import { formatDateTimeWib, getCreatedToDeadlineLabel } from '../../utils/dateTime';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getBookingInvoiceRemaining } from '../../utils/invoiceTotals';
import {
  ExpiryBadge,
  getPortalBookingStatus,
  getPaymentTargetLabel,
  canCancelBooking,
  buildWhatsAppFollowUpUrl,
} from './BookingStatusHelper';

interface BookingCardProps {
  booking: TenantBooking;
  submissions: PaymentSubmission[];
  pendingInvoiceSubmission: PaymentSubmission | null;
  pendingDepositSubmission: PaymentSubmission | null;
  onUploadClick: (booking: TenantBooking, targetType: PaymentTargetType) => void;
  onViewCatalog: () => void;
  onCancelClick: (booking: TenantBooking) => void;
}

export default function BookingCard({
  booking,
  submissions,
  pendingInvoiceSubmission,
  pendingDepositSubmission,
  onUploadClick,
  onViewCatalog,
  onCancelClick,
}: BookingCardProps) {
  const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
  const hasPendingSubmission = Boolean(pendingInvoiceSubmission || pendingDepositSubmission);
  const portalStatus = getPortalBookingStatus(booking, hasPendingSubmission);

  const hasInitialInvoice = Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);
  const invoiceTotalAmount =
    Number(booking.invoiceTotalAmountRupiah ?? booking.agreedRentAmountRupiah ?? 0) ||
    Number(booking.agreedRentAmountRupiah ?? 0);
  const invoiceRemainingAmount = getBookingInvoiceRemaining(booking);
  const depositAmount = Number(booking.depositAmountRupiah ?? 0);
  const depositPaidAmount = Number(booking.depositPaidAmountRupiah ?? 0);
  const depositRemainingAmount = Math.max(depositAmount - depositPaidAmount, 0);
  const totalInitialAmount = Number(booking.agreedRentAmountRupiah ?? 0) + depositAmount;
  const totalRemainingAmount = invoiceRemainingAmount + depositRemainingAmount;
  const cancelable = canCancelBooking(booking);
  const canPay =
    hasInitialInvoice &&
    !hasPendingSubmission &&
    !expiryMeta.isExpired &&
    totalRemainingAmount > 0;

  const createdToDeadlineLabel = getCreatedToDeadlineLabel(booking.createdAt, booking.expiresAt);
  const deadlineDetail = booking.expiresAt
    ? `${expiryMeta.relativeLabel} · berakhir ${expiryMeta.absoluteLabel}`
    : 'Batas waktu detail belum tersedia';

  const nextStep = (() => {
    if (hasPendingSubmission) {
      return 'Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.';
    }
    if (hasInitialInvoice) {
      return booking.expiresAt
        ? `Tagihan awal sudah tersedia. Bayar & kirim bukti sebelum ${expiryMeta.absoluteLabel}.`
        : 'Tagihan awal sudah tersedia. Bayar & kirim bukti dalam satu langkah.';
    }
    if (expiryMeta.isExpired) {
      return 'Pemesanan melewati batas waktu. Sistem akan mereset pemesanan ini; kamu perlu ajukan pemesanan ulang jika masih ingin kamar ini.';
    }
    return 'Admin sedang mengecek kesiapan kamar dan membuka tagihan awal.';
  })();

  const processSteps = [
    { label: '1. Pemesanan', state: 'done', helper: booking.createdAt ? `Diajukan ${formatDateTimeWib(booking.createdAt)}` : 'Pemesanan sudah diajukan' },
    {
      label: hasInitialInvoice ? '2. Tagihan awal dibuka' : '2. Review admin',
      state: expiryMeta.isExpired ? 'blocked' : hasInitialInvoice ? 'done' : 'active',
      helper: hasInitialInvoice
        ? 'Admin sudah membuka tagihan awal.'
        : booking.expiresAt
          ? `Admin harus review sebelum ${expiryMeta.absoluteLabel}.`
          : 'Menunggu keputusan admin.',
    },
    {
      label: hasPendingSubmission ? '3. Bukti diperiksa' : '3. Bayar & kirim bukti',
      state: hasPendingSubmission ? 'active' : hasInitialInvoice && !expiryMeta.isExpired ? 'active' : expiryMeta.isExpired ? 'blocked' : 'pending',
      helper: hasPendingSubmission
        ? 'Tidak perlu upload ulang.'
        : hasInitialInvoice && booking.expiresAt
          ? `Batas bayar ${expiryMeta.absoluteLabel}.`
          : 'Dilakukan setelah tagihan awal tersedia.',
    },
  ];

  return (
    <Card className="content-card border-0 tenant-booking-detail-card">
      <Card.Body>
        <div className="tenant-booking-detail-header">
          <div>
            <div className="page-eyebrow mb-2">Detail Pemesanan</div>
            <h2 className="h4 mb-1">
              {booking.room?.code ?? `Kamar #${booking.roomId}`}
            </h2>
            <div className="text-muted small">
              {booking.room?.name || 'Nama kamar belum tersedia'}
            </div>
          </div>
          <div className="tenant-booking-status-pills">
            <StatusBadge
              status={portalStatus.badgeStatus}
              customLabel={portalStatus.label}
            />
            <ExpiryBadge expiresAt={booking.expiresAt} />
            {!hasInitialInvoice ? (
              <Badge bg="light" text="dark" className="border status-badge">
                Tagihan belum dibuka
              </Badge>
            ) : null}
            {!hasPendingSubmission ? (
              <Badge bg="light" text="dark" className="border status-badge">
                Kamar belum terkunci
              </Badge>
            ) : null}
            <div className={expiryMeta.isExpired ? 'tenant-booking-deadline-line danger' : 'tenant-booking-deadline-line'}>
              {deadlineDetail}
            </div>
          </div>
        </div>

        <div className="tenant-booking-main-grid mt-3">
          <div className="tenant-booking-facts">
            <div>
              <span>Mulai tinggal</span>
              <strong>
                {formatDateId(booking.checkInDate, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </div>
            <div>
              <span>Masa sewa</span>
              <strong>{getStatusLabel(booking.pricingTerm)}</strong>
            </div>
            <div>
              <span>Sewa pertama</span>
              <strong>
                <CurrencyDisplay amount={booking.agreedRentAmountRupiah} />
              </strong>
            </div>
            <div>
              <span>Deposit awal</span>
              <strong>
                <CurrencyDisplay amount={depositAmount} showZero={false} />
              </strong>
            </div>
            <div>
              <span>Total awal</span>
              <strong>
                <CurrencyDisplay amount={totalInitialAmount} showZero={false} />
              </strong>
            </div>
          </div>

          <div className="tenant-booking-next-box">
            <div className="small text-muted mb-1">Langkah berikutnya</div>
            <div className="fw-semibold">{nextStep}</div>
            <div className={expiryMeta.isExpired ? 'tenant-booking-policy-chip danger mt-3' : 'tenant-booking-policy-chip mt-3'}>
              {expiryMeta.isExpired
                ? 'Batas waktu terlewat. Tenant perlu request ulang jika pemesanan sudah direset.'
                : 'Kamar baru aman setelah pembayaran valid disetujui admin.'}
            </div>
            {createdToDeadlineLabel ? (
              <div className="small text-muted mt-2">Durasi batas sistem: {createdToDeadlineLabel} dari waktu pengajuan.</div>
            ) : null}
          </div>
        </div>

        <div className="tenant-booking-process-line mt-3">
          {processSteps.map((step) => (
            <div key={step.label} className={`tenant-booking-process-step ${step.state}`}>
              <div className="tenant-booking-step-label">{step.label}</div>
              <div className="tenant-booking-step-helper">{step.helper}</div>
            </div>
          ))}
        </div>

        {hasInitialInvoice ? (
          <div className="tenant-booking-invoice-strip mt-3">
            <div>
              <div className="small text-muted">Tagihan awal</div>
              <div className="fw-semibold">
                {booking.latestInvoiceNumber ?? `INV-${booking.latestInvoiceId ?? '-'}`}
              </div>
              <div className="small text-muted">
                Sewa <CurrencyDisplay amount={invoiceTotalAmount} /> + deposit{' '}
                <CurrencyDisplay amount={depositAmount} showZero={false} />
              </div>
            </div>
            <div className="text-md-end">
              <StatusBadge status={booking.latestInvoiceStatus ?? 'ISSUED'} tone="tenant" domain="invoice" />
              <div className="small text-muted mt-2">Sisa bayar</div>
              <div className="fw-semibold fs-5">
                <CurrencyDisplay amount={totalRemainingAmount} />
              </div>
            </div>
          </div>
        ) : null}

        {hasPendingSubmission ? (
          <div className="tenant-booking-soft-note mt-3">
            Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.
          </div>
        ) : null}

        {portalStatus.helper ? (
          <div className="tenant-booking-helper-line mt-3">
            {portalStatus.helper}
          </div>
        ) : null}

        <div className="d-flex flex-wrap gap-2 mt-3">
          {canPay ? (
            <Button onClick={() => onUploadClick(booking, 'INVOICE')}>
              Bayar & Kirim Bukti
            </Button>
          ) : null}

          {cancelable ? (
            <Button
              variant="outline-danger"
              onClick={() => onCancelClick(booking)}
            >
              Batalkan pemesanan
            </Button>
          ) : (
            <Button variant="outline-secondary" onClick={onViewCatalog}>
              Pilih kamar lain
            </Button>
          )}

          <Button
            as="a"
            href={buildWhatsAppFollowUpUrl(booking)}
            target="_blank"
            rel="noreferrer"
            variant="outline-success"
          >
            Hubungi Admin
          </Button>
        </div>

        {submissions.length ? (
          <details className="tenant-booking-proof-history mt-3">
            <summary>Riwayat bukti bayar ({submissions.length})</summary>
            <div className="d-grid gap-2 mt-3">
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
          </details>
        ) : null}
      </Card.Body>
    </Card>
  );
}
