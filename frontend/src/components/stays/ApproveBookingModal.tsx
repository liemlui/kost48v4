import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { approveTenantBooking } from '../../api/bookings';
import type { ApproveBookingPayload, Stay, TenantBooking } from '../../types';

function isDashboardKey(value: unknown) {
  return typeof value === 'string' && value.startsWith('dashboard');
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ApproveBookingModal({
  show,
  onHide,
  booking,
}: {
  show: boolean;
  onHide: () => void;
  booking: TenantBooking | Stay | null;
}) {
  const queryClient = useQueryClient();
  const [agreedRentAmountRupiah, setAgreedRentAmountRupiah] = useState('');
  const [depositAmountRupiah, setDepositAmountRupiah] = useState('');
  const [initialElectricityKwh, setInitialElectricityKwh] = useState('');
  const [initialWaterM3, setInitialWaterM3] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !booking) return;
    setAgreedRentAmountRupiah(String(booking.agreedRentAmountRupiah ?? ''));
    setDepositAmountRupiah(String(booking.depositAmountRupiah ?? ''));
    setInitialElectricityKwh('0');
    setInitialWaterM3('0');
    setError('');
  }, [booking, show]);

  const payload = useMemo<ApproveBookingPayload | null>(() => {
    const agreed = toNumber(agreedRentAmountRupiah);
    const deposit = toNumber(depositAmountRupiah);
    const electricity = toNumber(initialElectricityKwh);
    const water = toNumber(initialWaterM3);

    if (agreed === null || deposit === null || electricity === null || water === null) return null;
    return {
      agreedRentAmountRupiah: agreed,
      depositAmountRupiah: deposit,
      initialElectricityKwh: electricity,
      initialWaterM3: water,
    };
  }, [agreedRentAmountRupiah, depositAmountRupiah, initialElectricityKwh, initialWaterM3]);

  const mutation = useMutation({
    mutationFn: (nextPayload: ApproveBookingPayload) => approveTenantBooking(booking?.id ?? 0, nextPayload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stays'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : undefined;
          return isDashboardKey(firstKey);
        },
      });
      onHide();
    },
  });

  const handleClose = () => {
    if (mutation.isPending) return;
    setError('');
    onHide();
  };

  const validatePayload = () => {
    if (!payload) {
      return 'Semua field approval wajib diisi dengan angka yang valid.';
    }

    if (payload.agreedRentAmountRupiah < 0) return 'Tarif sewa disepakati tidak boleh negatif.';
    if (payload.depositAmountRupiah < 0) return 'Deposit tidak boleh negatif.';
    if (payload.initialElectricityKwh < 0) return 'Meter awal listrik tidak boleh negatif.';
    if (payload.initialWaterM3 < 0) return 'Meter awal air tidak boleh negatif.';

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validatePayload();
    setError(validationError);
    if (validationError || !payload || !booking) return;

    try {
      await mutation.mutateAsync(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menyetujui booking. Silakan coba lagi.');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Approval Booking</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="small">
          Booking akan tetap berstatus <strong>reserved</strong> pada fase ini. Sistem akan membuat 2 baseline meter reading dan invoice awal <strong>DRAFT</strong>, tanpa membuka flow pembayaran.
        </Alert>

        {booking ? (
          <div className="mb-3 small text-muted">
            <div><strong>Tenant:</strong> {booking.tenant?.fullName ?? `Tenant #${booking.tenantId}`}</div>
            <div><strong>Kamar:</strong> {booking.room?.code ?? `Room #${booking.roomId}`} {booking.room?.name ? `· ${booking.room.name}` : ''}</div>
          </div>
        ) : null}

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Form.Group className="mb-3">
          <Form.Label>Tarif Sewa Disepakati</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="1"
            value={agreedRentAmountRupiah}
            onChange={(event) => setAgreedRentAmountRupiah(event.target.value)}
            placeholder="Contoh: 1500000"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Deposit</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="1"
            value={depositAmountRupiah}
            onChange={(event) => setDepositAmountRupiah(event.target.value)}
            placeholder="Contoh: 500000"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Meter Awal Listrik (kWh)</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={initialElectricityKwh}
            onChange={(event) => setInitialElectricityKwh(event.target.value)}
            placeholder="Contoh: 0"
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Meter Awal Air (m³)</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={initialWaterM3}
            onChange={(event) => setInitialWaterM3(event.target.value)}
            placeholder="Contoh: 0"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Tutup</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending || !booking}>
          {mutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : 'Setujui Booking'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
