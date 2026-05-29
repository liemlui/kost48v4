import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import type { Stay } from '../../types';
import { formatDateId } from '../../utils/bookingExpiry';

const MIN_REASON_LENGTH = 8;

export default function RejectBookingModal({
  show,
  onHide,
  booking,
  onSubmit,
  isSubmitting,
}: {
  show: boolean;
  onHide: () => void;
  booking: Stay | null;
  onSubmit: (reviewNotes: string) => void;
  isSubmitting?: boolean;
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!show) return;
    setReviewNotes('');
    setTouched(false);
  }, [show, booking?.id]);

  const trimmedReason = reviewNotes.trim();
  const reasonError = useMemo(() => {
    if (!trimmedReason) return 'Alasan penolakan wajib diisi.';
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      return `Alasan minimal ${MIN_REASON_LENGTH} karakter.`;
    }
    return '';
  }, [trimmedReason]);

  const canSubmit = Boolean(booking) && !reasonError && !isSubmitting;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onSubmit(trimmedReason);
  };

  return (
    <Modal show={show} onHide={isSubmitting ? undefined : onHide} backdrop="static" centered>
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>Tolak Booking</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <Alert variant="light" className="border small mb-3">
            <div className="fw-semibold">{booking.tenant?.fullName ?? `Tenant #${booking.tenantId}`}</div>
            <div className="text-muted">
              {booking.room?.code ?? `Kamar #${booking.roomId}`} · Check-in {formatDateId(booking.checkInDate)}
            </div>
          </Alert>
        ) : null}

        <Alert variant="warning" className="small">
          Booking akan dibatalkan dan kamar dibuka lagi. Gunakan alasan singkat yang bisa dipahami tenant.
        </Alert>

        <Form.Group>
          <Form.Label>
            Alasan penolakan <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={reviewNotes}
            disabled={isSubmitting}
            onBlur={() => setTouched(true)}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder="Contoh: data belum lengkap / kamar belum siap"
          />
          <Form.Text className={touched && reasonError ? 'text-danger' : 'text-muted'}>
            {touched && reasonError ? reasonError : `Minimal ${MIN_REASON_LENGTH} karakter.`}
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
          Batal
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Menolak...
            </>
          ) : (
            'Tolak Booking'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
