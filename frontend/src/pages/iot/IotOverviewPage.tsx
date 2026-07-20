import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  Droplets,
  Gauge,
  KeyRound,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  WifiOff,
  Zap,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../components/common/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { listResource } from '../../api/resources';
import { listStays } from '../../api/stays';
import { fetchPublicConfig } from '../../api/settings';
import type { Room, Stay } from '../../types';
import {
  createIotDevice,
  getIotDeviceTelemetry,
  getIotOverview,
  probeTuya,
  rotateIotDeviceSecret,
  syncAllTuya,
  syncTuyaDevice,
  updateIotDevice,
  type CreateIotDevicePayload,
  type DeviceSecretResult,
  type IotDevice,
  type IotProvider,
} from '../../api/iot';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

type Filter = 'ALL' | IotProvider;

const emptyForm: CreateIotDevicePayload = {
  deviceCode: '',
  displayName: '',
  provider: 'TUYA',
  deviceType: 'ELECTRICITY_METER',
  externalDeviceId: '',
};

function formatMetric(value: number | string | null, unit?: string | null) {
  const formatted = typeof value === 'number'
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
    : String(value ?? '—');
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}

function relativeTime(value?: string | null) {
  if (!value) return 'Belum ada data';
  const diffMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  if (Math.abs(diffMinutes) < 60) return new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' }).format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) return new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' }).format(diffHours, 'hour');
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

type UsageCycle = { start: Date; end: Date; anchorDay: number };

function dateAtAnchor(year: number, month: number, anchorDay: number) {
  return new Date(year, month, Math.min(anchorDay, new Date(year, month + 1, 0).getDate()), 0, 0, 0, 0);
}

/** Siklus bulanan mengikuti tanggal check-in; 5 Juli → 5 Agustus, dst. */
function getUsageCycle(checkInDate?: string | null, now = new Date()): UsageCycle | null {
  if (!checkInDate) return null;
  const checkIn = new Date(checkInDate);
  if (Number.isNaN(checkIn.getTime())) return null;
  const anchorDay = checkIn.getDate();
  let start = dateAtAnchor(now.getFullYear(), now.getMonth(), anchorDay);
  if (start.getTime() > now.getTime()) start = dateAtAnchor(now.getFullYear(), now.getMonth() - 1, anchorDay);
  return { start, end: dateAtAnchor(start.getFullYear(), start.getMonth() + 1, anchorDay), anchorDay };
}

