import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { createCheckoutRequest } from '../../api/checkoutRequests';
import type { Stay } from '../../types';

interface CheckoutRequestModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  stay: Stay;
}

export default function CheckoutRequestModal({ show, onHide, onSuccess, stay }: CheckoutRequestModalProps) {
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  };

  const [requestedCheckOutDate, setRequestedCheckOutDate] = useState(getMinDate());
  const [checkoutReason, setCheckoutReason] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setRequestedCheckOutDate(getMinDate());
    setCheckoutReason('');
    setRequestNotes('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');

    if (!requestedCheckOutDate) {
      setError('Tanggal rencana checkout wajib diisi.');
      return;
    }

    const minDate = getMinDate();
    if (requestedCheckOutDate < minDate) {
      setError('Tanggal rencana checkout minimal H+1 dari hari ini.');
      return;
    }

    if (!checkoutReason.trim()) {
      setError('Alasan checkout wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await createCheckoutRequest({
        stayId: stay.id,
        requestedCheckOutDate,
        checkoutReason: checkoutReason.trim(),
        requestNotes: requestNotes.trim() || undefined,
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal mengajukan permintaan checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Ajukan Checkout Lebih Awal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? (
          <Alert variant="danger" className="small">
            {error}
          </Alert>
        ) : null}

        <Form.Group className="mb-3">
          <Form.Label>Tanggal Rencana Checkout</Form.Label>
          <Form.Control
            type="date"
            value={requestedCheckOutDate}
            min={getMinDate()}
            onChange={(e) => setRequestedCheckOutDate(e.target.value)}
          />
          <Form.Text className="text-muted">
            Minimal H+1 dari hari ini. Admin akan meninjau dan menyetujui permintaan Anda.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Alasan Checkout</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Contoh: pindah kerja, selesai kuliah, pindah kost lain..."
            value={checkoutReason}
            onChange={(e) => setCheckoutReason(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Catatan Tambahan (opsional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Informasi tambahan untuk admin..."
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          Batal
        </Button>
        <Button variant="warning" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Mengirim...
            </>
          ) : (
            'Ajukan Checkout'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}