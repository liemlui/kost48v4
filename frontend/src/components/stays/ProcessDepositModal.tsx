import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useStay } from '../../hooks/useStay';
import { Stay } from '../../types';
import { formatRupiah } from '../../utils/formatCurrency';

type DepositAction = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT';

export default function ProcessDepositModal({ show, onHide, stay }: { show: boolean; onHide: () => void; stay: Stay }) {
  const { processDepositMutation } = useStay(stay.id);
  const depositAmount = Number(stay.depositAmountRupiah ?? 0);
  const [action, setAction] = useState<DepositAction>('FULL_REFUND');
  const [deduction, setDeduction] = useState('0');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const deductionNumber = Number(deduction || 0);
  const refundAmount = useMemo(() => {
    if (action === 'FORFEIT') return 0;
    if (action === 'FULL_REFUND') return depositAmount;
    return Math.max(0, depositAmount - deductionNumber);
  }, [action, deductionNumber, depositAmount]);

  const handleClose = () => {
    setAction('FULL_REFUND');
    setDeduction('0');
    setNote('');
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');

    if (action === 'PARTIAL_REFUND' && deductionNumber > depositAmount) {
      setError('Potongan tidak boleh melebihi deposit.');
      return;
    }

    try {
      await processDepositMutation.mutateAsync({
        action,
        depositDeductionRupiah: action === 'FORFEIT' ? depositAmount : action === 'PARTIAL_REFUND' ? deductionNumber : 0,
        depositRefundedRupiah: refundAmount,
        depositNote: note || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memproses deposit');
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Proses Deposit</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <Alert variant="light" className="border">
          <div>Deposit awal: <strong>{formatRupiah(depositAmount)}</strong></div>
          <div>Aksi dipilih: <strong>{action}</strong></div>
          <div>Total refund: <strong>{formatRupiah(refundAmount)}</strong></div>
        </Alert>
        <Form.Group className="mb-3">
          <Form.Label>Aksi Deposit</Form.Label>
          <Form.Select value={action} onChange={(e) => setAction(e.target.value as DepositAction)}>
            <option value="FULL_REFUND">Refund Penuh</option>
            <option value="PARTIAL_REFUND">Refund Sebagian</option>
            <option value="FORFEIT">Hangus / Forfeit</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Potongan</Form.Label>
          <Form.Control
            type="number"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
            disabled={action !== 'PARTIAL_REFUND'}
          />
          <div className="text-muted small mt-1">
            Potongan hanya dipakai untuk refund sebagian. Untuk refund penuh nilainya otomatis 0. Untuk forfeit seluruh deposit dianggap hangus.
          </div>
        </Form.Group>
        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan refund / potongan / hangus" />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button onClick={handleSubmit} disabled={processDepositMutation.isPending}>
          {processDepositMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Proses Deposit'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
