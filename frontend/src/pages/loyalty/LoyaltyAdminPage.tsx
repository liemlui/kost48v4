import PageHeader from '../../components/common/PageHeader';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CurrencyInput from '../../components/common/CurrencyInput';
import { formatDateOnly } from '../../utils/dateTime';
import { getStatusLabel } from '../../utils/statusLabels';
import {
  confirmPeerReport,
  createReward,
  decideRedemption,
  getLoyaltyConfig,
  getPeerReportsAdmin,
  getRedemptions,
  getRewards,
  moderatePeerReport,
  updateReward,
  type LoyaltyReward,
  type RewardInput,
} from '../../api/loyalty';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';

const REWARD_TYPES = ['RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL'];
const REWARD_TYPE_LABEL: Record<string, string> = {
  RENT_DISCOUNT: 'Diskon Sewa',
  SERVICE_ADDON: 'Layanan Tambahan',
  METER_DISCOUNT: 'Diskon Meter (Listrik/Air)',
  BADGE: 'Lencana',
  PHYSICAL: 'Barang Fisik',
};
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
  const peerQuery = useQuery({ queryKey: ['admin-peer-reports'], queryFn: () => getPeerReportsAdmin() });

  const peerMutation = useMutation({
    mutationFn: (p: { id: number; action: 'ACKNOWLEDGE' | 'DISMISS' | 'CONFIRM' }) =>
      p.action === 'CONFIRM' ? confirmPeerReport(p.id) : moderatePeerReport(p.id, p.action),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['admin-peer-reports'] }); },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal memproses laporan.'),
  });

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
    <div>
      <PageHeader
        eyebrow="Loyalitas"
        title="Loyalitas & Reward"
        description="Atur reward, penukaran poin, dan pantau laporan sesama penghuni."
      />
      <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <Badge bg="light" text="dark" className="border">1 poin ≈ {formatRupiah(perPoint)}</Badge>
      </div>
      <p className="text-muted small">1 poin ≈ {formatRupiah(perPoint)}. Nilai dapat disesuaikan oleh owner. Saran: gunakan reward layanan in-house (pembersihan/cat ulang kamar, voucher WiFi) — lebih hemat daripada diskon sewa.</p>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Permintaan Penukaran {pending.length > 0 && <Badge bg="warning" text="dark">{pending.length} menunggu</Badge>}</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead><tr><th>Tenant</th><th>Reward</th><th>Poin</th><th>Status</th><th>Tanggal</th><th className="text-end">Aksi</th></tr></thead>
            <tbody>
              {(!redemptionsQuery.data || redemptionsQuery.data.length === 0) && (
                <tr><td colSpan={6} className="text-center py-4">
                  <div className="text-muted mb-2">Belum ada penukaran.</div>
                  <small className="text-muted">Tenant akan melihat reward yang tersedia di portal mereka. Pastikan katalog reward sudah diisi.</small>
                </td></tr>
              )}
              {redemptionsQuery.data?.map((r) => (
                <tr key={r.id}>
                  <td>{r.tenant?.fullName ?? `#${r.tenantId}`}</td>
                  <td>{r.reward?.name ?? `#${r.rewardId}`}</td>
                  <td>{r.pointCost}</td>
                  <td><Badge bg={STATUS_VARIANT[r.status] ?? 'secondary'}>{getStatusLabel(r.status, undefined, { domain: 'loyalty' })}</Badge></td>
                  <td><small>{formatDateOnly(r.requestedAt)}</small></td>
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

      <Card className="mb-4">
        <Card.Header><strong>Laporan Sikap Antar-Tenant</strong> <small className="text-muted">(moderasi — identitas pelapor dirahasiakan dari terlapor)</small></Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead><tr><th>Pelapor</th><th>Terlapor</th><th>Kategori</th><th>Deskripsi</th><th>Status</th><th className="text-end">Aksi</th></tr></thead>
            <tbody>
              {peerQuery.data?.length === 0 && <tr><td colSpan={6} className="text-center py-4"><div className="text-muted mb-2">Belum ada laporan.</div><small className="text-muted">Laporan sikap antar-tenant akan muncul di sini untuk dimoderasi.</small></td></tr>}
              {peerQuery.data?.map((r) => (
                <tr key={r.id}>
                  <td><small>{r.reporter?.fullName ?? '-'}</small></td>
                  <td><small>{r.reportee?.fullName ?? '-'}</small></td>
                  <td><small>{r.category}</small></td>
                  <td><small>{r.description}</small></td>
                  <td><Badge bg={r.status === 'CONFIRMED' ? 'success' : r.status === 'DISMISSED' ? 'secondary' : 'warning'} text={r.status === 'CONFIRMED' || r.status === 'DISMISSED' ? undefined : 'dark'}>{getStatusLabel(r.status, undefined, { domain: 'loyalty' })}</Badge></td>
                  <td className="text-end">
                    {r.status === 'PENDING_REVIEW' && (
                      <>
                        <Button size="sm" variant="primary" className="me-2" disabled={peerMutation.isPending} onClick={() => peerMutation.mutate({ id: r.id, action: 'ACKNOWLEDGE' })}>Validasi</Button>
                        <Button size="sm" variant="outline-secondary" disabled={peerMutation.isPending} onClick={() => peerMutation.mutate({ id: r.id, action: 'DISMISS' })}>Tolak</Button>
                      </>
                    )}
                    {r.status === 'IMPROVED' && (
                      <Button size="sm" variant="success" disabled={peerMutation.isPending} onClick={() => peerMutation.mutate({ id: r.id, action: 'CONFIRM' })}>Konfirmasi membaik (+poin)</Button>
                    )}
                    {!['PENDING_REVIEW', 'IMPROVED'].includes(r.status) && <span className="text-muted small">—</span>}
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
              {rewardsQuery.data?.length === 0 && <tr><td colSpan={isOwner ? 7 : 6} className="text-center py-4"><div className="text-muted mb-2">Belum ada reward.</div>{isOwner ? <small className="text-muted">Gunakan tombol <strong>+ Reward</strong> di atas untuk menambahkan katalog reward. Tenant akan melihat reward yang aktif di portal mereka.</small> : <small className="text-muted">Belum ada reward yang tersedia. Hubungi owner untuk menambahkan reward.</small>}</td></tr>}
              {rewardsQuery.data?.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}{r.description && <div className="text-muted small">{r.description}</div>}</td>
                  <td><small>{REWARD_TYPE_LABEL[r.type] ?? r.type}</small></td>
                  <td>{r.pointCost}</td>
                  <td>{r.valueRupiah ? `{formatRupiah(r.valueRupiah)}` : '-'}</td>
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
          <Form.Group className="mb-3"><Form.Label>Tipe</Form.Label><Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REWARD_TYPES.map((t) => <option key={t} value={t}>{REWARD_TYPE_LABEL[t] ?? t}</option>)}</Form.Select></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Biaya Poin</Form.Label><CurrencyInput value={form.pointCost} onChange={(v) => setForm({ ...form, pointCost: v ?? 0 })} /></Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nilai (Rp, untuk jurnal reward)</Form.Label>
            <CurrencyInput value={form.valueRupiah ?? 0} onChange={(v) => setForm({ ...form, valueRupiah: v ?? 0 })} />
            {suggestedCost != null && suggestedCost !== form.pointCost && (
              <Form.Text>
                Saran biaya poin: <strong>{suggestedCost}</strong> (≈ {formatRupiah(perPoint)}/poin).{' '}
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
          <Button variant="primary" disabled={saveMutation.isPending || !form.name.trim()} onClick={() => saveMutation.mutate({ id: editId, input: form })}>{saveMutation.isPending ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Reward'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
    </div>
  );
}
