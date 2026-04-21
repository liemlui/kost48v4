import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { usePayments } from '../../hooks/usePayments';
import { Invoice, PaymentMethod } from '../../types';

function totalPaid(invoice: Invoice) {
  if (typeof invoice.paidAmountRupiah === 'number') return invoice.paidAmountRupiah;
  return (invoice.payments ?? []).reduce((sum, item) => sum + Number(item.amountRupiah ?? 0), 0);
}

export default function AddPaymentModal({ show, onHide, invoice }: { show: boolean; onHide: () => void; invoice: Invoice }) {
  const remainingAmount = Math.max(0, Number(invoice.totalAmountRupiah ?? 0) - totalPaid(invoice));
  const [amountRupiah, setAmountRupiah] = useState(String(remainingAmount || ''));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { createMutation } = usePayments(invoice.id, false);

  const previewStatus = useMemo(() => {
    const total = Number(invoice.totalAmountRupiah ?? 0);
    const nextPaid = totalPaid(invoice) + Number(amountRupiah || 0);
    if (nextPaid >= total) return 'PAID';
    if (nextPaid > 0) return 'PARTIAL';
    return 'ISSUED';
  }, [amountRupiah, invoice]);

  const handleClose = () => {
    setAmountRupiah(String(remainingAmount || ''));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod('TRANSFER');
    setReferenceNo('');
    setNote('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        invoiceId: invoice.id,
        paymentDate,
        amountRupiah: Number(amountRupiah),
        method,
        referenceNo: referenceNo || undefined,
        note: note || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menambah pembayaran');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Catat Pembayaran</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Alert variant="light" className="border">
          <div>Total invoice: {invoice.totalAmountRupiah ?? 0}</div>
          <div>Sudah dibayar: {totalPaid(invoice)}</div>
          <div>Sisa tagihan: {remainingAmount}</div>
          <div className="mt-2"><strong>Preview status setelah bayar: {previewStatus}</strong></div>
        </Alert>
        <Form.Group className="mb-3">
          <Form.Label>Nominal</Form.Label>
          <Form.Control type="number" value={amountRupiah} onChange={(e) => setAmountRupiah(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tanggal Bayar</Form.Label>
          <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Metode</Form.Label>
          <Form.Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {['CASH', 'TRANSFER', 'QRIS'].map((item) => <option key={item} value={item}>{item}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Reference No</Form.Label>
          <Form.Control value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : 'Simpan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
