import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listMyTenantBookings } from '../../api/bookings';
import { createPaymentSubmission, listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import SubmitPaymentModal from '../../components/portal/SubmitPaymentModal';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type {
  CreatePaymentSubmissionPayload,
  PaymentSubmission,
  PaymentTargetType,
  TenantBooking,
} from '../../types';
import { formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';

const SESSION_KEY = 'kost48:portal-bookings:success-message';

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const expiryMeta = getBookingExpiryMeta(expiresAt);
  return <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />;
}

function getPortalBookingStatus(booking: TenantBooking) {
  const hasInitialInvoice =
    Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  if (hasInitialInvoice) {
    return {
      badgeStatus: 'INFO',
      label: 'Menunggu Pembayaran',
      helper: booking.latestInvoiceNumber
        ? `Admin sudah menyetujui booking ini. Invoice awal ${booking.latestInvoiceNumber} sudah terbentuk dan menunggu pembayaran.`
        : 'Admin sudah menyetujui booking ini. Invoice awal booking sudah terbentuk dan menunggu pembayaran.',
    };
  }

  return {
    badgeStatus: 'WARNING',
    label: 'Menunggu Approval',
    helper:
      'Booking Anda masih menunggu persetujuan admin sebelum invoice awal dibuat.',
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

function getPaymentTargetLabel(targetType?: PaymentTargetType | string | null) {
  return targetType === 'DEPOSIT' ? 'Deposit' : 'Sewa';
}

function getDepositStatusLabel(status?: string | null) {
  if (!status) return 'Belum Dibayar';
  if (status === 'PAID') return 'Lunas';
  if (status === 'PARTIAL') return 'Sebagian';
  return 'Belum Dibayar';
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { stage, isLoading: isStageLoading, refetch: refetchStage } = useTenantPortalStage();

  const userId = user?.id;
  const tenantId = user?.tenantId;

  const [selectedBooking, setSelectedBooking] = useState<TenantBooking | null>(null);
  const [paymentTargetType, setPaymentTargetType] = useState<PaymentTargetType>('INVOICE');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY),
  );

  const bookingsQuery = useQuery({
    queryKey: ['tenant-bookings', { userId, tenantId }],
    queryFn: () => listMyTenantBookings({ limit: 100 }),
    enabled: Boolean(userId),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const submissionsQuery = useQuery({
    queryKey: ['payment-submissions', 'mine', { userId, tenantId }],
    queryFn: () => listMyPaymentSubmissions({ limit: 200 }),
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createSubmissionMutation = useMutation({
    mutationFn: async (payload: CreatePaymentSubmissionPayload) =>
      createPaymentSubmission(payload),
    onSuccess: async (created) => {
      const createdTarget =
        (created as PaymentSubmission | undefined)?.targetType === 'DEPOSIT'
          ? 'deposit'
          : 'sewa';
      const message = `Bukti pembayaran ${createdTarget} berhasil dikirim dan sekarang menunggu review admin.`;
      setSubmissionError(null);
      setSelectedBooking(null);
      setSuccessMessage(message);
      sessionStorage.setItem(SESSION_KEY, message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoice-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] }),
        refetchStage(),
      ]);
    },
    onError: (error) => {
      setSubmissionError(
        getErrorMessage(error, 'Gagal mengirim bukti pembayaran. Silakan coba lagi.'),
      );
    },
  });

  const items = useMemo(() => bookingsQuery.data?.items ?? [], [bookingsQuery.data]);
  const visibleBookings = useMemo(
    () => items.filter((item) => (item.room?.status ?? '').toUpperCase() === 'RESERVED'),
    [items],
  );
  const submissions = useMemo(
    () => submissionsQuery.data?.items ?? [],
    [submissionsQuery.data],
  );
  const submissionByBooking = useMemo(() => {
    const map = new Map<number, PaymentSubmission[]>();
    submissions.forEach((submission) => {
      const current = map.get(submission.stayId) ?? [];
      current.push(submission);
      map.set(submission.stayId, current);
    });
    return map;
  }, [submissions]);

  useEffect(() => {
    if (stage === 'occupied' && !isStageLoading) {
      navigate('/portal/stay', { replace: true });
    }
  }, [stage, isStageLoading, navigate]);

  const bookingErrorMessage = useMemo(
    () =>
      getErrorMessage(bookingsQuery.error, 'Gagal memuat daftar booking Anda. Silakan coba lagi.'),
    [bookingsQuery.error],
  );
  const submissionListError = useMemo(
    () =>
      submissionsQuery.isError
        ? getErrorMessage(
            submissionsQuery.error,
            'Gagal memuat riwayat bukti pembayaran.',
          )
        : null,
    [submissionsQuery.error, submissionsQuery.isError],
  );

  return (
    <div>
      <PageHeader
        title="Pemesanan Saya"
        description="Pantau status booking reserved Anda secara jujur, mulai dari menunggu approval admin sampai pembayaran sewa dan deposit benar-benar lengkap."
        secondaryAction={
          <Button onClick={() => navigate('/rooms')}>Cari Kamar Lagi</Button>
        }
      />

      {successMessage ? (
        <Alert
          variant="success"
          dismissible
          onClose={() => {
            setSuccessMessage(null);
            sessionStorage.removeItem(SESSION_KEY);
          }}
        >
          {successMessage}
        </Alert>
      ) : null}

      <Alert variant="info" className="small">
        Pembayaran awal digabung menjadi satu: <strong>sewa pertama + deposit</strong>. Mohon
        unggah bukti pembayaran sesuai total yang tertera. Admin akan memverifikasi bukti Anda
        sebelum kamar diaktifkan.
      </Alert>

      {submissionListError ? (
        <Alert variant="warning">{submissionListError}</Alert>
      ) : null}
      {bookingsQuery.isLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" />
        </div>
      ) : null}
      {bookingsQuery.isError ? (
        <Alert variant="danger">{bookingErrorMessage}</Alert>
      ) : null}

      {!bookingsQuery.isLoading && !bookingsQuery.isError && !visibleBookings.length ? (
        <EmptyState
          icon="📅"
          title="Belum ada booking aktif"
          description="Setelah Anda memesan kamar dari katalog publik, booking reserved akan muncul di halaman ini. Jika booking Anda sudah aktif sebagai hunian, Anda akan diarahkan ke halaman Hunian Saya."
          action={{ label: 'Lihat Katalog Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      <div className="d-grid gap-3">
        {visibleBookings.map((booking: TenantBooking) => {
          const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
          const portalStatus = getPortalBookingStatus(booking);
          const relatedSubmissions = [
            ...(submissionByBooking.get(booking.id) ?? []),
          ].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
          );
          const pendingInvoiceSubmission =
            relatedSubmissions.find(
              (item) =>
                item.status === 'PENDING_REVIEW' &&
                (item.targetType ?? 'INVOICE') === 'INVOICE',
            ) ?? null;
          const pendingDepositSubmission =
            relatedSubmissions.find(
              (item) =>
                item.status === 'PENDING_REVIEW' && item.targetType === 'DEPOSIT',
            ) ?? null;

          const invoicePaidAmount = Number(booking.invoicePaidAmountRupiah ?? 0);
          const invoiceTotalAmount = Number(
            booking.invoiceTotalAmountRupiah ?? booking.agreedRentAmountRupiah ?? 0,
          );
          const invoiceRemainingAmount = Math.max(
            Number(
              booking.invoiceRemainingAmountRupiah ??
                invoiceTotalAmount - invoicePaidAmount,
            ),
            0,
          );

          const depositAmount = Number(booking.depositAmountRupiah ?? 0);
          const depositPaidAmount = Number(booking.depositPaidAmountRupiah ?? 0);
          const depositRemainingAmount = Math.max(depositAmount - depositPaidAmount, 0);

          return (
            <Card className="content-card border-0" key={booking.id}>
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
                    <div className="fw-semibold">
                      {getStatusLabel(booking.pricingTerm)}
                    </div>
                  </div>
                  <div>
                    <div className="card-title-soft mb-1">Tarif Disepakati</div>
                    <div className="fw-semibold">
                      <CurrencyDisplay amount={booking.agreedRentAmountRupiah} />
                    </div>
                    <div className="small text-muted">
                      Deposit{' '}
                      <CurrencyDisplay
                        amount={booking.depositAmountRupiah}
                        showZero={false}
                      />
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

                {Number(booking.invoiceCount ?? 0) > 0 ||
                Boolean(booking.latestInvoiceId) ? (
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
                          <StatusBadge
                            status={booking.latestInvoiceStatus ?? 'ISSUED'}
                          />
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
                        <div className="small text-muted mb-1">
                          Total yang harus dibayar
                        </div>
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
                              onClick={() => {
                                setSelectedBooking(booking);
                                setPaymentTargetType('INVOICE');
                                setSubmissionError(null);
                              }}
                              disabled={
                                expiryMeta.isExpired ||
                                (invoiceRemainingAmount <= 0 &&
                                  depositRemainingAmount <= 0)
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
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate('/rooms')}
                  >
                    Lihat Katalog
                  </Button>
                </div>

                {relatedSubmissions.length ? (
                  <div className="mt-4">
                    <div className="card-title-soft mb-2">Riwayat bukti bayar</div>
                    <div className="d-grid gap-2">
                      {relatedSubmissions.map((submission) => (
                        <div key={submission.id} className="border rounded-3 p-3">
                          <div className="d-flex justify-content-between gap-3 flex-wrap">
                            <div>
                              <div className="fw-semibold">
                                {getPaymentTargetLabel(submission.targetType)} ·{' '}
                                <CurrencyDisplay amount={submission.amountRupiah} />
                              </div>
                              <div className="small text-muted">
                                {formatDateId(submission.paidAt)} ·{' '}
                                {submission.paymentMethod}
                              </div>
                            </div>
                            <div className="d-flex gap-2 flex-wrap align-items-start">
                              <StatusBadge status={submission.status} />
                              {submission.fileUrl ? (
                                <Button
                                  as="a"
                                  href={
                                    resolveAbsoluteFileUrl(submission.fileUrl) ?? '#'
                                  }
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
        })}
      </div>

      <SubmitPaymentModal
        show={Boolean(selectedBooking)}
        booking={selectedBooking}
        targetType={paymentTargetType}
        existingPending={
          selectedBooking
            ? (submissionByBooking.get(selectedBooking.id) ?? []).find(
                (item) =>
                  item.status === 'PENDING_REVIEW' &&
                  (item.targetType ?? 'INVOICE') === paymentTargetType,
              ) ?? null
            : null
        }
        submitting={createSubmissionMutation.isPending}
        errorMessage={submissionError}
        onHide={() => setSelectedBooking(null)}
        onSubmit={(payload) => createSubmissionMutation.mutateAsync(payload)}
      />
    </div>
  );
}