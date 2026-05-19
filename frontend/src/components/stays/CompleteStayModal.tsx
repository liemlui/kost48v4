import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStay } from '../../hooks/useStay';
import { Invoice, Stay } from '../../types';

export default function CompleteStayModal({
  show,
  onHide,
  onSuccess,
  stay,
  invoices,
}: {
  show: boolean;
  onHide: () => void;
  onSuccess?: () => void;
  stay: Stay;
  invoices: Invoice[];
}) {
  const { completeMutation } = useStay(stay.id);
  const [actualCheckOutDate, setActualCheckOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkoutReason, setCheckoutReason] = useState('');
  const [error, setError] = useState('');
  const unpaidCount = invoices.filter((invoice) => invoice.status !== 'PAID' && invoice.status !== 'CANCELLED').length;

  const handleClose = () => {
    setActualCheckOutDate(new Date().toISOString().slice(0, 10));
    setCheckoutReason('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validasi required fields
    if (!actualCheckOutDate) {
      setError('Tanggal check-out wajib diisi');
      return;
    }
    if (!checkoutReason.trim()) {
      setError('Alasan checkout wajib diisi');
      return;
    }
    
    try {
      await completeMutation.mutateAsync({ actualCheckOutDate, checkoutReason: checkoutReason.trim() });
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal checkout stay');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Checkout Final — Tenant Keluar Kamar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="small mb-3">
          Checkout Final menandakan tenant benar-benar keluar dari kamar. Status stay akan berubah menjadi selesai dan deposit diproses terpisah.
        </Alert>
        {unpaidCount > 0 ? (
          <Alert variant="danger">
            <strong>Checkout tidak dapat dilakukan.</strong> Masih ada {unpaidCount} invoice yang belum lunas atau belum dibatalkan. Selesaikan semua invoice terlebih dahulu sebelum melakukan checkout final.
          </Alert>
        ) : null}
        <Alert variant="info" className="mb-3">
          <div className="small">
            <strong>Deposit diproses terpisah setelah checkout.</strong> Setelah tenant keluar kos, admin akan mengecek kondisi kamar dan barang terlebih dahulu sebelum memutuskan refund deposit.
          </div>
        </Alert>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Form.Group className="mb-3">
          <Form.Label>
            Tanggal Check-out<span className="text-danger ms-1">*</span>
          </Form.Label>
          <Form.Control 
            type="date" 
            value={actualCheckOutDate} 
            onChange={(e) => setActualCheckOutDate(e.target.value)} 
            required
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>
            Alasan Checkout<span className="text-danger ms-1">*</span>
          </Form.Label>
          <Form.Control 
            as="textarea" 
            rows={3} 
            value={checkoutReason} 
            onChange={(e) => setCheckoutReason(e.target.value)} 
            required
            placeholder="Contoh: Kontrak selesai, pindah kos, dll."
          />
          <div className="text-muted small mt-1">Wajib diisi untuk mencatat alasan tenant keluar kos.</div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={completeMutation.isPending || !actualCheckOutDate || !checkoutReason.trim() || unpaidCount > 0}
          variant={unpaidCount > 0 ? 'secondary' : 'primary'}
        >
          {completeMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Konfirmasi Checkout Final'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
