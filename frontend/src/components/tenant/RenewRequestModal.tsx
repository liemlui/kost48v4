import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { createRenewRequest } from '../../api/renewRequests';
import type { PricingTerm, Stay } from '../../types';
import { tenantPricingTermLabel } from '../../utils/tenantCopy';
import { getDateInputDaysFromToday, toUtcDateOnlyIso } from '../../utils/tenantDates';
import { toTenantFriendlyError } from '../../utils/tenantErrorCopy';

const pricingOptions: PricingTerm[] = ['MONTHLY', 'BIWEEKLY', 'SMESTERLY', 'YEARLY'];

interface RenewRequestModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  stay: Stay;
}

export default function RenewRequestModal({ show, onHide, onSuccess, stay }: RenewRequestModalProps) {
  const defaultTerm = (pricingOptions.includes((stay.pricingTerm ?? '') as PricingTerm) ? stay.pricingTerm : 'MONTHLY') as PricingTerm;
  const [requestedTerm, setRequestedTerm] = useState<PricingTerm>(defaultTerm);
  const [requestedCheckOutDate, setRequestedCheckOutDate] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return;
    setRequestedTerm(defaultTerm);
    setRequestedCheckOutDate('');
    setRequestNotes('');
    setError('');
  }, [defaultTerm, show]);

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');

    if (!requestedTerm) {
      setError('Pilih jenis perpanjangan dulu.');
      return;
    }

    const minDate = getDateInputDaysFromToday(1);
    if (requestedCheckOutDate && requestedCheckOutDate < minDate) {
      setError('Tanggal akhir masa sewa yang diajukan minimal H+1 dari hari ini.');
      return;
    }

    setSubmitting(true);
    try {
      await createRenewRequest({
        stayId: stay.id,
        requestedTerm,
        requestedCheckOutDate: toUtcDateOnlyIso(requestedCheckOutDate),
        requestNotes: requestNotes.trim() || undefined,
      });
      onSuccess();
      onHide();
    } catch (err) {
      setError(toTenantFriendlyError(err, 'Gagal mengajukan perpanjangan. Periksa tagihan aktif atau hubungi admin.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" centered>
      <Modal.Header closeButton={!submitting}>
        <Modal.Title>Ajukan Perpanjangan</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger" className="small">{error}</Alert> : null}
        <Alert variant="info" className="small">
          Ajukan rencana perpanjangan dari sini. Admin akan mencatat meter terbaru terlebih dahulu, lalu tagihan perpanjangan akan dibuat jika disetujui.
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>Jenis Perpanjangan</Form.Label>
          <Form.Select value={requestedTerm} onChange={(event) => setRequestedTerm(event.target.value as PricingTerm)}>
            {pricingOptions.map((option) => (
              <option key={option} value={option}>{tenantPricingTermLabel(option)}</option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            Pilihan ini menjadi rencana yang akan ditinjau admin. Tagihan final tetap mengikuti keputusan admin dan checkpoint meter.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tanggal akhir masa sewa yang diajukan (opsional)</Form.Label>
          <Form.Control
            type="date"
            min={getDateInputDaysFromToday(1)}
            value={requestedCheckOutDate}
            onChange={(event) => setRequestedCheckOutDate(event.target.value)}
          />
          <Form.Text className="text-muted">
            Kosongkan jika kamu mengikuti durasi otomatis dari jenis perpanjangan di atas.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Catatan untuk admin (opsional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Contoh: ingin lanjut karena masih kerja/kuliah di Surabaya..."
            value={requestNotes}
            onChange={(event) => setRequestNotes(event.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>Batal</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><Spinner animation="border" size="sm" className="me-2" />Mengirim...</> : 'Kirim Pengajuan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
