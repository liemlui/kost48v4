import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import SafeImage from '../../components/common/SafeImage';
import { createFaq, deleteFaq, fetchAllFaqs, updateFaq, type FaqItem } from '../../api/faqs';
import { fetchOperationalSettings, updateOperationalSettings, type OperationalSetting } from '../../api/settings';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { listFacilityImages, uploadFacilityImage, deleteFacilityImage } from '../../api/facilityImages';

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

function FacilityPhotoPanel() {
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
      setError(`Gagal upload ${slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm(`Hapus foto untuk "${FACILITY_SLUGS.find((f) => f.slug === slug)?.label}"?`)) return;
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

const FAQ_CATEGORIES = ['Lokasi', 'Tarif', 'Fasilitas', 'Aturan', 'Layanan', 'Umum'];

const EMPTY_FORM = { question: '', answer: '', category: 'Umum', sortOrder: 0, isActive: true };

type FaqForm = typeof EMPTY_FORM;

// Mutation payload includes editId to avoid stale closure issues
type SavePayload = FaqForm & { editId: number | null };

/* ─── FAQ Management ───────────────────────────────────────────────── */

function FaqManagementPanel() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM);
  const [error, setError] = useState('');

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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="h5 mb-0">FAQ Publik</h3>
          <small className="text-muted">FAQ ini tampil di halaman publik /. Owner dan Admin bisa mengelola.</small>
        </div>
        <Button size="sm" onClick={openNew}>+ Tambah FAQ</Button>
      </div>

      {isLoading && <div className="py-4 text-center"><Spinner animation="border" /></div>}
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
                  onClick={() => { if (window.confirm('Hapus FAQ ini?')) deleteMutation.mutate(faq.id); }}
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
                <Form.Control
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
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

function RoomPhotoPanel() {
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
    if (!window.confirm('Hapus foto ini dari kamar?')) return;
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

function TariffSettingsPanel() {
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
    }),
    onSuccess: (updated) => { setForm(updated); setSavedMsg('Konstanta tersimpan.'); qc.invalidateQueries({ queryKey: ['operational-settings'] }); },
  });

  if (isLoading || !form) return <div className="text-muted py-3"><Spinner animation="border" size="sm" className="me-2" />Memuat konstanta...</div>;
  if (isError) return <Alert variant="danger">Gagal memuat konstanta operasional.</Alert>;

  const set = (key: keyof OperationalSetting, value: number | boolean) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

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
              <Form.Control type="number" min={0} value={form.freeElectricityKwhPerMonth} onChange={(e) => set('freeElectricityKwhPerMonth', Number(e.target.value))} />
              <Form.Text muted>Pemakaian di bawah jatah ini tidak ditagih.</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tarif listrik / kWh (Rp)</Form.Label>
              <Form.Control type="number" min={0} value={form.electricityTariffPerKwhRupiah} onChange={(e) => set('electricityTariffPerKwhRupiah', Number(e.target.value))} />
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
                  <Form.Control type="number" min={0} value={form.waterTariffPerM3Rupiah} onChange={(e) => set('waterTariffPerM3Rupiah', Number(e.target.value))} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Jatah air gratis / bulan (m³)</Form.Label>
                  <Form.Control type="number" min={0} value={form.freeWaterM3PerMonth} onChange={(e) => set('freeWaterM3PerMonth', Number(e.target.value))} />
                </Form.Group>
              </Col>
            </>
          ) : null}
        </Row>
        <Button className="mt-3" onClick={() => { setSavedMsg(''); save.mutate(); }} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan...' : 'Simpan Konstanta'}
        </Button>
      </Card.Body>
    </Card>
  );
}

export default function OwnerSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'photos' ? 'photos' : tabParam === 'facility-photos' ? 'facility-photos' : tabParam === 'tarif' ? 'tarif' : 'faq';

  return (
    <div className="settings-page">
      <div className="page-eyebrow mb-1">Owner · Pengaturan</div>
      <h1 className="h3 mb-1">Pengaturan Aplikasi</h1>
      <p className="text-muted mb-4">Kelola FAQ publik, foto kamar, dan tarif/konstanta operasional.</p>

      <Tabs
        activeKey={activeTab}
        onSelect={(key) => {
          const next = new URLSearchParams(searchParams);
          next.set('tab', key === 'photos' || key === 'tarif' ? key : 'faq');
          setSearchParams(next, { replace: true });
        }}
        className="command-tabs mb-4"
      >
        <Tab eventKey="faq" title="FAQ Publik">
          <FaqManagementPanel />
        </Tab>
        <Tab eventKey="photos" title="Foto Kamar">
          <RoomPhotoPanel />
        </Tab>
        <Tab eventKey="facility-photos" title="Foto Fasilitas">
          <FacilityPhotoPanel />
        </Tab>
        <Tab eventKey="tarif" title="Tarif & Konstanta">
          <TariffSettingsPanel />
        </Tab>
      </Tabs>
    </div>
  );
}
