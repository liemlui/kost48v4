// FILE: AssetRegisterPage.tsx — daftar aset tetap + penyusutan (JALUR UANG)
import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import CurrencyInput from '../../components/common/CurrencyInput';
import {
  createFixedAsset,
  fetchAssetLedgerAlignment,
  fetchAssetReadinessV2,
  fetchAssetRegister,
  fetchDepreciationPreview,
  postAssetLedgerAlignment,
  previewAssetLedgerAlignment,
  runDepreciation,
  updateFixedAsset,
  type AssetLedgerAlignmentPayload,
  type CreateFixedAssetPayload,
  type FixedAsset,
  type FixedAssetCategory,
  type FixedAssetCapitalizationSource,
  type FixedAssetLedgerAlignmentMethod,
  type UpdateFixedAssetPayload,
} from '../../api/assets';
import { listResource } from '../../api/resources';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import { formatDateOnly } from '../../utils/dateTime';

function formatRupiah(value?: number | null) {
  const parsed = Number(value ?? 0);
  const abs = formatRupiahWithoutSymbol(Math.abs(parsed));
  return parsed < 0 ? `(Rp ${abs})` : `Rp ${abs}`;
}

function formatDate(value?: string | null) {
  return formatDateOnly(value);
}

const categoryOptions: FixedAssetCategory[] = ['BUILDING', 'RENOVATION', 'ROOM_EQUIPMENT', 'FURNITURE', 'ELECTRONIC', 'UTILITY_EQUIPMENT', 'VEHICLE', 'SOFTWARE', 'OTHER'];
const capitalizationOptions: FixedAssetCapitalizationSource[] = ['OPENING_BALANCE', 'PURCHASE_JOURNAL', 'DISCLOSURE_ONLY'];
const alignmentMethods: FixedAssetLedgerAlignmentMethod[] = ['RECLASSIFY_FROM_CASH', 'OWNER_CAPITAL_CONTRIBUTION', 'DISCLOSURE_ONLY'];

const categoryLabels: Record<string, string> = {
  BUILDING: 'Bangunan',
  RENOVATION: 'Renovasi',
  ROOM_EQUIPMENT: 'Barang Kamar',
  FURNITURE: 'Furniture',
  ELECTRONIC: 'Elektronik',
  UTILITY_EQUIPMENT: 'Peralatan Utilitas',
  VEHICLE: 'Kendaraan',
  SOFTWARE: 'Software',
  OTHER: 'Lainnya',
};

const capitalizationLabels: Record<string, string> = {
  OPENING_BALANCE: 'Sudah masuk opening balance',
  PURCHASE_JOURNAL: 'Pembelian terjurnal',
  DISCLOSURE_ONLY: 'Catatan dulu / belum dijurnal',
};

const alignmentLabels: Record<string, string> = {
  RECLASSIFY_FROM_CASH: 'Reklasifikasi dari kas/bank',
  OWNER_CAPITAL_CONTRIBUTION: 'Kontribusi modal owner',
  DISCLOSURE_ONLY: 'Hanya catatan (tanpa jurnal)',
  MANUAL_REVIEW: 'Review manual',
};

const alignmentStatusLabels: Record<string, string> = {
  NOT_REQUIRED: 'Tidak perlu',
  NEEDS_REVIEW: 'Perlu ditinjau',
  PREVIEWED: 'Sudah preview',
  ALIGNED: 'Selaras',
  DISCLOSURE_ONLY: 'Hanya catatan',
  VOIDED: 'Dibatalkan',
};

const ALIGNMENT_STATUS_TOOLTIP: Record<string, string> = {
  NOT_REQUIRED: 'Tidak perlu alignment — nilai aset tidak perlu disamakan dengan ledger.',
  NEEDS_REVIEW: 'Perlu ditinjau owner sebelum membuat adjustment journal.',
  PREVIEWED: 'Sudah dibuat preview journal, belum diposting.',
  ALIGNED: 'Register aset sudah sama dengan ledger Fixed Assets.',
  DISCLOSURE_ONLY: 'Hanya dicatat sebagai disclosure, tidak membentuk journal.',
  VOIDED: 'Alignment dibatalkan.',
};

