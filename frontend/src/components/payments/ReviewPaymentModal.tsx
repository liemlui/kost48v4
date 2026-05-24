import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import type { PaymentSubmission } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import AiAssistButton from '../ai/AiAssistButton';
import { analyzePaymentProof, type PaymentProofAiResult } from '../../api/ai';
import { addHoursToDate, formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';

function formatSafeDate(value?: string | null) {
  return formatDateTimeWib(value);
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBackendError(message?: string | null) {
  if (!message) return null;
  const joined = Array.isArray(message) ? message.join(', ') : String(message);
  const lower = joined.toLowerCase();
  if (lower.includes('meter') && (lower.includes('lebih kecil') || lower.includes('pembacaan sebelumnya'))) {
    return 'Pembayaran belum bisa disetujui karena catatan meter pada masa sewa ini tidak konsisten. Cek tab Meter di detail masa sewa, pastikan angka meter awal/terbaru tidak turun, lalu coba approve lagi.';
  }
  if (lower.includes('overpay') || lower.includes('lebih')) {
    return 'Nominal bukti lebih besar dari kewajiban aktif. Jangan approve sebelum admin memastikan apakah ini memang pelunasan gabungan yang valid atau perlu dikoreksi tenant.';
  }
  return joined;
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

  useEffect(() => {
    setReviewNotes('');
    setValidationError(null);
    setShowZoom(false);
  }, [submission?.id, mode]);

  useEffect(() => {
    if (!show) {
      setReviewNotes('');
      setValidationError(null);
      setShowZoom(false);
    }
  }, [show]);

  const targetLabel = submission?.targetType === 'DEPOSIT' ? 'Deposit booking' : 'Tagihan';
  const remainingAmount = submission?.targetType === 'DEPOSIT'
    ? asNumber(submission?.deposit?.remainingAmountRupiah ?? submission?.deposit?.amountRupiah)
    : asNumber(submission?.invoice?.remainingAmountRupiah ?? submission?.invoice?.totalAmountRupiah);
  const submittedAmount = asNumber(submission?.amountRupiah);
  const amountDiff = submittedAmount - remainingAmount;
  const isExactPayment = remainingAmount > 0 && amountDiff === 0;
  const isPartialPayment = remainingAmount > 0 && submittedAmount < remainingAmount;
  const isOverPayment = remainingAmount > 0 && submittedAmount > remainingAmount;
  const normalizedError = normalizeBackendError(errorMessage);
  const absoluteFileUrl = resolveAbsoluteFileUrl(submission?.fileUrl);
  const reviewDeadline = getDeadlineMeta(addHoursToDate(submission?.createdAt ?? submission?.paidAt, 6), 'Batas review');
  const urgentSince = getDeadlineMeta(addHoursToDate(submission?.createdAt ?? submission?.paidAt, 1), 'Urgent sejak');
  const escalateSince = getDeadlineMeta(addHoursToDate(submission?.createdAt ?? submission?.paidAt, 3), 'Eskalasi sejak');
  const canPreviewImage = Boolean(absoluteFileUrl && (submission?.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(absoluteFileUrl || '')));

  const decisionCards = useMemo(() => {
    if (!submission) return [];
    if (submission.targetType === 'DEPOSIT') {
      return [
        { label: '1. Cek target', value: 'Deposit booking tenant', tone: 'info' },
        { label: '2. Dampak approve', value: 'Deposit terbayar/parsial akan diperbarui. Aktivasi kamar tetap mengikuti tagihan awal.', tone: 'success' },
        { label: '3. Setelah approve', value: 'Refresh booking, deposit, dan dashboard owner/admin.', tone: 'info' },
      ];
    }
    return [
      { label: '1. Cek nominal', value: isExactPayment ? 'Nominal pas dengan sisa tagihan.' : isPartialPayment ? 'Pembayaran parsial. Flow masih tertahan sampai lunas.' : isOverPayment ? 'Nominal lebih besar dari sisa tagihan. Perlu cek manual.' : 'Sisa tagihan belum terbaca. Cek invoice sebelum approve.', tone: isExactPayment ? 'success' : isOverPayment ? 'danger' : 'warning' },
      { label: '2. Dampak approve', value: isPartialPayment ? 'Invoice menjadi sebagian dibayar; renew/checkout tetap blocked.' : 'Jika lunas, blocker renew/checkout terbuka. Untuk booking awal, kamar bisa aktif dan meter awal jadi resmi.', tone: isPartialPayment ? 'warning' : 'success' },
      { label: '3. Setelah approve', value: 'Admin perlu cek dashboard, invoice, dan detail masa sewa jika ada blocker backend.', tone: 'info' },
    ];
  }, [isExactPayment, isOverPayment, isPartialPayment, submission]);

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      setValidationError('Alasan penolakan wajib diisi agar tenant tahu apa yang harus diperbaiki.');
      return;
    }
    setValidationError(null);
    onReject(reviewNotes.trim());
  };

  const handleClose = () => {
    if (!busy) onHide();
  };

  return (
    <>
      <Modal show={show} onHide={handleClose} centered backdrop="static" size="xl" dialogClassName="payment-review-command-modal">
        <Modal.Header closeButton={!busy}>
          <Modal.Title>{mode === 'approve' ? `Review & Setujui ${targetLabel}` : `Tolak Bukti Bayar ${targetLabel}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submission ? (
            <div className="payment-review-shell">
              <div className="payment-review-hero">
                <div>
                  <div className="payment-review-eyebrow">Finance decision</div>
                  <h4>{submission.room?.code ?? `Kamar #${submission.room?.id ?? '-'}`} · {submission.tenant?.fullName ?? 'Tenant tidak diketahui'}</h4>
                  <p>{submission.targetType === 'DEPOSIT' ? 'Deposit booking' : (submission.invoice?.invoiceNumber ?? `INV-${submission.invoiceId}`)} · Dibayar {formatSafeDate(submission.paidAt)} · {submission.paymentMethod}</p>
                  <p className={reviewDeadline.isExpired ? 'text-soft-danger fw-semibold' : 'text-muted'}>{reviewDeadline.hasDate ? `${reviewDeadline.relativeLabel} · max review ${reviewDeadline.absoluteLabel}` : 'Deadline review belum tersedia'}</p>
                </div>
                <div className="payment-review-statuses">
                  <StatusBadge status={submission.status} domain="payment" />
                  {submission.targetType === 'DEPOSIT' ? (
                    <StatusBadge status={submission.deposit?.paymentStatus === 'PAID' ? 'PAID' : submission.deposit?.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'WARNING'} customLabel={`Deposit ${submission.deposit?.paymentStatus ?? 'UNPAID'}`} />
                  ) : (
                    <StatusBadge status={submission.invoice?.status ?? 'DRAFT'} domain="invoice" />
                  )}
                </div>
              </div>

              <Row className="g-3">
                <Col lg={5}>
                  <div className="decision-section-card">
                    <div className="section-kicker">Ringkasan bukti</div>
                    <div className="payment-amount-grid">
                      <div>
                        <span>Dikirim tenant</span>
                        <strong><CurrencyDisplay amount={submission.amountRupiah} /></strong>
                      </div>
                      <div>
                        <span>Sisa kewajiban</span>
                        <strong><CurrencyDisplay amount={remainingAmount} /></strong>
                      </div>
                      <div className={isOverPayment ? 'danger' : isPartialPayment ? 'warning' : 'success'}>
                        <span>Selisih</span>
                        <strong>{amountDiff === 0 ? 'Pas' : <CurrencyDisplay amount={Math.abs(amountDiff)} />}</strong>
                      </div>
                    </div>
                    <div className="payment-proof-meta mt-3">
                      <div><span>Target</span><strong>{targetLabel}</strong></div>
                      <div><span>Metode</span><strong>{submission.paymentMethod}</strong></div>
                      <div><span>Pengirim</span><strong>{submission.senderName || 'Belum diisi'}</strong></div>
                      <div><span>Bank</span><strong>{submission.senderBankName || 'Belum diisi'}</strong></div>
                      <div><span>Referensi</span><strong>{submission.referenceNumber || 'Belum diisi'}</strong></div>
                      <div><span>Dikirim ke sistem</span><strong>{formatSafeDate(submission.createdAt ?? submission.paidAt)}</strong></div>
                      <div><span>Urgent / Eskalasi</span><strong>{urgentSince.clockLabel} / {escalateSince.clockLabel}</strong></div>
                      <div><span>Batas review</span><strong>{reviewDeadline.hasDate ? reviewDeadline.absoluteLabel : '-'}</strong></div>
                    </div>
                    {submission.fileUrl ? (
                      <div className="mt-3 small">
                        Bukti bayar:{' '}
                        <a href={absoluteFileUrl ?? '#'} target="_blank" rel="noreferrer">
                          {submission.originalFilename ?? 'Buka file'}
                        </a>
                        {submission.mimeType ? <span className="text-muted ms-1">({submission.mimeType}{submission.fileSizeBytes ? ` · ${Math.round(submission.fileSizeBytes / 1024)} KB` : ''})</span> : null}
                      </div>
                    ) : <Alert variant="warning" className="small mt-3 mb-0">Tidak ada file bukti. Approve hanya jika referensi manual sudah sangat jelas.</Alert>}
                  </div>

                  {canPreviewImage ? (
                    <div className="decision-section-card mt-3">
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <div>
                          <div className="section-kicker">Preview bukti</div>
                          <div className="small text-muted">Klik gambar untuk zoom. Preview dibuat compact agar decision panel tetap rapi.</div>
                        </div>
                        <Button size="sm" variant="outline-primary" onClick={() => setShowZoom(true)}>Zoom</Button>
                      </div>
                      <button type="button" className="payment-proof-preview-btn" onClick={() => setShowZoom(true)}>
                        <img src={absoluteFileUrl ?? ''} alt="Bukti bayar" />
                      </button>
                    </div>
                  ) : null}
                </Col>

                <Col lg={7}>
                  {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
                  {normalizedError ? (
                    <Alert variant="danger" className="payment-flow-blocker">
                      <div className="fw-semibold mb-1">Flow blocker dari backend</div>
                      <div>{normalizedError}</div>
                      <div className="small mt-2">Tindakan: jangan klik ulang berkali-kali. Perbaiki penyebabnya dulu, lalu buka ulang review pembayaran.</div>
                    </Alert>
                  ) : null}

                  <div className="decision-section-card">
                    <div className="section-kicker">Dampak operasional jika approve</div>
                    <div className="decision-check-list">
                      {decisionCards.map((card) => (
                        <div className={`decision-check-item ${card.tone}`} key={card.label}>
                          <span>{card.label}</span>
                          <strong>{card.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {mode === 'approve' ? (
                    <div className="decision-section-card mt-3 ai-proof-card">
                      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                        <div>
                          <div className="section-kicker">AI on-demand</div>
                          <div className="fw-semibold">Cek metadata bukti pembayaran</div>
                          <p className="small text-muted mb-0">Opsional. Ini hanya membantu membaca pola nominal/tanggal/referensi, bukan pengganti keputusan admin.</p>
                        </div>
                        <AiAssistButton<PaymentProofAiResult>
                          label="Analisa Bukti"
                          loadingLabel="Menganalisa..."
                          disabled={busy || !submission}
                          run={() => analyzePaymentProof({
                            submissionId: submission.id,
                            expectedAmountRupiah: remainingAmount,
                            submittedAmountRupiah: submittedAmount,
                            paidAt: submission.paidAt,
                            senderName: submission.senderName,
                            senderBankName: submission.senderBankName,
                            referenceNumber: submission.referenceNumber,
                            fileName: submission.originalFilename,
                            notes: submission.notes,
                          })}
                          renderResult={(result) => (
                            <div className="small ai-proof-result">
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
                      </div>
                    </div>
                  ) : null}

                  {mode === 'reject' ? (
                    <div className="decision-section-card mt-3">
                      <Form.Group>
                        <Form.Label>Alasan penolakan untuk tenant</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.currentTarget.value)}
                          disabled={busy}
                          placeholder="Contoh: Nominal belum sesuai tagihan. Mohon upload ulang bukti pembayaran dengan nominal yang benar."
                        />
                      </Form.Group>
                    </div>
                  ) : null}
                </Col>
              </Row>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer className="payment-review-footer">
          <Button variant="outline-secondary" onClick={handleClose} disabled={busy}>Tutup</Button>
          {mode === 'approve' ? (
            <Button variant={isOverPayment ? 'warning' : 'primary'} onClick={onApprove} disabled={!submission || busy}>
              {busy ? 'Memproses...' : isOverPayment ? 'Tetap Setujui Setelah Cek Manual' : 'Setujui Pembayaran'}
            </Button>
          ) : (
            <Button variant="danger" onClick={handleReject} disabled={!submission || busy || !reviewNotes.trim()}>
              {busy ? 'Memproses...' : 'Tolak Bukti'}
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
