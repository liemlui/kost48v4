import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import { uploadPaymentProof } from '../../api/paymentSubmissions';
import type {
  CreatePaymentSubmissionPayload,
  PaymentMethod,
  PaymentSubmission,
  TenantBooking,
} from '../../types';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  bitmap.close();
  if (!blob) return file;
  const nextName = file.name.replace(/\.(png|webp|jpeg|jpg)$/i, '') + '.jpg';
  return new File([blob], nextName, { type: 'image/jpeg' });
}

type Props = {
  show: boolean;
  booking: TenantBooking | null;
  targetType: string; // kept for backward compat, unused in combo mode
  existingPending?: PaymentSubmission | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onHide: () => void;
  onSubmit: (payload: CreatePaymentSubmissionPayload) => Promise<unknown> | void;
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
  const invoiceRemaining = Math.max(
    Number(booking?.invoiceRemainingAmountRupiah ?? 0)
      || Math.max(
        Number(booking?.invoiceTotalAmountRupiah ?? booking?.agreedRentAmountRupiah ?? 0)
        - Number(booking?.invoicePaidAmountRupiah ?? 0),
        0,
      ),
    0,
  );
  const depositRemaining = Math.max(
    Number(booking?.depositAmountRupiah ?? 0) - Number(booking?.depositPaidAmountRupiah ?? 0),
    0,
  );
  const combinedTotal = invoiceRemaining + depositRemaining;

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

  useEffect(() => {
    if (!show || !booking) return;
    setPaidAt(todayValue());
    setPaymentMethod('TRANSFER');
    setSenderName('');
    setSenderBankName('');
    setReferenceNumber('');
    setNotes('');
    setSelectedFile(null);
    setSelectedFileName('');
    setPreviewUrl(null);
    setShowZoom(false);
    setValidationError(null);
  }, [show, booking?.id]);

  const isPendingBlocked = existingPending?.status === 'PENDING_REVIEW';
  const isFullyPaid = combinedTotal <= 0;

  const helperText = useMemo(() => {
    if (!booking) return null;
    if (isPendingBlocked) {
      return 'Bukti pembayaran sebelumnya masih menunggu review admin. Tunggu hasil review sebelum mengirim ulang.';
    }
    if (isFullyPaid) {
      return 'Pembayaran awal (sewa + deposit) sudah lunas. Tidak ada tagihan tersisa.';
    }
    return 'Unggah bukti pembayaran gabungan sewa pertama dan deposit. Pembayaran harus sesuai total yang tertera. Admin akan memverifikasi sebelum kamar diaktifkan.';
  }, [booking, isPendingBlocked, isFullyPaid]);

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

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setValidationError('Bukti bayar hanya menerima JPG, PNG, atau WebP.');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setSelectedFile(compressed);
      setSelectedFileName(`${compressed.name} (${Math.round(compressed.size / 1024)} KB)`);
      setPreviewUrl(URL.createObjectURL(compressed));
      setValidationError(null);
    } catch {
      setSelectedFile(file);
      setSelectedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      setPreviewUrl(URL.createObjectURL(file));
      setValidationError(null);
    }
  };

  const handleSubmit = async () => {
    if (!booking?.latestInvoiceId) {
      setValidationError('Invoice booking awal belum tersedia untuk pembayaran.');
      return;
    }

    if (combinedTotal <= 0) {
      setValidationError('Tidak ada tagihan yang perlu dibayar saat ini.');
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

    if (!selectedFile) {
      setValidationError('File bukti bayar wajib dipilih.');
      return;
    }

    setValidationError(null);

    try {
      setUploading(true);
      uploadingRef.current = true;
      const uploadedProof = await uploadPaymentProof(selectedFile);
      await onSubmit({
        stayId: booking.id,
        invoiceId: booking.latestInvoiceId,
        targetType: 'INVOICE',
        amountRupiah: combinedTotal,
        paidAt,
        paymentMethod,
        senderName: senderName.trim() || undefined,
        senderBankName: senderBankName.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        fileUrl: uploadedProof.fileUrl,
        fileKey: uploadedProof.fileKey,
        originalFilename: uploadedProof.originalFilename,
        mimeType: uploadedProof.mimeType,
        fileSizeBytes: uploadedProof.fileSizeBytes,
      });
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  };

  return (
    <>
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton={!submitting && !uploading}>
        <Modal.Title>Upload Bukti Pembayaran Awal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {booking ? (
          <>
            <Alert variant={isPendingBlocked ? 'warning' : 'info'} className="small">
              <div className="fw-semibold mb-1">
                {booking.room?.code ?? `Kamar #${booking.roomId}`} · Pembayaran Sewa + Deposit
              </div>
              <div>{helperText}</div>
            </Alert>

            <div className="mb-3 small text-muted">
              Invoice awal: <strong>{booking.latestInvoiceNumber ?? `INV-${booking.latestInvoiceId ?? '-'}`}</strong>
            </div>

            {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

            <div className="bg-light rounded-3 p-3 mb-3 border">
              <div className="small text-muted mb-1">Rincian Pembayaran</div>
              <div className="d-flex justify-content-between gap-3 mb-1">
                <span>Sewa pertama</span>
                <strong><CurrencyDisplay amount={invoiceRemaining} /></strong>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-1">
                <span>Deposit</span>
                <strong><CurrencyDisplay amount={depositRemaining} /></strong>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between gap-3 fs-5">
                <span className="fw-semibold">Total yang harus dibayar</span>
                <span className="fw-bold"><CurrencyDisplay amount={combinedTotal} /></span>
              </div>
            </div>

            <Alert variant="warning" className="small mb-3">
              Pembayaran harus <strong>tepat sebesar total di atas</strong>. Pembayaran sebagian tidak diterima untuk pembayaran awal booking.
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
              <Form.Label>File Bukti Bayar</Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isPendingBlocked || isFullyPaid || submitting || uploading}
              />
              <Form.Text muted>
                Gambar akan dikompres dulu di browser sebelum diunggah agar lebih hemat bandwidth dan storage server.
              </Form.Text>
              {selectedFileName ? <div className="small mt-2">File siap unggah: <strong>{selectedFileName}</strong></div> : null}
              {previewUrl ? (
                <div className="mt-3">
                  <button type="button" className="btn btn-link p-0 border rounded overflow-hidden bg-white" onClick={() => setShowZoom(true)}>
                    <img src={previewUrl} alt="Preview bukti bayar" style={{ width: 180, maxWidth: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
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
          {uploading ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
        </Button>
      </Modal.Footer>
    </Modal>

    <Modal show={showZoom} onHide={() => setShowZoom(false)} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Zoom Bukti Bayar</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {previewUrl ? <img src={previewUrl} alt="Zoom bukti bayar" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} /> : null}
      </Modal.Body>
    </Modal>
    </>
  );
}