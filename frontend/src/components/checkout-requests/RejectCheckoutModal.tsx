import { useState, useEffect } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';

interface RejectCheckoutModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (reviewNotes: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function RejectCheckoutModal({ show, onHide, onSubmit, isSubmitting = false }: RejectCheckoutModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setReviewNotes('');
      setError('');
    }
  }, [show]);

  const handleClose = () => {
    setReviewNotes('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    const trimmed = reviewNotes.trim();
    if (trimmed.length < 8) {
      setError('Alasan penolakan wajib diisi minimal 8 karakter.');
      return;
    }
    setError('');
    await onSubmit(trimmed);
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Tolak Pengajuan Keluar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? (
          <Alert variant="danger" className="small">
            {error}
          </Alert>
        ) : null}
        <Form.Group>
          <Form.Label>Catatan Penolakan</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Contoh: jadwal belum bisa diproses karena masih perlu konfirmasi."
            value={reviewNotes}
            onChange={(e) => {
              setReviewNotes(e.target.value);
              if (error) setError('');
            }}
          />
          <Form.Text className="text-muted">
            Minimal 8 karakter. Alasan ini akan terlihat oleh tenant.
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Menolak...
            </>
          ) : (
            'Tolak'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}