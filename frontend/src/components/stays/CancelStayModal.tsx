import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStay } from '../../hooks/useStay';
import { Invoice, Stay } from '../../types';
import { formatRupiah } from '../../utils/formatCurrency';

export default function CancelStayModal({
  show,
  onHide,
  stay,
  invoices,
}: {
  show: boolean;
  onHide: () => void;
  stay: Stay;
  invoices: Invoice[];
}) {
  const { cancelMutation } = useStay(stay.id);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const unpaidCount = invoices.filter((invoice) => invoice.status !== 'PAID' && invoice.status !== 'CANCELLED').length;

  const handleClose = () => {
    setCancelReason('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    const trimmedReason = cancelReason.trim();
    setError('');

    if (!trimmedReason) {
      setError('Alasan pembatalan wajib diisi.');
      return;
    }

    try {
      await cancelMutation.mutateAsync({ cancelReason: trimmedReason });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal membatalkan stay');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Batalkan Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {unpaidCount ? (
          <Alert variant="warning">
            Ada {unpaidCount} invoice belum lunas. Stay tetap bisa dibatalkan, tetapi pastikan penagihan sudah diurus.
          </Alert>
        ) : null}
        <Alert variant="warning" className="mb-3">
          <div className="small">
            <strong>Stay akan dibatalkan dan status berubah menjadi CANCELLED.</strong> Aksi ini tidak dapat dibatalkan.
            {stay.depositAmountRupiah && Number(stay.depositAmountRupiah) > 0 && (
              <div className="mt-1">
                Deposit sebesar <strong>{formatRupiah(stay.depositAmountRupiah)}</strong> akan tetap tercatat dan dapat diproses melalui menu Proses Deposit setelah stay dibatalkan.
              </div>
            )}
          </div>
        </Alert>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Form.Group>
          <Form.Label>Alasan Pembatalan <span className="text-danger">*</span></Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Jelaskan alasan pembatalan stay"
          />
          <div className="text-muted small mt-1">Frontend sekarang mengirim field <code>cancelReason</code> sesuai kontrak backend.</div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button
          variant="danger"
          onClick={handleSubmit}
          disabled={cancelMutation.isPending || !cancelReason.trim()}
        >
          {cancelMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Konfirmasi Pembatalan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
