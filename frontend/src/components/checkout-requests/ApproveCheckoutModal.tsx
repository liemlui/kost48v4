import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import type { CheckoutRequest } from '../../types';
import { formatDateTimeWib } from '../../utils/dateTime';

interface ApproveCheckoutModalProps {
  show: boolean;
  checkoutRequest: CheckoutRequest | null;
  onHide: () => void;
  onSubmit: (reviewNotes?: string) => void | Promise<void>;
  isSubmitting?: boolean;
  openInvoiceCount?: number;
}

type ChecklistState = {
  finalSeparate: boolean;
  invoiceGuard: boolean;
  fieldReady: boolean;
};

const initialChecklist: ChecklistState = {
  finalSeparate: false,
  invoiceGuard: false,
  fieldReady: false,
};

export default function ApproveCheckoutModal({
  show,
  checkoutRequest,
  onHide,
  onSubmit,
  isSubmitting = false,
  openInvoiceCount,
}: ApproveCheckoutModalProps) {
  const [checklist, setChecklist] = useState<ChecklistState>(initialChecklist);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (show) {
      setChecklist(initialChecklist);
      setReviewNotes('');
    }
  }, [show, checkoutRequest?.id]);

  const allChecked = Object.values(checklist).every(Boolean);
  const hasKnownOpenInvoice = typeof openInvoiceCount === 'number' && openInvoiceCount > 0;

  const tenantLabel = useMemo(() => {
    return checkoutRequest?.stay?.tenant?.fullName || `Stay #${checkoutRequest?.stayId ?? '-'}`;
  }, [checkoutRequest]);

  const roomLabel = checkoutRequest?.stay?.room?.code || '-';
  const requestedDate = checkoutRequest?.requestedCheckOutDate
    ? formatDateTimeWib(checkoutRequest.requestedCheckOutDate)
    : '-';

  const handleClose = () => {
    setChecklist(initialChecklist);
    setReviewNotes('');
    onHide();
  };

  const handleToggle = (key: keyof ChecklistState) => {
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Review Pengajuan Keluar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <Badge bg="primary">{tenantLabel}</Badge>
          <Badge bg="secondary">Kamar {roomLabel}</Badge>
          <Badge bg="info">Keluar {requestedDate}</Badge>
        </div>

        {hasKnownOpenInvoice ? (
          <Alert variant="danger" className="small">
            Ada {openInvoiceCount} tagihan aktif. Backend akan menolak approval sampai tagihan selesai.
          </Alert>
        ) : (
          <Alert variant="info" className="small">
            Setujui pengajuan saja. Final checkout tetap aksi terpisah.
          </Alert>
        )}

        <div className="d-grid gap-2 mb-3">
          <Form.Check
            type="checkbox"
            id="checkout-final-separate"
            checked={checklist.finalSeparate}
            onChange={() => handleToggle('finalSeparate')}
            label="Saya paham approval ini belum melepas kamar."
          />
          <Form.Check
            type="checkbox"
            id="checkout-invoice-guard"
            checked={checklist.invoiceGuard}
            onChange={() => handleToggle('invoiceGuard')}
            label="Tagihan aktif tetap menjadi blocker final checkout."
          />
          <Form.Check
            type="checkbox"
            id="checkout-field-ready"
            checked={checklist.fieldReady}
            onChange={() => handleToggle('fieldReady')}
            label="Jadwal keluar sudah layak ditinjau admin."
          />
        </div>

        <Form.Group>
          <Form.Label>Catatan review</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Opsional, contoh: jadwal disetujui, final checkout menyusul."
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
          />
          <Form.Text className="text-muted">Singkat saja. Catatan bisa dilihat sebagai audit review.</Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          variant="primary"
          onClick={() => onSubmit(reviewNotes.trim() || undefined)}
          disabled={isSubmitting || !allChecked || hasKnownOpenInvoice}
        >
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Menyetujui...
            </>
          ) : (
            'Setujui Pengajuan'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
