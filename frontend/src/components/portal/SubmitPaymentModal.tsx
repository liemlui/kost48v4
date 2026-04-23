import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import type { CreatePaymentSubmissionPayload, PaymentMethod, PaymentSubmission, TenantBooking } from '../../types';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  show: boolean;
  booking: TenantBooking | null;
  existingPending?: PaymentSubmission | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onHide: () => void;
  onSubmit: (payload: CreatePaymentSubmissionPayload) => void;
};

export default function SubmitPaymentModal({ show, booking, existingPending, submitting = false, errorMessage, onHide, onSubmit }: Props) {
  const remainingAmount = Math.max((booking?.latestInvoiceStatus === 'PAID' ? 0 : 0) + ((booking as any)?.invoice?.remainingAmountRupiah ?? 0), 0);
  const fallbackRemaining = Math.max(
    Number((booking as any)?.invoiceRemainingAmountRupiah ?? 0)
      || Math.max(Number((booking as any)?.invoiceTotalAmountRupiah ?? booking?.agreedRentAmountRupiah ?? 0) - Number((booking as any)?.invoicePaidAmountRupiah ?? 0), 0),
    0,
  );
  const maxAmount = remainingAmount || fallbackRemaining || Number(booking?.agreedRentAmountRupiah ?? 0);

  const [amountRupiah, setAmountRupiah] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>(todayValue());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [senderName, setSenderName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [originalFilename, setOriginalFilename] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !booking) return;
    setAmountRupiah(String(maxAmount || booking.agreedRentAmountRupiah || ''));
    setPaidAt(todayValue());
    setPaymentMethod('TRANSFER');
    setSenderName('');
    setSenderBankName('');
    setReferenceNumber('');
    setNotes('');
    setFileUrl('');
    setOriginalFilename('');
    setValidationError(null);
  }, [show, booking, maxAmount]);

  const isPendingBlocked = existingPending?.status === 'PENDING_REVIEW';

  const helperText = useMemo(() => {
    if (!booking) return null;
    if (isPendingBlocked) {
      return 'Sudah ada bukti pembayaran yang sedang menunggu review. Tunggu hasil review admin sebelum mengirim ulang.';
    }
    return 'Untuk MVP fase ini, bukti bayar dapat dikirim sebagai URL share link. File upload storage penuh bisa disambungkan di iterasi berikutnya tanpa mengubah kontrak utama.';
  }, [booking, isPendingBlocked]);

  const handleSubmit = () => {
    if (!booking?.latestInvoiceId) {
      setValidationError('Invoice booking awal belum tersedia untuk submission pembayaran.');
      return;
    }

    const numericAmount = Number(amountRupiah);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setValidationError('Nominal pembayaran harus lebih besar dari nol.');
      return;
    }

    if (maxAmount > 0 && numericAmount > maxAmount) {
      setValidationError('Nominal pembayaran tidak boleh melebihi sisa tagihan invoice.');
      return;
    }

    if (!paidAt) {
      setValidationError('Tanggal bayar wajib diisi.');
      return;
    }

    const paidAtDate = new Date(paidAt);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(paidAtDate.getTime()) || paidAtDate > today) {
      setValidationError('Tanggal bayar tidak valid atau berada di masa depan.');
      return;
    }

    setValidationError(null);
    onSubmit({
      stayId: booking.id,
      invoiceId: booking.latestInvoiceId,
      amountRupiah: numericAmount,
      paidAt,
      paymentMethod,
      senderName: senderName.trim() || undefined,
      senderBankName: senderBankName.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
      originalFilename: originalFilename.trim() || undefined,
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload Bukti Bayar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <>
            <Alert variant={isPendingBlocked ? 'warning' : 'info'} className="small">
              <div className="fw-semibold mb-1">{booking.room?.code ?? `Kamar #${booking.roomId}`}</div>
              <div>{helperText}</div>
            </Alert>

            <div className="mb-3 small text-muted">
              Invoice awal: <strong>{booking.latestInvoiceNumber ?? `INV-${booking.latestInvoiceId ?? '-'}`}</strong>
              {' · '}
              Maksimal yang dapat dikirim sekarang: <strong><CurrencyDisplay amount={maxAmount} /></strong>
            </div>

            {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

            <Form.Group className="mb-3">
              <Form.Label>Nominal Dibayar</Form.Label>
              <Form.Control type="number" min={1} max={maxAmount || undefined} value={amountRupiah} onChange={(e) => setAmountRupiah(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tanggal Bayar</Form.Label>
              <Form.Control type="date" value={paidAt} onChange={(e) => setPaidAt(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Metode Pembayaran</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.currentTarget.value as PaymentMethod)} disabled={isPendingBlocked || submitting}>
                <option value="TRANSFER">Transfer</option>
                <option value="QRIS">QRIS</option>
                <option value="EWALLET">E-Wallet</option>
                <option value="CASH">Tunai</option>
                <option value="OTHER">Lainnya</option>
              </Form.Select>
            </Form.Group>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Nama Pengirim</Form.Label>
                  <Form.Control value={senderName} onChange={(e) => setSenderName(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Bank / Sumber Dana</Form.Label>
                  <Form.Control value={senderBankName} onChange={(e) => setSenderBankName(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mt-3">
              <Form.Label>Nomor Referensi</Form.Label>
              <Form.Control value={referenceNumber} onChange={(e) => setReferenceNumber(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>URL Bukti Bayar</Form.Label>
              <Form.Control type="url" placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Nama File Asli</Form.Label>
              <Form.Control placeholder="mis. bukti-transfer-april.jpg" value={originalFilename} onChange={(e) => setOriginalFilename(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Catatan</Form.Label>
              <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} disabled={isPendingBlocked || submitting} />
            </Form.Group>
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>Tutup</Button>
        <Button onClick={handleSubmit} disabled={!booking || isPendingBlocked || submitting}>Kirim Bukti Bayar</Button>
      </Modal.Footer>
    </Modal>
  );
}
