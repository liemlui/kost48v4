import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { approveBooking } from '../../api/bookings';
import type { ApproveBookingPayload, Stay } from '../../types';
import { formatDateId } from '../../utils/bookingExpiry';

function formatMoneyRaw(value: string) {
  return value.replace(/\D/g, '');
}

function formatMoneyPreview(rawDigits: string) {
  if (!rawDigits) return null;
  const num = Number(rawDigits);
  if (!Number.isFinite(num) || num === 0) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function roundUpToNearest(amount: number, nearest = 5000) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.ceil(amount / nearest) * nearest;
}

function resolveRateFromPricingTerm(booking: Stay | null) {
  if (!booking?.room || !booking?.pricingTerm) return null;
  const monthlyRate = Number(booking.room.monthlyRateRupiah ?? 0);
  switch (booking.pricingTerm) {
    case 'DAILY':
      return booking.room.dailyRateRupiah ?? null;
    case 'WEEKLY':
      return booking.room.weeklyRateRupiah ?? null;
    case 'BIWEEKLY':
      return booking.room.biWeeklyRateRupiah ?? null;
    case 'MONTHLY':
      return booking.room.monthlyRateRupiah ?? null;
    case 'SMESTERLY':
      return roundUpToNearest(monthlyRate * 5.5);
    case 'YEARLY':
      return roundUpToNearest(monthlyRate * 10);
    default:
      return booking.agreedRentAmountRupiah ?? null;
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
  const [confirmBusinessRule, setConfirmBusinessRule] = useState(false);
  const [confirmInvoiceAction, setConfirmInvoiceAction] = useState(false);
  const [confirmMeterBaseline, setConfirmMeterBaseline] = useState(false);

  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: ({ stayId, payload }: { stayId: number; payload: ApproveBookingPayload }) =>
      approveBooking(stayId, payload),
    onMutate: () => {
      submittingRef.current = true;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            typeof query.queryKey?.[0] === 'string' &&
            String(query.queryKey[0]).startsWith('dashboard-'),
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
    setAgreedRentAmountRupiah(
      String(booking.agreedRentAmountRupiah ?? rateFromSelectedTerm ?? ''),
    );
    setDepositAmountRupiah(
      String(
        booking.depositAmountRupiah ?? booking.room?.defaultDepositRupiah ?? '',
      ),
    );
    setInitialElectricityKwh('0');
    setInitialWaterM3('0');
    setConfirmBusinessRule(false);
    setConfirmInvoiceAction(false);
    setConfirmMeterBaseline(false);
    setError('');
  }, [booking, show]);

  const handleClose = () => {
    if (!submittingRef.current) {
      setAgreedRentAmountRupiah('');
      setDepositAmountRupiah('');
      setInitialElectricityKwh('0');
      setInitialWaterM3('0');
      setConfirmBusinessRule(false);
      setConfirmInvoiceAction(false);
      setConfirmMeterBaseline(false);
      setError('');
      onHide();
    }
  };

  const validate = () => {
    const rent = Number(agreedRentAmountRupiah);
    const deposit = Number(depositAmountRupiah);
    const electricity = Number(initialElectricityKwh);
    const water = Number(initialWaterM3);

    if (!Number.isFinite(rent) || rent <= 0)
      return 'Tarif sewa disepakati harus lebih besar dari 0.';
    if (!Number.isFinite(deposit) || deposit < 0)
      return 'Deposit tidak boleh negatif.';
    if (!Number.isFinite(electricity) || electricity < 0)
      return 'Meter awal listrik tidak boleh negatif.';
    if (!Number.isFinite(water) || water < 0)
      return 'Meter awal air tidak boleh negatif.';
    if (!confirmBusinessRule || !confirmInvoiceAction || !confirmMeterBaseline)
      return 'Centang 3 konfirmasi approval terlebih dahulu.';
    return '';
  };

  const computedTotalAwal =
    Number(agreedRentAmountRupiah || 0) + Number(depositAmountRupiah || 0);
  const allConfirmationsChecked = confirmBusinessRule && confirmInvoiceAction && confirmMeterBaseline;
  const paymentDeadlineLabel = booking?.expiresAt ? formatDateId(booking.expiresAt) : '-';

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
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Gagal menyetujui booking.',
      );
    }
  };

  const defaultRate = resolveRateFromPricingTerm(booking);

  return (
    <Modal show={show} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Review Booking</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <Alert variant="light" className="border small">
            <div className="d-flex justify-content-between gap-3">
              <div>
                <div className="fw-semibold">{booking.tenant?.fullName ?? `Tenant #${booking.tenantId}`}</div>
                <div className="text-muted">{roomLabel} · {booking.pricingTerm ?? '-'}</div>
              </div>
              <div className="text-end">
                <div className="fw-semibold">{formatDateId(booking.checkInDate)}</div>
                <div className="text-muted">Batas: {paymentDeadlineLabel}</div>
              </div>
            </div>
          </Alert>
        ) : null}

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Alert variant="info" className="small">
          <strong>Booking belum mengunci kamar.</strong> Setelah disetujui, tenant tetap harus bayar dan bukti pembayaran harus valid.
        </Alert>

        <Alert variant="light" className="border small">
          <div className="d-flex flex-wrap gap-3">
            <span>Default sewa: <strong>{defaultRate ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(defaultRate) : '-'}</strong></span>
            <span>Total awal: <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(computedTotalAwal || 0)}</strong></span>
          </div>
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>
            Tarif Sewa Disepakati <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            inputMode="numeric"
            value={agreedRentAmountRupiah}
            onChange={(e) =>
              setAgreedRentAmountRupiah(formatMoneyRaw(e.target.value))
            }
            placeholder="Otomatis mengikuti tarif booking, bisa diubah bila perlu"
          />
          {formatMoneyPreview(agreedRentAmountRupiah) && (
            <Form.Text className="d-block fw-semibold text-success">
              {formatMoneyPreview(agreedRentAmountRupiah)}
            </Form.Text>
          )}
          <Form.Text muted>
            Default ikut term booking; ubah hanya jika ada kesepakatan khusus.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            Deposit <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            inputMode="numeric"
            value={depositAmountRupiah}
            onChange={(e) =>
              setDepositAmountRupiah(formatMoneyRaw(e.target.value))
            }
            placeholder="Otomatis mengikuti deposit booking, bisa diubah bila perlu"
          />
          {formatMoneyPreview(depositAmountRupiah) && (
            <Form.Text className="d-block fw-semibold text-success">
              {formatMoneyPreview(depositAmountRupiah)}
            </Form.Text>
          )}
          <Form.Text muted>
            Deposit tetap dana titipan, bukan omzet.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            Meter Awal Listrik (kWh) <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            step="0.001"
            value={initialElectricityKwh}
            onChange={(e) => setInitialElectricityKwh(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>
            Meter Awal Air (m³) <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            step="0.001"
            value={initialWaterM3}
            onChange={(e) => setInitialWaterM3(e.target.value)}
          />
        </Form.Group>

        <div className="mt-3 p-3 border rounded bg-light">
          <div className="fw-semibold mb-2">Checklist approval</div>
          <Form.Check
            type="checkbox"
            className="mb-2"
            checked={confirmBusinessRule}
            onChange={(event) => setConfirmBusinessRule(event.target.checked)}
            label="Saya paham booking belum mengunci kamar sampai pembayaran valid disetujui."
          />
          <Form.Check
            type="checkbox"
            className="mb-2"
            checked={confirmInvoiceAction}
            onChange={(event) => setConfirmInvoiceAction(event.target.checked)}
            label="Setelah approve, invoice awal akan diterbitkan untuk tenant."
          />
          <Form.Check
            type="checkbox"
            checked={confirmMeterBaseline}
            onChange={(event) => setConfirmMeterBaseline(event.target.checked)}
            label="Tarif, deposit, dan meter awal sudah dicek."
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={mutation.isPending}
        >
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={mutation.isPending || !booking || !allConfirmationsChecked}
        >
          {mutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              Menyetujui...
            </>
          ) : (
            'Setujui & Buat Tagihan'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}