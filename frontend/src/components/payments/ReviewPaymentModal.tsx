import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import type { PaymentSubmission } from '../../types';

type Props = {
  show: boolean;
  mode: 'approve' | 'reject';
  submission: PaymentSubmission | null;
  busy?: boolean;
  errorMessage?: string | null;
  onHide: () => void;
  onApprove: () => void;
  onReject: (reviewNotes: string) => void;
};

export default function ReviewPaymentModal({ show, mode, submission, busy = false, errorMessage, onHide, onApprove, onReject }: Props) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setReviewNotes('');
      setValidationError(null);
    }
  }, [show]);

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      setValidationError('Alasan penolakan wajib diisi.');
      return;
    }
    setValidationError(null);
    onReject(reviewNotes.trim());
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'approve' ? 'Setujui Bukti Bayar' : 'Tolak Bukti Bayar'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {submission ? (
          <>
            <div className="mb-3 small text-muted">
              <div className="fw-semibold text-dark">{submission.room?.code ?? `Kamar #${submission.room?.id ?? '-'}`}</div>
              <div>{submission.tenant?.fullName ?? 'Tenant tidak diketahui'} · {submission.invoice?.invoiceNumber ?? `INV-${submission.invoiceId}`}</div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <StatusBadge status={submission.status} />
              <StatusBadge status={submission.invoice?.status ?? 'DRAFT'} />
            </div>
            <Alert variant="light" className="small">
              <div>Nominal: <strong><CurrencyDisplay amount={submission.amountRupiah} /></strong></div>
              <div>Tanggal bayar: <strong>{submission.paidAt ? new Date(submission.paidAt).toLocaleDateString('id-ID') : '-'}</strong></div>
              <div>Metode: <strong>{submission.paymentMethod}</strong></div>
              {submission.referenceNumber ? <div>Ref: <strong>{submission.referenceNumber}</strong></div> : null}
              {submission.fileUrl ? <div>URL bukti: <a href={submission.fileUrl} target="_blank" rel="noreferrer">Buka link</a></div> : null}
            </Alert>

            {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

            {mode === 'reject' ? (
              <Form.Group>
                <Form.Label>Alasan Penolakan</Form.Label>
                <Form.Control as="textarea" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.currentTarget.value)} disabled={busy} />
              </Form.Group>
            ) : (
              <Alert variant="warning" className="small mb-0">
                Approval akan membuat pembayaran invoice final. Jika nominal ini melunasi invoice booking awal, kamar akan berubah dari <strong>RESERVED</strong> menjadi <strong>OCCUPIED</strong>.
              </Alert>
            )}
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={busy}>Tutup</Button>
        {mode === 'approve' ? (
          <Button onClick={onApprove} disabled={!submission || busy}>Setujui</Button>
        ) : (
          <Button variant="danger" onClick={handleReject} disabled={!submission || busy}>Tolak</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
