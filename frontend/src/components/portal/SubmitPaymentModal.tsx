// FILE: SubmitPaymentModal.tsx — modal upload bukti bayar tenant (JALUR UANG)
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import SafeImage from '../common/SafeImage';
import CameraOrGalleryInput from '../common/CameraOrGalleryInput';
import { formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import { getBookingInvoiceRemaining } from '../../utils/invoiceTotals';
import { getDeadlineMeta } from '../../utils/dateTime';
import { TENANT_PAYMENT_PROOF_ACCEPT, prepareTenantPaymentProof, tenantPaymentProofReadyLabel } from '../../utils/tenantPaymentProof';
import type {
  CreatePaymentSubmissionPayload,
  PaymentMethod,
  PaymentSubmission,
  TenantBooking,
} from '../../types';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  show: boolean;
  booking: TenantBooking | null;
  targetType: string; // kept for backward compat, unused in combo mode
  existingPending?: PaymentSubmission | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onHide: () => void;
  onSubmit: (payload: CreatePaymentSubmissionPayload, file: File) => Promise<unknown> | void;
};

export default function SubmitPaymentModal({
  show,
  booking,
  existingPending,
  submitting = false,
  errorMessage,
  onHide,
  onSubmit,
}: Props) {
  const invoiceRemaining = getBookingInvoiceRemaining(booking);
  const depositAmount = Number(booking?.depositAmountRupiah ?? 0);
  const recordedDepositPaid = Number(booking?.depositPaidAmountRupiah ?? 0);
  const depositPaid = booking?.depositPaymentStatus === 'PAID' && recordedDepositPaid <= 0
    ? depositAmount
    : recordedDepositPaid;
  const depositRemaining = Math.max(depositAmount - depositPaid, 0);
  const combinedTotal = invoiceRemaining + depositRemaining;

  // DP (uang muka pesan kamar, 30% sewa) — terpisah dari deposit jaminan.
  const downPaymentAmount = Number(booking?.downPaymentAmountRupiah ?? 0);
  const downPaymentPaid = Number(booking?.downPaymentPaidRupiah ?? 0);
  const downPaymentRemaining = Math.max(downPaymentAmount - downPaymentPaid, 0);
  const canChooseDownPayment =
    downPaymentRemaining > 0 && downPaymentRemaining < combinedTotal;
  const isSettlementPhase = downPaymentPaid > 0 && combinedTotal > 0;

  const [paymentOption, setPaymentOption] = useState<'DP' | 'FULL'>('FULL');
  const [paidAt, setPaidAt] = useState<string>(todayValue());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [senderName, setSenderName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const submittingRef = useRef(false);
  const uploadingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = submitting || uploading;
  }, [submitting, uploading]);

  // Cleanup objectURL saat komponen unmount atau previewUrl berubah
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!show || !booking) return;
    setPaymentOption(canChooseDownPayment ? 'DP' : 'FULL');
    setPaidAt(todayValue());
    setPaymentMethod('TRANSFER');
    setSenderName('');
    setSenderBankName('');
    setReferenceNumber('');
    setNotes('');
    setSelectedFile(null);
    setSelectedFileName('');
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    setShowZoom(false);
    setValidationError(null);
  }, [show, booking?.id]);

  const isPendingBlocked = existingPending?.status === 'PENDING_REVIEW';
  const isFullyPaid = combinedTotal <= 0;
  const paymentDeadline = getDeadlineMeta(booking?.expiresAt, 'Batas bayar & kirim bukti');

  const helperText = useMemo(() => {
    if (!booking) return null;
    if (isPendingBlocked) {
      return 'Bukti diperiksa. Tidak perlu upload ulang.';
    }
    if (isFullyPaid) {
      return 'Pembayaran awal (sewa + deposit jaminan) sudah lunas. Tidak ada tagihan tersisa.';
    }
    if (isSettlementPhase) {
      return 'DP sudah diterima — kamar terkunci untuk Anda. Lunasi sisa sewa + deposit jaminan paling lambat saat check-in. Jika tidak lunas hingga H+1 pk 12:00 setelah tanggal check-in, DP hangus dan kamar dilepas.';
    }
    return booking.expiresAt
      ? `Bayar dan kirim bukti sebelum ${paymentDeadline.absoluteLabel}. Pemesanan saja belum mengunci kamar; kamar baru aman setelah pembayaran (DP atau pelunasan) disetujui admin.`
      : 'Bayar + kirim bukti. Aman setelah admin setujui.';
  }, [booking, isPendingBlocked, isFullyPaid, isSettlementPhase, paymentDeadline.absoluteLabel]);

  const handleClose = () => {
    if (!submittingRef.current) onHide();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedFileName('');
      return;
    }

    try {
      const prepared = await prepareTenantPaymentProof(file);
      setSelectedFile(prepared);
      setSelectedFileName(tenantPaymentProofReadyLabel(prepared));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(prepared));
      setValidationError(null);
    } catch (error) {
      setSelectedFile(null);
      setSelectedFileName('');
      setPreviewUrl(null);
      setValidationError(error instanceof Error ? error.message : 'Bukti pembayaran tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2MB.');
    }
  };

  const handleSubmit = async () => {
    if (!booking?.latestInvoiceId) {
      setValidationError('Tagihan awal belum tersedia untuk pembayaran.');
      return;
    }

    if (combinedTotal <= 0) {
      setValidationError('Tidak ada tagihan yang perlu dibayar saat ini.');
      return;
    }

    const amountToPay =
      paymentOption === 'DP' && canChooseDownPayment ? downPaymentRemaining : combinedTotal;

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

    if (!selectedFile) {
      setValidationError('File bukti bayar wajib dipilih.');
      return;
    }

    setValidationError(null);

    try {
      setUploading(true);
      uploadingRef.current = true;
      await onSubmit({
        stayId: booking.id,
        invoiceId: booking.latestInvoiceId,
        targetType: 'INVOICE',
        amountRupiah: amountToPay,
        paidAt,
        paymentMethod,
        senderName: senderName.trim() || undefined,
        senderBankName: senderBankName.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      }, selectedFile);
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  };

  return (
    <>
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton={!submitting && !uploading}>
        <Modal.Title>Bayar & Kirim Bukti</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <>
            <Alert variant={isPendingBlocked ? 'warning' : 'info'} className="small">
              <div className="fw-semibold mb-1">
                {booking.room?.code ?? `Kamar #${booking.roomId}`} · Pembayaran Sewa + Deposit
              </div>
              <div>{helperText}</div>
                {!isPendingBlocked && !isFullyPaid ? (
                  <div className="urgent-rule-note mt-2">{paymentDeadline.hasDate ? `${paymentDeadline.relativeLabel} · berakhir ${paymentDeadline.absoluteLabel}` : 'Batas bayar mengikuti jam deadline dari admin.'}</div>
                ) : null}
            </Alert>

            <div className="mb-3 small text-muted">
              Tagihan awal: <strong>{booking.latestInvoiceNumber ?? `TG-${booking.latestInvoiceId ?? '-'}`}</strong>
            </div>

            {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

            {canChooseDownPayment && !isPendingBlocked && !isFullyPaid ? (
              <div className="bg-light rounded-3 p-3 mb-3 border">
                <div className="small text-muted mb-2 fw-semibold">Pilih Cara Bayar</div>
                <Form.Check
                  type="radio"
                  id="pay-option-dp"
                  name="pay-option"
                  className="mb-2"
                  checked={paymentOption === 'DP'}
                  onChange={() => setPaymentOption('DP')}
                  label={(
                    <span>
                      <strong>DP 30% — <CurrencyDisplay amount={downPaymentRemaining} /></strong>
                      <span className="d-block small text-muted">Kamar langsung terkunci untuk Anda. Sisa sewa + deposit jaminan dilunasi paling lambat saat check-in. DP hangus jika gagal melunasi.</span>
                    </span>
                  )}
                />
                <Form.Check
                  type="radio"
                  id="pay-option-full"
                  name="pay-option"
                  checked={paymentOption === 'FULL'}
                  onChange={() => setPaymentOption('FULL')}
                  label={(
                    <span>
                      <strong>Bayar Lunas — <CurrencyDisplay amount={combinedTotal} /></strong>
                      <span className="d-block small text-muted">Sewa penuh + deposit jaminan sekaligus. Kamar terkunci dan langsung siap aktivasi.</span>
                    </span>
                  )}
                />
              </div>
            ) : null}

            <div className="bg-light rounded-3 p-3 mb-3 border">
              <div className="small text-muted mb-1">Rincian Pembayaran</div>
              {paymentOption === 'DP' && canChooseDownPayment ? (
                <div className="d-flex justify-content-between gap-3 mb-1">
                  <span>DP 30% (uang muka, bagian dari sewa)</span>
                  <strong><CurrencyDisplay amount={downPaymentRemaining} /></strong>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between gap-3 mb-1">
                    <span>{isSettlementPhase ? 'Sisa sewa (setelah DP)' : 'Sewa pertama'}</span>
                    <strong><CurrencyDisplay amount={invoiceRemaining} /></strong>
                  </div>
                  <div className="d-flex justify-content-between gap-3 mb-1">
                    <span>Deposit jaminan (dikembalikan saat checkout)</span>
                    <strong><CurrencyDisplay amount={depositRemaining} /></strong>
                  </div>
                </>
              )}
              <hr className="my-2" />
              <div className="d-flex justify-content-between gap-3 fs-5">
                <span className="fw-semibold">Total yang harus dibayar</span>
                <span className="fw-bold">
                  <CurrencyDisplay amount={paymentOption === 'DP' && canChooseDownPayment ? downPaymentRemaining : combinedTotal} />
                </span>
              </div>
            </div>

            <Alert variant="warning" className="small mb-3">
              Pembayaran harus <strong>tepat sebesar total di atas</strong> dan bukti wajib dikirim di modal ini. Nominal lain akan ditolak otomatis.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Tanggal Bayar</Form.Label>
              <Form.Control
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.currentTarget.value)}
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Metode Pembayaran</Form.Label>
              <Form.Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.currentTarget.value as PaymentMethod)}
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              >
                <option value="TRANSFER">Transfer</option>
                <option value="QRIS">QRIS</option>
                <option value="EWALLET">E-Wallet</option>
                <option value="CASH">Tunai</option>
                <option value="OTHER">Lainnya</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>File Bukti Pembayaran</Form.Label>
              <CameraOrGalleryInput
                accept={TENANT_PAYMENT_PROOF_ACCEPT}
                onChange={handleFileChange}
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
                helpText="Foto bukti langsung atau pilih screenshot dari galeri. JPG, PNG, atau WebP maksimal 2MB."
              />
              <Form.Text muted>
                Format bukti pembayaran: JPG, PNG, atau WebP maksimal 2MB. Gambar akan dikompres dulu di browser jika memungkinkan.
              </Form.Text>
              {selectedFileName ? <div className="small mt-2">File siap unggah: <strong>{selectedFileName}</strong></div> : null}
              {previewUrl ? (
                <div className="mt-3">
                  <button type="button" className="btn btn-link p-0 border rounded overflow-hidden bg-white" onClick={() => setShowZoom(true)}>
                    <SafeImage
                      src={previewUrl}
                      alt="Preview bukti bayar"
                      style={{ width: 180, maxWidth: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                      fallbackTitle="Preview tidak bisa dimuat"
                      fallbackDescription="Coba pilih ulang file bukti pembayaran."
                      resolveUrl={false}
                    />
                  </button>
                  <div className="small text-muted mt-2">Preview dibuat kecil agar halaman tetap ringan. Klik gambar untuk zoom.</div>
                </div>
              ) : null}
            </Form.Group>

            <hr className="my-3" />
            <div className="fw-semibold mb-2 small text-muted">Detail Tambahan (Opsional)</div>

            <Form.Group className="mb-3">
              <Form.Label>Nama Pengirim</Form.Label>
              <Form.Control
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.currentTarget.value)}
                placeholder="Contoh: Budi Santoso"
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
              <Form.Text muted>Nama pemilik rekening yang melakukan transfer.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Bank Pengirim</Form.Label>
              <Form.Control
                type="text"
                value={senderBankName}
                onChange={(e) => setSenderBankName(e.currentTarget.value)}
                placeholder="Contoh: BCA"
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
              <Form.Text muted>Bank asal dana dikirim.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nomor Referensi</Form.Label>
              <Form.Control
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.currentTarget.value)}
                placeholder="Contoh: 20260426/TRF/001"
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
              <Form.Text muted>Nomor referensi atau kode transaksi dari bukti transfer.</Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Catatan</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                placeholder="Opsional. Contoh: transfer dari rekening pribadi."
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
            </Form.Group>
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting || uploading}>Tutup</Button>
        <Button onClick={handleSubmit} disabled={!booking || isPendingBlocked || isFullyPaid || submitting || uploading}>
          {uploading ? 'Mengirim bukti...' : 'Bayar & Kirim Bukti'}
        </Button>
      </Modal.Footer>
    </Modal>

    <Modal show={showZoom} onHide={() => setShowZoom(false)} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Zoom Bukti Bayar</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {previewUrl ? (
          <SafeImage
            src={previewUrl}
            alt="Zoom bukti bayar"
            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            fallbackTitle="Preview tidak bisa dimuat"
            fallbackDescription="Coba pilih ulang file bukti pembayaran."
            resolveUrl={false}
          />
        ) : null}
      </Modal.Body>
    </Modal>
    </>
  );
}
