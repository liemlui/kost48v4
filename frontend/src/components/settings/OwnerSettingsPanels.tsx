// FILE: OwnerSettingsPage.tsx — halaman pengaturan owner: billing, AI, notifikasi, dsb
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import client from '../../api/client';
import SafeImage from '../common/SafeImage';
import CurrencyInput from '../common/CurrencyInput';
import { SkeletonBlock } from '../common/SkeletonLoader';
import { useConfirm } from '../common/ConfirmProvider';
import { useAuth } from '../../context/AuthContext';
import { createFaq, deleteFaq, fetchAllFaqs, updateFaq, type FaqItem } from '../../api/faqs';
import { fetchOperationalSettings, pickOperationalPayload, updateOperationalSettings, type OperationalSetting } from '../../api/settings';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { WIFI_DEFAULT_PRICE_RUPIAH } from '../../config/constants';
import { listFacilityImages, uploadFacilityImage, deleteFacilityImage } from '../../api/facilityImages';
import { deleteMarketingAsset, listMarketingAssets, uploadMarketingAsset } from '../../api/marketingAssets';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getOwnerAiStatus, getOwnerAiUsage, testOwnerAiConnection } from '../../api/ai';
import { generateFaqDraft, type FaqDraftResult } from '../../api/ai';
import { listAiDrafts, reviewAiDraft, expireAiDrafts, type AiDraft, type AiDraftStatus } from '../../api/aiDrafts';
import AiAssistButton from '../ai/AiAssistButton';
import AiResultPanel from '../ai/AiResultPanel';

/* ─── Facility Photos ──────────────────────────────────────────────── */

const FACILITY_SLUGS: { slug: string; label: string }[] = [
  { slug: 'parkir-luas', label: 'Parkir luas' },
  { slug: 'dapur-bersama', label: 'Dapur bersama' },
  { slug: 'air-pdam-tandon', label: 'Air PDAM + tandon' },
  { slug: 'balkon-santai', label: 'Balkon santai' },
  { slug: 'area-jemur', label: 'Area jemur' },
  { slug: 'taman', label: 'Taman/halaman' },
  { slug: 'kasur', label: 'Kasur' },
  { slug: 'lemari-baju', label: 'Lemari baju' },
  { slug: 'ac-kipas', label: 'AC / kipas' },
  { slug: 'kamar-mandi', label: 'Kamar mandi' },
  { slug: 'wifi', label: 'WiFi' },
  { slug: 'galon-air', label: 'Galon air' },
  { slug: 'tv-tambahan', label: 'TV tambahan' },
];

// ═══════════════════════════════════════════════════════════
//  COMPONENT: Helpers & Sub-Panels
// ═══════════════════════════════════════════════════════════

function resolvePublicPreviewUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('/uploads/room-images/')) return resolveAbsoluteFileUrl(url) ?? url;
  return url;
}

