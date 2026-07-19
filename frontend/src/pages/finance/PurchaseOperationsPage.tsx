import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import CurrencyInput from '../../components/common/CurrencyInput';
import ExpenseReceiptUpload from '../../components/expenses/ExpenseReceiptUpload';
import { createFixedAsset, fetchAssetRegister, type FixedAssetCategory } from '../../api/assets';
import { createResource, listResource } from '../../api/resources';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatDateOnly } from '../../utils/dateTime';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatCompactRupiah, formatRupiah } from '../../utils/formatCurrency';

type ExpenseCategory = 'RENT_BUILDING' | 'SALARY' | 'ELECTRICITY' | 'WATER' | 'INTERNET' | 'MAINTENANCE' | 'CLEANING' | 'SUPPLIES' | 'TAX' | 'MARKETING' | 'OTHER';
type WorkspaceView = 'ALL' | 'UTILITY' | 'OPERATIONS' | 'PURCHASES';

type Expense = {
  id: number;
  expenseDate: string;
  type: 'FIXED' | 'VARIABLE';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  category: ExpenseCategory;
  description: string;
  amountRupiah: number;
  vendorName?: string | null;
  note?: string | null;
  room?: { code?: string | null; name?: string | null } | null;
};

type PurchaseForm = {
  expenseDate: string;
  type: 'FIXED' | 'VARIABLE';
  category: ExpenseCategory;
  description: string;
  amountRupiah?: number;
  vendorName: string;
  note: string;
  aiDraftMeta?: Record<string, unknown>;
  createAssetCandidate: boolean;
  assetCategory: FixedAssetCategory;
  usefulLifeMonths: number;
  depreciationEnabled: boolean;
};

const CATEGORY_META: Record<ExpenseCategory, { label: string; shortLabel: string; icon: string; kind: WorkspaceView }> = {
  ELECTRICITY: { label: 'Listrik PLN', shortLabel: 'Listrik', icon: '⚡', kind: 'UTILITY' },
  WATER: { label: 'Air / PDAM / Pompa', shortLabel: 'Air', icon: '💧', kind: 'UTILITY' },
  INTERNET: { label: 'Internet / modal WiFi', shortLabel: 'Internet', icon: '📶', kind: 'UTILITY' },
  SUPPLIES: { label: 'Barang habis pakai / belanja kecil', shortLabel: 'Belanja barang', icon: '🛒', kind: 'PURCHASES' },
  MAINTENANCE: { label: 'Perawatan / perbaikan', shortLabel: 'Perawatan', icon: '🛠️', kind: 'OPERATIONS' },
  CLEANING: { label: 'Kebersihan / jasa bersih', shortLabel: 'Kebersihan', icon: '🧹', kind: 'OPERATIONS' },
  SALARY: { label: 'Gaji staf / operasional orang', shortLabel: 'Gaji', icon: '👤', kind: 'OPERATIONS' },
  RENT_BUILDING: { label: 'Sewa gedung / tanah', shortLabel: 'Sewa', icon: '🏠', kind: 'OPERATIONS' },
  TAX: { label: 'Pajak / retribusi / sampah', shortLabel: 'Pajak', icon: '🏛️', kind: 'OPERATIONS' },
  MARKETING: { label: 'Marketing / listing / komisi', shortLabel: 'Marketing', icon: '📣', kind: 'OPERATIONS' },
  OTHER: { label: 'Operasional lainnya', shortLabel: 'Lainnya', icon: '🧾', kind: 'OPERATIONS' },
};

const ASSET_CATEGORY_LABELS: Record<FixedAssetCategory, string> = {
  BUILDING: 'Bangunan', RENOVATION: 'Renovasi', ROOM_EQUIPMENT: 'Perlengkapan kamar', FURNITURE: 'Furniture', ELECTRONIC: 'Elektronik', UTILITY_EQUIPMENT: 'Peralatan utilitas', VEHICLE: 'Kendaraan', SOFTWARE: 'Software', OTHER: 'Lainnya',
};

