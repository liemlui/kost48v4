import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import CurrencyDisplay from '../common/CurrencyDisplay';
import SafeImage from '../common/SafeImage';
import CameraOrGalleryInput from '../common/CameraOrGalleryInput';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { TENANT_PAYMENT_PROOF_ACCEPT, prepareTenantPaymentProof, tenantPaymentProofReadyLabel } from '../../utils/tenantPaymentProof';
import { submitBatchPaymentWithProof } from '../../api/paymentSubmissions';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import type { Invoice, PaymentMethod } from '../../types';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  show: boolean;
  invoices: Invoice[];
  stayId: number;
  onHide: () => void;
  onSuccess: () => void;
};

export default function SubmitBatchPaymentModal({
  show,
  invoices,
  stayId,
  onHide,
  onSuccess,
}: Props) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const submittingRef = useRef(false);

  const totalAmount = invoices.reduce((s, inv) => s + getInvoiceTotalAmount(inv), 0);

  useEffect(() => {
    submittingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    if (!show) return;
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
    setErrorMessage(null);
  }, [show]);

  // Cleanup object URL saat unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    if (!selectedFile) {
      setValidationError('File bukti bayar wajib dipilih.');
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
    setErrorMessage(null);

    try {
      setUploading(true);

      await submitBatchPaymentWithProof({
        stayId,
        invoiceIds: invoices.map((i) => i.id),
        paidAt,
        paymentMethod,
        senderName: senderName.trim() || undefined,
        senderBankName: senderBankName.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      }, selectedFile);

      onSuccess();
      onHide();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Gagal mengirim bukti bayar batch. Coba kirim satu per satu.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton={!uploading}>
        <Modal.Title>Bayar Sekaligus & Kirim Bukti</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="small">
          <div className="fw-semibold mb-1">
            Pembayaran Batch — {invoices.length} Tagihan
          </div>
          <div>
            Kirim 1 bukti bayar untuk {invoices.length} tagihan sekaligus.
            Admin akan memeriksa bukti pembayaran.
          </div>
        </Alert>

        {/* Daftar invoice */}
        <div className="mb-3">
          <div className="small text-muted fw-semibold mb-2">Tagihan yang dibayar:</div>
          {invoices.map((inv) => (
            <div key={inv.id} className="d-flex justify-content-between align-items-center bg-light rounded p-2 mb-1">
              <div>
                <strong>{inv.invoiceNumber ?? `#${inv.id}`}</strong>
                <span className="text-muted ms-2 small">{inv.status === 'OVERDUE' ? '⚠️ Jatuh tempo' : ''}</span>
              </div>
              <strong><CurrencyDisplay amount={getInvoiceTotalAmount(inv)} /></strong>
            </div>
          ))}
          <div className="d-flex justify-content-between align-items-center bg-primary bg-opacity-10 rounded p-2 mt-2 fw-bold">
            <span>Total</span>
            <span><CurrencyDisplay amount={totalAmount} /></span>
          </div>
        </div>

        <Alert variant="warning" className="small mb-3">
          Pembayaran harus <strong>tepat sebesar total di atas</strong> dan bukti wajib dikirim di modal ini.
        </Alert>

        {validationError ? <Alert variant="danger">{validationError}</Alert> : null}
        {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

        <Form.Group className="mb-3">
          <Form.Label>Tanggal Bayar</Form.Label>
          <Form.Control
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.currentTarget.value)}
            disabled={uploading}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Metode Pembayaran</Form.Label>
          <Form.Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.currentTarget.value as PaymentMethod)}
            disabled={uploading}
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
            disabled={uploading}
            helpText="Foto bukti langsung atau pilih screenshot dari galeri. JPG, PNG, atau WebP maksimal 2MB."
          />
          <Form.Text muted>
            Format bukti pembayaran: JPG, PNG, atau WebP maksimal 2MB.
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
              <div className="small text-muted mt-2">Klik gambar untuk zoom.</div>
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
            disabled={uploading}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Bank Pengirim</Form.Label>
          <Form.Control
            type="text"
            value={senderBankName}
            onChange={(e) => setSenderBankName(e.currentTarget.value)}
            placeholder="Contoh: BCA"
            disabled={uploading}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nomor Referensi</Form.Label>
          <Form.Control
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.currentTarget.value)}
            placeholder="Contoh: 20260426/TRF/001"
            disabled={uploading}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="Opsional."
            disabled={uploading}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>Tutup</Button>
        <Button onClick={handleSubmit} disabled={uploading}>
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
