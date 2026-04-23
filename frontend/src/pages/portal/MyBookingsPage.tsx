import { useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { listMyTenantBookings } from '../../api/bookings';
import { createPaymentSubmission, listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import SubmitPaymentModal from '../../components/portal/SubmitPaymentModal';
import type { CreatePaymentSubmissionPayload, PaymentSubmission, TenantBooking } from '../../types';
import { formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const expiryMeta = getBookingExpiryMeta(expiresAt);
  return <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />;
}

function getPortalBookingStatus(booking: TenantBooking) {
  const hasInitialInvoice = Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  if (hasInitialInvoice) {
    return {
      badgeStatus: 'INFO',
      label: 'Menunggu Pembayaran',
      helper:
        booking.latestInvoiceNumber
          ? `Admin sudah menyetujui booking ini. Invoice awal ${booking.latestInvoiceNumber} sudah terbentuk dan menunggu pembayaran.`
          : 'Admin sudah menyetujui booking ini. Invoice awal booking sudah terbentuk dan menunggu pembayaran.',
    };
  }

  return {
    badgeStatus: 'WARNING',
    label: 'Menunggu Approval',
    helper: 'Booking Anda masih menunggu persetujuan admin sebelum invoice awal dibuat.',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<TenantBooking | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;

  const bookingsQuery = useQuery({
    queryKey: ['tenant-bookings'],
    queryFn: () => listMyTenantBookings({ limit: 100 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const submissionsQuery = useQuery({
    queryKey: ['payment-submissions', 'mine'],
    queryFn: () => listMyPaymentSubmissions({ limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createSubmissionMutation = useMutation({
    mutationFn: async (payload: CreatePaymentSubmissionPayload) => createPaymentSubmission(payload),
    onSuccess: async () => {
      setSubmissionError(null);
      setSelectedBooking(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
      ]);
    },
    onError: (error) => {
      setSubmissionError(getErrorMessage(error, 'Gagal mengirim bukti pembayaran. Silakan coba lagi.'));
    },
  });

  const items = useMemo(() => bookingsQuery.data?.items ?? [], [bookingsQuery.data]);
  const submissions = useMemo(() => submissionsQuery.data?.items ?? [], [submissionsQuery.data]);
  const submissionByBooking = useMemo(() => {
    const map = new Map<number, PaymentSubmission[]>();
    submissions.forEach((submission) => {
      const current = map.get(submission.stayId) ?? [];
      current.push(submission);
      map.set(submission.stayId, current);
    });
    return map;
  }, [submissions]);

  const bookingErrorMessage = useMemo(() => getErrorMessage(bookingsQuery.error, 'Gagal memuat daftar booking Anda. Silakan coba lagi.'), [bookingsQuery.error]);
  const submissionListError = useMemo(() => submissionsQuery.isError ? getErrorMessage(submissionsQuery.error, 'Gagal memuat riwayat bukti pembayaran.') : null, [submissionsQuery.error, submissionsQuery.isError]);

  return (
    <div>
      <PageHeader
        title="Pemesanan Saya"
        description="Pantau status booking Anda secara jujur, mulai dari menunggu approval admin sampai menunggu pembayaran booking awal."
        secondaryAction={<Button onClick={() => navigate('/rooms')}>Cari Kamar Lagi</Button>}
      />

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      <Alert variant="info" className="small">
        Status di halaman ini mengikuti kondisi nyata booking reserved Anda. Booking yang belum punya invoice awal berarti <strong>Menunggu Approval</strong>, sedangkan booking yang sudah punya invoice awal berarti <strong>Menunggu Pembayaran</strong>.
      </Alert>
      {submissionListError ? <Alert variant="warning">{submissionListError}</Alert> : null}
      {bookingsQuery.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {bookingsQuery.isError ? <Alert variant="danger">{bookingErrorMessage}</Alert> : null}
      {!bookingsQuery.isLoading && !bookingsQuery.isError && !items.length ? (
        <EmptyState
          icon="📅"
          title="Belum ada booking aktif"
          description="Setelah Anda memesan kamar dari katalog publik, booking reserved akan muncul di halaman ini."
          action={{ label: 'Lihat Katalog Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      <div className="d-grid gap-3">
        {items.map((booking: TenantBooking) => {
          const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
          const portalStatus = getPortalBookingStatus(booking);
          const relatedSubmissions = [...(submissionByBooking.get(booking.id) ?? [])].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
          const pendingSubmission = relatedSubmissions.find((item) => item.status === 'PENDING_REVIEW') ?? null;
          return (
            <Card className="content-card border-0" key={booking.id}>
              <Card.Body>
                <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="fw-semibold fs-5">{booking.room?.code ?? `Kamar #${booking.roomId}`}</div>
                    <div className="text-muted small">{booking.room?.name || 'Nama kamar belum tersedia'}{booking.room?.floor ? ` · Lantai ${booking.room.floor}` : ''}</div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <StatusBadge status={portalStatus.badgeStatus} customLabel={portalStatus.label} />
                    <StatusBadge status={booking.room?.status ?? 'RESERVED'} />
                    <ExpiryBadge expiresAt={booking.expiresAt} />
                  </div>
                </div>

                <div className="booking-summary-grid">
                  <div>
                    <div className="card-title-soft mb-1">Check-in</div>
                    <div className="fw-semibold">{formatDateId(booking.checkInDate, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
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
                    <div className="fw-semibold">{formatDateId(booking.expiresAt, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                <Alert variant={expiryMeta.isExpired ? 'warning' : 'secondary'} className="mt-3 mb-0 small">
                  <strong>{portalStatus.label}.</strong> {portalStatus.helper} {expiryMeta.helperText}
                </Alert>

                <div className="mt-3 small text-muted">
                  {booking.latestInvoiceNumber
                    ? `Invoice booking awal: ${booking.latestInvoiceNumber}${booking.latestInvoiceStatus ? ` (${getStatusLabel(booking.latestInvoiceStatus)})` : ''}. `
                    : ''}
                  {booking.plannedCheckOutDate ? `Rencana checkout ${formatDateId(booking.plannedCheckOutDate, { day: '2-digit', month: 'long', year: 'numeric' })}.` : 'Belum ada rencana checkout.'}
                  {booking.stayPurpose ? ` Tujuan tinggal: ${getStatusLabel(booking.stayPurpose)}.` : ''}
                  {booking.notes ? ` Catatan: ${booking.notes}` : ''}
                </div>

                {portalStatus.label === 'Menunggu Pembayaran' ? (
                  <div className="mt-3 d-flex gap-2 flex-wrap align-items-center">
                    <Button
                      onClick={() => {
                        setSubmissionError(null);
                        setSelectedBooking(booking);
                      }}
                      disabled={expiryMeta.isExpired || createSubmissionMutation.isPending}
                    >
                      Upload Bukti Bayar
                    </Button>
                    {pendingSubmission ? <StatusBadge status={pendingSubmission.status} /> : null}
                    {pendingSubmission ? <span className="small text-muted">Sudah ada submission yang sedang menunggu review admin.</span> : null}
                  </div>
                ) : null}

                {relatedSubmissions.length ? (
                  <div className="mt-4">
                    <div className="card-title-soft mb-2">Riwayat Bukti Bayar</div>
                    <div className="d-grid gap-2">
                      {relatedSubmissions.map((submission) => (
                        <div key={submission.id} className="border rounded p-3 bg-light-subtle">
                          <div className="d-flex justify-content-between gap-2 flex-wrap mb-2">
                            <div className="fw-semibold"><CurrencyDisplay amount={submission.amountRupiah} /></div>
                            <div className="d-flex gap-2 flex-wrap">
                              <StatusBadge status={submission.status} />
                              {submission.invoice?.status ? <StatusBadge status={submission.invoice.status} /> : null}
                            </div>
                          </div>
                          <div className="small text-muted">
                            Dibayar pada {formatDateId(submission.paidAt, { day: '2-digit', month: 'long', year: 'numeric' })}
                            {submission.referenceNumber ? ` · Ref ${submission.referenceNumber}` : ''}
                            {submission.fileUrl ? ' · Bukti tersedia via link' : ''}
                          </div>
                          {submission.reviewNotes ? <div className="small text-soft-danger mt-2">Alasan review: {submission.reviewNotes}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      <SubmitPaymentModal
        show={Boolean(selectedBooking)}
        booking={selectedBooking}
        existingPending={selectedBooking ? (submissionByBooking.get(selectedBooking.id) ?? []).find((item) => item.status === 'PENDING_REVIEW') ?? null : null}
        submitting={createSubmissionMutation.isPending}
        errorMessage={submissionError}
        onHide={() => setSelectedBooking(null)}
        onSubmit={(payload) => createSubmissionMutation.mutate(payload)}
      />
    </div>
  );
}
