import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import type { PaymentSubmission } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import AiAssistButton from '../ai/AiAssistButton';
import { analyzePaymentProof, type PaymentProofAiResult } from '../../api/ai';

function formatSafeDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

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

export default function ReviewPaymentModal({
  show,
  mode,
  submission,
  busy = false,
  errorMessage,
  onHide,
  onApprove,
  onReject,
}: Props) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    setReviewNotes('');
    setValidationError(null);
    setShowZoom(false);
  }, [submission?.id]);

  useEffect(() => {
    if (!show) {
      setReviewNotes('');
      setValidationError(null);
      setShowZoom(false);
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

  const handleClose = () => {
    if (!busy) onHide();
  };

  const targetLabel = submission?.targetType === 'DEPOSIT' ? 'Deposit Booking' : 'Sewa Awal';
  const absoluteFileUrl = resolveAbsoluteFileUrl(submission?.fileUrl);
  const canPreviewImage = Boolean(absoluteFileUrl && (submission?.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(absoluteFileUrl || '')));

  return (
    <>
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton={!busy}>
        <Modal.Title>{mode === 'approve' ? `Setujui Bukti Bayar ${targetLabel}` : `Tolak Bukti Bayar ${targetLabel}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {submission ? (
          <>
            <div className="mb-3 small text-muted">
              <div className="fw-semibold text-dark">{submission.room?.code ?? `Kamar #${submission.room?.id ?? '-'}`}</div>
              <div>
                {submission.tenant?.fullName ?? 'Tenant tidak diketahui'} ·{' '}
                {submission.targetType === 'DEPOSIT'
                  ? `Deposit booking`
                  : (submission.invoice?.invoiceNumber ?? `INV-${submission.invoiceId}`)}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <StatusBadge status={submission.status} />
              {submission.targetType === 'DEPOSIT' ? (
                <StatusBadge
                  status={submission.deposit?.paymentStatus === 'PAID'
                    ? 'PAID'
                    : submission.deposit?.paymentStatus === 'PARTIAL'
                      ? 'PARTIAL'
                      : 'WARNING'}
                  customLabel={`Deposit ${submission.deposit?.paymentStatus ?? 'UNPAID'}`}
                />
              ) : (
                <StatusBadge status={submission.invoice?.status ?? 'DRAFT'} />
              )}
            </div>
            <Alert variant="light" className="small">
              <div>Target: <strong>{targetLabel}</strong></div>
              <div>Nominal: <strong><CurrencyDisplay amount={submission.amountRupiah} /></strong></div>
              <div>Tanggal bayar: <strong>{formatSafeDate(submission.paidAt)}</strong></div>
              <div>Metode: <strong>{submission.paymentMethod}</strong></div>
              {submission.targetType === 'DEPOSIT' ? (
                <div>
                  Sisa deposit sesudah payment ini akan dihitung dari total deposit booking.
                </div>
              ) : null}
              {submission.fileUrl ? (
                <div>
                  Bukti bayar:{' '}
                  <a href={absoluteFileUrl ?? '#'} target="_blank" rel="noreferrer">
                    {submission.originalFilename ?? 'Buka file'}
                  </a>
                  {submission.mimeType ? (
                    <span className="text-muted ms-1">({submission.mimeType}{submission.fileSizeBytes ? ` · ${Math.round(submission.fileSizeBytes / 1024)} KB` : ''})</span>
                  ) : null}
                </div>
              ) : null}
            </Alert>

            {canPreviewImage ? (
              <div className="mb-3">
                <button type="button" className="btn btn-link p-0 border rounded overflow-hidden bg-white" onClick={() => setShowZoom(true)}>
                  <img src={absoluteFileUrl ?? ''} alt="Bukti bayar" style={{ width: 220, maxWidth: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                </button>
                <div className="small text-muted mt-2">Preview dibuat kecil agar panel review tetap rapi. Klik gambar untuk zoom.</div>
              </div>
            ) : null}

            {mode === 'approve' ? (
              <Alert variant="info" className="small">
                <div className="fw-semibold mb-2">AI on-demand: bantu cek metadata bukti pembayaran</div>
                <AiAssistButton<PaymentProofAiResult>
                  label="Analisa Bukti"
                  loadingLabel="Menganalisa bukti..."
                  disabled={busy || !submission}
                  run={() => analyzePaymentProof({
                    submissionId: submission.id,
                    expectedAmountRupiah: submission.targetType === 'DEPOSIT'
                      ? Number(submission.deposit?.remainingAmountRupiah ?? submission.deposit?.amountRupiah ?? 0)
                      : Number(submission.invoice?.remainingAmountRupiah ?? submission.invoice?.totalAmountRupiah ?? 0),
                    submittedAmountRupiah: Number(submission.amountRupiah ?? 0),
                    paidAt: submission.paidAt,
                    senderName: submission.senderName,
                    senderBankName: submission.senderBankName,
                    referenceNumber: submission.referenceNumber,
                    fileName: submission.originalFilename,
                    notes: submission.notes,
                  })}
                  renderResult={(result) => (
                    <div className="small">
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                        <Badge bg={result.confidence === 'HIGH' ? 'success' : result.confidence === 'MEDIUM' ? 'warning' : 'secondary'}>Confidence {result.confidence}</Badge>
                        <Badge bg="light" text="dark">{result.cached ? 'Cache' : result.mode ?? 'Rule'}</Badge>
                      </div>
                      {result.matches?.length ? <ul className="mb-2 ps-3 text-success">{result.matches.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                      {result.warnings?.length ? <ul className="mb-2 ps-3 text-danger">{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                      <div className="text-muted">{result.recommendedAction}</div>
                    </div>
                  )}
                />
              </Alert>
            ) : null}

            {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

                  {mode === 'reject' && (
                <Form.Group>
                  <Form.Label>Alasan Penolakan</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.currentTarget.value)}
                    disabled={busy}
                  />
                </Form.Group>
              )}
              {mode === 'approve' ? (
                <Alert variant="warning" className="small mb-0">
                  {submission.targetType === 'DEPOSIT'
                    ? 'Approval deposit hanya akan melunasi kewajiban deposit. Kamar baru aktif operasional jika sewa awal dan deposit sama-sama lunas.'
                    : 'Approval sewa awal hanya akan melunasi invoice sewa. Kamar baru aktif operasional jika sewa awal dan deposit sama-sama lunas.'}
                </Alert>
              ) : null}
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={busy}>Tutup</Button>
        {mode === 'approve' ? (
          <Button onClick={onApprove} disabled={!submission || busy}>
            {busy ? 'Memproses...' : 'Setujui'}
          </Button>
        ) : (
          <Button variant="danger" onClick={handleReject} disabled={!submission || busy || !reviewNotes.trim()}>
            {busy ? 'Memproses...' : 'Tolak'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>

    <Modal show={showZoom} onHide={() => setShowZoom(false)} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Zoom Bukti Bayar</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {canPreviewImage ? <img src={absoluteFileUrl ?? ''} alt="Zoom bukti bayar" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} /> : null}
      </Modal.Body>
    </Modal>
    </>
  );
}
