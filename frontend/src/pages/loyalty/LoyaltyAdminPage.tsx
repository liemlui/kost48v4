import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReward,
  decideRedemption,
  getLoyaltyConfig,
  getRedemptions,
  getRewards,
  updateReward,
  type LoyaltyReward,
  type RewardInput,
} from '../../api/loyalty';
import { useAuth } from '../../context/AuthContext';

const REWARD_TYPES = ['RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL'];
const STATUS_VARIANT: Record<string, string> = { PENDING: 'warning', APPROVED: 'info', FULFILLED: 'success', REJECTED: 'danger', CANCELLED: 'secondary' };

const emptyForm: RewardInput = { name: '', description: '', pointCost: 100, type: 'PHYSICAL', valueRupiah: 0, stockQty: undefined, isActive: true };

export default function LoyaltyAdminPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RewardInput>(emptyForm);

  const rewardsQuery = useQuery({ queryKey: ['admin-rewards'], queryFn: () => getRewards(true) });
  const redemptionsQuery = useQuery({ queryKey: ['admin-redemptions'], queryFn: () => getRedemptions() });
  const configQuery = useQuery({ queryKey: ['loyalty-config'], queryFn: getLoyaltyConfig });

  const perPoint = configQuery.data?.pointRupiahValue ?? 100;
  const suggestedCost = form.valueRupiah && perPoint > 0 ? Math.max(1, Math.round(form.valueRupiah / perPoint)) : null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-rewards'] });
    queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
    queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { id: number | null; input: RewardInput }) =>
      payload.id ? updateReward(payload.id, payload.input) : createReward(payload.input),
    onSuccess: () => { setShowForm(false); setError(null); invalidate(); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal menyimpan reward.'),
  });

  const decideMutation = useMutation({
    mutationFn: (p: { id: number; decision: 'APPROVE' | 'REJECT' }) => decideRedemption(p.id, p.decision),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal memproses penukaran.'),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r: LoyaltyReward) => {
    setEditId(r.id);
    setForm({ name: r.name, description: r.description ?? '', pointCost: r.pointCost, type: r.type, valueRupiah: r.valueRupiah ?? 0, stockQty: r.stockQty ?? undefined, isActive: r.isActive, fulfillmentTaskCategory: r.fulfillmentTaskCategory ?? undefined, fulfillmentTaskTitle: r.fulfillmentTaskTitle ?? undefined });
    setShowForm(true);
  };

  const pending = redemptionsQuery.data?.filter((r) => r.status === 'PENDING') ?? [];

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <h3 className="mb-0">Loyalitas & Reward</h3>
        <Badge bg="light" text="dark" className="border">1 poin ≈ Rp{perPoint.toLocaleString('id-ID')}</Badge>
      </div>
      <p className="text-muted small">Estimasi nilai poin diatur lewat env <code>LOYALTY_POINT_RUPIAH_VALUE</code>. Saran: gunakan reward layanan in-house (pembersihan/cat ulang kamar, voucher WiFi) — lebih hemat daripada diskon sewa.</p>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Permintaan Penukaran {pending.length > 0 && <Badge bg="warning" text="dark">{pending.length} menunggu</Badge>}</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead><tr><th>Tenant</th><th>Reward</th><th>Poin</th><th>Status</th><th>Tanggal</th><th className="text-end">Aksi</th></tr></thead>
            <tbody>
              {redemptionsQuery.data?.length === 0 && <tr><td colSpan={6} className="text-muted text-center py-3">Belum ada penukaran.</td></tr>}
              {redemptionsQuery.data?.map((r) => (
                <tr key={r.id}>
                  <td>{r.tenant?.fullName ?? `#${r.tenantId}`}</td>
                  <td>{r.reward?.name ?? `#${r.rewardId}`}</td>
                  <td>{r.pointCost}</td>
                  <td><Badge bg={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge></td>
                  <td><small>{new Date(r.requestedAt).toLocaleDateString('id-ID')}</small></td>
                  <td className="text-end">
                    {r.status === 'PENDING' ? (
                      <>
                        <Button size="sm" variant="success" className="me-2" disabled={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: r.id, decision: 'APPROVE' })}>Setujui</Button>
                        <Button size="sm" variant="outline-danger" disabled={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: r.id, decision: 'REJECT' })}>Tolak</Button>
                      </>
                    ) : <span className="text-muted small">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Katalog Reward</strong>
          {isOwner && <Button size="sm" variant="primary" onClick={openCreate}>+ Reward</Button>}
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead><tr><th>Nama</th><th>Tipe</th><th>Poin</th><th>Nilai</th><th>Stok</th><th>Status</th>{isOwner && <th className="text-end">Aksi</th>}</tr></thead>
            <tbody>
              {rewardsQuery.data?.length === 0 && <tr><td colSpan={isOwner ? 7 : 6} className="text-muted text-center py-3">Belum ada reward.</td></tr>}
              {rewardsQuery.data?.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}{r.description && <div className="text-muted small">{r.description}</div>}</td>
                  <td><small>{r.type}</small></td>
                  <td>{r.pointCost}</td>
                  <td>{r.valueRupiah ? `Rp${r.valueRupiah.toLocaleString('id-ID')}` : '-'}</td>
                  <td>{r.stockQty ?? '∞'}</td>
                  <td><Badge bg={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  {isOwner && <td className="text-end"><Button size="sm" variant="outline-secondary" onClick={() => openEdit(r)}>Ubah</Button></td>}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton><Modal.Title>{editId ? 'Ubah Reward' : 'Reward Baru'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Nama</Form.Label><Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Deskripsi</Form.Label><Form.Control as="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Tipe</Form.Label><Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Form.Select></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Biaya Poin</Form.Label><Form.Control type="number" min={1} value={form.pointCost} onChange={(e) => setForm({ ...form, pointCost: Number(e.target.value) })} /></Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nilai (Rp, untuk jurnal reward)</Form.Label>
            <Form.Control type="number" min={0} value={form.valueRupiah ?? 0} onChange={(e) => setForm({ ...form, valueRupiah: Number(e.target.value) })} />
            {suggestedCost != null && suggestedCost !== form.pointCost && (
              <Form.Text>
                Saran biaya poin: <strong>{suggestedCost}</strong> (≈ Rp{perPoint.toLocaleString('id-ID')}/poin).{' '}
                <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => setForm({ ...form, pointCost: suggestedCost })}>Pakai saran</Button>
              </Form.Text>
            )}
          </Form.Group>
          <Form.Group className="mb-3"><Form.Label>Stok (kosongkan = tak terbatas)</Form.Label><Form.Control type="number" min={0} value={form.stockQty ?? ''} onChange={(e) => setForm({ ...form, stockQty: e.target.value === '' ? undefined : Number(e.target.value) })} /></Form.Group>
          <hr />
          <p className="text-muted small mb-2">Opsional — jika reward ini berupa <strong>tugas staf</strong> (mis. bersihkan area umum), isi kategori tiket. Saat disetujui, tiket staf dibuat otomatis.</p>
          <Form.Group className="mb-3"><Form.Label>Kategori tugas staf</Form.Label><Form.Control placeholder="mis. CLEANING_COMMON" value={form.fulfillmentTaskCategory ?? ''} onChange={(e) => setForm({ ...form, fulfillmentTaskCategory: e.target.value || undefined })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Judul tugas staf</Form.Label><Form.Control placeholder="mis. Bersihkan dapur umum" value={form.fulfillmentTaskTitle ?? ''} onChange={(e) => setForm({ ...form, fulfillmentTaskTitle: e.target.value || undefined })} /></Form.Group>
          <Form.Check type="switch" label="Aktif" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
          <Button variant="primary" disabled={saveMutation.isPending || !form.name.trim()} onClick={() => saveMutation.mutate({ id: editId, input: form })}>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