function formatUsageDate(value: Date | string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function metricForDevice(device: IotDevice) {
  return device.deviceType === 'ELECTRICITY_METER'
    ? { key: 'electricity.energy_total_kwh', label: 'Listrik', unit: 'kWh' }
    : { key: 'water.volume_total_m3', label: 'Air', unit: 'm³' };
}

function DeviceState({ device }: { device: IotDevice }) {
  if (!device.enabled) return <Badge bg="secondary">Nonaktif</Badge>;
  if (device.online === true) return <Badge bg="success">Online</Badge>;
  if (device.online === false) return <Badge bg="danger">Offline</Badge>;
  return <Badge bg="warning" text="dark">Belum disinkronkan</Badge>;
}

function LatestValues({ device }: { device: IotDevice }) {
  const preferred = device.latestTelemetry.filter((item) => [
    'electricity.energy_total_kwh',
    'electricity.power_w',
    'water.volume_total_m3',
    'water.flow_rate_lpm',
  ].includes(item.metric));
  if (!preferred.length) return <span className="text-muted small">Menunggu telemetry</span>;
  return (
    <div className="iot-reading-list">
      {preferred.slice(0, 2).map((item) => (
        <span key={item.metric} className={`iot-reading-pill ${item.quality === 'SUSPECT' ? 'is-suspect' : ''}`} title={item.reason ?? item.metric}>
          {formatMetric(item.value, item.unit)}
        </span>
      ))}
    </div>
  );
}

export default function IotOverviewPage() {
  useDocumentTitle('IoT Listrik & Air');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateIotDevicePayload>(emptyForm);
  const [secretResult, setSecretResult] = useState<DeviceSecretResult | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IotDevice | null>(null);

  const overviewQuery = useQuery({
    queryKey: ['iot', 'overview'],
    queryFn: getIotOverview,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
  const roomsQuery = useQuery({
    queryKey: ['rooms', 'iot-mapping'],
    queryFn: () => listResource<Room>('/rooms', { isActive: true, limit: 100 }),
    staleTime: 5 * 60_000,
  });
  const staysQuery = useQuery({
    queryKey: ['stays', 'iot-usage-cycle'],
    queryFn: () => listStays({ status: 'ACTIVE', page: 1, limit: 200 }),
    staleTime: 60_000,
  });
  const publicConfigQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 5 * 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['iot'] });
  const createMutation = useMutation({
    mutationFn: createIotDevice,
    onSuccess: async () => {
      toast('Perangkat berhasil didaftarkan. Jalankan sinkronisasi untuk mengambil telemetry pertama.', 'success');
      setShowCreate(false);
      setForm(emptyForm);
      probeMutation.reset();
      await invalidate();
    },
  });
  const probeMutation = useMutation({
    mutationFn: probeTuya,
    onSuccess: (result) => toast(`Tuya terhubung: ${result.metricCount} datapoint terbaca.`, 'success'),
  });
  const syncMutation = useMutation({
    mutationFn: syncTuyaDevice,
    onSuccess: async (result) => {
      toast(result.duplicate ? 'Status Tuya tidak berubah; data duplikat tidak disimpan.' : `${result.telemetryCount} nilai Tuya berhasil disimpan.`, 'success');
      await invalidate();
    },
  });
  const syncAllMutation = useMutation({
    mutationFn: syncAllTuya,
    onSuccess: async (result) => {
      toast(`Sinkronisasi selesai: ${result.succeeded}/${result.total} perangkat berhasil.`, result.failed ? 'warning' : 'success');
      await invalidate();
    },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => updateIotDevice(id, { enabled }),
    onSuccess: invalidate,
  });
  const secretMutation = useMutation({
    mutationFn: rotateIotDeviceSecret,
    onSuccess: async (result) => {
      setSecretResult(result);
      await invalidate();
    },
  });

  const overview = overviewQuery.data;
  const devices = useMemo(() => (overview?.devices ?? []).filter((device) => filter === 'ALL' || device.provider === filter), [overview, filter]);
  const activeStay = useMemo<Stay | null>(() => {
    if (!selectedDevice?.roomId) return null;
    return (staysQuery.data?.items ?? []).find((stay) => stay.roomId === selectedDevice.roomId && stay.room?.status === 'OCCUPIED') ?? null;
  }, [selectedDevice?.roomId, staysQuery.data?.items]);
  const usageCycle = useMemo(() => getUsageCycle(activeStay?.checkInDate), [activeStay?.checkInDate]);
  const selectedMetric = selectedDevice ? metricForDevice(selectedDevice) : null;
  const telemetryQuery = useQuery({
    queryKey: ['iot', 'telemetry', selectedDevice?.id, selectedMetric?.key, usageCycle?.start.toISOString()],
    queryFn: () => getIotDeviceTelemetry(selectedDevice!.id, {
      metric: selectedMetric!.key,
      from: usageCycle!.start.toISOString(),
      to: usageCycle!.end.toISOString(),
      limit: 500,
    }),
    enabled: Boolean(selectedDevice && selectedMetric && usageCycle),
    staleTime: 20_000,
  });
  const usageSummary = useMemo(() => {
    if (!usageCycle || !selectedMetric) return null;
    const readings = (telemetryQuery.data ?? [])
      .map((item) => ({ ...item, numericValue: Number(item.value) }))
      .filter((item) => item.metric === selectedMetric.key && Number.isFinite(item.numericValue))
      .sort((left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime());
    const baseline = [...readings].reverse().find((item) => new Date(item.observedAt).getTime() <= usageCycle.start.getTime());
    const periodReadings = readings.filter((item) => new Date(item.observedAt).getTime() >= usageCycle.start.getTime());
    const latest = periodReadings[periodReadings.length - 1];
    const usage = baseline && latest ? Math.max(0, latest.numericValue - baseline.numericValue) : null;
    return { baseline, latest, usage, sampleCount: periodReadings.length };
  }, [selectedMetric, telemetryQuery.data, usageCycle]);
  const freeKwh = publicConfigQuery.data?.freeElectricityKwhPerMonth ?? 30;
  const usagePercent = selectedDevice?.deviceType === 'ELECTRICITY_METER' && usageSummary?.usage != null && freeKwh > 0
    ? Math.min(100, (usageSummary.usage / freeKwh) * 100)
    : 0;

  const setProvider = (provider: IotProvider) => {
    setForm((current) => ({
      ...current,
      provider,
      deviceType: provider === 'TUYA' ? 'ELECTRICITY_METER' : 'WATER_FLOW_METER',
      externalDeviceId: provider === 'TUYA' ? current.externalDeviceId : '',
    }));
    probeMutation.reset();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      deviceCode: form.deviceCode.trim(),
      displayName: form.displayName?.trim() || undefined,
      externalDeviceId: form.provider === 'TUYA' ? form.externalDeviceId?.trim() : undefined,
      roomId: form.roomId || undefined,
    });
  };

  const copySecret = async () => {
    if (!secretResult) return;
    try {
      await navigator.clipboard.writeText(secretResult.deviceSecret);
      toast('Device secret disalin. Simpan di password manager/provisioning ESP32.', 'success');
    } catch {
      toast('Clipboard tidak tersedia. Salin secret secara manual.', 'warning');
    }
  };

  return (
    <FeatureErrorBoundary>
      <div className="iot-page">
      <PageHeader
        eyebrow="Utility Telemetry"
        title="IoT Listrik & Air"
        description="Pantau KWH Tuya sekarang dan siapkan jalur water flow ESP32 tanpa mencampur telemetry mentah dengan billing."
        secondaryAction={(
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-primary" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending || !overview?.summary.tuya}>
              <RefreshCw size={16} className={syncAllMutation.isPending ? 'iot-spin' : ''} /> Sinkronkan Tuya
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Tambah Perangkat</Button>
          </div>
        )}
      />

      <Alert variant="info" className="iot-safety-banner">
        <ShieldCheck size={21} />
        <div><strong>Mode aman read-only.</strong> Dashboard tidak menyediakan tombol relay Tuya dan telemetry tidak otomatis menjadi tagihan. Pemakaian untuk billing tetap melalui review catatan meter.</div>
      </Alert>

      {overviewQuery.isLoading ? (
        <div className="py-5 text-center"><Spinner animation="border" /></div>
      ) : overviewQuery.isError ? (
        <Alert variant="danger">{getApiErrorMessage(overviewQuery.error, 'Gagal memuat dashboard IoT. Pastikan migration database sudah dijalankan.')}</Alert>
      ) : overview ? (
        <>
          {!overview.configuration.tuya.configured ? (
            <Alert variant="warning"><AlertTriangle size={18} /> Kredensial/region Tuya backend belum lengkap. Isi environment server sebelum sinkronisasi.</Alert>
          ) : null}
          {!overview.configuration.esp32CredentialVaultConfigured ? (
            <Alert variant="secondary"><KeyRound size={18} /> Isi <code>IOT_MASTER_KEY</code> sebelum provisioning secret water meter ESP32.</Alert>
          ) : null}

          <div className="iot-kpi-grid" aria-label="Ringkasan IoT">
            <div className="iot-kpi-card"><span className="iot-kpi-icon is-blue"><Radio /></span><div><small>Perangkat aktif</small><strong>{overview.summary.enabled}</strong><span>dari {overview.summary.total} terdaftar</span></div></div>
            <div className="iot-kpi-card"><span className="iot-kpi-icon is-green"><CheckCircle2 /></span><div><small>Online</small><strong>{overview.summary.online}</strong><span>status cloud/perangkat</span></div></div>
            <div className="iot-kpi-card"><span className="iot-kpi-icon is-amber"><WifiOff /></span><div><small>Stale / belum data</small><strong>{overview.summary.stale}</strong><span>batas {import.meta.env.VITE_IOT_STALE_LABEL || '30 menit'}</span></div></div>
            <div className="iot-kpi-card"><span className="iot-kpi-icon is-cyan"><Droplets /></span><div><small>Water meter</small><strong>{overview.summary.water}</strong><span>siap menerima ESP32</span></div></div>
          </div>

          <Card className="content-card border-0 iot-device-panel">
            <Card.Body>
              <div className="iot-panel-toolbar">
                <div><h2>Registry perangkat</h2><p>Klik baris untuk melihat detail telemetry dan pemakaian sesuai periode sewa.</p></div>
                <div className="iot-filter-group" role="group" aria-label="Filter provider">
                  {(['ALL', 'TUYA', 'KOST48_ESP32'] as Filter[]).map((item) => (
                    <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
                      {item === 'ALL' ? 'Semua' : item === 'TUYA' ? 'Tuya KWH' : 'ESP32 Air'}
                    </button>
                  ))}
                </div>
              </div>

              {devices.length === 0 ? (
                <div className="iot-empty-state">
                  {filter === 'KOST48_ESP32' ? <Droplets /> : <Zap />}
                  <h3>Belum ada perangkat pada kategori ini</h3>
                  <p>Daftarkan Tuya device ID sekarang atau siapkan identitas ESP32 untuk pemasangan sensor air nanti.</p>
                  <Button size="sm" onClick={() => setShowCreate(true)}>Tambah perangkat</Button>
                </div>
              ) : (
                <Table responsive hover className="align-middle mb-0 iot-device-table">
                  <thead><tr><th>Perangkat</th><th>Kamar</th><th>Status</th><th>Nilai terakhir</th><th>Terakhir masuk</th><th className="text-end">Aksi</th></tr></thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                        key={device.id}
                        className="clickable-row iot-device-row"
                        onClick={() => setSelectedDevice(device)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedDevice(device);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Buka detail perangkat ${device.displayName || device.deviceCode}`}
                      >
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`iot-device-icon ${device.provider === 'TUYA' ? 'is-electric' : 'is-water'}`}>{device.provider === 'TUYA' ? <Zap size={18} /> : <Droplets size={18} />}</span>
                            <div><strong>{device.displayName || device.deviceCode}</strong><div className="small text-muted">{device.deviceCode} · {device.provider === 'TUYA' ? 'Tuya Cloud' : `ESP32 · secret v${device.credentialVersion}`}</div></div>
                          </div>
                        </td>
                        <td>{device.room ? <><strong>{device.room.code}</strong>{device.room.name ? <div className="small text-muted">{device.room.name}</div> : null}</> : <span className="text-muted">Belum dipetakan</span>}</td>
                        <td><DeviceState device={device} /></td>
                        <td><LatestValues device={device} /></td>
                        <td><span title={device.lastSeenAt ?? undefined}>{relativeTime(device.lastSeenAt)}</span></td>
                        <td className="iot-device-actions" onClick={(event) => event.stopPropagation()}>
                          <div className="d-flex justify-content-end flex-wrap gap-1">
                            {device.provider === 'TUYA' ? (
                              <Button size="sm" variant="outline-primary" onClick={() => syncMutation.mutate(device.id)} disabled={syncMutation.isPending || !device.enabled}>
                                <RefreshCw size={14} className={syncMutation.isPending && syncMutation.variables === device.id ? 'iot-spin' : ''} /> Sync
                              </Button>
                            ) : user?.role === 'OWNER' ? (
                              <Button size="sm" variant="outline-primary" onClick={() => secretMutation.mutate(device.id)} disabled={secretMutation.isPending || !overview.configuration.esp32CredentialVaultConfigured}>
                                <KeyRound size={14} /> {device.credentialProvisioned ? 'Rotasi secret' : 'Provision'}
                              </Button>
                            ) : null}
                            <Button size="sm" variant={device.enabled ? 'outline-secondary' : 'outline-success'} onClick={() => toggleMutation.mutate({ id: device.id, enabled: !device.enabled })} disabled={toggleMutation.isPending}>
                              {device.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <span className="row-arrow-cell" aria-hidden="true"><ChevronRight size={18} /></span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          <div className="iot-readiness-grid">
            <Card className="border-0 content-card"><Card.Body><div className="iot-readiness-title"><Zap /> <div><h3>Tuya KWH</h3><Badge bg={overview.configuration.tuya.configured ? 'success' : 'warning'}>{overview.configuration.tuya.configured ? 'Cloud siap' : 'Perlu konfigurasi'}</Badge></div></div><p>Tarik energi kumulatif, arus, daya, dan tegangan. Region: <code>{overview.configuration.tuya.region || 'belum valid'}</code>.</p></Card.Body></Card>
            <Card className="border-0 content-card"><Card.Body><div className="iot-readiness-title"><Droplets /> <div><h3>ESP32-C3 Water Flow</h3><Badge bg={overview.configuration.esp32CredentialVaultConfigured ? 'primary' : 'secondary'}>{overview.configuration.esp32CredentialVaultConfigured ? 'Ingest siap' : 'Menunggu master key'}</Badge></div></div><p>Endpoint signed HTTPS sudah disiapkan di <code>{overview.configuration.waterIngestPath}</code>. Hardware dapat menyusul tanpa perubahan kontrak data.</p></Card.Body></Card>
          </div>
        </>
      ) : null}

      <Modal show={showCreate} onHide={() => !createMutation.isPending && setShowCreate(false)} centered size="lg">
        <Form onSubmit={submit}>
          <Modal.Header closeButton><Modal.Title>Tambah perangkat IoT</Modal.Title></Modal.Header>
          <Modal.Body>
            <Alert variant="light" className="border small">Perangkat Tuya hanya dibaca. ESP32 akan memakai HMAC device secret setelah provisioning oleh Owner.</Alert>
            <Row className="g-3">
              <Col md={6}><Form.Group controlId="iot-provider"><Form.Label>Provider</Form.Label><Form.Select value={form.provider} onChange={(event) => setProvider(event.target.value as IotProvider)}><option value="TUYA">Tuya Cloud — KWH</option><option value="KOST48_ESP32">KOST48 ESP32 — Air</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-room"><Form.Label>Kamar</Form.Label><Form.Select value={form.roomId ?? ''} onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Belum dipetakan</option>{roomsQuery.data?.items.map((room) => <option key={room.id} value={room.id}>{room.code}{room.name ? ` — ${room.name}` : ''}</option>)}</Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-device-code"><Form.Label>Device code internal</Form.Label><Form.Control required maxLength={80} pattern="[A-Za-z0-9._-]+" placeholder={form.provider === 'TUYA' ? 'kwh-kamar-01' : 'water-kamar-01'} value={form.deviceCode} onChange={(event) => setForm((current) => ({ ...current, deviceCode: event.target.value }))} /><Form.Text>Identitas stabil di aplikasi, bukan nama tenant.</Form.Text></Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-display-name"><Form.Label>Nama tampilan</Form.Label><Form.Control maxLength={120} placeholder="Meter KWH Kamar 01" value={form.displayName ?? ''} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></Form.Group></Col>
              {form.provider === 'TUYA' ? (
                <Col xs={12}><Form.Group controlId="iot-tuya-device-id"><Form.Label>Tuya device ID</Form.Label><div className="d-flex gap-2"><Form.Control required maxLength={128} autoComplete="off" placeholder="Device ID dari Tuya Cloud project" value={form.externalDeviceId ?? ''} onChange={(event) => { setForm((current) => ({ ...current, externalDeviceId: event.target.value })); probeMutation.reset(); }} /><Button type="button" variant="outline-primary" onClick={() => probeMutation.mutate(form.externalDeviceId?.trim() || '')} disabled={!form.externalDeviceId?.trim() || probeMutation.isPending}>{probeMutation.isPending ? <Spinner size="sm" /> : 'Uji koneksi'}</Button></div></Form.Group></Col>
              ) : null}
            </Row>
            {probeMutation.isSuccess ? <Alert variant="success" className="mt-3 mb-0"><CheckCircle2 size={18} /> Terhubung ke {probeMutation.data.device.name || 'perangkat Tuya'} · {probeMutation.data.device.online ? 'online' : 'offline'} · {probeMutation.data.metricCount} datapoint.</Alert> : null}
            {probeMutation.isError ? <Alert variant="danger" className="mt-3 mb-0">{getApiErrorMessage(probeMutation.error, 'Uji koneksi Tuya gagal.')}</Alert> : null}
            {createMutation.isError ? <Alert variant="danger" className="mt-3 mb-0">{getApiErrorMessage(createMutation.error, 'Gagal mendaftarkan perangkat.')}</Alert> : null}
          </Modal.Body>
          <Modal.Footer><Button variant="outline-secondary" onClick={() => setShowCreate(false)} disabled={createMutation.isPending}>Batal</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Spinner size="sm" /> : 'Daftarkan perangkat'}</Button></Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(selectedDevice)} onHide={() => setSelectedDevice(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detail pemakaian perangkat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDevice ? (
            <>
              <section className="iot-detail-device-head">
                <span className={`iot-device-icon ${selectedDevice.provider === 'TUYA' ? 'is-electric' : 'is-water'}`}>
                  {selectedDevice.provider === 'TUYA' ? <Zap size={20} /> : <Droplets size={20} />}
                </span>
                <div>
                  <strong>{selectedDevice.displayName || selectedDevice.deviceCode}</strong>
                  <span>{selectedDevice.room ? `Kamar ${selectedDevice.room.code}` : 'Belum dipetakan ke kamar'} · {selectedMetric?.label} · {selectedDevice.provider === 'TUYA' ? 'Tuya Cloud' : 'ESP32'}</span>
                </div>
                <DeviceState device={selectedDevice} />
              </section>

              {!selectedDevice.roomId ? (
                <Alert variant="secondary" className="mt-3 mb-0"><Gauge size={18} /> Petakan perangkat ke kamar terlebih dahulu agar periode pemakaian dapat dihitung.</Alert>
              ) : staysQuery.isLoading ? (
                <div className="py-4 text-center"><Spinner animation="border" size="sm" /> Memuat masa sewa kamar…</div>
              ) : !activeStay || !usageCycle ? (
                <Alert variant="secondary" className="mt-3 mb-0"><CalendarDays size={18} /> Belum ada masa sewa aktif untuk kamar ini, sehingga periode pemakaian belum dapat ditentukan.</Alert>
              ) : (
                <section className="iot-usage-cycle-card">
                  <div className="iot-usage-cycle-head">
                    <div>
                      <span>Siklus monitoring penghuni</span>
                      <strong>{formatUsageDate(usageCycle.start)} – {formatUsageDate(usageCycle.end)}</strong>
                      <small>Mengikuti tanggal masuk {formatUsageDate(activeStay.checkInDate ?? usageCycle.start)} (setiap tanggal {usageCycle.anchorDay}).</small>
                    </div>
                    <span className="iot-cycle-badge">Masa sewa #{activeStay.id}</span>
                  </div>

                  {telemetryQuery.isLoading ? (
                    <div className="py-4 text-center"><Spinner animation="border" size="sm" /> Menghitung pemakaian dari sensor…</div>
                  ) : telemetryQuery.isError ? (
                    <Alert variant="danger" className="mb-0">{getApiErrorMessage(telemetryQuery.error, 'Riwayat telemetry tidak dapat dimuat.')}</Alert>
                  ) : !usageSummary?.baseline || !usageSummary.latest || usageSummary.usage == null ? (
                    <Alert variant="secondary" className="mb-0">Belum ada pembacaan pembanding pada atau sebelum awal periode. Sinkronkan meter agar total periode berikutnya dapat dihitung akurat.</Alert>
                  ) : (
                    <div className="iot-usage-content">
                      {selectedDevice.deviceType === 'ELECTRICITY_METER' ? (
                        <div className="iot-usage-donut" style={{ background: `conic-gradient(#2563eb ${usagePercent}%, #dbeafe 0)` }} aria-label={`${usageSummary.usage.toFixed(2)} dari ${freeKwh} kWh jatah gratis`}>
                          <div><strong>{usageSummary.usage.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</strong><span>kWh dipakai</span></div>
                        </div>
                      ) : null}
                      <div className="iot-usage-summary">
                        <span>{selectedMetric?.label} periode ini</span>
                        <strong>{usageSummary.usage.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong>
                        {selectedDevice.deviceType === 'ELECTRICITY_METER' ? (
                          <small>{usageSummary.usage > freeKwh ? `${(usageSummary.usage - freeKwh).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kWh melewati jatah ${freeKwh} kWh.` : `${Math.max(0, freeKwh - usageSummary.usage).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kWh jatah gratis tersisa.`}</small>
                        ) : <small>{usageSummary.sampleCount} pembacaan pada periode ini.</small>}
                      </div>
                      <div className="iot-reading-comparison">
                        <span>Awal periode<strong>{usageSummary.baseline.numericValue.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong><small>{relativeTime(usageSummary.baseline.observedAt)}</small></span>
                        <span>Terakhir<strong>{usageSummary.latest.numericValue.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong><small>{relativeTime(usageSummary.latest.observedAt)}</small></span>
                      </div>
                      {/* Live metrics: watt, volt, ampere dari telemetry terbaru */}
                      {selectedDevice.latestTelemetry && selectedDevice.latestTelemetry.length > 0 ? (
                        <div className="iot-live-metrics">
                          {(() => {
                            const powerW = selectedDevice.latestTelemetry.find((m: any) => m.metric === 'electricity.power_w');
                            const voltageV = selectedDevice.latestTelemetry.find((m: any) => m.metric === 'electricity.voltage_v');
                            const currentA = selectedDevice.latestTelemetry.find((m: any) => m.metric === 'electricity.current_a');
                            if (!powerW && !voltageV && !currentA) return null;
                            return (
                              <div className="iot-live-metrics-row">
                                {powerW ? <span className="iot-live-chip">⚡ {Number(powerW.value).toFixed(0)} W</span> : null}
                                {voltageV ? <span className="iot-live-chip">🔌 {Number(voltageV.value).toFixed(1)} V</span> : null}
                                {currentA ? <span className="iot-live-chip">🔧 {Number(currentA.value).toFixed(2)} A</span> : null}
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <p className="iot-usage-note">Monitoring sensor saja, bukan dasar tagihan. Tagihan resmi tetap memakai pencatatan dan review meter.</p>
                </section>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setSelectedDevice(null)}>Tutup</Button>
          {selectedDevice?.provider === 'TUYA' ? <Button onClick={() => syncMutation.mutate(selectedDevice.id)} disabled={syncMutation.isPending || !selectedDevice.enabled}><RefreshCw size={16} className={syncMutation.isPending ? 'iot-spin' : ''} /> Sinkronkan</Button> : null}
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(secretResult)} onHide={() => setSecretResult(null)} centered backdrop="static">
        <Modal.Header><Modal.Title>Device secret — tampil satu kali</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="warning"><AlertTriangle size={18} /> Jangan tutup sebelum secret disimpan untuk provisioning firmware.</Alert>
          <Form.Label>Device ID</Form.Label><Form.Control readOnly value={secretResult?.deviceCode ?? ''} className="mb-3" />
          <Form.Label>Device secret</Form.Label><div className="d-flex gap-2"><Form.Control readOnly value={secretResult?.deviceSecret ?? ''} className="font-monospace" /><Button variant="outline-primary" onClick={copySecret} aria-label="Salin device secret"><Copy size={18} /></Button></div>
          <p className="small text-muted mt-3 mb-0">Gunakan canonical signature sesuai dokumen M15B. Backend hanya menyimpan versi terenkripsi.</p>
        </Modal.Body>
        <Modal.Footer><Button onClick={() => setSecretResult(null)}>Saya sudah menyimpan</Button></Modal.Footer>
      </Modal>
    </div>
    </FeatureErrorBoundary>
  );
}
