import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import {
  createFixedAsset,
  fetchAssetLedgerAlignment,
  fetchAssetReadinessV2,
  fetchAssetRegister,
  fetchDepreciationPreview,
  postAssetLedgerAlignment,
  previewAssetLedgerAlignment,
  runDepreciation,
  type AssetLedgerAlignmentPayload,
  type CreateFixedAssetPayload,
  type FixedAsset,
  type FixedAssetCategory,
  type FixedAssetCapitalizationSource,
  type FixedAssetLedgerAlignmentMethod,
} from '../../api/assets';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

function formatRupiah(value?: number | null) {
  const parsed = Number(value ?? 0);
  const abs = Math.abs(parsed).toLocaleString('id-ID');
  return parsed < 0 ? `(Rp ${abs})` : `Rp ${abs}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
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
  UTILITY_EQUIPMENT: 'Utility Equipment',
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
  RECLASSIFY_FROM_CASH: 'Reclassify dari kas/bank',
  OWNER_CAPITAL_CONTRIBUTION: 'Kontribusi modal owner',
  DISCLOSURE_ONLY: 'Disclosure only',
  MANUAL_REVIEW: 'Review manual',
};

const alignmentStatusLabels: Record<string, string> = {
  NOT_REQUIRED: 'Tidak perlu',
  NEEDS_REVIEW: 'Perlu review',
  PREVIEWED: 'Sudah preview',
  ALIGNED: 'Aligned',
  DISCLOSURE_ONLY: 'Disclosure only',
  VOIDED: 'Voided',
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
  notes: '',
};

export default function AssetRegisterPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
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

  const createMutation = useMutation({
    mutationFn: createFixedAsset,
    onSuccess: () => {
      setForm(initialForm);
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
      notes: form.notes || undefined,
    };
    createMutation.mutate(payload);
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
    <div>
  <PageHeader
    title="Asset Register"
    description="List fixed assets, depreciation, and ledger alignment — ensure assets are recorded correctly in the Balance Sheet."
    secondaryAction={<Badge bg="primary">Fixed Asset</Badge>}
  />

      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Aset</div><h3 className="h4 mb-1">{formatRupiah(readiness?.totals.acquisitionCostRupiah)}</h3><small className="text-muted">Total acquisition cost terdaftar</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Buku</div><h3 className="h4 mb-1">{formatRupiah(readiness?.totals.netBookValueRupiah)}</h3><small className="text-muted">Cost dikurangi akumulasi depresiasi</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Ledger Net Fixed Asset</div><h3 className="h4 mb-1">{formatRupiah(alignment?.ledger.netFixedAssetsRupiah)}</h3><small className="text-muted">Dari JournalEntry ledger</small></Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="content-card border-0 h-100"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-1">Alignment Gap</div><h3 className="h4 mb-1">{formatRupiah(alignment?.gapRupiah)}</h3><small className="text-muted">Register vs ledger</small></Card.Body></Card>
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
        <Col xl={7}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                <div><div className="small text-uppercase text-muted fw-semibold mb-1">Register</div><h3 className="h5 mb-1">Daftar aset</h3><p className="text-muted mb-0">Gunakan alignment hanya setelah owner yakin treatment ledger-nya benar.</p></div>
                <Badge bg={assets.length ? 'success' : 'secondary'}>{assets.length} aset</Badge>
              </div>
              {assetsQuery.isLoading ? <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Memuat aset...</div> : assets.length ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead><tr><th>Aset</th><th>Cost</th><th>Akum.</th><th>Nilai buku</th><th>Alignment</th><th>Aksi</th></tr></thead>
                    <tbody>{assets.map((asset) => {
                      const status = asset.ledgerAlignment?.status ?? 'NEEDS_REVIEW';
                      return <tr key={asset.id}>
                        <td><div className="fw-semibold">{asset.assetCode} · {asset.name}</div><small className="text-muted">{categoryLabels[asset.category] ?? asset.category} · {capitalizationLabels[asset.capitalizationSource] ?? asset.capitalizationSource}</small></td>
                        <td>{formatRupiah(asset.acquisitionCostRupiah)}</td>
                        <td>{formatRupiah(asset.accumulatedDepreciationRupiah)}</td>
                        <td>{formatRupiah(asset.bookValueRupiah)}</td>
                        <td><Badge bg={alignmentBadge(status)} text={alignmentBadge(status) === 'warning' || alignmentBadge(status) === 'light' ? 'dark' : undefined}>{alignmentStatusLabels[status] ?? status}</Badge></td>
                        <td><Button size="sm" variant="outline-primary" disabled={status === 'ALIGNED'} onClick={() => openAlignmentModal(asset)}>{status === 'ALIGNED' ? 'Aligned' : 'Review'}</Button></td>
                      </tr>;
                    })}</tbody>
                  </Table>
                </div>
              ) : <Alert variant="light" className="border mb-0">Belum ada aset. Tambahkan aset pertama sebagai disclosure/opening agar tidak langsung double-count ledger.</Alert>}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Tambah Aset</div><h3 className="h5 mb-3">Asset onboarding aman</h3>
              <Form onSubmit={submitAsset} className="d-grid gap-3">
                <Form.Group><Form.Label>Nama aset</Form.Label><Form.Control value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Contoh: AC kamar 201" required /></Form.Group>
                <Row className="g-2"><Col sm={6}><Form.Group><Form.Label>Kategori</Form.Label><Form.Select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as FixedAssetCategory }))}>{categoryOptions.map((option) => <option key={option} value={option}>{categoryLabels[option]}</option>)}</Form.Select></Form.Group></Col><Col sm={6}><Form.Group><Form.Label>Basis kapitalisasi</Form.Label><Form.Select value={form.capitalizationSource} onChange={(e) => setForm((prev) => ({ ...prev, capitalizationSource: e.target.value as FixedAssetCapitalizationSource }))}>{capitalizationOptions.map((option) => <option key={option} value={option}>{capitalizationLabels[option]}</option>)}</Form.Select></Form.Group></Col></Row>
                <Row className="g-2"><Col sm={6}><Form.Group><Form.Label>Tanggal perolehan</Form.Label><Form.Control type="date" value={form.acquisitionDate} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDate: e.target.value }))} required /></Form.Group></Col><Col sm={6}><Form.Group><Form.Label>Mulai depresiasi</Form.Label><Form.Control type="date" value={form.depreciationStartDate} onChange={(e) => setForm((prev) => ({ ...prev, depreciationStartDate: e.target.value }))} /></Form.Group></Col></Row>
                <Row className="g-2"><Col sm={6}><Form.Group><Form.Label>Cost</Form.Label><Form.Control type="number" min={1} value={form.acquisitionCostRupiah} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionCostRupiah: e.target.value }))} required /></Form.Group></Col><Col sm={6}><Form.Group><Form.Label>Residu</Form.Label><Form.Control type="number" min={0} value={form.salvageValueRupiah} onChange={(e) => setForm((prev) => ({ ...prev, salvageValueRupiah: e.target.value }))} /></Form.Group></Col></Row>
                <Row className="g-2"><Col sm={6}><Form.Group><Form.Label>Umur manfaat bulan</Form.Label><Form.Control type="number" min={1} value={form.usefulLifeMonths} onChange={(e) => setForm((prev) => ({ ...prev, usefulLifeMonths: e.target.value }))} required /></Form.Group></Col><Col sm={6}><Form.Group><Form.Label>Akumulasi awal</Form.Label><Form.Control type="number" min={0} value={form.accumulatedDepreciationRupiah} onChange={(e) => setForm((prev) => ({ ...prev, accumulatedDepreciationRupiah: e.target.value }))} /></Form.Group></Col></Row>
                <Form.Check type="switch" label="Aktifkan depresiasi bulanan untuk aset ini" checked={form.depreciationEnabled} onChange={(e) => setForm((prev) => ({ ...prev, depreciationEnabled: e.target.checked }))} />
                <Form.Group><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Contoh: aset sudah termasuk opening balance 2026-05" /></Form.Group>
                {createMutation.isError ? <Alert variant="danger" className="mb-0">{getApiErrorMessage(createMutation.error, 'Gagal membuat aset')}</Alert> : null}
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Menyimpan...' : 'Simpan Aset'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
            <div><div className="small text-uppercase text-muted fw-semibold mb-1">Monthly Depreciation</div><h3 className="h5 mb-1">Preview & post depresiasi</h3><p className="text-muted mb-0">Posting beban penyusutan bulanan ke jurnal akuntansi berdasarkan aset yang aktif dan eligible.</p></div>
            <div className="d-flex gap-2 align-items-end"><Form.Group><Form.Label className="small mb-1">Tahun</Form.Label><Form.Control type="number" value={runPeriod.year} onChange={(e) => setRunPeriod((prev) => ({ ...prev, year: Number(e.target.value) }))} style={{ width: 110 }} /></Form.Group><Form.Group><Form.Label className="small mb-1">Bulan</Form.Label><Form.Control type="number" min={1} max={12} value={runPeriod.month} onChange={(e) => setRunPeriod((prev) => ({ ...prev, month: Number(e.target.value) }))} style={{ width: 90 }} /></Form.Group><Button variant="outline-primary" disabled={!canRunDepreciation || runMutation.isPending} onClick={() => runMutation.mutate({ ...runPeriod, notes: 'Monthly depreciation run' })}>{runMutation.isPending ? 'Posting...' : 'Post Run'}</Button></div>
          </div>
          {previewQuery.isLoading ? <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Menghitung preview...</div> : <>
            <div className="d-flex flex-wrap gap-2 mb-3"><Badge bg={preview?.alreadyPosted ? 'secondary' : 'primary'}>{preview?.alreadyPosted ? 'Sudah diposting' : 'Belum diposting'}</Badge><Badge bg="light" text="dark" className="border">Eligible: {preview?.eligibleAssetCount ?? 0}</Badge><Badge bg="light" text="dark" className="border">Total: {formatRupiah(preview?.totalDepreciationRupiah)}</Badge></div>
            {runMutation.isError ? <Alert variant="danger">{getApiErrorMessage(runMutation.error, 'Gagal post depresiasi')}</Alert> : null}
            {runMutation.isSuccess ? <Alert variant="success">Depresiasi berhasil diposting dan JournalEntry sudah dibuat.</Alert> : null}
            {preview?.eligibleLines.length ? <div className="table-responsive"><Table hover size="sm" className="align-middle mb-0"><thead><tr><th>Aset</th><th>Beban bulan ini</th><th>Akum. setelah</th><th>Nilai buku setelah</th></tr></thead><tbody>{preview.eligibleLines.map((line) => <tr key={line.fixedAssetId}><td><div className="fw-semibold">{line.asset.assetCode} · {line.asset.name}</div><small className="text-muted">{line.asset.usefulLifeMonths} bulan</small></td><td>{formatRupiah(line.depreciationAmountRupiah)}</td><td>{formatRupiah(line.accumulatedAfterRupiah)}</td><td>{formatRupiah(line.bookValueAfterRupiah)}</td></tr>)}</tbody></Table></div> : <Alert variant="light" className="border mb-0">Belum ada aset eligible. Aktifkan depreciationEnabled pada aset yang aman untuk disusutkan.</Alert>}
          </>}
        </Card.Body>
      </Card>

      <Modal show={Boolean(alignmentAsset)} onHide={() => setAlignmentAsset(null)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Review Alignment Ledger</Modal.Title></Modal.Header>
        <Modal.Body>
          {alignmentAsset ? <>
            <Alert variant="warning"><strong>Owner approval required.</strong> Jangan post alignment jika nilai aset sudah masuk Fixed Assets di opening balance. Adjustment ini memengaruhi Balance Sheet.</Alert>
            <div className="mb-3"><div className="fw-semibold">{alignmentAsset.assetCode} · {alignmentAsset.name}</div><small className="text-muted">Nilai perolehan {formatRupiah(alignmentAsset.acquisitionCostRupiah)} · nilai buku {formatRupiah(alignmentAsset.bookValueRupiah)}</small></div>
            <Row className="g-2 mb-3"><Col md={6}><Form.Group><Form.Label>Metode</Form.Label><Form.Select value={alignmentForm.method} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, method: e.target.value as FixedAssetLedgerAlignmentMethod }))}>{alignmentMethods.map((method) => <option key={method} value={method}>{alignmentLabels[method]}</option>)}</Form.Select></Form.Group></Col><Col md={3}><Form.Group><Form.Label>Akun kredit</Form.Label><Form.Control value={alignmentForm.method === 'OWNER_CAPITAL_CONTRIBUTION' ? '3000' : alignmentForm.creditAccountCode} disabled={alignmentForm.method !== 'RECLASSIFY_FROM_CASH'} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, creditAccountCode: e.target.value }))} /></Form.Group></Col><Col md={3}><Form.Group><Form.Label>Jumlah</Form.Label><Form.Control type="number" min={1} disabled={alignmentForm.method === 'DISCLOSURE_ONLY'} value={alignmentForm.amountRupiah} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, amountRupiah: e.target.value }))} /></Form.Group></Col></Row>
            <Form.Group className="mb-3"><Form.Label>Catatan</Form.Label><Form.Control as="textarea" rows={2} value={alignmentForm.notes} onChange={(e) => setAlignmentForm((prev) => ({ ...prev, notes: e.target.value }))} /></Form.Group>
            {alignmentPreviewMutation.isError ? <Alert variant="danger">{getApiErrorMessage(alignmentPreviewMutation.error, 'Preview gagal')}</Alert> : null}
            {alignmentPostMutation.isError ? <Alert variant="danger">{getApiErrorMessage(alignmentPostMutation.error, 'Post alignment gagal')}</Alert> : null}
            {alignmentPreviewMutation.data ? <Card className="border-0 bg-light"><Card.Body><div className="small text-uppercase text-muted fw-semibold mb-2">Preview Journal</div>{alignmentPreviewMutation.data.journalPreview ? <><div>Debit {alignmentPreviewMutation.data.journalPreview.debit.accountCode} {alignmentPreviewMutation.data.journalPreview.debit.accountName}: <strong>{formatRupiah(alignmentPreviewMutation.data.journalPreview.debit.amountRupiah)}</strong></div><div>Credit {alignmentPreviewMutation.data.journalPreview.credit.accountCode} {alignmentPreviewMutation.data.journalPreview.credit.accountName}: <strong>{formatRupiah(alignmentPreviewMutation.data.journalPreview.credit.amountRupiah)}</strong></div><Badge bg="success" className="mt-2">Balanced</Badge></> : <div className="text-muted">Metode ini tidak membuat journal.</div>}</Card.Body></Card> : null}
          </> : null}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setAlignmentAsset(null)}>Tutup</Button><Button variant="outline-primary" onClick={previewAlignment} disabled={alignmentPreviewMutation.isPending}>{alignmentPreviewMutation.isPending ? 'Preview...' : 'Preview'}</Button><Button variant="primary" onClick={postAlignment} disabled={alignmentPostMutation.isPending}>{alignmentPostMutation.isPending ? 'Posting...' : 'Post Alignment'}</Button></Modal.Footer>
      </Modal>
    </div>
  );
}
