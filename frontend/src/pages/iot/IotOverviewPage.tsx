import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import {
  Activity,
  AlertTriangle,
  Building2,
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
import { StatCardSkeleton, TableSkeleton } from '../../components/common/SkeletonLoader';
import Sparkline from '../../components/charts/Sparkline';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../components/common/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { listResource } from '../../api/resources';
import { listStays } from '../../api/stays';
import type { Room, Stay } from '../../types';
import {
  backfillIotDeviceHistory,
  createIotDevice,
  getIotDeviceTelemetry,
  getIotOverview,
  iotQueryKeys,
  probeTuya,
  rotateIotDeviceSecret,
  syncAllTuya,
  syncTuyaDevice,
  updateIotDevice,
  type CreateIotDevicePayload,
  type DeviceSecretResult,
  type IotDevice,
  type IotOverview,
  type IotProvider,
  type IotReadingQuality,
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
  return `${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value))} WIB`;
}

type UsageCycle = { start: Date; end: Date; anchorDay: number };

function jakartaDateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

function jakartaDateAtAnchor(year: number, monthIndex: number, anchorDay: number) {
  const day = Math.min(anchorDay, new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, monthIndex, day, -7, 0, 0, 0));
}

export function hasCumulativeReset(values: number[]) {
  return values.some((value, index) => index > 0 && value < values[index - 1]);
}

/** Siklus bulanan mengikuti tanggal check-in; 5 Juli → 5 Agustus, dst. */
export function getUsageCycle(checkInDate?: string | null, now = new Date()): UsageCycle | null {
  if (!checkInDate) return null;
  const checkIn = new Date(checkInDate);
  if (Number.isNaN(checkIn.getTime())) return null;
  const checkInParts = jakartaDateParts(checkIn);
  const nowParts = jakartaDateParts(now);
  const anchorDay = checkInParts.day;
  let start = jakartaDateAtAnchor(nowParts.year, nowParts.month - 1, anchorDay);
  if (start.getTime() > now.getTime()) start = jakartaDateAtAnchor(nowParts.year, nowParts.month - 2, anchorDay);
  const startParts = jakartaDateParts(start);
  return { start, end: jakartaDateAtAnchor(startParts.year, startParts.month, anchorDay), anchorDay };
}

