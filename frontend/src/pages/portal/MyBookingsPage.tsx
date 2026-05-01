import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { cancelTenantBooking, listMyTenantBookings } from '../../api/bookings';
import { createPaymentSubmission, listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import SubmitPaymentModal from '../../components/portal/SubmitPaymentModal';
import BookingCard from '../../components/portal/BookingCard';
import { getErrorMessage } from '../../components/portal/BookingStatusHelper';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type {
  CreatePaymentSubmissionPayload,
  PaymentSubmission,
  PaymentTargetType,
  TenantBooking,
} from '../../types';

const SESSION_KEY = 'kost48:portal-bookings:success-message';

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
  const [cancelTarget, setCancelTarget] = useState<TenantBooking | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const cancelMutation = useMutation({
    mutationFn: async (booking: TenantBooking) =>
      cancelTenantBooking(booking.id),
    onSuccess: async () => {
      const message = 'Booking berhasil dibatalkan. Kamar telah dilepas kembali.';
      setCancelError(null);
      setCancelTarget(null);
      setSuccessMessage(message);
      sessionStorage.setItem(SESSION_KEY, message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['public-rooms'] }),
        refetchStage(),
      ]);
    },
    onError: (error) => {
      setCancelError(
        getErrorMessage(error, 'Gagal membatalkan booking. Silakan coba lagi.'),
      );
    },
  });

  const handleUploadClick = (booking: TenantBooking, targetType: PaymentTargetType) => {
    setSelectedBooking(booking);
    setPaymentTargetType(targetType);
    setSubmissionError(null);
  };

  const handleCancelClick = (booking: TenantBooking) => {
    setCancelTarget(booking);
    setCancelError(null);
  };

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

          return (
            <BookingCard
              key={booking.id}
              booking={booking}
              submissions={relatedSubmissions}
              pendingInvoiceSubmission={pendingInvoiceSubmission}
              pendingDepositSubmission={pendingDepositSubmission}
              onUploadClick={handleUploadClick}
              onViewCatalog={() => navigate('/rooms')}
              onCancelClick={handleCancelClick}
            />
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

      <Modal
        show={Boolean(cancelTarget)}
        onHide={() => {
          if (!cancelMutation.isPending) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton={!cancelMutation.isPending}>
          <Modal.Title>Batalkan booking?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelTarget ? (
            <>
              <p>
                Anda akan membatalkan booking kamar{' '}
                <strong>{cancelTarget.room?.code ?? `#${cancelTarget.roomId}`}</strong>.
              </p>
              <p className="mb-0 text-muted small">
                Kamar akan dilepas kembali ke katalog publik dan booking ini tidak dapat
                dilanjutkan. Jika Anda masih berminat, silakan lakukan pemesanan baru.
              </p>
              {cancelError ? (
                <Alert variant="danger" className="mt-3 mb-0">
                  {cancelError}
                </Alert>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setCancelTarget(null);
              setCancelError(null);
            }}
            disabled={cancelMutation.isPending}
          >
            Tutup
          </Button>
          <Button
            variant="danger"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (cancelTarget) {
                cancelMutation.mutate(cancelTarget);
              }
            }}
          >
            {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}