import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { cancelTenantBooking, listMyTenantBookings } from '../../api/bookings';
import { getResource } from '../../api/resources';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import { useAuth } from '../../context/AuthContext';
import { getPrimaryTenantBooking, isTenantBookingOccupied, stayToTenantBooking } from '../../utils/tenantBookingRules';
import TenantBookingWaitingRoom from './TenantBookingWaitingRoom';
import { getErrorMessage } from '../portal/BookingStatusHelper';
import type { Stay, TenantBooking } from '../../types';

export default function TenantBookingGate({ mode = 'rooms' }: { mode?: 'rooms' | 'booking-route' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<TenantBooking | null>(null);
  const [cancelError, setCancelError] = useState('');

  const bookingsQuery = useQuery({
    queryKey: ['tenant-bookings', { userId: user?.id, tenantId: user?.tenantId }],
    queryFn: () => listMyTenantBookings({ limit: 100 }),
    enabled: Boolean(user?.id),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const currentStayQuery = useQuery({
    queryKey: ['portal-stage', 'stay', { userId: user?.id, tenantId: user?.tenantId }],
    queryFn: () => getResource<Stay>('/stays/me/current'),
    enabled: Boolean(user?.id),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const submissionsQuery = useQuery({
    queryKey: ['payment-submissions', 'mine', { userId: user?.id, tenantId: user?.tenantId }],
    queryFn: () => listMyPaymentSubmissions({ limit: 200 }),
    enabled: Boolean(user?.id),
    retry: false,
    staleTime: 30_000,
  });

  const booking = useMemo(() => {
    const primary = getPrimaryTenantBooking(bookingsQuery.data?.items ?? []);
    if (primary) return primary;
    const fromStay = stayToTenantBooking(currentStayQuery.data);
    if (fromStay && !isTenantBookingOccupied(fromStay)) return fromStay;
    return fromStay;
  }, [bookingsQuery.data, currentStayQuery.data]);
  const submissions = submissionsQuery.data?.items ?? [];

  const cancelMutation = useMutation({
    mutationFn: async (target: TenantBooking) => cancelTenantBooking(target.id),
    onSuccess: async () => {
      setCancelTarget(null);
      setCancelError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['public-rooms'] }),
      ]);
      navigate('/rooms', { replace: true });
    },
    onError: (error) => {
      setCancelError(getErrorMessage(error, 'Gagal membatalkan pemesanan. Silakan coba lagi.'));
    },
  });

  if (bookingsQuery.isLoading || currentStayQuery.isLoading) {
    return <div className="py-5 text-center"><Spinner animation="border" /></div>;
  }

  if (bookingsQuery.isError && !currentStayQuery.data) {
    return <Alert variant="danger">Gagal membaca status pemesanan kamu. Silakan coba lagi.</Alert>;
  }

  return (
    <>
      <TenantBookingWaitingRoom
        booking={booking}
        submissions={submissions}
        onViewBooking={() => booking && isTenantBookingOccupied(booking) ? navigate('/portal/stay') : navigate('/portal/bookings')}
        onPayInvoice={() => booking?.latestInvoiceId ? navigate(`/portal/invoices/${booking.latestInvoiceId}`) : navigate('/portal/invoices')}
        onPickRoom={() => navigate('/rooms')}
        onCancelBooking={booking ? () => setCancelTarget(booking) : undefined}
      />

      <Alert variant="warning" className="mt-3 border-0 tenant-booking-lock-alert">
        <strong>{mode === 'booking-route' ? 'Kamu masih punya proses pemesanan.' : 'Katalog disembunyikan agar tidak bingung.'}</strong>{' '}
        {mode === 'booking-route'
          ? 'Selesaikan atau batalkan proses ini dulu.'
          : 'Selesaikan satu proses dulu agar tidak bingung.'}
      </Alert>

      <Modal show={Boolean(cancelTarget)} onHide={() => !cancelMutation.isPending && setCancelTarget(null)} centered backdrop="static">
        <Modal.Header closeButton={!cancelMutation.isPending}>
          <Modal.Title>Batalkan pemesanan?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Kamu akan membatalkan pemesanan kamar <strong>{cancelTarget?.room?.code ?? (cancelTarget ? `#${cancelTarget.roomId}` : '')}</strong>.
          </p>
          <p className="small text-muted mb-0">
            Setelah batal, kamu bisa pilih kamar lain.
          </p>
          {cancelError ? <Alert variant="danger" className="mt-3 mb-0">{cancelError}</Alert> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={cancelMutation.isPending} onClick={() => setCancelTarget(null)}>Tutup</Button>
          <Button variant="danger" disabled={cancelMutation.isPending || !cancelTarget} onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget)}>
            {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, batalkan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
