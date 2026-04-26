import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { approveBooking } from '../../api/bookings';
import { formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import type { ApproveBookingPayload, Stay } from '../../types';
import { formatDateId } from '../../utils/bookingExpiry';

function formatNumberInput(value: string) {
  return value.replace(/[^0-9.]/g, '');
}

function displayCurrencyInput(value: string) {
  if (!value) return '';
  return formatRupiahWithoutSymbol(value);
}

function resolveRateFromPricingTerm(booking: Stay | null) {
  if (!booking?.room || !booking?.pricingTerm) return null;
  switch (booking.pricingTerm) {
    case 'DAILY': return booking.room.dailyRateRupiah ?? null;
    case 'WEEKLY': return booking.room.weeklyRateRupiah ?? null;
    case 'BIWEEKLY': return booking.room.biWeeklyRateRupiah ?? null;
    case 'MONTHLY': return booking.room.monthlyRateRupiah ?? null;
    default: return booking.agreedRentAmountRupiah ?? null;
  }
}

export default function ApproveBookingModal({
  show,
  onHide,
  booking,
}: {
  show: boolean;
  onHide: () => void;
  booking: Stay | null;
}) {
  const queryClient = useQueryClient();
  const [agreedRentAmountRupiah, setAgreedRentAmountRupiah] = useState('');
  const [depositAmountRupiah, setDepositAmountRupiah] = useState('');
  const [initialElectricityKwh, setInitialElectricityKwh] = useState('0');
  const [initialWaterM3, setInitialWaterM3] = useState('0');
  const [error, setError] = useState('');

  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: ({ stayId, payload }: { stayId: number; payload: ApproveBookingPayload }) => approveBooking(stayId, payload),
    onMutate: () => {
      submittingRef.current = true;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({
          predicate: (query) => typeof query.queryKey?.[0] === 'string' && String(query.queryKey[0]).startsWith('dashboard-'),
        }),
      ]);
      submittingRef.current = false;
      handleClose();
    },
    onError: () => {
      submittingRef.current = false;
    },
  });

  const roomLabel = useMemo(() => {
    if (!booking) return '-';
    return booking.room?.code ?? `Kamar #${booking.roomId}`;
  }, [booking]);

  useEffect(() => {
    if (!booking || !show) return;
    const rateFromSelectedTerm = resolveRateFromPricingTerm(booking);
    setAgreedRentAmountRupiah(String(booking.agreedRentAmountRupiah ?? rateFromSelectedTerm ?? ''));
    setDepositAmountRupiah(String(booking.depositAmountRupiah ?? booking.room?.defaultDepositRupiah ?? ''));
    setInitialElectricityKwh('0');
    setInitialWaterM3('0');
    setError('');
  }, [booking, show]);

  const handleClose = () => {
    if (!submittingRef.current) {
      setAgreedRentAmountRupiah('');
      setDepositAmountRupiah('');
      setInitialElectricityKwh('0');
      setInitialWaterM3('0');
      setError('');
      onHide();
    }
  };

  const validate = () => {
    const rent = Number(agreedRentAmountRupiah);
    const deposit = Number(depositAmountRupiah);
    const electricity = Number(initialElectricityKwh);
    const water = Number(initialWaterM3);

    if (!Number.isFinite(rent) || rent <= 0) return 'Tarif sewa disepakati harus lebih besar dari 0.';
    if (!Number.isFinite(deposit) || deposit < 0) return 'Deposit tidak boleh negatif.';
    if (!Number.isFinite(electricity) || electricity < 0) return 'Meter awal listrik tidak boleh negatif.';
    if (!Number.isFinite(water) || water < 0) return 'Meter awal air tidak boleh negatif.';
    return '';
  };

  const computedTotalAwal = (Number(agreedRentAmountRupiah || 0) + Number(depositAmountRupiah || 0));

  const handleSubmit = async () => {
    if (!booking) return;

    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      await mutation.mutateAsync({
        stayId: booking.id,
        payload: {
          agreedRentAmountRupiah: Number(agreedRentAmountRupiah),
          depositAmountRupiah: Number(depositAmountRupiah),
          initialElectricityKwh,
          initialWaterM3,
        },
      });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Gagal menyetujui booking.');
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Setujui Booking</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <Alert variant="light" className="border small">
            <div><strong>Tenant:</strong> {booking.tenant?.fullName ?? `Tenant #${booking.tenantId}`}</div>
            <div><strong>Kamar:</strong> {roomLabel}</div>
            <div><strong>Check-in:</strong> {formatDateId(booking.checkInDate)}</div>
            <div><strong>Pricing term:</strong> {booking.pricingTerm ?? '-'}</div>
            <div><strong>Expires at:</strong> {formatDateId(booking.expiresAt)}</div>
          </Alert>
        ) : null}

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Alert variant="info" className="small">
          Pricing term tenant: <strong>{booking?.pricingTerm ?? '-'}</strong> · Default sewa sesuai term: <strong>{displayCurrencyInput(String(resolveRateFromPricingTerm(booking) ?? '')) || '-'}</strong> · Total awal: <strong>{formatRupiahWithoutSymbol(String(computedTotalAwal || 0))}</strong>
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>Tarif Sewa Disepakati <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="text"
            inputMode="numeric"
            value={displayCurrencyInput(agreedRentAmountRupiah)}
            onChange={(e) => setAgreedRentAmountRupiah(formatNumberInput(e.target.value))}
            placeholder="Otomatis mengikuti tarif booking, bisa diubah bila perlu"
          />
          <Form.Text muted>Default mengikuti harga kamar sesuai pricing term yang sudah dipilih tenant saat booking, lalu masih boleh disesuaikan admin bila memang ada negosiasi khusus.</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Deposit <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="text"
            inputMode="numeric"
            value={displayCurrencyInput(depositAmountRupiah)}
            onChange={(e) => setDepositAmountRupiah(formatNumberInput(e.target.value))}
            placeholder="Otomatis mengikuti deposit booking, bisa diubah bila perlu"
          />
          <Form.Text muted>Deposit booking ditampilkan terpisah dari sewa agar tenant melihat total awal dengan jujur.</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Meter Awal Listrik (kWh) <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="number"
            min={0}
            step="0.001"
            value={initialElectricityKwh}
            onChange={(e) => setInitialElectricityKwh(formatNumberInput(e.target.value))}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Meter Awal Air (m3) <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="number"
            min={0}
            step="0.001"
            value={initialWaterM3}
            onChange={(e) => setInitialWaterM3(formatNumberInput(e.target.value))}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>Batal</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending || !booking}>
          {mutation.isPending ? <><Spinner size="sm" className="me-2" />Menyetujui...</> : 'Setujui Booking'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