function alignmentBadge(status?: string) {
  if (status === 'ALIGNED') return 'success';
  if (status === 'DISCLOSURE_ONLY') return 'secondary';
  if (status === 'NEEDS_REVIEW' || status === 'PREVIEWED') return 'warning';
  return 'light';
}

const initialForm = {
  name: '',
  category: 'ROOM_EQUIPMENT' as FixedAssetCategory,
  capitalizationSource: 'DISCLOSURE_ONLY' as FixedAssetCapitalizationSource,
  acquisitionDate: new Date().toISOString().slice(0, 10),
  depreciationStartDate: new Date().toISOString().slice(0, 10),
  acquisitionCostRupiah: '',
  salvageValueRupiah: '0',
  usefulLifeMonths: '36',
  accumulatedDepreciationRupiah: '0',
  depreciationEnabled: false,
  inventoryItemId: '',
  notes: '',
};

export default function AssetRegisterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [showCreateAsset, setShowCreateAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const now = useMemo(() => new Date(), []);
  const [runPeriod, setRunPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [alignmentAsset, setAlignmentAsset] = useState<FixedAsset | null>(null);
  const [alignmentForm, setAlignmentForm] = useState({
    method: 'RECLASSIFY_FROM_CASH' as FixedAssetLedgerAlignmentMethod,
    creditAccountCode: '1010',
    amountRupiah: '',
    notes: '',
  });

  const assetsQuery = useQuery({ queryKey: ['assets', 'register'], queryFn: () => fetchAssetRegister({ limit: 50 }) });
  const readinessQuery = useQuery({ queryKey: ['assets', 'readiness-v2'], queryFn: fetchAssetReadinessV2 });
  const alignmentQuery = useQuery({ queryKey: ['assets', 'ledger-alignment'], queryFn: fetchAssetLedgerAlignment });
  const previewQuery = useQuery({ queryKey: ['assets', 'depreciation-preview', runPeriod], queryFn: () => fetchDepreciationPreview(runPeriod) });
  const inventoryOptionsQuery = useQuery({
    queryKey: ['assets', 'inventory-options'],
    queryFn: () => listResource<{ id: number; name: string; sku?: string | null; category?: string | null }>('/inventory-items', { limit: 500, isActive: 'true' }),
  });

  const createMutation = useMutation({
    mutationFn: createFixedAsset,
    onSuccess: () => {
      setForm(initialForm);
      setShowCreateAsset(false);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ assetId, payload }: { assetId: number; payload: UpdateFixedAssetPayload }) => updateFixedAsset(assetId, payload),
    onSuccess: () => {
      setForm(initialForm);
      setEditingAsset(null);
      setShowCreateAsset(false);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: runDepreciation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
  });

  const alignmentPreviewMutation = useMutation({
    mutationFn: ({ assetId, payload }: { assetId: number; payload: AssetLedgerAlignmentPayload }) => previewAssetLedgerAlignment(assetId, payload),
  });

  const alignmentPostMutation = useMutation({
    mutationFn: ({ assetId, payload }: { assetId: number; payload: AssetLedgerAlignmentPayload }) => postAssetLedgerAlignment(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      setAlignmentAsset(null);
      alignmentPreviewMutation.reset();
    },
  });

  const assets = assetsQuery.data?.items ?? [];
  const readiness = readinessQuery.data;
  const alignment = alignmentQuery.data;
  const preview = previewQuery.data;
  const canRunDepreciation = Boolean(preview?.eligibleAssetCount && !preview.alreadyPosted && preview.totalDepreciationRupiah > 0);

  function submitAsset(event: FormEvent) {
    event.preventDefault();
    const payload: CreateFixedAssetPayload = {
      name: form.name.trim(),
      category: form.category,
      capitalizationSource: form.capitalizationSource,
      acquisitionDate: form.acquisitionDate,
      depreciationStartDate: form.depreciationStartDate || form.acquisitionDate,
      acquisitionCostRupiah: Number(form.acquisitionCostRupiah || 0),
      salvageValueRupiah: Number(form.salvageValueRupiah || 0),
      usefulLifeMonths: Number(form.usefulLifeMonths || 1),
      accumulatedDepreciationRupiah: Number(form.accumulatedDepreciationRupiah || 0),
      depreciationEnabled: form.depreciationEnabled,
      inventoryItemId: form.inventoryItemId ? Number(form.inventoryItemId) : undefined,
      notes: form.notes || undefined,
    };
    if (editingAsset) {
      updateMutation.mutate({ assetId: editingAsset.id, payload });
      return;
    }
    createMutation.mutate(payload);
  }

  function openCreateAssetModal() {
    setEditingAsset(null);
    createMutation.reset();
    updateMutation.reset();
    setForm(initialForm);
    setShowCreateAsset(true);
  }

  function closeCreateAssetModal() {
    if (createMutation.isPending || updateMutation.isPending) return;
    setShowCreateAsset(false);
    setEditingAsset(null);
  }

  function openEditAssetModal(asset: FixedAsset) {
    createMutation.reset();
    updateMutation.reset();
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      category: asset.category,
      capitalizationSource: asset.capitalizationSource,
      acquisitionDate: asset.acquisitionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      depreciationStartDate: asset.depreciationStartDate?.slice(0, 10) ?? asset.acquisitionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      acquisitionCostRupiah: String(asset.acquisitionCostRupiah ?? ''),
      salvageValueRupiah: String(asset.salvageValueRupiah ?? 0),
      usefulLifeMonths: String(asset.usefulLifeMonths ?? 36),
      accumulatedDepreciationRupiah: String(asset.accumulatedDepreciationRupiah ?? 0),
      depreciationEnabled: asset.depreciationEnabled,
      inventoryItemId: asset.inventoryItemId ? String(asset.inventoryItemId) : '',
      notes: asset.notes ?? '',
    });
    setShowCreateAsset(true);
  }

  function openAlignmentModal(asset: FixedAsset) {
    setAlignmentAsset(asset);
    setAlignmentForm({
      method: 'RECLASSIFY_FROM_CASH',
      creditAccountCode: '1010',
      amountRupiah: String(asset.acquisitionCostRupiah || ''),
      notes: `Alignment ledger ${asset.assetCode}`,
    });
    alignmentPreviewMutation.reset();
    alignmentPostMutation.reset();
  }

  function buildAlignmentPayload(): AssetLedgerAlignmentPayload {
    return {
      method: alignmentForm.method,
      creditAccountCode: alignmentForm.method === 'RECLASSIFY_FROM_CASH' ? alignmentForm.creditAccountCode || '1010' : undefined,
      amountRupiah: alignmentForm.method === 'DISCLOSURE_ONLY' ? undefined : Number(alignmentForm.amountRupiah || 0),
      notes: alignmentForm.notes || undefined,
    };
  }

  function previewAlignment() {
    if (!alignmentAsset) return;
    alignmentPreviewMutation.mutate({ assetId: alignmentAsset.id, payload: buildAlignmentPayload() });
  }

  function postAlignment() {
    if (!alignmentAsset) return;
    alignmentPostMutation.mutate({ assetId: alignmentAsset.id, payload: buildAlignmentPayload() });
  }

  return (
    <div className="finance-workspace">
  <PageHeader
    title="Daftar Aset Tetap"
    description="Daftar aset tetap, depresiasi, dan penyesuaian ledger — pastikan aset tercatat dengan benar di Neraca."
    secondaryAction={(
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <Badge bg="primary">Fixed Asset</Badge>
        <Button type="button" onClick={openCreateAssetModal}>Tambah Aset Baru</Button>
      </div>
    )}
  />

      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Aset</div><h3 className="h4 mb-1">{formatRupiah(readiness?.totals.acquisitionCostRupiah)}</h3><small className="text-muted">Total acquisition cost terdaftar</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Buku</div><h3 className="h4 mb-1">{formatRupiah(readiness?.totals.netBookValueRupiah)}</h3><small className="text-muted">Cost dikurangi akumulasi depresiasi</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Buku (Ledger)</div><h3 className="h4 mb-1">{formatRupiah(alignment?.ledger.netFixedAssetsRupiah)}</h3><small className="text-muted">Dari JournalEntry ledger</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Selisih Ledger vs Register</div><h3 className="h4 mb-1">{formatRupiah(alignment?.gapRupiah)}</h3><small className="text-muted">Register vs ledger</small></Card.Body></Card>
        </Col>
      </Row>

      {alignment?.needsAlignment ? (
        <Alert variant="warning" className="border-0 shadow-sm">
          <strong>Perlu alignment ledger.</strong> Asset register belum sama dengan ledger Fixed Assets. Review pilihan alignment sebelum membuat adjustment journal agar tidak double-count opening balance.
        </Alert>
      ) : alignment ? (
        <Alert variant="success" className="border-0 shadow-sm">Register aset dan ledger fixed asset sudah aligned.</Alert>
      ) : null}

      <Row className="g-3 mb-3">
        <Col xs={12}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                <div><div className="small text-uppercase text-muted fw-semibold mb-1">Register</div><h3 className="h5 mb-1">Daftar aset</h3><p className="text-muted mb-0">Gunakan alignment hanya setelah owner yakin treatment ledger-nya benar.</p></div>
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                  <Badge bg={assets.length ? 'success' : 'secondary'}>{assets.length} aset</Badge>
                  <Button type="button" size="sm" onClick={openCreateAssetModal}>Tambah Aset Baru</Button>
                </div>
              </div>
              {assetsQuery.isLoading ? <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Memuat aset...</div> : assets.length ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead><tr><th>Aset</th><th>Cost</th><th>Akum.</th><th>Nilai buku</th><th>Alignment</th><th>Aksi</th></tr></thead>
                    <tbody>{assets.map((asset) => {
                      const status = asset.ledgerAlignment?.status ?? 'NEEDS_REVIEW';
                      return <tr key={asset.id}>
                        <td>
                          <div className="fw-semibold">{asset.assetCode} · {asset.name}</div>
                          <small className="text-muted">{categoryLabels[asset.category] ?? asset.category} · {capitalizationLabels[asset.capitalizationSource] ?? asset.capitalizationSource}</small>
                          {(asset.inventoryItem || asset.room) ? (
                            <div><small className="text-success">🔗 Tertaut: {[asset.inventoryItem?.name ? `${asset.inventoryItem.name} (inventaris)` : null, asset.room?.code ? `Kamar ${asset.room.code}` : null].filter(Boolean).join(' · ')}</small></div>
                          ) : null}
                        </td>
                        <td>{formatRupiah(asset.acquisitionCostRupiah)}</td>
                        <td>{formatRupiah(asset.accumulatedDepreciationRupiah)}</td>
                        <td>{formatRupiah(asset.bookValueRupiah)}</td>
                        <td><Badge bg={alignmentBadge(status)} text={alignmentBadge(status) === 'warning' || alignmentBadge(status) === 'light' ? 'dark' : undefined} title={ALIGNMENT_STATUS_TOOLTIP[status] ?? 'Status alignment aset terhadap ledger Fixed Assets.'}>{alignmentStatusLabels[status] ?? status}</Badge></td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-secondary" onClick={() => openEditAssetModal(asset)}>Edit</Button>
                            <Button size="sm" variant="outline-primary" disabled={status === 'ALIGNED'} onClick={() => openAlignmentModal(asset)}>{status === 'ALIGNED' ? 'Aligned' : 'Review'}</Button>
                          </div>
                        </td>
                      </tr>;
                    })}</tbody>
                  </Table>
                </div>
              ) : <Alert variant="light" className="border mb-0">Belum ada aset. Tambahkan aset pertama sebagai disclosure/opening agar tidak langsung double-count ledger.</Alert>}
            </Card.Body>
          </Card>
        </Col>

      </Row>

      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
            <div><div className="small text-uppercase text-muted fw-semibold mb-1">Depresiasi Bulanan</div><h3 className="h5 mb-1">Preview &amp; posting depresiasi</h3><p className="text-muted mb-0">Posting beban penyusutan bulanan ke jurnal akuntansi berdasarkan aset yang aktif dan eligible.</p></div>
            <div className="d-flex gap-2 align-items-end"><Form.Group><Form.Label className="small mb-1">Tahun</Form.Label><Form.Control type="number" value={runPeriod.year} onChange={(e) => setRunPeriod((prev) => ({ ...prev, year: Number(e.target.value) }))} style={{ width: 110 }} /></Form.Group><Form.Group><Form.Label className="small mb-1">Bulan</Form.Label><Form.Control type="number" min={1} max={12} value={runPeriod.month} onChange={(e) => setRunPeriod((prev) => ({ ...prev, month: Number(e.target.value) }))} style={{ width: 90 }} /></Form.Group><Button variant="outline-primary" disabled={!canRunDepreciation || runMutation.isPending} onClick={() => runMutation.mutate({ ...runPeriod, notes: 'Monthly depreciation run' })}>{runMutation.isPending ? 'Memposting...' : 'Posting Depresiasi'}</Button></div>
          </div>
          {previewQuery.isLoading ? <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Menghitung preview...</div> : <>
            <div className="d-flex flex-wrap gap-2 mb-3"><Badge bg={preview?.alreadyPosted ? 'secondary' : 'primary'}>{preview?.alreadyPosted ? 'Sudah diposting' : 'Belum diposting'}</Badge><Badge bg="light" text="dark" className="border">Eligible: {preview?.eligibleAssetCount ?? 0}</Badge><Badge bg="light" text="dark" className="border">Total: {formatRupiah(preview?.totalDepreciationRupiah)}</Badge></div>
            {runMutation.isError ? <Alert variant="danger">{getApiErrorMessage(runMutation.error, 'Gagal post depresiasi')}</Alert> : null}
            {runMutation.isSuccess ? <Alert variant="success">Depresiasi berhasil diposting dan JournalEntry sudah dibuat.</Alert> : null}
            {preview?.eligibleLines.length ? <div className="table-responsive"><Table hover size="sm" className="align-middle mb-0"><thead><tr><th>Aset</th><th>Beban bulan ini</th><th>Akum. setelah</th><th>Nilai buku setelah</th></tr></thead><tbody>{preview.eligibleLines.map((line) => <tr key={line.fixedAssetId}><td><div className="fw-semibold">{line.asset.assetCode} · {line.asset.name}</div><small className="text-muted">{line.asset.usefulLifeMonths} bulan</small></td><td>{formatRupiah(line.depreciationAmountRupiah)}</td><td>{formatRupiah(line.accumulatedAfterRupiah)}</td><td>{formatRupiah(line.bookValueAfterRupiah)}</td></tr>)}</tbody></Table></div> : <Alert variant="light" className="border mb-0">Belum ada aset eligible. Aktifkan depreciationEnabled pada aset yang aman untuk disusutkan.</Alert>}
          </>}
        </Card.Body>
      </Card>

      <Modal show={showCreateAsset} onHide={closeCreateAssetModal} size="lg" centered>
        <Form onSubmit={submitAsset}>
          <Modal.Header closeButton>
            <Modal.Title>{editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="small text-uppercase text-muted fw-semibold mb-1">Pendaftaran aset baru</div>
            <p className="text-muted small mb-3">
              Isi data aset tetap. Validasi field wajib tetap aktif sebelum simpan.
            </p>
            <div className="d-grid gap-3">
              <Form.Group>
                <Form.Label>Nama aset</Form.Label>
                <Form.Control
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: AC kamar 201"
                  required
                />
              </Form.Group>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Kategori</Form.Label>
                    <Form.Select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as FixedAssetCategory }))}>
                      {categoryOptions.map((option) => <option key={option} value={option}>{categoryLabels[option]}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Basis kapitalisasi</Form.Label>
                    <Form.Select value={form.capitalizationSource} onChange={(e) => setForm((prev) => ({ ...prev, capitalizationSource: e.target.value as FixedAssetCapitalizationSource }))}>
                      {capitalizationOptions.map((option) => <option key={option} value={option}>{capitalizationLabels[option]}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Tanggal perolehan</Form.Label>
                    <Form.Control type="date" value={form.acquisitionDate} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDate: e.target.value }))} required />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Mulai depresiasi</Form.Label>
                    <Form.Control type="date" value={form.depreciationStartDate} onChange={(e) => setForm((prev) => ({ ...prev, depreciationStartDate: e.target.value }))} />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Cost</Form.Label>
                    <CurrencyInput required value={form.acquisitionCostRupiah === '' ? undefined : Number(form.acquisitionCostRupiah)} onChange={(v) => setForm((prev) => ({ ...prev, acquisitionCostRupiah: v == null ? '' : String(v) }))} />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Residu</Form.Label>
                    <CurrencyInput value={form.salvageValueRupiah === '' ? undefined : Number(form.salvageValueRupiah)} onChange={(v) => setForm((prev) => ({ ...prev, salvageValueRupiah: v == null ? '' : String(v) }))} />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-2">
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Umur manfaat bulan</Form.Label>
                    <Form.Control type="number" min={1} value={form.usefulLifeMonths} onChange={(e) => setForm((prev) => ({ ...prev, usefulLifeMonths: e.target.value }))} required />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label>Akumulasi awal</Form.Label>
                    <CurrencyInput value={form.accumulatedDepreciationRupiah === '' ? undefined : Number(form.accumulatedDepreciationRupiah)} onChange={(v) => setForm((prev) => ({ ...prev, accumulatedDepreciationRupiah: v == null ? '' : String(v) }))} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Check
                type="switch"
                label="Aktifkan depresiasi bulanan untuk aset ini"
                checked={form.depreciationEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, depreciationEnabled: e.target.checked }))}
              />
              <Form.Group>
                <Form.Label>Tautkan ke barang inventaris <span className="text-muted">(opsional)</span></Form.Label>
                <Form.Select value={form.inventoryItemId} onChange={(e) => setForm((prev) => ({ ...prev, inventoryItemId: e.target.value }))}>
                  <option value="">Tidak ditautkan</option>
                  {(inventoryOptionsQuery.data?.items ?? []).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}{opt.category ? ` (${opt.category})` : ''}</option>
                  ))}
                </Form.Select>
                <Form.Text muted>Aset ini akan terhubung ke barang inventaris yang sama, bukan dua data terpisah.</Form.Text>
              </Form.Group>
              <Form.Group>
                <Form.Label>Catatan</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: aset sudah termasuk opening balance 2026-05"
                />
              </Form.Group>
              {createMutation.isError ? <Alert variant="danger" className="mb-0">{getApiErrorMessage(createMutation.error, 'Gagal membuat aset')}</Alert> : null}
              {updateMutation.isError ? <Alert variant="danger" className="mb-0">{getApiErrorMessage(updateMutation.error, 'Gagal memperbarui aset')}</Alert> : null}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeCreateAssetModal} disabled={createMutation.isPending || updateMutation.isPending}>Batal</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : editingAsset ? 'Simpan Perubahan' : 'Simpan Aset'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(alignmentAsset)} onHide={() => setAlignmentAsset(null)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Review Alignment Ledger</Modal.Title></Modal.Header>
        <Modal.Body>
          {alignmentAsset ? <>
            <Alert variant="warning"><strong>Owner approval required.</strong> Jangan post alignment jika nilai aset sudah masuk Fixed Assets di opening balance. Adjustment ini memengaruhi Balance Sheet.</Alert>
            <div className="mb-3"><div className="fw-semibold">{alignmentAsset.assetCode} · {alignmentAsset.name}</div><small className="text-muted">Nilai perolehan {formatRupiah(alignmentAsset.acquisitionCostRupiah)} · nilai buku {formatRupiah(alignmentAsset.bookValueRupiah)}</small></div>
            <Row className="g-2 mb-3"><Col md={6}><Form.Group><Form.Label>Metode</Form.Label><Form.Select value={alignmentForm.method} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, method: e.target.value as FixedAssetLedgerAlignmentMethod }))}>{alignmentMethods.map((method) => <option key={method} value={method}>{alignmentLabels[method]}</option>)}</Form.Select></Form.Group></Col><Col md={3}><Form.Group><Form.Label>Akun kredit</Form.Label><Form.Control value={alignmentForm.method === 'OWNER_CAPITAL_CONTRIBUTION' ? '3000' : alignmentForm.creditAccountCode} disabled={alignmentForm.method !== 'RECLASSIFY_FROM_CASH'} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, creditAccountCode: e.target.value }))} /></Form.Group></Col><Col md={3}><Form.Group><Form.Label>Jumlah</Form.Label><CurrencyInput disabled={alignmentForm.method === 'DISCLOSURE_ONLY'} value={alignmentForm.amountRupiah === '' ? undefined : Number(alignmentForm.amountRupiah)} onChange={(v) => setAlignmentForm((prev) => ({ ...prev, amountRupiah: v == null ? '' : String(v) }))} /></Form.Group></Col></Row>
            <Form.Group className="mb-3"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={alignmentForm.notes} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, notes: e.target.value }))} /></Form.Group>
            {alignmentPreviewMutation.isError ? <Alert variant="danger">{getApiErrorMessage(alignmentPreviewMutation.error, 'Preview gagal')}</Alert> : null}
            {alignmentPostMutation.isError ? <Alert variant="danger">{getApiErrorMessage(alignmentPostMutation.error, 'Post alignment gagal')}</Alert> : null}
            {alignmentPreviewMutation.data ? <Card className="border-0 bg-light"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-2">Preview Journal</div>{alignmentPreviewMutation.data.journalPreview ? <><div>Debit {alignmentPreviewMutation.data.journalPreview.debit.accountCode} {alignmentPreviewMutation.data.journalPreview.debit.accountName}: <strong>{formatRupiah(alignmentPreviewMutation.data.journalPreview.debit.amountRupiah)}</strong></div><div>Credit {alignmentPreviewMutation.data.journalPreview.credit.accountCode} {alignmentPreviewMutation.data.journalPreview.credit.accountName}: <strong>{formatRupiah(alignmentPreviewMutation.data.journalPreview.credit.amountRupiah)}</strong></div><Badge bg="success" className="mt-2">Seimbang</Badge></> : <div className="text-muted">Metode ini tidak membuat journal.</div>}</Card.Body></Card> : null}
          </> : null}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setAlignmentAsset(null)}>Tutup</Button><Button variant="outline-primary" onClick={previewAlignment} disabled={alignmentPreviewMutation.isPending}>{alignmentPreviewMutation.isPending ? 'Memuat preview...' : 'Preview Jurnal'}</Button><Button variant="primary" onClick={postAlignment} disabled={alignmentPostMutation.isPending}>{alignmentPostMutation.isPending ? 'Memposting...' : 'Posting Penyesuaian'}</Button></Modal.Footer>
      </Modal>
    </div>
  );
}
