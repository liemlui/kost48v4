import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffWorkAudit, type StaffAuditPayload, type StaffPerformanceSummary } from '../../api/staffPerformance';

type Props = {
  show: boolean;
  staff?: StaffPerformanceSummary | null;
  onHide: () => void;
};

export default function StaffAuditModal({ show, staff, onHide }: Props) {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<StaffAuditPayload['sourceType']>('MANUAL_AUDIT');
  const [result, setResult] = useState<StaffAuditPayload['result']>('PASS');
  const [notes, setNotes] = useState('');
  const [sourceId, setSourceId] = useState('');

  useEffect(() => {
    if (show) {
      setSourceType('MANUAL_AUDIT');
      setResult('PASS');
      setNotes('');
      setSourceId('');
    }
  }, [show]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!staff) throw new Error('Staff belum dipilih');
      return createStaffWorkAudit({
        staffId: staff.staff.id,
        sourceType,
        sourceId: sourceId.trim() ? Number(sourceId) : undefined,
        result,
        notes,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-staff-performance'] });
      onHide();
    },
  });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Audit Pekerjaan Staff</Modal.Title></Modal.Header>
      <Modal.Body>
        {mutation.isError ? <Alert variant="danger">Audit belum tersimpan. Coba lagi.</Alert> : null}
        <Alert variant="light" className="border small">Audit harus berdasarkan pengecekan nyata. Jika pekerjaan belum sesuai, tulis catatan agar staff bisa memperbaiki.</Alert>
        <Form.Group className="mb-3">
          <Form.Label>Staff</Form.Label>
          <Form.Control value={staff?.staff.fullName ?? ''} disabled />
        </Form.Group>
        <div className="row g-2">
          <div className="col-6">
            <Form.Group className="mb-3">
              <Form.Label>Jenis pekerjaan</Form.Label>
              <Form.Select value={sourceType} onChange={(event) => setSourceType(event.currentTarget.value as StaffAuditPayload['sourceType'])}>
                <option value="MANUAL_AUDIT">Audit manual</option>
                <option value="ROUTINE">Checklist</option>
                <option value="TICKET">Tugas/tiket</option>
                <option value="METER">Catat meter</option>
                <option value="STOCK_REPORT">Stok gudang/alat</option>
                <option value="ROOM_CHECK">Cek kamar</option>
              </Form.Select>
            </Form.Group>
          </div>
          <div className="col-6">
            <Form.Group className="mb-3">
              <Form.Label>ID pekerjaan</Form.Label>
              <Form.Control inputMode="numeric" value={sourceId} onChange={(event) => setSourceId(event.currentTarget.value)} placeholder="Opsional" />
            </Form.Group>
          </div>
        </div>
        <Form.Group className="mb-3">
          <Form.Label>Hasil audit</Form.Label>
          <Form.Select value={result} onChange={(event) => setResult(event.currentTarget.value as StaffAuditPayload['result'])}>
            <option value="PASS">Sesuai</option>
            <option value="NEEDS_FIX">Kurang rapi / perlu ulang</option>
            <option value="FAILED">Tidak sesuai</option>
            <option value="NOT_DONE">Diklaim selesai tapi belum dikerjakan</option>
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} placeholder="Contoh: lantai masih licin, minta pel ulang area kamar mandi." />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Batal</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !staff}>{mutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : 'Simpan Audit'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
