import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import { listPendingLossRefunds, processLossRefund, type LossRefund } from '../../api/lossRefunds';
import { formatRupiah } from '../../utils/formatCurrency';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LossRefundsPage() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<LossRefund | null>(null);
  const [note, setNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loss-refunds', 'pending'],
    queryFn: listPendingLossRefunds,
  });

  const mutation = useMutation({
    mutationFn: () => processLossRefund(target!.id, { note: note.trim() || undefined, proofUrl: proofUrl.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loss-refunds', 'pending'] });
      setTarget(null);
      setNote('');
      setProofUrl('');
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Gagal memproses refund.');
    },
  });

  const submitRefund = () => {
    if (!proofUrl.trim()) {
      setError('URL bukti transfer balik wajib diisi.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  const items = data ?? [];

  return (
    <div>
      <PageHeader
        title="Refund Kalah-Cepat"
        description="Tenant yang kalah first-paid-wins padahal sudah transfer — kembalikan dananya lalu tandai selesai."
      />
      {/* R-30: chip penanda halaman eksklusif owner */}
      <div className="mb-3">
        <span className="badge bg-danger-subtle text-danger-emphasis small" title="Halaman ini tidak dapat dilihat oleh Admin, Staf, atau Penghuni.">Hanya Owner</span>
      </div>

      <Card>
        <Card.Body>
          {isLoading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : items.length === 0 ? (
            <Alert variant="success" className="mb-0">Tidak ada refund yang menunggu diproses. ✅</Alert>
          ) : (
            <Table responsive hover className="align-middle">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Kamar</th>
                  <th className="text-end">Nominal Refund</th>
                  <th>Catatan</th>
                  <th>Dibatalkan</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-semibold">{r.tenant?.fullName ?? `Tenant #${r.id}`}</div>
                      {r.tenant?.phone && <div className="text-muted small">{r.tenant.phone}</div>}
                    </td>
                    <td>{r.room?.code ? `${r.room.code}${r.room.name ? ` - ${r.room.name}` : ''}` : '-'}</td>
                    <td className="text-end fw-semibold">{formatRupiah(r.lossRefundAmountRupiah)}</td>
                    <td className="small text-muted">{r.lossRefundNote ?? r.cancelReason ?? '-'}</td>
                    <td className="small">{formatDate(r.updatedAt)}</td>
                    <td className="text-end">
                      <Button size="sm" variant="primary" onClick={() => { setTarget(r); setNote(''); setProofUrl(''); setError(null); }}>
                        Tandai sudah direfund
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!target} onHide={() => setTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Proses Refund</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {target && (
            <>
              <p className="mb-3">
                Kembalikan <strong>{formatRupiah(target.lossRefundAmountRupiah)}</strong> ke{' '}
                <strong>{target.tenant?.fullName}</strong>
                {target.tenant?.phone ? ` (${target.tenant.phone})` : ''}, lalu catat di bawah.
              </p>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form.Group className="mb-3">
                <Form.Label>Catatan (mis. bukti transfer balik / ref)</Form.Label>
                <Form.Control as="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Transfer balik BCA ref ..." />
              </Form.Group>
              <Form.Group>
                <Form.Label>URL bukti transfer balik</Form.Label>
                <Form.Control value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="/uploads/refunds/..." />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setTarget(null)} disabled={mutation.isPending}>Batal</Button>
          <Button variant="primary" onClick={submitRefund} disabled={mutation.isPending || !proofUrl.trim()}>
            {mutation.isPending ? 'Memproses…' : 'Tandai Selesai (refund dikembalikan)'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
