import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStay } from '../../hooks/useStay';
import { Stay } from '../../types';
import { getStatusLabel } from '../../utils/statusLabels';

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

function addCalendarMonthsClamped(base: Date, months: number) {
  const day = base.getDate();
  const result = new Date(base.getFullYear(), base.getMonth(), 1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

function addTerm(base: Date, pricingTerm?: string) {
  const result = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  switch (pricingTerm) {
    case 'DAILY':
      result.setDate(result.getDate() + 1);
      return result;
    case 'WEEKLY':
      result.setDate(result.getDate() + 7);
      return result;
    case 'BIWEEKLY':
      result.setDate(result.getDate() + 14);
      return result;
    case 'SMESTERLY':
      return addCalendarMonthsClamped(result, 6);
    case 'YEARLY':
      return addCalendarMonthsClamped(result, 12);
    case 'MONTHLY':
    default:
      return addCalendarMonthsClamped(result, 1);
  }
}

function isNonNegativeNumberString(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}


function pricingTermDisplay(value?: string | null) {
  return getStatusLabel(value ?? '') || '-';
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
  const [agreedRentAmountRupiah, setAgreedRentAmountRupiah] = useState('');
  const [electricityReadingValue, setElectricityReadingValue] = useState('');
  const [waterReadingValue, setWaterReadingValue] = useState('');
  const [meterReadingAt, setMeterReadingAt] = useState(formatDateInput(new Date()));
  const [error, setError] = useState('');

  const currentEndDate = useMemo(() => toValidDate(stay.plannedCheckOutDate) ?? toValidDate(stay.checkInDate), [stay.plannedCheckOutDate, stay.checkInDate]);
  const autoDate = useMemo(() => {
    if (!currentEndDate) return null;
    return addTerm(currentEndDate, stay.pricingTerm);
  }, [currentEndDate, stay.pricingTerm]);
  const renewalStartDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return currentEndDate && currentEndDate > today ? currentEndDate : today;
  }, [currentEndDate]);
  const minDate = useMemo(() => new Date(renewalStartDate.getTime() + ONE_DAY_MS), [renewalStartDate]);

  useEffect(() => {
    if (show) {
      setPlannedCheckOutDate('');
      setAgreedRentAmountRupiah(stay.agreedRentAmountRupiah ? String(stay.agreedRentAmountRupiah) : '');
      setElectricityReadingValue('');
      setWaterReadingValue('');
      setMeterReadingAt(formatDateInput(new Date()));
      setError('');
      return;
    }
    setPlannedCheckOutDate('');
    setAgreedRentAmountRupiah('');
    setElectricityReadingValue('');
    setWaterReadingValue('');
    setMeterReadingAt(formatDateInput(new Date()));
    setError('');
  }, [show, stay.agreedRentAmountRupiah]);

  const handleClose = () => {
    setPlannedCheckOutDate('');
    setAgreedRentAmountRupiah('');
    setElectricityReadingValue('');
    setWaterReadingValue('');
    setMeterReadingAt(formatDateInput(new Date()));
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');

    if (!currentEndDate) {
      setError('Tanggal akhir masa sewa saat ini tidak valid. Periksa data sebelum memperpanjang.');
      return;
    }

    if (plannedCheckOutDate) {
      const selectedDate = toValidDate(plannedCheckOutDate);
      if (!selectedDate) {
        setError('Tanggal akhir masa sewa baru tidak valid.');
        return;
      }
      if (selectedDate <= renewalStartDate) {
        setError('Tanggal akhir masa sewa baru harus setelah awal periode perpanjangan yang baru.');
        return;
      }
    }

    if (!isNonNegativeNumberString(electricityReadingValue)) {
      setError('Meter listrik terbaru wajib diisi dan tidak boleh negatif.');
      return;
    }

    if (!isNonNegativeNumberString(waterReadingValue)) {
      setError('Meter air terbaru wajib diisi dan tidak boleh negatif.');
      return;
    }

    const meterReadingDate = formatDateInput(meterReadingAt);
    if (!meterReadingDate) {
      setError('Tanggal catat meter tidak valid.');
      return;
    }

    const rentAmount = agreedRentAmountRupiah.trim() ? Number(agreedRentAmountRupiah) : undefined;
    if (rentAmount !== undefined && (!Number.isFinite(rentAmount) || rentAmount < 0)) {
      setError('Tarif sewa periode baru tidak valid.');
      return;
    }

    try {
      await renewMutation.mutateAsync({
        plannedCheckOutDate: plannedCheckOutDate || undefined,
        agreedRentAmountRupiah: rentAmount,
        electricityReadingValue,
        waterReadingValue,
        meterReadingAt: meterReadingDate,
      });
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Gagal memperpanjang masa sewa'));
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Perpanjang Masa Sewa</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant={currentEndDate ? 'info' : 'warning'} className="mb-3">
          <div className="small">
            <strong>Perpanjangan sekarang wajib mencatat meter terbaru terlebih dahulu.</strong>
            <div className="mt-1">
              Sistem akan menghitung pemakaian listrik dan air dari catatan meter sebelumnya, lalu memasukkannya ke tagihan perpanjangan.
            </div>
            <div className="mt-2">
              • Akhir masa sewa saat ini: <strong>{formatDisplayDate(currentEndDate)}</strong>
              <br />
              • Jenis masa sewa: <strong>{pricingTermDisplay(stay.pricingTerm)}</strong>
              <br />
              • Jika tanggal kosong, sistem memakai tanggal otomatis: <strong>{formatDisplayDate(autoDate)}</strong>
            </div>
          </div>
        </Alert>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Form.Group className="mb-3">
          <Form.Label>Tanggal akhir masa sewa baru (opsional)</Form.Label>
          <Form.Control
            type="date"
            value={plannedCheckOutDate}
            onChange={(e) => setPlannedCheckOutDate(e.target.value)}
            min={formatDateInput(minDate)}
          />
          <div className="text-muted small mt-1">
            Kosongkan bila ingin mengikuti periode sewa otomatis sesuai jenis masa sewa saat ini.
            <br />
            Tanggal minimal: <strong>{formatDisplayDate(minDate)}</strong>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tarif Sewa Periode Baru (Opsional)</Form.Label>
          <Form.Control
            type="number"
            min="0"
            inputMode="numeric"
            value={agreedRentAmountRupiah}
            onChange={(e) => setAgreedRentAmountRupiah(e.target.value)}
            placeholder="Kosongkan untuk memakai tarif saat ini"
          />
          <div className="text-muted small mt-1">Kosongkan jika tarif sewa tidak berubah.</div>
        </Form.Group>

        <div className="border rounded-3 p-3 bg-light">
          <div className="fw-semibold mb-2">Checkpoint Meter</div>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Meter Listrik Terbaru (kWh)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={electricityReadingValue}
                  onChange={(e) => setElectricityReadingValue(e.target.value)}
                  placeholder="Contoh: 1234"
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Meter Air Terbaru (m³)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={waterReadingValue}
                  onChange={(e) => setWaterReadingValue(e.target.value)}
                  placeholder="Contoh: 88"
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Tanggal Catat Meter</Form.Label>
                <Form.Control
                  type="date"
                  value={meterReadingAt}
                  onChange={(e) => setMeterReadingAt(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
          <div className="text-muted small mt-2">
            Sistem menyimpan checkpoint per tanggal agar tidak bentrok dan mudah diaudit.
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button variant="success" onClick={handleSubmit} disabled={renewMutation.isPending || !currentEndDate}>
          {renewMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Setujui & Buat Tagihan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