export function FacilityPhotoPanel() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: uploaded = [], isLoading, refetch } = useQuery({
    queryKey: ['facility-images'],
    queryFn: listFacilityImages,
  });

  const uploadedMap = new Map(uploaded.map((u) => [u.slug, u.url]));

  const handleUpload = async (slug: string, file: File) => {
    setUploading(slug);
    setError('');
    try {
      await uploadFacilityImage(slug, file);
      qc.invalidateQueries({ queryKey: ['facility-images'] });
    } catch (err) {
      const label = FACILITY_SLUGS.find((f) => f.slug === slug)?.label ?? slug;
      setError(`Gagal upload foto "${label}": ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (slug: string) => {
    const ok = await confirm({ title: 'Hapus Foto Fasilitas', message: `Hapus foto untuk "${FACILITY_SLUGS.find((f) => f.slug === slug)?.label}"?`, confirmLabel: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await deleteFacilityImage(slug);
      qc.invalidateQueries({ queryKey: ['facility-images'] });
    } catch (err) {
      setError(`Gagal hapus: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="h5 mb-0">Foto Fasilitas</h3>
        <small className="text-muted">
          Upload 1 foto real per fasilitas KOST48. Foto akan tampil di halaman publik (beranda).
          Format: JPG/PNG/WebP, maks. 2MB.
        </small>
      </div>

      {error && <Alert variant="danger" className="py-2 small mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}

      {isLoading ? (
        <div className="py-4 text-center"><Spinner animation="border" size="sm" /></div>
      ) : (
        <Row className="g-3">
          {FACILITY_SLUGS.map(({ slug, label }) => {
            const imageUrl = uploadedMap.get(slug);
            return (
              <Col xs={6} md={4} lg={3} key={slug}>
                <div className="settings-facility-card">
                  <div className="settings-facility-img-wrap">
                    {imageUrl ? (
                      <SafeImage
                        src={imageUrl}
                        alt={label}
                        className="settings-facility-img"
                      />
                    ) : (
                      <div className="settings-facility-img-placeholder">
                        <span>📷</span>
                        <small>Belum ada foto</small>
                      </div>
                    )}
                  </div>
                  <div className="settings-facility-info">
                    <strong>{label}</strong>
                  </div>
                  <div className="settings-facility-actions d-flex gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      id={`facility-file-${slug}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(slug, e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      size="sm"
                      variant={imageUrl ? 'outline-primary' : 'primary'}
                      onClick={() => document.getElementById(`facility-file-${slug}`)?.click()}
                      disabled={uploading === slug}
                      className="flex-fill"
                    >
                      {uploading === slug ? <><Spinner animation="border" size="sm" /> Upload...</> : imageUrl ? 'Ganti' : 'Upload'}
                    </Button>
                    {imageUrl && (
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(slug)}>
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

export function MarketingAssetPanel() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['marketing-assets'],
    queryFn: listMarketingAssets,
  });

  const handleUpload = async (slug: string, file: File) => {
    setUploading(slug);
    setError('');
    try {
      await uploadMarketingAsset(slug, file);
      qc.invalidateQueries({ queryKey: ['marketing-assets'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal upload aset marketing'));
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (slug: string, label: string) => {
    const ok = await confirm({ title: 'Hapus Aset Marketing', message: `Hapus upload "${label}" dan kembali ke aset bawaan?`, confirmLabel: 'Hapus', variant: 'danger' });
    if (!ok) return;
    setError('');
    try {
      await deleteMarketingAsset(slug);
      qc.invalidateQueries({ queryKey: ['marketing-assets'] });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus aset marketing'));
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="h5 mb-0">Aset Publik & Brosur</h3>
        <small className="text-muted">
          Kelola foto hero, galeri, spanduk, dan brosur yang tampil di landing page. Jika upload dihapus,
          halaman publik kembali memakai aset bawaan.
        </small>
      </div>

      {error && <Alert variant="danger" className="py-2 small mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}
      {isError && !isLoading && (
        <Alert variant="warning" className="d-flex align-items-start gap-3">
          <div className="flex-fill">
            <strong>Endpoint aset marketing belum bisa dibaca.</strong><br />
            <span className="small">Pastikan backend sudah berjalan dengan kode terbaru.</span>
          </div>
          <Button size="sm" variant="outline-warning" onClick={() => refetch()}>Coba lagi</Button>
        </Alert>
      )}

      {isLoading ? (
        <div className="py-4 text-center"><Spinner animation="border" size="sm" /></div>
      ) : (
        <Row className="g-3">
          {assets.map((asset) => {
            const imageUrl = resolvePublicPreviewUrl(asset.activeUrl);
            return (
              <Col xs={6} md={4} lg={3} key={asset.slug}>
                <div className="settings-facility-card">
                  <div className="settings-facility-img-wrap">
                    {imageUrl ? (
                      <SafeImage
                        src={imageUrl}
                        alt={asset.label}
                        className="settings-facility-img"
                        resolveUrl={false}
                      />
                    ) : (
                      <div className="settings-facility-img-placeholder">
                        <span>Foto</span>
                        <small>Belum ada aset</small>
                      </div>
                    )}
                  </div>
                  <div className="settings-facility-info">
                    <strong>{asset.label}</strong>
                    <Badge bg={asset.url ? 'primary' : 'secondary'} className="mt-1">
                      {asset.url ? 'Upload owner' : 'Bawaan'}
                    </Badge>
                  </div>
                  <div className="settings-facility-actions d-flex gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      id={`marketing-asset-file-${asset.slug}`}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(asset.slug, e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      size="sm"
                      variant={asset.url ? 'outline-primary' : 'primary'}
                      onClick={() => document.getElementById(`marketing-asset-file-${asset.slug}`)?.click()}
                      disabled={uploading === asset.slug}
                      className="flex-fill"
                    >
                      {uploading === asset.slug ? <><Spinner animation="border" size="sm" /> Upload...</> : asset.url ? 'Ganti' : 'Upload'}
                    </Button>
                    {asset.url && (
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(asset.slug, asset.label)}>
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}

const FAQ_CATEGORIES = ['Lokasi', 'Tarif', 'Fasilitas', 'Aturan', 'Layanan', 'Umum'];

const EMPTY_FORM = { question: '', answer: '', category: 'Umum', sortOrder: 0, isActive: true };

type FaqForm = typeof EMPTY_FORM;

// Mutation payload includes editId to avoid stale closure issues
type SavePayload = FaqForm & { editId: number | null };

/* ─── FAQ Management ───────────────────────────────────────────────── */

export function FaqManagementPanel() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [lastDraft, setLastDraft] = useState<FaqDraftResult | null>(null);

  const { data: faqs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['owner-faqs'],
    queryFn: fetchAllFaqs,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ editId, ...f }: SavePayload) => {
      if (editId !== null) return updateFaq(editId, f);
      return createFaq(f);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-faqs'] });
      qc.invalidateQueries({ queryKey: ['public-faqs'] });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Gagal menyimpan FAQ')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-faqs'] });
      qc.invalidateQueries({ queryKey: ['public-faqs'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateFaq(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-faqs'] });
      qc.invalidateQueries({ queryKey: ['public-faqs'] });
    },
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: faqs.length });
    setError('');
    setShowForm(true);
  };

  const openEdit = (faq: FaqItem) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      sortOrder: faq.sortOrder,
      isActive: faq.isActive ?? true,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('Pertanyaan dan jawaban wajib diisi.');
      return;
    }
    saveMutation.mutate({ ...form, editId: editingId });
  };

  const applyDraftItem = (item: FaqDraftResult['result']['items'][number]) => {
    setEditingId(null);
    setForm({
      question: item.question,
      answer: item.answer,
      category: FAQ_CATEGORIES.includes(item.category) ? item.category : 'Umum',
      sortOrder: item.sortOrder,
      isActive: true,
    });
    setShowForm(true);
    setError('');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="h5 mb-0">FAQ Publik</h3>
          <small className="text-muted">FAQ ini tampil di halaman publik /. Owner dan Admin bisa mengelola.</small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <AiAssistButton<FaqDraftResult>
            label="Buat Draft FAQ dengan AI"
            loadingLabel="Menyusun draft FAQ..."
            run={async () => {
              const draft = await generateFaqDraft();
              setLastDraft(draft);
              return draft;
            }}
            renderResult={(draft) => (
              <AiResultPanel
                title="Draft FAQ Owner AI"
                mode={draft.mode}
                fallback={draft.fallback}
                warnings={draft.warnings}
                usage={draft.usage}
              >
                <div className="small text-muted mb-2">
                  Pilih item yang ingin dimasukkan ke form. Draft ini belum mengubah FAQ publik.
                </div>
                <div className="d-grid gap-2">
                  {draft.result.items.slice(0, 6).map((item, index) => (
                    <div key={`${item.question}-${index}`} className="border rounded p-2">
                      <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                        <Badge bg="light" text="dark" className="border">{item.category}</Badge>
                        <Badge bg="light" text="dark" className="border">#{item.sortOrder}</Badge>
                      </div>
                      <div className="fw-semibold">{item.question}</div>
                      <div className="small text-muted mb-2">{item.answer}</div>
                      <Button size="sm" variant="outline-primary" onClick={() => applyDraftItem(item)}>
                        Pakai ke Form FAQ
                      </Button>
                    </div>
                  ))}
                </div>
              </AiResultPanel>
            )}
          />
          <Button size="sm" onClick={openNew}>+ Tambah FAQ</Button>
        </div>
      </div>

      {lastDraft?.result.publicCopyDraft ? (
        <Alert variant="light" className="border small">
          <strong>Ringkasan copy publik draft:</strong> {lastDraft.result.publicCopyDraft}
        </Alert>
      ) : null}

      {isLoading && (
        <div className="d-grid gap-2 py-2" role="status" aria-label="Memuat FAQ" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="d-flex align-items-center gap-3 p-3 border-bottom">
              <SkeletonBlock width="60px" height="22px" />
              <SkeletonBlock width="80px" height="22px" />
              <div className="flex-fill">
                <SkeletonBlock width="60%" height="16px" className="mb-1" />
                <SkeletonBlock width="40%" height="14px" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && !isLoading && (
        <Alert variant="warning" className="d-flex align-items-start gap-3">
          <div className="flex-fill">
            <strong>Endpoint FAQ belum tersedia.</strong><br />
            <span className="small">Backend perlu di-restart agar module FAQ aktif. Data 18 FAQ sudah ada di database dan akan muncul setelah backend restart.</span>
          </div>
          <Button size="sm" variant="outline-warning" onClick={() => refetch()}>Coba lagi</Button>
        </Alert>
      )}

      {faqs.length > 0 && (
        <div className="d-grid gap-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="settings-faq-row">
              <div className="d-flex align-items-start gap-2 flex-wrap">
                <Badge bg={faq.isActive ? 'success' : 'secondary'} className="mt-1 flex-shrink-0">
                  {faq.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <Badge bg="light" text="dark" className="border flex-shrink-0">{faq.category}</Badge>
                <Badge bg="light" text="dark" className="border flex-shrink-0">#{faq.sortOrder}</Badge>
                <div className="flex-fill min-w-0">
                  <div className="fw-semibold text-truncate">{faq.question}</div>
                  <div className="small text-muted text-truncate">{faq.answer}</div>
                </div>
              </div>
              <div className="d-flex gap-1 mt-2 flex-wrap">
                <Button size="sm" variant="outline-primary" onClick={() => openEdit(faq)}>Edit</Button>
                <Button
                  size="sm"
                  variant={faq.isActive ? 'outline-warning' : 'outline-success'}
                  onClick={() => toggleMutation.mutate({ id: faq.id, isActive: !faq.isActive })}
                  disabled={toggleMutation.isPending}
                >
                  {faq.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={async () => { const ok = await confirm({ title: 'Hapus FAQ', message: 'Hapus FAQ ini?', confirmLabel: 'Hapus', variant: 'danger' }); if (!ok) return; deleteMutation.mutate(faq.id); }}
                  disabled={deleteMutation.isPending}
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && faqs.length === 0 && (
        <Alert variant="light" className="border text-center py-4">
          Belum ada FAQ.{' '}
          <button type="button" className="btn btn-link p-0" onClick={openNew}>+ Tambah FAQ pertama</button>
        </Alert>
      )}

      {/* Form modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId !== null ? 'Edit FAQ' : 'Tambah FAQ Baru'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Pertanyaan</Form.Label>
            <Form.Control
              autoFocus
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              placeholder="Contoh: Berapa kisaran tarif kamar?"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Jawaban</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={form.answer}
              onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
              placeholder="Tulis jawaban yang jelas dan informatif."
            />
          </Form.Group>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Kategori</Form.Label>
                <Form.Select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  {FAQ_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Urutan tampil</Form.Label>
                <CurrencyInput
                  value={form.sortOrder}
                  onChange={(v) => setForm((p) => ({ ...p, sortOrder: v ?? 0 }))}
                />
                <Form.Text>Angka kecil tampil lebih atas.</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="faq-active"
                label="Tampilkan di publik"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Menyimpan...' : editingId !== null ? 'Simpan Perubahan' : 'Tambah FAQ'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/* ─── Room Photo Management ────────────────────────────────────────── */

type RoomBasic = { id: number; code: string; name: string; images: string[] };

export function RoomPhotoPanel() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<RoomBasic | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [], isLoading, isError, refetch } = useQuery<RoomBasic[]>({
    queryKey: ['owner-rooms-photos'],
    queryFn: async () => {
      const res = await client.get('/rooms', { params: { limit: 100 } });
      const payload = res.data?.data;
      // Handle { items: [...] } or plain array
      if (payload?.items && Array.isArray(payload.items)) return payload.items as RoomBasic[];
      if (Array.isArray(payload)) return payload as RoomBasic[];
      return [];
    },
    retry: 2,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRoom || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    setUploadError('');
    try {
      const res = await client.post<{ data: { fileUrl: string } }>('/rooms/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = res.data.data.fileUrl;
      const updatedImages = [...(selectedRoom.images ?? []), newUrl];
      await client.patch(`/rooms/${selectedRoom.id}`, { images: updatedImages });
      setSelectedRoom((r) => r ? { ...r, images: updatedImages } : r);
      qc.invalidateQueries({ queryKey: ['owner-rooms-photos'] });
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Gagal upload foto'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveImage = async (url: string) => {
    if (!selectedRoom) return;
    const ok = await confirm({ title: 'Hapus Foto Kamar', message: 'Hapus foto ini dari kamar?', confirmLabel: 'Hapus', variant: 'danger' });
    if (!ok) return;
    const updatedImages = selectedRoom.images.filter((u) => u !== url);
    try {
      await client.patch(`/rooms/${selectedRoom.id}`, { images: updatedImages });
      setSelectedRoom((r) => r ? { ...r, images: updatedImages } : r);
      qc.invalidateQueries({ queryKey: ['owner-rooms-photos'] });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Gagal menghapus foto'));
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="h5 mb-0">Foto Kamar</h3>
        <small className="text-muted">Pilih kamar untuk melihat dan mengelola foto yang tampil di halaman publik.</small>
      </div>

      <Row className="g-3">
        <Col md={4}>
          <div className="settings-room-list">
            {isLoading && (
              <div className="py-4 text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span className="text-muted small">Memuat kamar...</span>
              </div>
            )}
            {isError && !isLoading && (
              <Alert variant="warning" className="small m-2">
                Gagal memuat daftar kamar.{' '}
                <button type="button" className="btn btn-link p-0 small" onClick={() => refetch()}>
                  Coba lagi
                </button>
              </Alert>
            )}
            {!isLoading && !isError && rooms.length === 0 && (
              <div className="text-muted small text-center py-4">Tidak ada kamar ditemukan.</div>
            )}
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={`settings-room-item${selectedRoom?.id === room.id ? ' active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <strong>{room.code}</strong>
                <span>{room.name || '—'}</span>
                <Badge bg={room.images?.length ? 'primary' : 'secondary'} className="ms-auto">
                  {room.images?.length ?? 0} foto
                </Badge>
              </button>
            ))}
          </div>
        </Col>

        <Col md={8}>
          {!selectedRoom ? (
            <Alert variant="light" className="border d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 200 }}>
              {isLoading ? 'Memuat daftar kamar...' : '← Pilih kamar di sebelah kiri'}
            </Alert>
          ) : (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <strong>{selectedRoom.code}</strong>
                  <span className="text-muted ms-2">{selectedRoom.name}</span>
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                  />
                  <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <><Spinner animation="border" size="sm" className="me-1" />Mengunggah...</> : '+ Unggah Foto'}
                  </Button>
                </div>
              </div>

              {uploadError && <Alert variant="danger" className="py-2 small mb-3">{uploadError}</Alert>}

              {selectedRoom.images?.length === 0 ? (
                <Alert variant="light" className="border text-center text-muted">
                  Belum ada foto. Upload foto kamar agar tampil di katalog publik.
                </Alert>
              ) : (
                <Row className="g-2">
                  {selectedRoom.images.map((url, i) => {
                    const displayUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                    return (
                      <Col xs={6} md={4} key={`${url}-${i}`}>
                        <div className="settings-photo-thumb">
                          <SafeImage src={displayUrl} alt={`Foto ${i + 1}`} resolveUrl={false} />
                          <button
                            type="button"
                            className="settings-photo-remove"
                            onClick={() => handleRemoveImage(url)}
                            aria-label="Hapus foto"
                          >
                            ✕
                          </button>
                          {i === 0 && <span className="settings-photo-main-badge">Utama</span>}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}

              <Alert variant="light" className="border small mt-3 mb-0">
                Foto pertama akan tampil sebagai foto utama di katalog kamar. Foto tambahan tampil saat hover/slideshow.
                Format: JPG, PNG, WebP. Maks. 2MB per foto.
              </Alert>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export function TariffSettingsPanel() {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['operational-settings'], queryFn: fetchOperationalSettings });
  const [form, setForm] = useState<OperationalSetting | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: () => updateOperationalSettings({
      freeElectricityKwhPerMonth: Number(form?.freeElectricityKwhPerMonth ?? 0),
      electricityTariffPerKwhRupiah: Number(form?.electricityTariffPerKwhRupiah ?? 0),
      waterMeteringEnabled: Boolean(form?.waterMeteringEnabled),
      waterTariffPerM3Rupiah: Number(form?.waterTariffPerM3Rupiah ?? 0),
      freeWaterM3PerMonth: Number(form?.freeWaterM3PerMonth ?? 0),
      wifiRupiah: Number(form?.wifiRupiah ?? WIFI_DEFAULT_PRICE_RUPIAH),
      galonRupiah: Number(form?.galonRupiah ?? 20000),
      petDepositRupiah: Number(form?.petDepositRupiah ?? 100000),
      extraOccupantFeePercent: Number(form?.extraOccupantFeePercent ?? 20),
      acCleanKwhThreshold: Number(form?.acCleanKwhThreshold ?? 200),
      tenantLoyaltyEnabled: Boolean(form?.tenantLoyaltyEnabled),
      ktpVerificationGateEnabled: Boolean(form?.ktpVerificationGateEnabled),
      brevoApiKey: (form as any)?.brevoApiKey,
      mailFromEmail: (form as any)?.mailFromEmail,
      mailFromName: (form as any)?.mailFromName,
      autoOpsEnabled: Boolean((form as any)?.autoOpsEnabled),
      recurringExpenseDraftsEnabled: Boolean((form as any)?.recurringExpenseDraftsEnabled),
      assetDepreciationAutoEnabled: Boolean((form as any)?.assetDepreciationAutoEnabled),
      rentRecognitionEnabled: Boolean((form as any)?.rentRecognitionEnabled),
      notificationPruningEnabled: Boolean((form as any)?.notificationPruningEnabled),
      notificationRetentionDays: Number((form as any)?.notificationRetentionDays ?? 90),
      journalReconciliationEnabled: Boolean((form as any)?.journalReconciliationEnabled),
      journalReconciliationLimit: Number((form as any)?.journalReconciliationLimit ?? 100),
      bookingReviewDeadlineHours: Number((form as any)?.bookingReviewDeadlineHours ?? 3),
      approvedBookingPaymentDeadlineHours: Number((form as any)?.approvedBookingPaymentDeadlineHours ?? 3),
      paymentReviewUrgentHours: Number((form as any)?.paymentReviewUrgentHours ?? 1),
      paymentReviewEscalateHours: Number((form as any)?.paymentReviewEscalateHours ?? 3),
      paymentReviewMaxHours: Number((form as any)?.paymentReviewMaxHours ?? 6),
      invoiceUrgentAfterHours: Number((form as any)?.invoiceUrgentAfterHours ?? 6),
      invoiceDueAfterHours: Number((form as any)?.invoiceDueAfterHours ?? 24),
      renewReminderDays: Number((form as any)?.renewReminderDays ?? 3),
      renewLastCallHours: Number((form as any)?.renewLastCallHours ?? 24),
      renewPaymentDeadlineHours: Number((form as any)?.renewPaymentDeadlineHours ?? 3),
      renewReviewUrgentHours: Number((form as any)?.renewReviewUrgentHours ?? 3),
      renewReviewEscalateHours: Number((form as any)?.renewReviewEscalateHours ?? 6),
      checkoutReviewUrgentHours: Number((form as any)?.checkoutReviewUrgentHours ?? 3),
      checkoutReviewEscalateHours: Number((form as any)?.checkoutReviewEscalateHours ?? 6),
      checkoutFinalUrgentHours: Number((form as any)?.checkoutFinalUrgentHours ?? 6),
      lateTenantVacateHours: Number((form as any)?.lateTenantVacateHours ?? 3),
      autoOpsIntervalMinutes: Number((form as any)?.autoOpsIntervalMinutes ?? 5),
      acCleaningEnabled: Boolean((form as any)?.acCleaningEnabled),
    }),
    onSuccess: (updated) => { setForm(updated); setSavedMsg('Konstanta tersimpan.'); qc.invalidateQueries({ queryKey: ['operational-settings'] }); },
  });

  if (isLoading || !form) return <div className="text-muted py-3"><Spinner animation="border" size="sm" className="me-2" />Memuat konstanta...</div>;
  if (isError) return <Alert variant="danger">Gagal memuat konstanta operasional.</Alert>;

  const set = (key: keyof OperationalSetting, value: number | boolean | string) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    const ok = await confirm({
      title: 'Simpan Tarif & Konstanta?',
      message: 'Perubahan ini dapat memengaruhi perhitungan tagihan, otomatisasi operasional, dan akses fitur tenant. Pastikan nilai sudah benar sebelum menyimpan.',
      confirmLabel: 'Simpan perubahan',
      variant: 'warning',
    });
    if (!ok) return;
    setSavedMsg('');
    save.mutate();
  };

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <h5 className="mb-1">Tarif & Konstanta Operasional</h5>
        <p className="text-muted">Dasar perhitungan tagihan meter listrik &amp; air. Sumber tunggal — berlaku ke semua kamar (tarif per-kamar tetap bisa di-override bila perlu).</p>
        {save.isError ? <Alert variant="danger" className="py-2">{getApiErrorMessage(save.error, 'Gagal menyimpan konstanta')}</Alert> : null}
        {savedMsg ? <Alert variant="success" className="py-2" dismissible onClose={() => setSavedMsg('')}>{savedMsg}</Alert> : null}
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Jatah listrik gratis / bulan (kWh)</Form.Label>
              <CurrencyInput value={form.freeElectricityKwhPerMonth} onChange={(v) => set('freeElectricityKwhPerMonth', v ?? 0)} />
              <Form.Text muted>Pemakaian di bawah jatah ini tidak ditagih.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tarif listrik / kWh (Rp)</Form.Label>
              <CurrencyInput value={form.electricityTariffPerKwhRupiah} onChange={(v) => set('electricityTariffPerKwhRupiah', v ?? 0)} />
              <Form.Text muted>Untuk pemakaian melebihi jatah gratis.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Check
              type="switch"
              id="water-metering-toggle"
              label="Hitung tagihan air dari meter (aktifkan nanti saat meter air sudah ada)"
              checked={form.waterMeteringEnabled}
              onChange={(e) => set('waterMeteringEnabled', e.target.checked)}
            />
          </Col>
          {form.waterMeteringEnabled ? (
            <>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tarif air / m³ (Rp)</Form.Label>
                  <CurrencyInput value={form.waterTariffPerM3Rupiah} onChange={(v) => set('waterTariffPerM3Rupiah', v ?? 0)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Jatah air gratis / bulan (m³)</Form.Label>
                  <CurrencyInput value={form.freeWaterM3PerMonth} onChange={(v) => set('freeWaterM3PerMonth', v ?? 0)} />
                </Form.Group>
              </Col>
            </>
          ) : null}
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">Biaya layanan tambahan & aturan penghuni</p></Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>WiFi per gadget / bulan (Rp)</Form.Label>
              <CurrencyInput value={form.wifiRupiah ?? WIFI_DEFAULT_PRICE_RUPIAH} onChange={(v) => set('wifiRupiah', v ?? 0)} />
              <Form.Text muted>Biaya berlangganan WiFi per perangkat per bulan.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Galon air (Voila) / galon (Rp)</Form.Label>
              <CurrencyInput value={form.galonRupiah ?? 20000} onChange={(v) => set('galonRupiah', v ?? 0)} />
              <Form.Text muted>Harga jual galon air Voila dari pengelola.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Deposit hewan peliharaan (Rp)</Form.Label>
              <CurrencyInput value={form.petDepositRupiah ?? 100000} onChange={(v) => set('petDepositRupiah', v ?? 0)} />
              <Form.Text muted>Deposit refundable untuk tenant yang membawa hewan peliharaan.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Biaya penghuni ekstra (%)</Form.Label>
              <CurrencyInput value={form.extraOccupantFeePercent ?? 20} onChange={(v) => set('extraOccupantFeePercent', Math.min(100, v ?? 0))} />
              <Form.Text muted>% dari sewa per penghuni ekstra (di atas batas gratis per roomSize).</Form.Text>
            </Form.Group>
          </Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">Perawatan AC (jadwal cuci otomatis)</p></Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Ambang pemakaian AC → cuci (kWh)</Form.Label>
              <CurrencyInput value={form.acCleanKwhThreshold ?? 200} onChange={(v) => set('acCleanKwhThreshold', v ?? 0)} />
              <Form.Text muted>Sistem membuat tiket cuci AC bila estimasi pemakaian (watt × jam × hari sejak cuci terakhir) mencapai angka ini — pemicu dini selain interval hari/bulan per-kamar. Isi 0 untuk pakai interval saja.</Form.Text>
            </Form.Group>
          </Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">Fitur tenant</p></Col>
          <Col md={12}>
            <Form.Check
              type="switch"
              id="tenant-loyalty-toggle"
              label="Tampilkan fitur Loyalitas & Reward untuk penghuni (poin, leaderboard, katalog reward, referral)"
              checked={form.tenantLoyaltyEnabled ?? false}
              onChange={(e) => set('tenantLoyaltyEnabled', e.target.checked)}
            />
            <Form.Text muted>Nonaktifkan saat katalog reward belum siap. Penghuni tidak akan melihat menu Loyalitas di portal.</Form.Text>
          </Col>
          <Col md={12}>
            <Form.Check
              type="switch"
              id="ktp-gate-toggle"
              label="Wajibkan verifikasi KTP sebelum check-in & booking (gate UU PDP)"
              checked={form.ktpVerificationGateEnabled ?? false}
              onChange={(e) => set('ktpVerificationGateEnabled', e.target.checked)}
            />
            <Form.Text muted>Aktifkan setelah onboarding KTP siap. Tenant yang KTP-nya belum diverifikasi akan ditolak saat check-in atau booking.</Form.Text>
          </Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">Email (Brevo)</p></Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Brevo API Key</Form.Label>
              <Form.Control type="password" value={(form as any).brevoApiKey ?? ''} onChange={(e) => set('brevoApiKey' as any, e.target.value)} placeholder={form.brevoApiKeySet ? (form.brevoApiKeyPreview ?? '••••') : 'Kosong = nonaktifkan email'} />
              <Form.Text muted>{form.brevoApiKeySet ? `Tersimpan (sumber: ${form.brevoApiKeySource === 'env' ? '.env' : 'settings'}). Kosongkan untuk hapus.` : 'Isi untuk mengaktifkan email reset password via Brevo.'}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Email Pengirim</Form.Label>
              <Form.Control type="email" value={(form as any).mailFromEmail ?? ''} onChange={(e) => set('mailFromEmail' as any, e.target.value)} placeholder="no-reply@kost48surabaya.com" />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Nama Pengirim</Form.Label>
              <Form.Control type="text" value={(form as any).mailFromName ?? ''} onChange={(e) => set('mailFromName' as any, e.target.value)} placeholder="Kost48 Surabaya" />
            </Form.Group>
          </Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">AutoOps — Penjadwalan Otomatis</p></Col>
          <Col md={4}>
            <Form.Check type="switch" id="autoops-enabled" label="Aktifkan AutoOps (penjadwalan otomatis)" checked={(form as any).autoOpsEnabled ?? true} onChange={(e) => set('autoOpsEnabled' as any, e.target.checked)} />
          </Col>
          <Col md={4}>
            <Form.Group><Form.Label>Interval (menit)</Form.Label><Form.Control type="number" min={1} max={60} value={(form as any).autoOpsIntervalMinutes ?? 5} onChange={(e) => set('autoOpsIntervalMinutes' as any, Number(e.target.value))} /></Form.Group>
          </Col>
          <Col md={4}>
            <Form.Check type="switch" id="ac-cleaning" label="Jadwal cuci AC otomatis" checked={(form as any).acCleaningEnabled ?? true} onChange={(e) => set('acCleaningEnabled' as any, e.target.checked)} />
          </Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">Accounting Sweeps</p></Col>
          <Col md={4}><Form.Check type="switch" id="recurring-expense" label="Draft pengeluaran berulang" checked={(form as any).recurringExpenseDraftsEnabled ?? false} onChange={(e) => set('recurringExpenseDraftsEnabled' as any, e.target.checked)} /></Col>
          <Col md={4}><Form.Check type="switch" id="asset-depreciation" label="Penyusutan aset otomatis" checked={(form as any).assetDepreciationAutoEnabled ?? false} onChange={(e) => set('assetDepreciationAutoEnabled' as any, e.target.checked)} /></Col>
          <Col md={4}><Form.Check type="switch" id="rent-recognition" label="PSAK 72 — pengakuan sewa" checked={(form as any).rentRecognitionEnabled ?? false} onChange={(e) => set('rentRecognitionEnabled' as any, e.target.checked)} /></Col>
          <Col md={4}><Form.Check type="switch" id="notif-pruning" label="Bersihkan notifikasi lama" checked={(form as any).notificationPruningEnabled ?? true} onChange={(e) => set('notificationPruningEnabled' as any, e.target.checked)} /></Col>
          <Col md={4}><Form.Group><Form.Label>Retensi notifikasi (hari)</Form.Label><Form.Control type="number" min={1} max={365} value={(form as any).notificationRetentionDays ?? 90} onChange={(e) => set('notificationRetentionDays' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={4}><Form.Check type="switch" id="journal-recon" label="Backfill jurnal otomatis" checked={(form as any).journalReconciliationEnabled ?? false} onChange={(e) => set('journalReconciliationEnabled' as any, e.target.checked)} /></Col>
          <Col md={4}><Form.Group><Form.Label>Limit jurnal per run</Form.Label><Form.Control type="number" min={1} max={1000} value={(form as any).journalReconciliationLimit ?? 100} onChange={(e) => set('journalReconciliationLimit' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col xs={12}><hr className="my-1" /><p className="text-muted small mb-0">SLA Deadline AutoOps (jam)</p><Form.Text muted>Batas waktu untuk notifikasi urgensi. Default sesuai rekomendasi operasional.</Form.Text></Col>
          <Col md={3}><Form.Group><Form.Label>Review booking</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).bookingReviewDeadlineHours ?? 3} onChange={(e) => set('bookingReviewDeadlineHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Bayar setelah approve</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).approvedBookingPaymentDeadlineHours ?? 3} onChange={(e) => set('approvedBookingPaymentDeadlineHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review bayar (urgent)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).paymentReviewUrgentHours ?? 1} onChange={(e) => set('paymentReviewUrgentHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review bayar (eskalasi)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).paymentReviewEscalateHours ?? 3} onChange={(e) => set('paymentReviewEscalateHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review bayar (max)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).paymentReviewMaxHours ?? 6} onChange={(e) => set('paymentReviewMaxHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Invoice urgent</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).invoiceUrgentAfterHours ?? 6} onChange={(e) => set('invoiceUrgentAfterHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Invoice jatuh tempo</Form.Label><Form.Control type="number" min={1} max={720} value={(form as any).invoiceDueAfterHours ?? 24} onChange={(e) => set('invoiceDueAfterHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Renew reminder (hari)</Form.Label><Form.Control type="number" min={1} max={30} value={(form as any).renewReminderDays ?? 3} onChange={(e) => set('renewReminderDays' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Renew last call</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).renewLastCallHours ?? 24} onChange={(e) => set('renewLastCallHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Bayar renew</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).renewPaymentDeadlineHours ?? 3} onChange={(e) => set('renewPaymentDeadlineHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review renew (urgent)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).renewReviewUrgentHours ?? 3} onChange={(e) => set('renewReviewUrgentHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review renew (eskalasi)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).renewReviewEscalateHours ?? 6} onChange={(e) => set('renewReviewEscalateHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review checkout (urgent)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).checkoutReviewUrgentHours ?? 3} onChange={(e) => set('checkoutReviewUrgentHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Review checkout (eskalasi)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).checkoutReviewEscalateHours ?? 6} onChange={(e) => set('checkoutReviewEscalateHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Final checkout (urgent)</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).checkoutFinalUrgentHours ?? 6} onChange={(e) => set('checkoutFinalUrgentHours' as any, Number(e.target.value))} /></Form.Group></Col>
          <Col md={3}><Form.Group><Form.Label>Grace telat keluar</Form.Label><Form.Control type="number" min={1} max={168} value={(form as any).lateTenantVacateHours ?? 3} onChange={(e) => set('lateTenantVacateHours' as any, Number(e.target.value))} /></Form.Group></Col>
        </Row>
        <Button className="mt-3" onClick={() => void handleSave()} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan...' : 'Simpan Konstanta'}
        </Button>
      </Card.Body>
    </Card>
  );
}

/* ─── AI & Biaya (G7) ──────────────────────────────────────────────── */

const AI_FEATURE_LABELS: Record<string, string> = {
  brief: 'Brief Owner',
  finance: 'Analisa Keuangan',
  'expense-ocr-draft': 'Draft Nota (OCR)',
  'ktp-ocr': 'Validasi KTP',
  'payment-review': 'Review Pembayaran',
  'ticket-action-draft': 'Saran Tiket',
  'inventory-reorder-draft': 'Saran Stok',
  'field-report-review-draft': 'Review Lapangan',
  'test-connection': 'Tes Koneksi',
};
const aiFeatureLabel = (k: string) => AI_FEATURE_LABELS[k] ?? k;

export function AiSettingsPanel() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const statusQuery = useQuery({ queryKey: ['owner-ai', 'status'], queryFn: getOwnerAiStatus });
  // /owner-ai/usage = OWNER-only di backend (G7 observability biaya); ADMIN tidak fetch agar tidak 403.
  const usageQuery = useQuery({ queryKey: ['owner-ai', 'usage'], queryFn: getOwnerAiUsage, enabled: isOwner });
  const settingsQuery = useQuery({ queryKey: ['settings', 'operational'], queryFn: fetchOperationalSettings });
  const updateMutation = useMutation({
    mutationFn: updateOperationalSettings,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-ai', 'status'] }); qc.invalidateQueries({ queryKey: ['settings', 'operational'] }); },
  });
  const testMutation = useMutation({ mutationFn: testOwnerAiConnection });

  const s = statusQuery.data;
  const u = usageQuery.data;
  const db = settingsQuery.data;
  const yesNo = (v?: boolean) => (v ? <Badge bg="success">Ya</Badge> : <Badge bg="secondary">Tidak</Badge>);

  const [form, setForm] = useState<Record<string, any>>({});
  useEffect(() => { if (db) setForm({ ...db }); }, [db]);
  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // API key diketik terpisah dari form (GET tidak pernah memuat nilai key — hanya status/preview).
  const [apiKeyInput, setApiKeyInput] = useState('');

  const save = () => {
    // pickOperationalPayload: buang field non-DTO (id/updatedAt/dll) — backend forbidNonWhitelisted menolak 400.
    const payload = pickOperationalPayload(form);
    const typedKey = apiKeyInput.trim();
    if (typedKey) payload.deepseekApiKey = typedKey;
    updateMutation.mutate(payload, { onSuccess: () => setApiKeyInput('') });
  };

  return (
    <div>
      <div className="mb-3 d-flex justify-content-between align-items-start">
        <div>
          <h3 className="h5 mb-0">AI &amp; Biaya</h3>
          <small className="text-muted">
            Status DeepSeek, batas harian, penggunaan, dan jejak keputusan. API key cukup diisi di sini — tersimpan di database dan langsung aktif tanpa restart (env hanya fallback).
          </small>
        </div>
        <Button size="sm" variant="primary" onClick={() => void save()} disabled={updateMutation.isPending || !db}>
          {updateMutation.isPending ? <><Spinner size="sm" className="me-1" />Menyimpan…</> : 'Simpan Konfigurasi'}
        </Button>
      </div>

      {statusQuery.isLoading ? (
        <div className="py-3 text-muted"><Spinner animation="border" size="sm" className="me-2" />Memuat status AI…</div>
      ) : s ? (
        <Card className="content-card border-0 mb-3">
          <Card.Body>
            <Row className="g-3 mb-3">
              <Col md={4}><div className="small text-muted">API Key</div>
                {db?.deepseekApiKeySet ? (
                  <Badge bg="success">
                    Terpasang {db.deepseekApiKeySource === 'settings' ? `dari Settings ${db.deepseekApiKeyPreview ?? ''}`.trim() : 'dari env'}
                  </Badge>
                ) : (
                  <Badge bg="warning" text="dark">Belum diisi</Badge>
                )}
              </Col>
              <Col md={4}><div className="small text-muted">Fitur AI aktif</div><Form.Check type="switch" checked={form.aiFeaturesEnabled ?? false} onChange={e => setF('aiFeaturesEnabled', e.target.checked)} label={form.aiFeaturesEnabled ? 'Aktif' : 'Mati'} /></Col>
              <Col md={4}><div className="small text-muted">Manual-only</div><Form.Check type="switch" checked={form.aiManualOnly ?? true} onChange={e => setF('aiManualOnly', e.target.checked)} /></Col>
              <Col md={4}><div className="small text-muted">Hanya OWNER/ADMIN</div><Form.Check type="switch" checked={form.aiOwnerAdminOnly ?? true} onChange={e => setF('aiOwnerAdminOnly', e.target.checked)} /></Col>
              <Col md={4}><div className="small text-muted">Log penggunaan</div><Form.Check type="switch" checked={form.aiLogUsage ?? true} onChange={e => setF('aiLogUsage', e.target.checked)} /></Col>
              <Col md={4}><div className="small text-muted">Model default</div>
                <Form.Select size="sm" value={form.deepseekModel || 'deepseek-v4-flash'} onChange={e => setF('deepseekModel', e.target.value)}>
                  <option value="deepseek-v4-flash">deepseek-v4-flash (hemat)</option>
                  <option value="deepseek-v4-pro">deepseek-v4-pro (analisa berat)</option>
                </Form.Select>
              </Col>
              <Col md={4}><div className="small text-muted">Model finance</div>
                <Form.Select size="sm" value={form.deepseekFinanceModel || 'deepseek-v4-pro'} onChange={e => setF('deepseekFinanceModel', e.target.value)}>
                  <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                  <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                </Form.Select>
              </Col>
              <Col md={4}><div className="small text-muted">Base URL</div><Form.Control size="sm" value={form.deepseekBaseUrl || 'https://api.deepseek.com'} onChange={e => setF('deepseekBaseUrl', e.target.value)} /></Col>
              <Col md={4}><div className="small text-muted">Limit harian</div><CurrencyInput size="sm" value={form.aiDailyRequestLimit ?? 50} onChange={(v) => setF('aiDailyRequestLimit', Math.min(1000, Math.max(1, v ?? 50)))} /></Col>
              <Col md={4}><div className="small text-muted">Sisa hari ini</div>{u?.remainingDaily ?? s.dailyRemaining}</Col>
              <Col md={4}><div className="small text-muted">Terpakai hari ini</div>{u?.todayTotal ?? 0}</Col>
            </Row>
            <hr />
            <Row className="g-3 align-items-end mb-1">
              <Col md={6}>
                <div className="small text-muted">
                  API Key DeepSeek{db?.deepseekApiKeyPreview ? <> — tersimpan: <code>{db.deepseekApiKeyPreview}</code></> : null}
                </div>
                <Form.Control
                  size="sm"
                  type="password"
                  autoComplete="off"
                  placeholder={db?.deepseekApiKeySet ? 'Isi hanya bila ingin mengganti key' : 'Tempel API key DeepSeek (sk-…)'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                />
                <Form.Text muted>Tersimpan aman di database & langsung aktif tanpa restart. Tempel key lalu klik "Simpan Konfigurasi".</Form.Text>
              </Col>
              {db?.deepseekApiKeySource === 'settings' ? (
                <Col md="auto">
                  <Button size="sm" variant="outline-danger" disabled={updateMutation.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Hapus API Key',
                        message: 'Hapus API key DeepSeek dari database? Fitur AI berhenti bekerja sampai key baru diisi (env fallback tetap dipakai bila ada).',
                        confirmLabel: 'Hapus',
                        variant: 'danger',
                      });
                      if (ok) updateMutation.mutate({ deepseekApiKey: '' });
                    }}>
                    Hapus key
                  </Button>
                </Col>
              ) : null}
            </Row>
            <hr />
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !s.configured}>
                {testMutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menguji…</> : 'Tes Koneksi DeepSeek'}
              </Button>
              {testMutation.data ? (
                <span className={`small ${testMutation.data.ok ? 'text-success' : 'text-danger'}`}>
                  {testMutation.data.ok ? `✅ ${testMutation.data.message} (${testMutation.data.latencyMs} ms, ${testMutation.data.model})` : `⚠️ ${testMutation.data.message}`}
                </span>
              ) : null}
              {!s.configured ? <span className="small text-muted">Tempel API key pada kolom di atas lalu klik "Simpan Konfigurasi" — langsung aktif tanpa restart.</span> : null}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="warning">Gagal memuat status AI.</Alert>
      )}

      <Row className="g-3">
        <Col md={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="fw-semibold mb-2">Penggunaan hari ini (per fitur)</div>
              {!isOwner ? (
                <div className="text-muted small">Data pemakaian AI hanya tersedia untuk OWNER.</div>
              ) : u && Object.keys(u.byFeature).length ? (
                <ul className="list-unstyled mb-0 small">
                  {Object.entries(u.byFeature).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <li key={k} className="d-flex justify-content-between border-bottom py-1">
                      <span>{aiFeatureLabel(k)}</span><span className="fw-semibold">{v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted small">Belum ada penggunaan AI hari ini.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={7}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="fw-semibold mb-2">Jejak keputusan memakai AI (20 terakhir)</div>
              {!isOwner ? (
                <div className="text-muted small">Jejak pemakaian AI hanya tersedia untuk OWNER.</div>
              ) : usageQuery.isLoading ? (
                <div className="text-muted small"><Spinner animation="border" size="sm" className="me-2" />Memuat…</div>
              ) : u && u.recentAudit.length ? (
                <div className="d-grid gap-2">
                  {u.recentAudit.map((a) => (
                    <div key={a.id} className="border rounded p-2 small">
                      <div className="d-flex justify-content-between">
                        <span className="fw-semibold">{a.ai?.feature ? aiFeatureLabel(a.ai.feature) : a.action}</span>
                        <span className="text-muted">{new Date(a.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-muted">
                        {a.action} · {a.entityType}{a.entityId ? ` #${a.entityId}` : ''}{a.actorName ? ` · oleh ${a.actorName}` : ''}
                        {a.ai?.humanDecision ? ` · ${a.ai.humanDecision}` : ''}
                        {a.ai?.model ? ` · ${a.ai.model}` : ''}
                        {a.ai?.confidence != null ? ` · keyakinan ${Math.round(a.ai.confidence * 100)}%` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted small">Belum ada keputusan yang memakai AI. (Tercatat saat manusia menyetujui hasil AI.)</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ─── Antrean Draft AI (G9) ────────────────────────────────────────── */

const DRAFT_STATUS_BADGE: Record<AiDraftStatus, string> = {
  DRAFT: 'warning', APPLIED: 'success', REJECTED: 'secondary', EXPIRED: 'light',
};
const DRAFT_STATUS_LABEL: Record<AiDraftStatus, string> = {
  DRAFT: 'Menunggu', APPLIED: 'Dipakai', REJECTED: 'Ditolak', EXPIRED: 'Kedaluwarsa',
};
const DRAFT_FILTERS: { key: AiDraftStatus | 'ALL'; label: string }[] = [
  { key: 'DRAFT', label: 'Menunggu' },
  { key: 'APPLIED', label: 'Dipakai' },
  { key: 'REJECTED', label: 'Ditolak' },
  { key: 'EXPIRED', label: 'Kedaluwarsa' },
  { key: 'ALL', label: 'Semua' },
];

export function AiDraftQueuePanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AiDraftStatus | 'ALL'>('DRAFT');
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['ai-drafts', filter],
    queryFn: () => listAiDrafts(filter === 'ALL' ? undefined : { status: filter }),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'APPLIED' | 'REJECTED' }) => reviewAiDraft(id, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-drafts'] }),
  });
  const expireMutation = useMutation({
    mutationFn: expireAiDrafts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-drafts'] }),
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="h5 mb-0">Antrean Draft AI</h3>
          <small className="text-muted">Hasil AI yang disimpan untuk ditinjau. Aksi final tetap lewat menu masing-masing — di sini hanya menandai Dipakai/Ditolak.</small>
        </div>
        <Button size="sm" variant="outline-secondary" onClick={() => expireMutation.mutate()} disabled={expireMutation.isPending}>
          {expireMutation.isPending ? 'Memproses…' : 'Bersihkan kedaluwarsa'}
        </Button>
      </div>

      <div className="mb-3 d-flex gap-1 flex-wrap">
        {DRAFT_FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? 'primary' : 'outline-primary'} onClick={() => setFilter(f.key)}>{f.label}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-4 text-center"><Spinner animation="border" /></div>
      ) : drafts.length === 0 ? (
        <Alert variant="light" className="border text-center py-4">Belum ada draft pada status ini.</Alert>
      ) : (
        <div className="d-grid gap-2">
          {drafts.map((d: AiDraft) => (
            <div key={d.id} className="border rounded p-2">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div className="min-w-0">
                  <span className="fw-semibold">{d.feature}</span>
                  {d.targetType ? <span className="text-muted small ms-2">{d.targetType}{d.targetId ? ` #${d.targetId}` : ''}</span> : null}
                  <div className="small text-muted">
                    {new Date(d.createdAt).toLocaleString('id-ID')} · {d.mode}{d.model ? ` · ${d.model}` : ''}
                    {d.confidence != null ? ` · keyakinan ${Math.round(d.confidence * 100)}%` : ''}
                  </div>
                </div>
                <Badge bg={DRAFT_STATUS_BADGE[d.status]} text={d.status === 'EXPIRED' ? 'dark' : undefined}>{DRAFT_STATUS_LABEL[d.status]}</Badge>
              </div>
              <pre className="small bg-light border rounded p-2 mt-2 mb-2" style={{ maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(d.resultJson, null, 2)}</pre>
              {d.reviewNote ? <div className="small text-muted mb-1">Catatan: {d.reviewNote}</div> : null}
              {d.status === 'DRAFT' ? (
                <div className="d-flex gap-1">
                  <Button size="sm" variant="outline-success" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: d.id, decision: 'APPLIED' })}>Tandai Dipakai</Button>
                  <Button size="sm" variant="outline-danger" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: d.id, decision: 'REJECTED' })}>Tolak</Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT: OwnerSettingsPage — Main Shell
// ═══════════════════════════════════════════════════════════
