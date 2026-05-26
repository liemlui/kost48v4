import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import {
  createFixedAsset,
  fetchAssetReadinessV2,
  fetchAssetRegister,
  fetchDepreciationPreview,
  runDepreciation,
  type CreateFixedAssetPayload,
  type FixedAssetCategory,
  type FixedAssetCapitalizationSource,
} from '../../api/assets';

function formatRupiah(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = maybe.response?.data?.message ?? maybe.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

const categoryOptions: FixedAssetCategory[] = ['BUILDING', 'RENOVATION', 'ROOM_EQUIPMENT', 'FURNITURE', 'ELECTRONIC', 'UTILITY_EQUIPMENT', 'VEHICLE', 'SOFTWARE', 'OTHER'];
const capitalizationOptions: FixedAssetCapitalizationSource[] = ['OPENING_BALANCE', 'PURCHASE_JOURNAL', 'DISCLOSURE_ONLY'];

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

  const assetsQuery = useQuery({ queryKey: ['assets', 'register'], queryFn: () => fetchAssetRegister({ limit: 50 }) });
  const readinessQuery = useQuery({ queryKey: ['assets', 'readiness-v2'], queryFn: fetchAssetReadinessV2 });
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

  const assets = assetsQuery.data?.items ?? [];
  const readiness = readinessQuery.data;
  const preview = previewQuery.data;

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

  const canRunDepreciation = Boolean(preview?.eligibleAssetCount && !preview.alreadyPosted && preview.totalDepreciationRupiah > 0);

  return (
    <div>
      <PageHeader
        title="Asset Register"
        description="B4 foundation: daftar aset, readiness, dan depresiasi bulanan yang terhubung ke ledger. Acquisition journal tidak otomatis agar opening balance tidak double-count."
        secondaryAction={<Badge bg="primary">B4 Schema Active</Badge>}
      />

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Aset</div>
              <h3 className="h4 mb-1">{formatRupiah(readiness?.totals.acquisitionCostRupiah)}</h3>
              <small className="text-muted">Total acquisition cost terdaftar</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Nilai Buku</div>
              <h3 className="h4 mb-1">{formatRupiah(readiness?.totals.netBookValueRupiah)}</h3>
              <small className="text-muted">Cost dikurangi akumulasi depresiasi</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Siap Disusutkan</div>
              <h3 className="h4 mb-1">{readinessQuery.isLoading ? '...' : readiness?.counts.depreciableCount ?? 0}</h3>
              <small className="text-muted">Aset ACTIVE dengan depreciationEnabled=true</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={7}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                <div>
                  <div className="small text-uppercase text-muted fw-semibold mb-1">Register</div>
                  <h3 className="h5 mb-1">Daftar aset</h3>
                  <p className="text-muted mb-0">Gunakan mode disclosure/opening dulu jika nilai aset sudah masuk opening balance.</p>
                </div>
                <Badge bg={assets.length ? 'success' : 'secondary'}>{assets.length} aset</Badge>
              </div>
              {assetsQuery.isLoading ? (
                <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Memuat aset...</div>
              ) : assets.length ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Aset</th>
                        <th>Kategori</th>
                        <th>Cost</th>
                        <th>Akum.</th>
                        <th>Nilai buku</th>
                        <th>Dep.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td>
                            <div className="fw-semibold">{asset.assetCode} · {asset.name}</div>
                            <small className="text-muted">{capitalizationLabels[asset.capitalizationSource] ?? asset.capitalizationSource}</small>
                          </td>
                          <td>{categoryLabels[asset.category] ?? asset.category}</td>
                          <td>{formatRupiah(asset.acquisitionCostRupiah)}</td>
                          <td>{formatRupiah(asset.accumulatedDepreciationRupiah)}</td>
                          <td>{formatRupiah(asset.bookValueRupiah)}</td>
                          <td><Badge bg={asset.depreciationEnabled ? 'success' : 'secondary'}>{asset.depreciationEnabled ? 'ON' : 'OFF'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="light" className="border mb-0">Belum ada aset. Tambahkan aset pertama sebagai disclosure/opening agar tidak langsung double-count ledger.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Tambah Aset</div>
              <h3 className="h5 mb-3">Asset onboarding aman</h3>
              <Form onSubmit={submitAsset} className="d-grid gap-3">
                <Form.Group>
                  <Form.Label>Nama aset</Form.Label>
                  <Form.Control value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Contoh: AC kamar 201" required />
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
                  <Col sm={6}><Form.Group><Form.Label>Tanggal perolehan</Form.Label><Form.Control type="date" value={form.acquisitionDate} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDate: e.target.value }))} required /></Form.Group></Col>
                  <Col sm={6}><Form.Group><Form.Label>Mulai depresiasi</Form.Label><Form.Control type="date" value={form.depreciationStartDate} onChange={(e) => setForm((prev) => ({ ...prev, depreciationStartDate: e.target.value }))} /></Form.Group></Col>
                </Row>
                <Row className="g-2">
                  <Col sm={6}><Form.Group><Form.Label>Cost</Form.Label><Form.Control type="number" min={1} value={form.acquisitionCostRupiah} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionCostRupiah: e.target.value }))} required /></Form.Group></Col>
                  <Col sm={6}><Form.Group><Form.Label>Residu</Form.Label><Form.Control type="number" min={0} value={form.salvageValueRupiah} onChange={(e) => setForm((prev) => ({ ...prev, salvageValueRupiah: e.target.value }))} /></Form.Group></Col>
                </Row>
                <Row className="g-2">
                  <Col sm={6}><Form.Group><Form.Label>Umur manfaat bulan</Form.Label><Form.Control type="number" min={1} value={form.usefulLifeMonths} onChange={(e) => setForm((prev) => ({ ...prev, usefulLifeMonths: e.target.value }))} required /></Form.Group></Col>
                  <Col sm={6}><Form.Group><Form.Label>Akumulasi awal</Form.Label><Form.Control type="number" min={0} value={form.accumulatedDepreciationRupiah} onChange={(e) => setForm((prev) => ({ ...prev, accumulatedDepreciationRupiah: e.target.value }))} /></Form.Group></Col>
                </Row>
                <Form.Check type="switch" label="Aktifkan depresiasi bulanan untuk aset ini" checked={form.depreciationEnabled} onChange={(e) => setForm((prev) => ({ ...prev, depreciationEnabled: e.target.checked }))} />
                <Form.Group>
                  <Form.Label>Catatan</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Contoh: aset sudah termasuk opening balance 2026-05" />
                </Form.Group>
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
            <div>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Monthly Depreciation</div>
              <h3 className="h5 mb-1">Preview & post depresiasi</h3>
              <p className="text-muted mb-0">Run ini membuat JournalEntry DEPRECIATION: Debit 6700 Depreciation, Credit 1590 Accumulated Depreciation.</p>
            </div>
            <div className="d-flex gap-2 align-items-end">
              <Form.Group>
                <Form.Label className="small mb-1">Tahun</Form.Label>
                <Form.Control type="number" value={runPeriod.year} onChange={(e) => setRunPeriod((prev) => ({ ...prev, year: Number(e.target.value) }))} style={{ width: 110 }} />
              </Form.Group>
              <Form.Group>
                <Form.Label className="small mb-1">Bulan</Form.Label>
                <Form.Control type="number" min={1} max={12} value={runPeriod.month} onChange={(e) => setRunPeriod((prev) => ({ ...prev, month: Number(e.target.value) }))} style={{ width: 90 }} />
              </Form.Group>
              <Button variant="outline-primary" disabled={!canRunDepreciation || runMutation.isPending} onClick={() => runMutation.mutate({ ...runPeriod, notes: 'B4 monthly depreciation run' })}>{runMutation.isPending ? 'Posting...' : 'Post Run'}</Button>
            </div>
          </div>
          {previewQuery.isLoading ? (
            <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Menghitung preview...</div>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Badge bg={preview?.alreadyPosted ? 'secondary' : 'primary'}>{preview?.alreadyPosted ? 'Sudah diposting' : 'Belum diposting'}</Badge>
                <Badge bg="light" text="dark" className="border">Eligible: {preview?.eligibleAssetCount ?? 0}</Badge>
                <Badge bg="light" text="dark" className="border">Total: {formatRupiah(preview?.totalDepreciationRupiah)}</Badge>
              </div>
              {runMutation.isError ? <Alert variant="danger">{getApiErrorMessage(runMutation.error, 'Gagal post depresiasi')}</Alert> : null}
              {runMutation.isSuccess ? <Alert variant="success">Depresiasi berhasil diposting dan JournalEntry sudah dibuat.</Alert> : null}
              {preview?.eligibleLines.length ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead><tr><th>Aset</th><th>Beban bulan ini</th><th>Akum. setelah</th><th>Nilai buku setelah</th></tr></thead>
                    <tbody>
                      {preview.eligibleLines.map((line) => (
                        <tr key={line.fixedAssetId}>
                          <td><div className="fw-semibold">{line.asset.assetCode} · {line.asset.name}</div><small className="text-muted">{line.asset.usefulLifeMonths} bulan</small></td>
                          <td>{formatRupiah(line.depreciationAmountRupiah)}</td>
                          <td>{formatRupiah(line.accumulatedAfterRupiah)}</td>
                          <td>{formatRupiah(line.bookValueAfterRupiah)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="light" className="border mb-0">Belum ada aset eligible. Aktifkan depreciationEnabled pada aset yang aman untuk disusutkan.</Alert>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
