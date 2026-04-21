import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStay } from '../../hooks/useStay';
import { Stay } from '../../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(input?: string | Date | null): string {
  const date = toValidDate(input);
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(input?: string | Date | null): string {
  const date = toValidDate(input);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addTerm(base: Date, pricingTerm?: string) {
  const result = new Date(base.getTime());
  switch (pricingTerm) {
    case 'DAILY':
      result.setDate(result.getDate() + 1);
      break;
    case 'WEEKLY':
      result.setDate(result.getDate() + 7);
      break;
    case 'BIWEEKLY':
      result.setDate(result.getDate() + 14);
      break;
    case 'SMESTERLY':
      result.setMonth(result.getMonth() + 6);
      break;
    case 'YEARLY':
      result.setFullYear(result.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
}

export default function RenewStayModal({
  show,
  onHide,
  stay,
  onSuccess,
}: {
  show: boolean;
  onHide: () => void;
  stay: Stay;
  onSuccess?: () => void;
}) {
  const { renewMutation } = useStay(stay.id);
  const [plannedCheckOutDate, setPlannedCheckOutDate] = useState('');
  const [error, setError] = useState('');

  const currentEndDate = useMemo(() => toValidDate(stay.plannedCheckOutDate) ?? toValidDate(stay.checkInDate), [stay.plannedCheckOutDate, stay.checkInDate]);
  const autoDate = useMemo(() => {
    if (!currentEndDate) return null;
    return addTerm(currentEndDate, stay.pricingTerm);
  }, [currentEndDate, stay.pricingTerm]);
  const minDate = useMemo(() => currentEndDate ? new Date(currentEndDate.getTime() + ONE_DAY_MS) : null, [currentEndDate]);

  useEffect(() => {
    if (!show) {
      setPlannedCheckOutDate('');
      setError('');
    }
  }, [show]);

  const handleClose = () => {
    setPlannedCheckOutDate('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');

    if (!currentEndDate) {
      setError('Tanggal akhir stay saat ini tidak valid. Periksa data stay sebelum memperpanjang.');
      return;
    }

    if (plannedCheckOutDate) {
      const selectedDate = toValidDate(plannedCheckOutDate);
      if (!selectedDate) {
        setError('Tanggal check-out baru tidak valid.');
        return;
      }
      if (selectedDate <= currentEndDate) {
        setError('Tanggal perpanjangan harus setelah tanggal berakhir saat ini.');
        return;
      }
    }

    try {
      const payload = plannedCheckOutDate ? { plannedCheckOutDate } : {};
      await renewMutation.mutateAsync(payload);
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memperpanjang stay');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Perpanjang Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant={currentEndDate ? 'info' : 'warning'} className="mb-3">
          <div className="small">
            <strong>Perpanjangan stay akan membuat invoice DRAFT baru untuk periode lanjutan.</strong>
            <div className="mt-1">
              • Tanggal berakhir saat ini: <strong>{formatDisplayDate(currentEndDate)}</strong>
              <br />
              • Pricing term stay: <strong>{stay.pricingTerm || '-'}</strong>
              <br />
              • Jika tanggal kosong, sistem akan memakai estimasi otomatis: <strong>{formatDisplayDate(autoDate)}</strong>
            </div>
          </div>
        </Alert>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Form.Group className="mb-3">
          <Form.Label>Tanggal Check-out Baru (Opsional)</Form.Label>
          <Form.Control
            type="date"
            value={plannedCheckOutDate}
            onChange={(e) => setPlannedCheckOutDate(e.target.value)}
            min={formatDateInput(minDate)}
          />
          <div className="text-muted small mt-1">
            Kosongkan bila ingin mengikuti perpanjangan otomatis sesuai pricing term.
            <br />
            Tanggal minimal: <strong>{formatDisplayDate(minDate)}</strong>
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button variant="success" onClick={handleSubmit} disabled={renewMutation.isPending || !currentEndDate}>
          {renewMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Konfirmasi Perpanjangan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