function formatUsageDate(value: Date | string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

function metricForDevice(device: IotDevice) {
  return device.deviceType === 'ELECTRICITY_METER'
    ? { key: 'electricity.energy_total_kwh', label: 'Listrik', unit: 'kWh' }
    : { key: 'water.volume_total_m3', label: 'Air', unit: 'm³' };
}

function isDeviceStale(device: IotDevice, staleAfterMinutes: number) {
  const lastSeen = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : Number.NaN;
  return !Number.isFinite(lastSeen) || Date.now() - lastSeen > staleAfterMinutes * 60_000;
}

function DeviceState({ device, staleAfterMinutes }: { device: IotDevice; staleAfterMinutes: number }) {
  let label = 'Belum ada data';
  let tone = 'warning';
  if (!device.enabled) {
    label = 'Nonaktif';
    tone = 'neutral';
  } else if (device.online === false) {
    label = 'Offline';
    tone = 'danger';
  } else if (isDeviceStale(device, staleAfterMinutes)) {
    label = device.lastSeenAt ? 'Data terlambat' : 'Belum ada data';
  } else if (device.online === true) {
    label = 'Online';
    tone = 'success';
  }
  return <span className={`iot-state-badge is-${tone}`}><span aria-hidden="true" />{label}</span>;
}

function LatestValues({ device }: { device: IotDevice }) {
  const preferred = device.latestTelemetry.filter((item) => [
    'electricity.energy_total_kwh',
    'electricity.power_w',
    'water.volume_total_m3',
    'water.flow_rate_lpm',
  ].includes(item.metric));
  if (!preferred.length) return <span className="text-muted small">Menunggu data sensor</span>;
  const metricLabels: Record<string, string> = {
    'electricity.energy_total_kwh': 'Energi',
    'electricity.power_w': 'Daya',
    'water.volume_total_m3': 'Volume',
    'water.flow_rate_lpm': 'Aliran',
  };
  const qualityLabels: Record<IotReadingQuality, string> = {
    GOOD: 'baik',
    SUSPECT: 'meragukan',
    REJECTED: 'ditolak',
  };
  return (
    <div className="iot-reading-list">
      {preferred.slice(0, 2).map((item) => (
        <span
          key={item.metric}
          className={`iot-reading-pill ${item.quality === 'SUSPECT' ? 'is-suspect' : item.quality === 'REJECTED' ? 'is-rejected' : ''}`}
          title={`${item.reason ? `${item.reason} · ` : ''}Kualitas ${qualityLabels[item.quality]}`}
          aria-label={`${metricLabels[item.metric]}: ${formatMetric(item.value, item.unit)}. Kualitas ${qualityLabels[item.quality]}${item.reason ? `. ${item.reason}` : ''}`}
        >
          <small>{metricLabels[item.metric]}</small>{formatMetric(item.value, item.unit)}
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
  const [pendingSecretResult, setPendingSecretResult] = useState<DeviceSecretResult | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const overviewQuery = useQuery({
    queryKey: iotQueryKeys.overview,
    queryFn: getIotOverview,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
  const overview = overviewQuery.data;
  const selectedDevice = useMemo(
    () => overview?.devices.find((device) => device.id === selectedDeviceId) ?? null,
    [overview?.devices, selectedDeviceId],
  );
  const roomsQuery = useQuery({
    queryKey: ['rooms', 'iot-mapping'],
    queryFn: () => listResource<Room>('/rooms', { isActive: true, limit: 100 }),
    staleTime: 5 * 60_000,
    enabled: showCreate,
  });
  const staysQuery = useQuery({
    queryKey: ['stays', 'iot-usage-cycle'],
    queryFn: () => listStays({ status: 'ACTIVE', page: 1, limit: 200 }),
    staleTime: 60_000,
    enabled: Boolean(selectedDevice?.roomId),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: iotQueryKeys.all });
  const createMutation = useMutation({
    mutationFn: createIotDevice,
    onSuccess: async () => {
      toast('Perangkat berhasil didaftarkan. Jalankan sinkronisasi untuk mengambil telemetri pertama.', 'success');
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
    onError: (error) => toast(getApiErrorMessage(error, 'Sinkronisasi perangkat gagal.'), 'danger'),
  });
  const syncAllMutation = useMutation({
    mutationFn: syncAllTuya,
    onSuccess: async (result) => {
      toast(`Sinkronisasi selesai: ${result.succeeded}/${result.total} perangkat berhasil.`, result.failed ? 'warning' : 'success');
      await invalidate();
    },
    onError: (error) => toast(getApiErrorMessage(error, 'Sinkronisasi seluruh perangkat gagal.'), 'danger'),
  });
  const backfillMutation = useMutation({
    mutationFn: (id: number) => backfillIotDeviceHistory(id, 7),
    onSuccess: async (result) => {
      toast(`Riwayat Tuya diperbarui: ${result.stored}/${result.totalLogs} telemetri historis disimpan.`, result.truncated ? 'warning' : 'success');
      await invalidate();
    },
    onError: (error) => toast(getApiErrorMessage(error, 'Pengambilan riwayat Tuya gagal.'), 'danger'),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => updateIotDevice(id, { enabled }),
    onSuccess: async (updated) => {
      queryClient.setQueryData<IotOverview>(iotQueryKeys.overview, (current) => current ? {
        ...current,
        devices: current.devices.map((device) => device.id === updated.id ? updated : device),
      } : current);
      toast(updated.enabled ? 'Perangkat diaktifkan.' : 'Perangkat dinonaktifkan.', 'success');
      await invalidate();
    },
    onError: (error) => toast(getApiErrorMessage(error, 'Status perangkat gagal diubah.'), 'danger'),
  });
  const secretMutation = useMutation({
    mutationFn: rotateIotDeviceSecret,
    onSuccess: async (result) => {
      if (selectedDeviceId == null) {
        setSecretResult(result);
      } else {
        setPendingSecretResult(result);
        setSelectedDeviceId(null);
      }
      await invalidate();
    },
    onError: (error) => toast(getApiErrorMessage(error, 'Secret perangkat gagal dibuat.'), 'danger'),
  });

  const devices = useMemo(() => {
    const filtered = (overview?.devices ?? []).filter((device) => filter === 'ALL' || device.provider === filter);
    if (!overview) return filtered;
    const staleAfterMinutes = overview.staleAfterMinutes ?? 30;
    const needsAttention = (device: IotDevice) => device.enabled && (device.online !== true || isDeviceStale(device, staleAfterMinutes));
    return [...filtered].sort((left, right) => Number(needsAttention(right)) - Number(needsAttention(left)));
  }, [overview, filter]);
  const operationalSummary = useMemo(() => {
    if (!overview) return { attention: 0, healthy: 0, mapped: 0 };
    const staleAfterMinutes = overview.staleAfterMinutes ?? 30;
    const enabled = overview.devices.filter((device) => device.enabled);
    const attention = enabled.filter((device) => isDeviceStale(device, staleAfterMinutes) || device.online !== true).length;
    const healthy = Math.max(0, enabled.length - attention);
    return {
      attention,
      healthy,
      mapped: overview.devices.filter((device) => Boolean(device.roomId)).length,
    };
  }, [overview]);
  const filterOptions = useMemo(() => [
    { value: 'ALL' as const, label: 'Semua', count: overview?.summary.total ?? 0 },
    { value: 'TUYA' as const, label: 'Tuya kWh', count: overview?.summary.tuya ?? 0 },
    { value: 'KOST48_ESP32' as const, label: 'ESP32 Air', count: overview?.summary.water ?? 0 },
  ], [overview]);
  const activeStay = useMemo<Stay | null>(() => {
    if (!selectedDevice?.roomId) return null;
    return (staysQuery.data?.items ?? []).find((stay) => stay.roomId === selectedDevice.roomId && stay.room?.status === 'OCCUPIED') ?? null;
  }, [selectedDevice?.roomId, staysQuery.data?.items]);
  // Query refetches drive renders every minute; recomputing here prevents an
  // open modal from retaining yesterday's Jakarta cycle after an anchor date.
  const usageCycle = getUsageCycle(activeStay?.checkInDate);
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
      .filter((item) => item.metric === selectedMetric.key && item.quality === 'GOOD' && Number.isFinite(item.numericValue))
      .sort((left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime());
    const baseline = [...readings].reverse().find((item) => new Date(item.observedAt).getTime() <= usageCycle.start.getTime());
    const periodReadings = readings.filter((item) => new Date(item.observedAt).getTime() >= usageCycle.start.getTime());
    const latest = periodReadings[periodReadings.length - 1];
    const cumulativeReadings = baseline
      ? [baseline, ...periodReadings.filter((item) => item.id !== baseline.id)]
      : periodReadings;
    const resetDetected = hasCumulativeReset(cumulativeReadings.map((item) => item.numericValue));
    const delta = baseline && latest ? latest.numericValue - baseline.numericValue : null;
    const usage = resetDetected ? null : delta;
    return { baseline, latest, usage, resetDetected, sampleCount: periodReadings.length };
  }, [selectedMetric, telemetryQuery.data, usageCycle]);

  const setProvider = (provider: IotProvider) => {
    setForm((current) => ({
      ...current,
      provider,
      deviceType: provider === 'TUYA' ? 'ELECTRICITY_METER' : 'WATER_FLOW_METER',
      externalDeviceId: provider === 'TUYA' ? current.externalDeviceId : '',
    }));
    probeMutation.reset();
  };

  const openCreateModal = (provider?: IotProvider) => {
    createMutation.reset();
    probeMutation.reset();
    setSecretResult(null);
    if (provider) setProvider(provider);
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setShowCreate(false);
    setForm(emptyForm);
    createMutation.reset();
    probeMutation.reset();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (createMutation.isPending) return;
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
        eyebrow="Pemantauan utilitas"
        title="IoT Listrik & Air"
        description="Pantau kesehatan meter, pembacaan terbaru, dan pemetaan kamar dalam satu pusat kendali. Data sensor tetap terpisah dari tagihan resmi."
        secondaryAction={(
          <div className="d-flex flex-wrap gap-2 iot-header-actions">
            <Button variant="outline-primary" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending || !overview?.summary.tuya}>
              <RefreshCw size={16} className={syncAllMutation.isPending ? 'iot-spin' : ''} /> Sinkronkan Tuya
            </Button>
            <Button onClick={() => openCreateModal()}><Plus size={16} /> Tambah perangkat</Button>
          </div>
        )}
      />

      <Alert variant="info" className="iot-safety-banner">
        <ShieldCheck size={21} />
        <div><strong>Pemantauan aman.</strong> Dashboard tidak menyediakan kontrol relay Tuya dan telemetri tidak otomatis menjadi tagihan. Perhitungan resmi tetap melalui pemeriksaan catatan meter.</div>
      </Alert>

      {overviewQuery.isLoading ? (
        <div className="iot-overview-loading" role="status" aria-label="Memuat pusat kendali IoT">
          <span className="visually-hidden">Memuat pusat kendali IoT…</span>
          <div className="iot-kpi-grid">{Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)}</div>
          <Card className="content-card border-0"><Card.Body><TableSkeleton rows={5} cols={6} /></Card.Body></Card>
        </div>
      ) : overviewQuery.isError ? (
        <Alert variant="danger" className="iot-error-state">
          <AlertTriangle size={20} aria-hidden="true" />
          <div><strong>Pusat kendali belum dapat dimuat</strong><p>{getApiErrorMessage(overviewQuery.error, 'Periksa koneksi server lalu coba lagi.')}</p><Button size="sm" variant="outline-danger" onClick={() => overviewQuery.refetch()}>Coba lagi</Button></div>
        </Alert>
      ) : overview ? (
        <>
          {!overview.configuration.tuya.configured ? (
            <Alert variant="warning"><AlertTriangle size={18} /> Kredensial/region Tuya backend belum lengkap. Isi environment server sebelum sinkronisasi.</Alert>
          ) : null}
          {overview.summary.water > 0 && !overview.configuration.esp32CredentialVaultConfigured ? (
            <Alert variant="secondary"><KeyRound size={18} /> Isi <code>IOT_MASTER_KEY</code> sebelum provisioning secret water meter ESP32.</Alert>
          ) : null}

          <section className={`iot-health-strip ${operationalSummary.attention > 0 ? 'is-warning' : overview.summary.enabled > 0 ? 'is-healthy' : 'is-neutral'}`} aria-label="Kesehatan jaringan IoT">
            <span className="iot-health-icon" aria-hidden="true">{operationalSummary.attention > 0 ? <AlertTriangle /> : <Activity />}</span>
            <div className="iot-health-copy">
              <span>Kesehatan jaringan</span>
              <strong>{operationalSummary.attention > 0 ? `${operationalSummary.attention} perangkat perlu diperiksa` : overview.summary.enabled > 0 ? 'Semua perangkat aktif mengirim status terbaru' : 'Belum ada perangkat aktif'}</strong>
              <small>{operationalSummary.healthy}/{overview.summary.enabled} perangkat aktif sehat · {operationalSummary.mapped}/{overview.summary.total} sudah dipetakan ke kamar</small>
            </div>
            <div className="iot-health-score">
              <strong>{operationalSummary.healthy}/{overview.summary.enabled}</strong>
              <span>aktif sehat</span>
            </div>
            <time className="iot-health-updated" dateTime={new Date(overviewQuery.dataUpdatedAt).toISOString()}>
              Diperbarui {relativeTime(new Date(overviewQuery.dataUpdatedAt).toISOString())}
            </time>
          </section>

          <div className="iot-kpi-grid" role="list" aria-label="Ringkasan IoT">
            <div className="iot-kpi-card" role="listitem"><span className="iot-kpi-icon is-blue"><Radio /></span><div><small>Perangkat aktif</small><strong>{overview.summary.enabled}</strong><span>dari {overview.summary.total} terdaftar</span></div></div>
            <div className="iot-kpi-card" role="listitem"><span className="iot-kpi-icon is-green"><CheckCircle2 /></span><div><small>Online</small><strong>{overview.summary.online}</strong><span>status cloud/perangkat</span></div></div>
            <div className="iot-kpi-card" role="listitem"><span className="iot-kpi-icon is-amber"><WifiOff /></span><div><small>Perlu perhatian</small><strong>{operationalSummary.attention}</strong><span>offline / data terlambat</span></div></div>
            <div className="iot-kpi-card" role="listitem"><span className="iot-kpi-icon is-cyan"><Building2 /></span><div><small>Sudah dipetakan</small><strong>{operationalSummary.mapped}</strong><span>dari {overview.summary.total} perangkat</span></div></div>
          </div>

          <Card className="content-card border-0 iot-device-panel" id="iot-device-registry">
            <Card.Body>
              <div className="iot-panel-toolbar">
                <div><h2>Daftar perangkat</h2><p>Pilih Lihat detail untuk membuka kesehatan, pembacaan sensor, dan pemakaian periode sewa.</p></div>
                <div className="iot-filter-group" role="group" aria-label="Filter provider">
                  {filterOptions.map((item) => (
                    <button key={item.value} type="button" aria-pressed={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>
                      {item.label}<span className="iot-filter-count">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {devices.length === 0 ? (
                <div className="iot-empty-state">
                  {filter === 'KOST48_ESP32' ? <Droplets /> : <Zap />}
                  <h3>Belum ada perangkat pada kategori ini</h3>
                  <p>{filter === 'TUYA' ? 'Daftarkan ID perangkat Tuya untuk mulai memantau listrik.' : filter === 'KOST48_ESP32' ? 'Siapkan identitas ESP32 untuk pemasangan sensor air.' : 'Daftarkan meter otomatis lalu petakan ke kamar yang sesuai.'}</p>
                  <Button size="sm" onClick={() => openCreateModal(filter === 'ALL' ? undefined : filter)}>Tambah perangkat</Button>
                </div>
              ) : (
                <>
                <div className="iot-device-desktop">
                <Table responsive hover className="align-middle mb-0 iot-device-table">
                  <caption className="visually-hidden">Daftar perangkat IoT beserta kamar, status, pembacaan terakhir, dan tindakan pengelolaan.</caption>
                  <thead><tr><th>Perangkat</th><th>Kamar</th><th>Status</th><th>Nilai terakhir</th><th>Terakhir masuk</th><th className="text-end">Aksi</th></tr></thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                        key={device.id}
                        className="iot-device-row"
                      >
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`iot-device-icon ${device.provider === 'TUYA' ? 'is-electric' : 'is-water'}`}>{device.provider === 'TUYA' ? <Zap size={18} /> : <Droplets size={18} />}</span>
                            <div><strong>{device.displayName || device.deviceCode}</strong><div className="small text-muted">{device.deviceCode} · {device.provider === 'TUYA' ? 'Tuya Cloud' : `ESP32 · secret v${device.credentialVersion}`}</div></div>
                          </div>
                        </td>
                        <td>{device.room ? <><strong>{device.room.code}</strong>{device.room.name ? <div className="small text-muted">{device.room.name}</div> : null}</> : <span className="text-muted">Belum dipetakan</span>}</td>
                        <td><DeviceState device={device} staleAfterMinutes={overview.staleAfterMinutes ?? 30} /></td>
                        <td><LatestValues device={device} /></td>
                        <td>{device.lastSeenAt ? <time dateTime={device.lastSeenAt} title={`${new Date(device.lastSeenAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`}>{relativeTime(device.lastSeenAt)}</time> : <span className="text-muted">Belum ada data</span>}</td>
                        <td className="iot-device-actions" onClick={(event) => event.stopPropagation()}>
                          <Button size="sm" variant="outline-primary" onClick={() => setSelectedDeviceId(device.id)}>
                            Lihat detail <ChevronRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
                <div className="iot-device-mobile-list" role="list" aria-label="Daftar perangkat IoT">
                  {devices.map((device) => (
                    <article className="iot-device-mobile-card" role="listitem" key={device.id} aria-labelledby={`iot-device-${device.id}`}>
                      <div className="iot-device-mobile-head">
                        <span className={`iot-device-icon ${device.provider === 'TUYA' ? 'is-electric' : 'is-water'}`} aria-hidden="true">{device.provider === 'TUYA' ? <Zap size={18} /> : <Droplets size={18} />}</span>
                        <div><strong id={`iot-device-${device.id}`}>{device.displayName || device.deviceCode}</strong><span>{device.deviceCode} · {device.provider === 'TUYA' ? 'Tuya Cloud' : 'ESP32 Air'}</span></div>
                        <DeviceState device={device} staleAfterMinutes={overview.staleAfterMinutes ?? 30} />
                      </div>
                      <dl className="iot-device-mobile-meta">
                        <div><dt>Kamar</dt><dd>{device.room ? device.room.code : 'Belum dipetakan'}</dd></div>
                        <div><dt>Data terakhir</dt><dd>{device.lastSeenAt ? <time dateTime={device.lastSeenAt}>{relativeTime(device.lastSeenAt)}</time> : 'Belum ada'}</dd></div>
                      </dl>
                      <LatestValues device={device} />
                      <Button size="sm" variant="outline-primary" onClick={() => setSelectedDeviceId(device.id)}>Lihat detail <ChevronRight size={14} /></Button>
                    </article>
                  ))}
                </div>
                </>
              )}
            </Card.Body>
          </Card>

          <div className="iot-readiness-grid">
            <Card className="border-0 content-card"><Card.Body><div className="iot-readiness-title"><Zap /> <div><h3>Tuya kWh</h3><Badge bg={overview.configuration.tuya.configured ? 'success' : 'warning'}>{overview.configuration.tuya.configured ? 'Cloud siap' : 'Perlu konfigurasi'}</Badge></div></div><p>Tarik energi kumulatif, arus, daya, dan tegangan. Region: <code>{overview.configuration.tuya.region || 'belum valid'}</code>.</p></Card.Body></Card>
            {overview.summary.water > 0 ? (
              <Card className="border-0 content-card"><Card.Body><div className="iot-readiness-title"><Droplets /> <div><h3>ESP32-C3 Water Flow</h3><Badge bg={overview.configuration.esp32CredentialVaultConfigured ? 'primary' : 'secondary'}>{overview.configuration.esp32CredentialVaultConfigured ? 'Ingest siap' : 'Menunggu master key'}</Badge></div></div><p>Endpoint signed HTTPS sudah disiapkan di <code>{overview.configuration.waterIngestPath}</code>.</p></Card.Body></Card>
            ) : null}
          </div>
        </>
      ) : null}

      <Modal show={showCreate} onHide={closeCreateModal} centered size="lg" scrollable backdrop={createMutation.isPending ? 'static' : true} keyboard={!createMutation.isPending}>
        <Form onSubmit={submit} aria-busy={createMutation.isPending}>
          <Modal.Header closeButton={!createMutation.isPending} closeLabel="Tutup"><Modal.Title>Tambah perangkat IoT</Modal.Title></Modal.Header>
          <Modal.Body>
            <Alert variant="light" className="border small">Perangkat Tuya hanya dibaca. ESP32 akan memakai HMAC device secret setelah provisioning oleh Owner.</Alert>
            <fieldset disabled={createMutation.isPending} className="m-0 border-0 p-0">
            <Row className="g-3">
              <Col md={6}><Form.Group controlId="iot-provider"><Form.Label>Jenis koneksi</Form.Label><Form.Select value={form.provider} onChange={(event) => setProvider(event.target.value as IotProvider)}><option value="TUYA">Tuya Cloud — listrik</option><option value="KOST48_ESP32">KOST48 ESP32 — air</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-room"><Form.Label>Kamar</Form.Label><Form.Select disabled={roomsQuery.isLoading || roomsQuery.isError} value={form.roomId ?? ''} onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">{roomsQuery.isLoading ? 'Memuat daftar kamar…' : roomsQuery.isError ? 'Daftar kamar tidak tersedia' : 'Belum dipetakan'}</option>{roomsQuery.data?.items.map((room) => <option key={room.id} value={room.id}>{room.code}{room.name ? ` — ${room.name}` : ''}</option>)}</Form.Select>{roomsQuery.isError ? <Form.Text className="text-danger">Kamar dapat dipetakan nanti setelah server kembali tersedia.</Form.Text> : null}</Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-device-code"><Form.Label>Kode perangkat</Form.Label><Form.Control required maxLength={80} pattern="[A-Za-z0-9._-]+" placeholder={form.provider === 'TUYA' ? 'kwh-kamar-01' : 'water-kamar-01'} value={form.deviceCode} onChange={(event) => setForm((current) => ({ ...current, deviceCode: event.target.value }))} /><Form.Text>Identitas stabil di aplikasi, bukan nama penghuni.</Form.Text></Form.Group></Col>
              <Col md={6}><Form.Group controlId="iot-display-name"><Form.Label>Nama tampilan</Form.Label><Form.Control maxLength={120} placeholder="Meter kWh Kamar 01" value={form.displayName ?? ''} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></Form.Group></Col>
              {form.provider === 'TUYA' ? (
                <Col xs={12}><Form.Group controlId="iot-tuya-device-id"><Form.Label>Tuya device ID</Form.Label><div className="d-flex gap-2"><Form.Control required maxLength={128} autoComplete="off" placeholder="Device ID dari Tuya Cloud project" value={form.externalDeviceId ?? ''} onChange={(event) => { setForm((current) => ({ ...current, externalDeviceId: event.target.value })); probeMutation.reset(); }} /><Button type="button" variant="outline-primary" onClick={() => probeMutation.mutate(form.externalDeviceId?.trim() || '')} disabled={!form.externalDeviceId?.trim() || probeMutation.isPending}>{probeMutation.isPending ? <Spinner size="sm" /> : 'Uji koneksi'}</Button></div></Form.Group></Col>
              ) : null}
            </Row>
            </fieldset>
            {probeMutation.isSuccess ? <Alert variant="success" className="mt-3 mb-0"><CheckCircle2 size={18} /> Terhubung ke {probeMutation.data.device.name || 'perangkat Tuya'} · {probeMutation.data.device.online ? 'online' : 'offline'} · {probeMutation.data.metricCount} datapoint.</Alert> : null}
            {probeMutation.isError ? <Alert variant="danger" className="mt-3 mb-0">{getApiErrorMessage(probeMutation.error, 'Uji koneksi Tuya gagal.')}</Alert> : null}
            {createMutation.isError ? <Alert variant="danger" className="mt-3 mb-0">{getApiErrorMessage(createMutation.error, 'Gagal mendaftarkan perangkat.')}</Alert> : null}
          </Modal.Body>
          <Modal.Footer><Button variant="outline-secondary" onClick={closeCreateModal} disabled={createMutation.isPending}>Batal</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Spinner size="sm" /> : 'Daftarkan perangkat'}</Button></Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={Boolean(selectedDevice)}
        onHide={() => { if (!secretMutation.isPending) setSelectedDeviceId(null); }}
        onExited={() => {
          if (!pendingSecretResult) return;
          setSecretResult(pendingSecretResult);
          setPendingSecretResult(null);
        }}
        centered
        size="lg"
        className="iot-device-modal"
        scrollable
      >
        <Modal.Header closeButton closeLabel="Tutup">
          <Modal.Title>Detail perangkat</Modal.Title>
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
                <DeviceState device={selectedDevice} staleAfterMinutes={overview?.staleAfterMinutes ?? 30} />
              </section>

              {!selectedDevice.roomId ? (
                <Alert variant="secondary" className="mt-3 mb-0"><Gauge size={18} /> Petakan perangkat ke kamar terlebih dahulu agar periode pemakaian dapat dihitung.</Alert>
              ) : staysQuery.isLoading ? (
                <div className="py-4 text-center"><Spinner animation="border" size="sm" /> Memuat masa sewa kamar…</div>
              ) : staysQuery.isError ? (
                <Alert variant="danger" className="mt-3 mb-0"><AlertTriangle size={18} /><div>Masa sewa kamar belum dapat dimuat. <Button size="sm" variant="outline-danger" className="ms-2" onClick={() => staysQuery.refetch()}>Coba lagi</Button></div></Alert>
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
                    <Alert variant="danger" className="mb-0">{getApiErrorMessage(telemetryQuery.error, 'Riwayat telemetri tidak dapat dimuat.')}</Alert>
                  ) : usageSummary?.resetDetected ? (
                    <Alert variant="warning" className="mb-0"><AlertTriangle size={18} /><div><strong>Reset atau pergantian meter terdeteksi</strong><div>Urutan pembacaan menunjukkan angka kumulatif pernah turun. Pemakaian tidak dianggap nol; periksa perangkat dan tetapkan baseline baru.</div></div></Alert>
                  ) : !usageSummary?.baseline || !usageSummary.latest || usageSummary.usage == null ? (
                    <Alert variant="secondary" className="mb-0">Belum ada pembacaan pembanding pada atau sebelum awal periode. Sinkronkan meter agar total periode berikutnya dapat dihitung akurat.</Alert>
                  ) : (
                    <div className="iot-usage-content">
                      <div className="iot-usage-summary">
                        <span>{selectedMetric?.label} periode ini</span>
                        <strong>{usageSummary.usage.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong>
                        {selectedDevice.deviceType === 'ELECTRICITY_METER' ? (
                          <small>Delta sensor untuk monitoring operasional. Jatah dan biaya mengikuti snapshot canonical pada portal penghuni.</small>
                        ) : <small>{usageSummary.sampleCount} pembacaan pada periode ini.</small>}
                      </div>
                      <div className="iot-reading-comparison">
                        <span>Awal periode<strong>{usageSummary.baseline.numericValue.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong><small>{relativeTime(usageSummary.baseline.observedAt)}</small></span>
                        <span>Terakhir<strong>{usageSummary.latest.numericValue.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {selectedMetric?.unit}</strong><small>{relativeTime(usageSummary.latest.observedAt)}</small></span>
                      </div>
                      {/* Live metrics: watt, volt, ampere dari telemetry terbaru */}
                      {selectedDevice.deviceType === 'ELECTRICITY_METER' ? (() => {
                        const goodMetric = (metric: string) => selectedDevice.latestTelemetry.find((item) => item.metric === metric && item.quality === 'GOOD' && Number.isFinite(Number(item.value)));
                        const powerW = goodMetric('electricity.power_w');
                        const voltageV = goodMetric('electricity.voltage_v');
                        const currentA = goodMetric('electricity.current_a');
                        if (!powerW && !voltageV && !currentA) return null;
                        return <div className="iot-live-metrics"><div className="iot-live-metrics-row">
                          {powerW ? <span className="iot-live-chip">Daya {Number(powerW.value).toFixed(0)} W</span> : null}
                          {voltageV ? <span className="iot-live-chip">Tegangan {Number(voltageV.value).toFixed(1)} V</span> : null}
                          {currentA ? <span className="iot-live-chip">Arus {Number(currentA.value).toFixed(2)} A</span> : null}
                        </div></div>;
                      })() : null}
                    </div>
                  )}
                  {/* Mini trend chart dari telemetri historis berkualitas baik */}
                  {!usageSummary?.resetDetected ? (() => {
                    const filtered = (telemetryQuery.data ?? [])
                      .filter((item) => item.metric === selectedMetric?.key && item.quality === 'GOOD' && Number.isFinite(Number(item.value)))
                      .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
                      .slice(-20);
                    if (filtered.length < 2) return null;
                    const baseVal = Number(filtered[0].value);
                    const points = filtered.map((item) => ({
                      label: new Date(item.observedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }),
                      value: Number((Number(item.value) - baseVal).toFixed(3)),
                    }));
                    return <div className="iot-trend-mini"><div className="iot-trend-mini-head">Tren 20 titik terakhir</div><Sparkline points={points} width={280} height={50} strokeColor="#2563eb" ariaLabel="Tren telemetri berkualitas baik" /></div>;
                  })() : null}
                  {/* Mini telemetry table — 5 titik terakhir */}
                  {telemetryQuery.data && telemetryQuery.data.length > 0 ? (
                    <div className="iot-telemetry-table-wrap">
                      <div className="iot-trend-mini-head">Riwayat pembacaan</div>
                      <table className="iot-telemetry-mini-table">
                        <thead><tr><th>Waktu</th><th>Nilai</th><th>Kualitas</th></tr></thead>
                        <tbody>
                          {(() => {
                            const rows = (telemetryQuery.data ?? [])
                              .filter((item) => item.metric === selectedMetric?.key)
                              .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
                              .slice(0, 5);
                            return rows.map((item) => (
                              <tr key={item.id}>
                                <td>{new Date(item.observedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</td>
                                <td><strong>{Number(item.value).toLocaleString('id-ID', { maximumFractionDigits: 3 })}</strong> {selectedMetric?.unit}</td>
                                <td>{item.quality === 'SUSPECT' ? <span className="iot-quality-badge badge-suspect">Meragukan</span> : item.quality === 'REJECTED' ? <span className="iot-quality-badge badge-rejected">Ditolak</span> : <span className="iot-quality-badge badge-good">Baik</span>}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <p className="iot-usage-note">Pemantauan sensor saja, bukan dasar tagihan. Tagihan resmi tetap memakai pencatatan dan pemeriksaan meter.</p>
                </section>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setSelectedDeviceId(null)} disabled={secretMutation.isPending}>Tutup</Button>
          {selectedDevice ? (
            <Button
              variant={selectedDevice.enabled ? 'outline-secondary' : 'outline-success'}
              onClick={() => {
                if (selectedDevice.enabled && !window.confirm('Nonaktifkan perangkat ini? Polling dan ingest perangkat akan dihentikan sampai diaktifkan kembali.')) return;
                toggleMutation.mutate({ id: selectedDevice.id, enabled: !selectedDevice.enabled });
              }}
              disabled={toggleMutation.isPending}
            >
              {selectedDevice.enabled ? 'Nonaktifkan perangkat' : 'Aktifkan perangkat'}
            </Button>
          ) : null}
          {selectedDevice && selectedDevice.provider !== 'TUYA' && user?.role === 'OWNER' ? (
            <Button variant="outline-primary" onClick={() => {
              if (selectedDevice.credentialProvisioned && !window.confirm('Rotasi secret akan membuat secret firmware lama tidak berlaku. Lanjutkan hanya jika ESP32 siap diprovision ulang.')) return;
              secretMutation.mutate(selectedDevice.id);
            }} disabled={secretMutation.isPending || !overview?.configuration.esp32CredentialVaultConfigured}>
              <KeyRound size={16} /> {selectedDevice.credentialProvisioned ? 'Rotasi secret' : 'Provision secret'}
            </Button>
          ) : null}
          {selectedDevice?.provider === 'TUYA' ? <Button variant="outline-primary" onClick={() => backfillMutation.mutate(selectedDevice.id)} disabled={backfillMutation.isPending || !selectedDevice.enabled} title="Ambil dan simpan riwayat report-log Tuya hingga 7 hari terakhir"><CalendarDays size={16} className={backfillMutation.isPending ? 'iot-spin' : ''} /> Ambil riwayat 7 hari</Button> : null}
          {selectedDevice?.provider === 'TUYA' ? <Button onClick={() => syncMutation.mutate(selectedDevice.id)} disabled={syncMutation.isPending || !selectedDevice.enabled}><RefreshCw size={16} className={syncMutation.isPending ? 'iot-spin' : ''} /> Sinkronkan</Button> : null}
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(secretResult)} onHide={() => setSecretResult(null)} centered backdrop="static" keyboard={false}>
        <Modal.Header><Modal.Title>Device secret — tampil satu kali</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="warning"><AlertTriangle size={18} /> Jangan tutup sebelum secret disimpan untuk provisioning firmware.</Alert>
          <Form.Label htmlFor="iot-secret-device-id">Device ID</Form.Label><Form.Control id="iot-secret-device-id" readOnly value={secretResult?.deviceCode ?? ''} className="mb-3" />
          <Form.Label htmlFor="iot-secret-value">Device secret</Form.Label><div className="d-flex gap-2"><Form.Control id="iot-secret-value" readOnly value={secretResult?.deviceSecret ?? ''} className="font-monospace" /><Button variant="outline-primary" onClick={copySecret} aria-label="Salin device secret"><Copy size={18} /></Button></div>
          <p className="small text-muted mt-3 mb-0">Gunakan canonical signature sesuai dokumen M15B. Backend hanya menyimpan versi terenkripsi.</p>
        </Modal.Body>
        <Modal.Footer><Button onClick={() => setSecretResult(null)}>Saya sudah menyimpan</Button></Modal.Footer>
      </Modal>
    </div>
    </FeatureErrorBoundary>
  );
}