function initialForm(category: ExpenseCategory = 'ELECTRICITY', createAssetCandidate = false): PurchaseForm {
  return {
    expenseDate: new Date().toISOString().slice(0, 10),
    type: category === 'INTERNET' || category === 'RENT_BUILDING' || category === 'SALARY' ? 'FIXED' : 'VARIABLE',
    category, description: '', amountRupiah: undefined, vendorName: '', note: '', createAssetCandidate,
    assetCategory: createAssetCandidate ? 'ROOM_EQUIPMENT' : 'OTHER', usefulLifeMonths: 36, depreciationEnabled: false,
  };
}

function dateInputValue(value?: string | null) { return value ? value.slice(0, 10) : ''; }
function sumAmount(items: Expense[]) { return items.reduce((total, item) => total + Number(item.amountRupiah ?? 0), 0); }
function matchesView(item: Expense, view: WorkspaceView) { return view === 'ALL' || CATEGORY_META[item.category]?.kind === view; }

export default function PurchaseOperationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<WorkspaceView>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [search, setSearch] = useState('');
  const [showEntry, setShowEntry] = useState(false);
  const [form, setForm] = useState<PurchaseForm>(() => initialForm());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useDocumentTitle('Pembelian & Operasional');

  const expensesQuery = useQuery({ queryKey: ['purchase-operations', 'expenses'], queryFn: () => listResource<Expense>('/expenses', { limit: 500 }) });
  const assetsQuery = useQuery({ queryKey: ['purchase-operations', 'assets'], queryFn: () => fetchAssetRegister({ limit: 500 }) });
  const expenses = expensesQuery.data?.items ?? [];
  const assets = assetsQuery.data?.items ?? [];
  const periodExpenses = useMemo(() => expenses.filter((item) => !selectedMonth || dateInputValue(item.expenseDate).startsWith(selectedMonth)), [expenses, selectedMonth]);
  const visibleExpenses = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('id-ID');
    return periodExpenses.filter((item) => {
      if (!matchesView(item, view)) return false;
      if (!needle) return true;
      return `${item.description} ${item.vendorName ?? ''} ${item.note ?? ''} ${CATEGORY_META[item.category]?.label ?? ''}`.toLocaleLowerCase('id-ID').includes(needle);
    });
  }, [periodExpenses, search, view]);
  const periodAssets = useMemo(() => assets.filter((asset) => !selectedMonth || dateInputValue(asset.acquisitionDate).startsWith(selectedMonth)), [assets, selectedMonth]);
  const totals = useMemo(() => {
    const utilities = periodExpenses.filter((item) => CATEGORY_META[item.category]?.kind === 'UTILITY');
    const purchases = periodExpenses.filter((item) => CATEGORY_META[item.category]?.kind === 'PURCHASES');
    return {
      all: sumAmount(periodExpenses), utilities: sumAmount(utilities), purchases: sumAmount(purchases),
      assetCost: periodAssets.reduce((total, asset) => total + Number(asset.acquisitionCostRupiah ?? 0), 0),
    };
  }, [periodAssets, periodExpenses]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PurchaseForm) => {
      const expense = await createResource<Expense>('/expenses', {
        expenseDate: payload.expenseDate, type: payload.type, category: payload.category, description: payload.description.trim(), amountRupiah: payload.amountRupiah,
        vendorName: payload.vendorName.trim() || undefined, note: payload.note.trim() || undefined, aiDraftMeta: payload.aiDraftMeta,
      });
      if (!payload.createAssetCandidate) return { assetError: null };
      try {
        await createFixedAsset({
          name: payload.description.trim(), category: payload.assetCategory, status: 'DRAFT', locationType: 'GENERAL', capitalizationSource: 'DISCLOSURE_ONLY',
          acquisitionDate: payload.expenseDate, acquisitionCostRupiah: Number(payload.amountRupiah), salvageValueRupiah: 0, usefulLifeMonths: payload.usefulLifeMonths,
          depreciationEnabled: payload.depreciationEnabled, expenseId: expense.id,
          notes: 'Dibuat dari Pembelian & Operasional. Perlu review/alignment sebelum menjadi nilai aset di ledger.',
        });
        return { assetError: null };
      } catch (assetError) {
        return { assetError: getApiErrorMessage(assetError, 'Pengeluaran sudah tersimpan, tetapi kandidat aset belum dapat dibuat.') };
      }
    },
    onSuccess: ({ assetError }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-operations'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowEntry(false); setForm(initialForm());
      setNotice(assetError ?? 'Pengeluaran tersimpan. Riwayat dan ringkasan sudah diperbarui.');
    },
    onError: (saveError) => setError(getApiErrorMessage(saveError, 'Pengeluaran belum dapat disimpan.')),
  });

  const openEntry = (category: ExpenseCategory, createAssetCandidate = false) => { setError(null); setNotice(null); setForm(initialForm(category, createAssetCandidate)); setShowEntry(true); };
  const applyOcrDraft = (patch: Record<string, unknown>) => {
    const nextAmount = Number(patch.amountRupiah);
    setForm((current) => ({
      ...current, expenseDate: typeof patch.expenseDate === 'string' ? patch.expenseDate : current.expenseDate,
      type: patch.type === 'FIXED' || patch.type === 'VARIABLE' ? patch.type : current.type,
      category: typeof patch.category === 'string' && patch.category in CATEGORY_META ? patch.category as ExpenseCategory : current.category,
      description: typeof patch.description === 'string' ? patch.description : current.description,
      amountRupiah: Number.isFinite(nextAmount) && nextAmount > 0 ? nextAmount : current.amountRupiah,
      vendorName: typeof patch.vendorName === 'string' ? patch.vendorName : current.vendorName,
      note: typeof patch.note === 'string' ? patch.note : current.note,
      aiDraftMeta: patch.aiDraftMeta && typeof patch.aiDraftMeta === 'object' ? patch.aiDraftMeta as Record<string, unknown> : current.aiDraftMeta,
    }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    if (!form.description.trim()) return setError('Isi nama atau keterangan pembelian terlebih dahulu.');
    if (!form.amountRupiah || form.amountRupiah <= 0) return setError('Nominal pembelian harus lebih dari Rp 0.');
    saveMutation.mutate(form);
  };
  const periodLabel = selectedMonth ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${selectedMonth}-01T00:00:00`)) : 'semua periode';

  return <FeatureErrorBoundary><div className="purchase-operations-page">
    <PageHeader eyebrow="Keuangan · Pembelian" title="Pembelian & Operasional" description="Mulai dari apa yang dibeli. Sistem memisahkan biaya listrik/air/internet, belanja barang, dan kandidat aset agar riwayat kas mudah diaudit." actionLabel="Catat pembelian" onAction={() => openEntry('SUPPLIES')} secondaryAction={<Button variant="outline-primary" onClick={() => navigate('/finance/assets')}>Buka register aset</Button>} />
    {notice ? <Alert variant="success" dismissible onClose={() => setNotice(null)} className="mb-0">{notice}</Alert> : null}

    <Card className="purchase-start-card border-0"><Card.Body>
      <div className="purchase-section-heading"><div><div className="section-kicker">Langkah 1 · Tentukan jenis transaksi</div><h2>Pilih jalur pencatatan yang sesuai</h2><p>Jangan masukkan barang tahan lama sebagai biaya rutin. Pembeli WiFi dari luar tetap dicatat sebagai pendapatan di menu WiFi, bukan di sini.</p></div><Link className="btn btn-light btn-sm" to="/wifi-sales">Catat penjualan WiFi</Link></div>
      <Row className="g-3">
        <Col lg={4}><button type="button" className="purchase-path-card is-utility" onClick={() => openEntry('ELECTRICITY')}><span className="purchase-path-icon">⚡</span><span><strong>Bayar utilitas</strong><small>Listrik PLN, air/PDAM, atau internet/modal WiFi.</small><em>Masuk biaya operasional</em></span></button></Col>
        <Col lg={4}><button type="button" className="purchase-path-card is-purchase" onClick={() => openEntry('SUPPLIES')}><span className="purchase-path-icon">🛒</span><span><strong>Belanja operasional</strong><small>Galon, alat kebersihan, perlengkapan kecil, atau kebutuhan harian.</small><em>Masuk pembelian barang</em></span></button></Col>
        <Col lg={4}><button type="button" className="purchase-path-card is-asset" onClick={() => openEntry('SUPPLIES', true)}><span className="purchase-path-icon">🛏️</span><span><strong>Barang tahan lama</strong><small>Kasur, AC, kipas, lemari, CCTV, mesin cuci, atau peralatan bernilai guna panjang.</small><em>Buat kandidat aset untuk review</em></span></button></Col>
      </Row>
    </Card.Body></Card>

    <section className="purchase-filter-bar" aria-label="Penyaring pembelian dan operasional">
      <div className="purchase-period-control"><label htmlFor="purchase-period">Periode</label><div className="d-flex gap-2 align-items-center"><Form.Control id="purchase-period" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />{selectedMonth ? <Button size="sm" variant="link" className="text-nowrap" onClick={() => setSelectedMonth('')}>Semua waktu</Button> : null}</div></div>
      <div className="purchase-filter-tabs" role="tablist" aria-label="Kelompok transaksi">{([['ALL', 'Semua catatan'], ['UTILITY', 'Utilitas'], ['PURCHASES', 'Belanja barang'], ['OPERATIONS', 'Operasional']] as Array<[WorkspaceView, string]>).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? 'is-active' : ''} onClick={() => setView(key)}>{label}</button>)}</div>
      <Form.Control className="purchase-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama toko, keterangan, atau jenis biaya" aria-label="Cari riwayat pembelian" />
    </section>

    <section className="purchase-summary-grid" aria-label={`Ringkasan ${periodLabel}`}>
      <Card className="purchase-summary-card is-total border-0"><Card.Body><span>Total keluar</span><strong>{formatCompactRupiah(totals.all)}</strong><small>{periodExpenses.length} catatan pada {periodLabel}</small></Card.Body></Card>
      <Card className="purchase-summary-card is-utility border-0"><Card.Body><span>Utilitas</span><strong>{formatCompactRupiah(totals.utilities)}</strong><small>Listrik, air, dan internet</small></Card.Body></Card>
      <Card className="purchase-summary-card is-purchase border-0"><Card.Body><span>Belanja barang</span><strong>{formatCompactRupiah(totals.purchases)}</strong><small>Barang habis pakai / perlengkapan kecil</small></Card.Body></Card>
      <Card className="purchase-summary-card is-asset border-0"><Card.Body><span>Register aset</span><strong>{formatCompactRupiah(totals.assetCost)}</strong><small>{periodAssets.length} aset tercatat · perlu review ledger bila belum aligned</small></Card.Body></Card>
    </section>

    <Row className="g-3 align-items-stretch"><Col xl={8}><Card className="purchase-timeline-card content-card border-0 h-100"><Card.Body>
      <div className="purchase-section-heading compact"><div><div className="section-kicker">Langkah 2 · Riwayat kas keluar</div><h2>Kapan dan untuk apa uang dibelanjakan</h2><p>{visibleExpenses.length} catatan sesuai penyaring. Urut dari transaksi terbaru.</p></div><Button variant="outline-primary" size="sm" onClick={() => openEntry('ELECTRICITY')}>+ Catat utilitas</Button></div>
      {expensesQuery.isLoading ? <div className="py-5 text-center text-muted"><Spinner animation="border" size="sm" className="me-2" />Memuat riwayat pembelian...</div> : null}
      {expensesQuery.isError ? <Alert variant="danger" className="mb-0">Riwayat pengeluaran belum dapat dimuat. Coba muat ulang halaman.</Alert> : null}
      {!expensesQuery.isLoading && !expensesQuery.isError && visibleExpenses.length === 0 ? <EmptyState title="Belum ada catatan pada penyaring ini" description="Pilih periode lain atau catat pembelian pertama." /> : null}
      {!expensesQuery.isLoading && !expensesQuery.isError && visibleExpenses.length > 0 ? <div className="table-responsive"><Table hover className="purchase-timeline-table align-middle mb-0"><thead><tr><th>Tanggal</th><th>Masuk ke</th><th>Rincian pembelian</th><th>Vendor / lokasi</th><th className="text-end">Nominal</th></tr></thead><tbody>{visibleExpenses.map((item) => { const meta = CATEGORY_META[item.category]; return <tr key={item.id}><td data-label="Tanggal"><strong>{formatDateOnly(item.expenseDate)}</strong><small>{item.type === 'FIXED' ? 'Biaya tetap' : 'Biaya variabel'}</small></td><td data-label="Masuk ke"><span className={`expense-kind-chip is-${meta?.kind.toLowerCase() ?? 'operations'}`}>{meta?.icon} {meta?.shortLabel ?? item.category}</span></td><td data-label="Rincian pembelian"><div className="fw-semibold">{item.description}</div>{item.note ? <small className="text-muted">{item.note}</small> : null}</td><td data-label="Vendor / lokasi"><div>{item.vendorName || '—'}</div>{item.room?.code ? <small className="text-muted">Kamar {item.room.code}</small> : null}</td><td data-label="Nominal" className="text-end fw-bold">{formatRupiah(item.amountRupiah)}</td></tr>; })}</tbody></Table></div> : null}
    </Card.Body></Card></Col>
    <Col xl={4}><Card className="purchase-guide-card border-0 h-100"><Card.Body><div className="section-kicker">Aturan klasifikasi</div><h2>Supaya laporan tidak tercampur</h2><div className="purchase-guide-list"><div><span>1</span><p><strong>Listrik, air, internet</strong> selalu biaya operasional sesuai tanggal pembayaran.</p></div><div><span>2</span><p><strong>Barang cepat habis</strong> seperti galon dan alat bersih masuk belanja operasional.</p></div><div><span>3</span><p><strong>Kasur, AC, kipas, lemari</strong> dicatat sebagai kandidat aset lalu ditinjau di register aset sebelum alignment ledger.</p></div></div><Alert variant="light" className="border small mb-0">Kandidat aset dibuat sebagai <strong>draft disclosure</strong>: tidak mengubah jurnal lagi sampai owner meninjau dan melakukan alignment di register aset.</Alert></Card.Body></Card></Col></Row>

    <Modal show={showEntry} onHide={() => !saveMutation.isPending && setShowEntry(false)} centered size="lg" scrollable><Form onSubmit={submit}>
      <Modal.Header closeButton><Modal.Title>{form.createAssetCandidate ? 'Catat pembelian barang tahan lama' : `Catat ${CATEGORY_META[form.category].shortLabel.toLowerCase()}`}</Modal.Title></Modal.Header>
      <Modal.Body>{error ? <Alert variant="danger">{error}</Alert> : null}<Alert variant={form.createAssetCandidate ? 'warning' : 'info'} className="small">{form.createAssetCandidate ? 'Pengeluaran akan dicatat sebagai biaya. Sistem juga membuat kandidat aset berstatus draft untuk direview; jurnal aset tidak dibuat otomatis.' : 'Saat disimpan, pengeluaran langsung dikonfirmasi dan sistem mencoba membuat jurnal sesuai konfigurasi accounting.'}</Alert>
        <Row className="g-3"><Col md={4}><Form.Group><Form.Label>Tanggal beli / bayar</Form.Label><Form.Control required type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} /></Form.Group></Col><Col md={4}><Form.Group><Form.Label>Masuk ke</Form.Label><Form.Select value={form.category} onChange={(event) => { const category = event.target.value as ExpenseCategory; setForm((current) => ({ ...current, category, type: category === 'INTERNET' || category === 'RENT_BUILDING' || category === 'SALARY' ? 'FIXED' : current.type })); }}>{(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((category) => <option key={category} value={category}>{CATEGORY_META[category].icon} {CATEGORY_META[category].label}</option>)}</Form.Select></Form.Group></Col><Col md={4}><Form.Group><Form.Label>Sifat biaya</Form.Label><Form.Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PurchaseForm['type'] }))}><option value="VARIABLE">Variabel</option><option value="FIXED">Tetap</option></Form.Select></Form.Group></Col><Col md={8}><Form.Group><Form.Label>Barang / keterangan pembayaran</Form.Label><Form.Control required value={form.description} placeholder="Contoh: Token listrik PLN Juli 2026" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Form.Group></Col><Col md={4}><Form.Group><Form.Label>Nominal</Form.Label><CurrencyInput required value={form.amountRupiah} onChange={(amountRupiah) => setForm((current) => ({ ...current, amountRupiah }))} placeholder="0" /></Form.Group></Col><Col md={6}><Form.Group><Form.Label>Vendor / tempat beli</Form.Label><Form.Control value={form.vendorName} placeholder="PLN, Tokopedia, toko, teknisi" onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label>Catatan</Form.Label><Form.Control value={form.note} placeholder="Nomor meter, invoice, atau detail barang" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></Form.Group></Col></Row>
        <Form.Check className="mt-4" type="switch" id="purchase-create-asset" checked={form.createAssetCandidate} onChange={(event) => setForm((current) => ({ ...current, createAssetCandidate: event.target.checked, assetCategory: event.target.checked ? 'ROOM_EQUIPMENT' : current.assetCategory }))} label="Ini barang tahan lama; buat kandidat aset untuk review" />
        {form.createAssetCandidate ? <Row className="g-3 mt-1 p-2 rounded border bg-light"><Col md={6}><Form.Group><Form.Label>Kategori kandidat aset</Form.Label><Form.Select value={form.assetCategory} onChange={(event) => setForm((current) => ({ ...current, assetCategory: event.target.value as FixedAssetCategory }))}>{(Object.keys(ASSET_CATEGORY_LABELS) as FixedAssetCategory[]).map((category) => <option key={category} value={category}>{ASSET_CATEGORY_LABELS[category]}</option>)}</Form.Select></Form.Group></Col><Col md={3}><Form.Group><Form.Label>Masa manfaat</Form.Label><Form.Control type="number" min={1} value={form.usefulLifeMonths} onChange={(event) => setForm((current) => ({ ...current, usefulLifeMonths: Number(event.target.value) || 1 }))} /><Form.Text>bulan</Form.Text></Form.Group></Col><Col md={3} className="d-flex align-items-end"><Form.Check type="switch" id="purchase-depreciation" checked={form.depreciationEnabled} onChange={(event) => setForm((current) => ({ ...current, depreciationEnabled: event.target.checked }))} label="Siap disusutkan" /></Col></Row> : null}
        <details className="mt-4"><summary className="small fw-semibold">Pindai nota untuk mengisi draft</summary><div className="pt-3"><ExpenseReceiptUpload onApplyDraft={applyOcrDraft} disabled={saveMutation.isPending} /></div></details>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={() => setShowEntry(false)} disabled={saveMutation.isPending}>Batal</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menyimpan...</> : 'Simpan catatan'}</Button></Modal.Footer>
    </Form></Modal>
  </div></FeatureErrorBoundary>;
}
