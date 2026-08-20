import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, Spinner } from 'react-bootstrap';
import { AlertTriangle, ArrowLeft, CalendarDays, Droplets, Radio, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../components/common/ToastProvider';
import LineAreaChart from '../../components/charts/LineAreaChart';
import ChartRangeSelector, { type ChartGranularity } from '../../components/charts/ChartRangeSelector';
import UsageGauge from '../../components/charts/UsageGauge';
import type { HorizontalBarPoint } from '../../components/charts/HorizontalBarChart';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import { OKABE_ITO } from '../../components/charts/chartPalette';
import UtilityProjection from '../../components/portal/stay/UtilityProjection';
import AnomalyAlert from '../../components/portal/stay/AnomalyAlert';
import {
  getMyRoomElectricityTimeline,
  getMyRoomUtilityTelemetry,
  iotQueryKeys,
  refreshMyRoomMeter,
  type TenantElectricityTimeline,
  type TenantRoomUtilityTelemetry,
  type TenantUtilityDevice,
} from '../../api/iot';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { fetchPublicConfig } from '../../api/settings';
import { getResource } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { summarizeUsageSinceCheckIn, estimateUtilityCost, numeric } from '../../utils/meterUsage';
import { toDateKey } from '../../pages/portal/myStayShared';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import type { MeterReading, Stay } from '../../types';

const statusLabel: Record<TenantUtilityDevice['status'], string> = {
  NO_DEVICE: 'Belum terpasang',
  NOT_CONNECTED: 'Belum terhubung',
  OFFLINE: 'Offline',
  STALE: 'Data terlambat',
  NO_FLOW: 'Tidak ada aliran',
  ONLINE: 'Online',
};

const qualityLabel: Partial<Record<NonNullable<TenantUtilityDevice['quality']>, string>> = {
  SUSPECT: 'data perlu diperiksa',
  REJECTED: 'data ditolak',
};

function liveValue(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)} ${unit === 'm3' ? 'm³' : unit}`;
}

export function timelineBucket(dateKey: string, granularity: ChartGranularity) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (granularity === 'monthly') return dateKey.slice(0, 7);
  if (granularity === 'weekly') {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
  }
  return dateKey;
}

export function timelineLabel(bucket: string, granularity: ChartGranularity) {
  const normalizedBucket = granularity === 'monthly' ? `${bucket}-01` : bucket;
  const date = new Date(`${normalizedBucket}T00:00:00.000Z`);
  if (granularity === 'monthly') {
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function LiveMeterTileLarge({ device }: { device: TenantUtilityDevice }) {
  const isWater = device.utilityType === 'WATER';
  const isOnline = ['ONLINE', 'NO_FLOW'].includes(device.status);
  const qualityWarning = device.quality ? qualityLabel[device.quality] : undefined;
  const rejected = device.quality === 'REJECTED';
  const stateClass = isOnline && !qualityWarning ? 'is-ok' : 'is-warning';
  const hasLivePower = !isWater && !rejected && device.powerW != null;
  return (
    <div className={`tenant-live-meter tenant-live-meter--large ${stateClass}`}>
      <div className="tenant-live-meter-head">
        <strong className="energy-meter-name">{isWater ? <Droplets size={16} aria-hidden="true" /> : <Zap size={16} aria-hidden="true" />}{isWater ? 'Meter air' : 'Meter listrik'}</strong>
        <span className={`tenant-live-meter-status-badge ${isOnline ? 'badge-ok' : 'badge-warn'}`}>
          {statusLabel[device.status]}{qualityWarning ? ` · ${qualityWarning}` : ''}
        </span>
      </div>
      <div className="tenant-live-meter-value">{liveValue(rejected ? null : device.total, device.unit)}</div>
      <div className="tenant-live-meter-reading-label">{rejected ? 'Pembacaan terakhir tidak dipakai' : 'Angka meter kumulatif'}</div>
      {hasLivePower ? (
        <div className="tenant-live-meter-power">
          <span className="live-power-watt" title="Daya pada pembaruan terakhir">
            ⚡ {device.powerW!.toFixed(0)} W
          </span>
          {device.voltageV != null ? (
            <span className="live-power-detail" title="Tegangan">
              {device.voltageV.toFixed(0)} V
            </span>
          ) : null}
          {device.currentA != null ? (
            <span className="live-power-detail" title="Arus">
              {device.currentA.toFixed(1)} A
            </span>
          ) : null}
        </div>
      ) : null}
      {isWater && !rejected && device.flowRateLpm != null ? (
        <div className="tenant-live-meter-flow">Aliran saat ini: {liveValue(device.flowRateLpm, 'L/menit')}</div>
      ) : null}
      <small>{device.statusMessage}</small>
      {device.observedAt ? (
        <small className="tenant-live-meter-observed">
          Terakhir dibaca {new Date(device.observedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
        </small>
      ) : null}
    </div>
  );
}

/** Halaman dedicated untuk memantau pembaruan energi (listrik & air). */
export default function EnergyPage() {
  useDocumentTitle('Energi Kamar');
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId as number | undefined;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshSensorMutation = useMutation({
    mutationFn: refreshMyRoomMeter,
    onSuccess: async (result) => {
      toast(
        result.synced > 0
          ? `${result.synced}/${result.total} meter berhasil disinkronkan.`
          : result.message ?? 'Tidak ada meter yang perlu disinkronkan.',
        result.synced > 0 ? 'success' : 'info',
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: iotQueryKeys.tenantUtilityRoot }),
        queryClient.invalidateQueries({ queryKey: ['portal-meter-readings'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-meter-history'] }),
      ]);
    },
    onError: (error) => toast(getApiErrorMessage(error, 'Meter belum berhasil disinkronkan.'), 'danger'),
  });

  const stayQuery = useQuery({
    queryKey: ['energy-stay', tenantId],
    queryFn: () => getResource<Stay>('/stays/me/current'),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const status = (error as any)?.response?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
  const stay = stayQuery.data;

  const publicConfig = useQuery({ queryKey: ['public-config'], queryFn: fetchPublicConfig });
  const waterEnabled = Boolean(publicConfig.data?.waterMeteringEnabled);
  const elecTariff = numeric(stay?.room?.electricityTariffPerKwhRupiah ?? stay?.electricityTariffPerKwhRupiah);
  const waterTariff = numeric(stay?.room?.waterTariffPerM3Rupiah ?? stay?.waterTariffPerM3Rupiah);

  // Meter readings
  const meterWindow = useMemo(() => {
    if (!stay?.checkInDate) return { startKey: '', endKey: '' };
    const start = new Date(stay.checkInDate);
    const end = new Date();
    return { startKey: toDateKey(start), endKey: toDateKey(end) };
  }, [stay?.checkInDate]);

  const meterReadingsQuery = useQuery({
    queryKey: ['tenant-meter-history', stay?.roomId, meterWindow.startKey, meterWindow.endKey],
    queryFn: () => getMeterReadingsByRoom(stay!.roomId, {
      from: meterWindow.startKey,
      to: meterWindow.endKey,
      limit: 100,
    }),
    enabled: Boolean(stay?.roomId),
    staleTime: 60_000,
    retry: false,
  });

  // IoT telemetry
  const utilityTelemetryQuery = useQuery<TenantRoomUtilityTelemetry>({
    queryKey: iotQueryKeys.tenantUtility(stay?.roomId),
    queryFn: getMyRoomUtilityTelemetry,
    enabled: Boolean(stay?.roomId),
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const electricityTimelineQuery = useQuery<TenantElectricityTimeline>({
    queryKey: iotQueryKeys.tenantTimeline(stay?.roomId),
    queryFn: getMyRoomElectricityTimeline,
    enabled: Boolean(stay?.roomId),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });

  // Keep telemetry transport bounded: the 60-second query above is the only
  // refresh path used by this view on shared Passenger hosting.

  const readings: MeterReading[] = meterReadingsQuery.data ?? [];
  const telemetry = utilityTelemetryQuery.data;
  const cycleElectricity = telemetry?.cycle?.electricity;
  const cycleFreeKwh = cycleElectricity?.freeKwh ?? 0;
  const allowanceMonths = telemetry?.cycle?.allowanceMonths ?? 1;
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('daily');

  // Derived data
  const summary = useMemo(() => {
    if (!stay?.checkInDate || readings.length === 0) return null;
    return summarizeUsageSinceCheckIn(readings, stay.checkInDate);
  }, [readings, stay?.checkInDate]);
  const hasMeterElectricityUsage = useMemo(
    () => (summary?.rows.filter((row) => typeof row.electricityKwh === 'number').length ?? 0) >= 2,
    [summary?.rows],
  );
  const hasMeterWaterUsage = useMemo(
    () => (summary?.rows.filter((row) => typeof row.waterM3 === 'number').length ?? 0) >= 2,
    [summary?.rows],
  );

  // Backend supplies one canonical tenant cycle (anchored to check-in) with a
  // baseline. Never treat the cumulative IoT counter itself as period usage.
  const periodUsage = useMemo(() => {
    if (cycleElectricity) {
      return { electricityKwh: cycleElectricity.usageKwh ?? 0, waterM3: summary?.totalWaterM3 ?? 0 };
    }
    return { electricityKwh: 0, waterM3: 0 };
  }, [cycleElectricity, summary]);

  const isIotFallback = telemetry?.cycle?.source === 'IOT_TELEMETRY';

  // Label periode: "8 Jul – 8 Agu"
  const periodLabel = useMemo(() => {
    if (!telemetry?.cycle) return '';
    const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
    return `${fmt(telemetry.cycle.start)} - ${fmt(telemetry.cycle.end)}`;
  }, [telemetry?.cycle]);

  const estimate = useMemo(() => estimateUtilityCost({
    electricityUsageKwh: periodUsage.electricityKwh,
    waterUsageM3: periodUsage.waterM3,
    electricityTariff: elecTariff,
    waterTariff,
    freeKwh: cycleFreeKwh,
    waterEnabled,
  }), [periodUsage, elecTariff, waterTariff, cycleFreeKwh, waterEnabled]);
  const allowanceKnown = Boolean(cycleElectricity);
  const canonicalElectricityEstimate = cycleElectricity?.estimatedChargeRupiah ?? null;
  const canonicalElectricityTariff = cycleElectricity ? cycleElectricity.tariffRupiah : elecTariff;
  const remainingFreeKwh = Math.max(0, cycleFreeKwh - periodUsage.electricityKwh);
  const excessKwh = Math.max(0, periodUsage.electricityKwh - cycleFreeKwh);
  const sourceMeta = useMemo(() => {
    if (!telemetry?.cycle) {
      if (utilityTelemetryQuery.isLoading) return { label: 'Menyiapkan snapshot', detail: 'Mengambil periode resmi dari server', tone: 'empty' };
      if (utilityTelemetryQuery.isError) return { label: 'Snapshot belum tersedia', detail: 'Riwayat lokal tidak digunakan untuk menebak tagihan', tone: 'review' };
      return { label: 'Menunggu snapshot', detail: 'Belum ada sumber pemakaian periode', tone: 'empty' };
    }
    const effectiveSource = telemetry.cycle.source;
    if (effectiveSource === 'METER_READING' && telemetry?.cycle?.electricity?.billingReady !== false) return { label: 'Catatan meter resmi', detail: 'Siap untuk perhitungan tagihan', tone: 'official' };
    if (effectiveSource === 'METER_READING') return { label: 'Catatan perlu diperiksa', detail: 'Baseline atau catatan terbaru belum lengkap', tone: 'review' };
    if (effectiveSource === 'IOT_TELEMETRY') return { label: 'Perkiraan sensor', detail: 'Belum menjadi dasar tagihan', tone: 'sensor' };
    return { label: 'Menunggu pencatatan', detail: 'Belum ada sumber pemakaian periode', tone: 'empty' };
  }, [telemetry?.cycle, utilityTelemetryQuery.isError, utilityTelemetryQuery.isLoading]);

  const goodSensorPoints = useMemo(
    () => (electricityTimelineQuery.data?.points ?? []).filter((point) => point.quality === 'GOOD'),
    [electricityTimelineQuery.data?.points],
  );
  const manualTrendRows = useMemo(
    () => (summary?.rows ?? []).filter((row) => (row.usageElectricityKwh ?? 0) > 0),
    [summary?.rows],
  );
  const trendPoints: HorizontalBarPoint[] = useMemo(() => {
    if (goodSensorPoints.length >= 2) {
      const buckets = new Map<string, (typeof goodSensorPoints)[number]>();
      goodSensorPoints.forEach((point) => {
        buckets.set(timelineBucket(point.date, chartGranularity), point);
      });
      return [...buckets.entries()].map(([bucket, point]) => ({
        label: timelineLabel(bucket, chartGranularity),
        value: Number(point.totalUsageKwh.toFixed(2)),
        detail: `Akumulasi ${point.totalUsageKwh.toFixed(2)} kWh sejak awal periode`,
        color: OKABE_ITO.blue,
      }));
    }
    const buckets = new Map<string, number>();
    manualTrendRows.forEach((row) => {
      const key = timelineBucket(row.dateKey, chartGranularity);
      buckets.set(key, (buckets.get(key) ?? 0) + (row.usageElectricityKwh ?? 0));
    });
    return [...buckets.entries()]
      .slice(-12)
      .map(([bucket, usage]) => ({
        label: timelineLabel(bucket, chartGranularity),
        value: Number(usage.toFixed(2)),
        detail: `Pemakaian ${usage.toFixed(2)} kWh`,
        color: OKABE_ITO.blue,
      }));
  }, [chartGranularity, goodSensorPoints, manualTrendRows]);

  const usingIotTimeline = goodSensorPoints.length >= 2;
  const hasTrendSource = usingIotTimeline || manualTrendRows.length >= 2;
  const hasExcludedTimelinePoints = (electricityTimelineQuery.data?.points ?? []).some((point) => point.quality !== 'GOOD');

  const hasData = cycleElectricity?.usageKwh != null;
  const isLoading = utilityTelemetryQuery.isLoading;
  const isError = utilityTelemetryQuery.isError;

  // Loading / no stay
  if (stayQuery.isLoading) {
    return (
      <div className="energy-page text-center py-5">
        <Spinner animation="border" size="sm" /> Memuat data kamar…
      </div>
    );
  }

  const stayErrorStatus = (stayQuery.error as any)?.response?.status;
  if (stayQuery.isError && stayErrorStatus !== 404) {
    return (
      <div className="energy-page">
        <Card className="border-0 shadow-sm energy-state-card"><Card.Body>
          <AlertTriangle size={28} aria-hidden="true" />
          <h1>Data kamar belum dapat dimuat</h1>
          <p>Koneksi ke server sedang bermasalah. Status sewa dan catatan tagihanmu tidak berubah.</p>
          <Button variant="outline-primary" onClick={() => stayQuery.refetch()}>Coba lagi</Button>
        </Card.Body></Card>
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="energy-page">
        <Card className="border-0 shadow-sm energy-state-card">
            <Card.Body>
              <Zap size={30} aria-hidden="true" />
              <h1>Energi kamar</h1>
              <p className="text-muted">Halaman ini tersedia setelah kamu memiliki kamar aktif.</p>
              <Link to="/portal/stay" className="btn btn-outline-primary">Kembali ke Panduan Kos</Link>
            </Card.Body>
          </Card>
      </div>
    );
  }

  return (
    <FeatureErrorBoundary>
      <div className="energy-page">
          <Link to="/portal/stay" className="energy-back-link"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke Panduan Kos</Link>

          <header className="energy-hero">
            <span className="energy-hero-icon" aria-hidden="true"><Zap /></span>
            <div className="energy-hero-copy">
              <span>Ringkasan utilitas</span>
              <h1>Energi Kamar {stay.room?.code ?? ''}</h1>
              <p>Lihat pemakaian periode berjalan, perkiraan biaya, dan kondisi sensor kamar.</p>
            </div>
            <div className="energy-hero-meta">
              <span className={`energy-source-badge is-${sourceMeta.tone}`} title={sourceMeta.detail}>{sourceMeta.label}</span>
              <small>{telemetry?.refreshedAt ? `Diperbarui ${new Date(telemetry.refreshedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : 'Pemantauan otomatis diperiksa tiap menit'}</small>
            </div>
          </header>

          <section className="energy-overview-section" aria-labelledby="energy-period-heading">
            <div className="energy-section-heading">
              <div><span>Periode aktif</span><h2 id="energy-period-heading">Pemakaian listrik</h2></div>
              {periodLabel ? <span className="energy-period-badge"><CalendarDays size={14} aria-hidden="true" />{periodLabel}</span> : null}
            </div>

            {isLoading && !hasData ? (
              <div className="energy-overview-loading" role="status"><Spinner animation="border" size="sm" /><span>Menyiapkan pemakaian periode…</span></div>
            ) : isError && !hasData ? (
              <div className="energy-inline-state is-error"><strong>Snapshot periode belum dapat dimuat</strong><span>Catatan meter tetap aman dan tidak dihitung ulang di perangkat ini.</span><Button size="sm" variant="outline-danger" onClick={() => utilityTelemetryQuery.refetch()}>Coba lagi</Button></div>
            ) : hasData ? (
              <>
                <div className={`energy-overview-grid${cycleFreeKwh > 0 ? '' : ' no-gauge'}`}>
                  {allowanceKnown && cycleFreeKwh > 0 ? <div className="energy-gauge-row"><UsageGauge value={periodUsage.electricityKwh} maxValue={cycleFreeKwh} unit="kWh" label="Listrik terpakai" thresholds={{ warning: 50, danger: 100 }} size={190} /></div> : null}
                  <div className="energy-primary-reading">
                    <span>Terpakai periode ini</span>
                    <strong>{periodUsage.electricityKwh.toFixed(2)} kWh</strong>
                    <p>{allowanceKnown ? cycleFreeKwh > 0 ? `Jatah ${cycleFreeKwh} kWh untuk ${allowanceMonths} bulan sewa.` : 'Tidak ada jatah gratis; pemakaian dihitung sesuai tarif.' : 'Informasi jatah sedang disiapkan.'}</p>
                    <div className="energy-primary-cost"><span>Estimasi listrik</span><strong>{canonicalElectricityEstimate == null ? '—' : <CurrencyDisplay amount={canonicalElectricityEstimate} showZero />}</strong><small>{canonicalElectricityEstimate == null ? 'Ditahan sampai sumber dan baseline valid' : sourceMeta.tone === 'official' ? 'Berdasarkan catatan meter yang tersedia' : 'Belum menjadi nominal tagihan final'}</small></div>
                  </div>
                </div>
                <div className="energy-fact-grid">
                  <div><span>{allowanceKnown ? excessKwh > 0 ? 'Melebihi jatah' : 'Sisa jatah' : 'Jatah listrik'}</span><strong>{allowanceKnown ? `${(excessKwh > 0 ? excessKwh : remainingFreeKwh).toFixed(2)} kWh` : '—'}</strong></div>
                  <div><span>Tarif listrik</span><strong><CurrencyDisplay amount={canonicalElectricityTariff} />/kWh</strong></div>
                  {waterEnabled ? <div><span>Air sejak masuk</span><strong>{meterReadingsQuery.isLoading ? '…' : meterReadingsQuery.isError || !hasMeterWaterUsage ? '—' : `${periodUsage.waterM3.toFixed(2)} m³`}</strong><small>{meterReadingsQuery.isLoading ? 'Memuat catatan air' : meterReadingsQuery.isError ? 'Riwayat air belum tersedia' : hasMeterWaterUsage ? <>Est. <CurrencyDisplay amount={estimate.water} showZero /></> : 'Belum cukup catatan air'}</small></div> : null}
                </div>
              </>
            ) : (
              <div className="energy-empty-state">
                <Radio size={25} aria-hidden="true" />
                <p>Menunggu pencatatan meter pertama</p>
                <small>Setelah ada angka awal dan terbaru, pemakaian serta estimasi biaya akan muncul di sini.</small>
                <Link to="/portal/stay?tab=listrik" className="btn btn-outline-primary btn-sm">Buka pencatatan meter</Link>
              </div>
            )}

            {telemetry?.cycle?.electricity?.resetDetected ? <div className="energy-integrity-warning"><AlertTriangle size={17} aria-hidden="true" /><div><strong>Perubahan angka meter terdeteksi</strong><span>Pengelola perlu memeriksa baseline sebelum data digunakan untuk tagihan.</span></div></div> : null}
            {isIotFallback ? <div className="energy-iot-notice"><ShieldCheck size={17} aria-hidden="true" /><div><strong>Angka periode sementara berasal dari sensor</strong><span>Gunakan untuk pemantauan. Tagihan resmi tetap menunggu catatan meter yang ditinjau pengelola.</span></div></div> : null}
          </section>

          <AnomalyAlert readings={readings} utilityType="ELECTRICITY" />
          <AnomalyAlert readings={readings} utilityType="WATER" />

          <section className="energy-live-section" aria-labelledby="energy-monitoring-heading">
            <div className="energy-section-heading">
              <div><span>Pemantauan otomatis</span><h2 id="energy-monitoring-heading">Kondisi sensor terbaru</h2></div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline-primary"
                  disabled={refreshSensorMutation.isPending}
                  onClick={() => refreshSensorMutation.mutate()}
                  title="Sinkronkan ulang pembacaan meter dari perangkat IoT"
                >
                  <RefreshCw size={14} aria-hidden="true" className="me-1" />
                  {refreshSensorMutation.isPending ? 'Menyinkronkan…' : 'Muat Ulang Sensor'}
                </Button>
                <span className="energy-monitoring-note"><Radio size={14} aria-hidden="true" />Bukan dasar langsung tagihan</span>
              </div>
            </div>
            {utilityTelemetryQuery.isLoading ? <div className="energy-live-loading" role="status"><Spinner animation="border" size="sm" /> Memeriksa sensor…</div>
              : utilityTelemetryQuery.isError ? <div className="energy-inline-state is-warning"><strong>Status sensor belum tersedia</strong><span>Catatan dan tagihan resmi tidak terpengaruh.</span><Button size="sm" variant="outline-secondary" onClick={() => utilityTelemetryQuery.refetch()}>Coba lagi</Button></div>
                : telemetry ? <><div className="energy-live-grid"><LiveMeterTileLarge device={telemetry.electricity} />{waterEnabled || telemetry.water.status !== 'NO_DEVICE' ? <LiveMeterTileLarge device={telemetry.water} /> : null}</div><p className="energy-billing-notice">{telemetry.billingNotice}</p></>
                  : <div className="energy-inline-state"><strong>Belum ada sensor terhubung</strong><span>Pemakaian tetap dapat dihitung dari catatan meter.</span></div>}
          </section>

          {electricityTimelineQuery.data?.resetDetected && !telemetry?.cycle?.electricity?.resetDetected ? <div className="energy-integrity-warning"><AlertTriangle size={17} aria-hidden="true" /><div><strong>Reset terdeteksi pada timeline sensor</strong><span>Titik setelah perubahan counter ditahan dari interpretasi tagihan dan perlu diperiksa pengelola.</span></div></div> : null}

          {hasTrendSource ? (
            <section className="energy-trend-section">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h2 className="energy-section-title" style={{ margin: 0 }}>
                  {usingIotTimeline ? 'Timeline Pemakaian Listrik' : 'Tren Pemakaian Listrik'}
                </h2>
                <ChartRangeSelector value={chartGranularity} onChange={setChartGranularity} compact />
              </div>
              {usingIotTimeline ? (
                <p className="text-muted small mt-2 mb-0">
                  Akumulasi kWh dari sensor sejak awal periode sewa aktif. Satu titik mewakili pembacaan terakhir pada hari tersebut.
                </p>
              ) : null}
              {hasExcludedTimelinePoints ? <p className="energy-trend-quality-note"><AlertTriangle size={14} aria-hidden="true" /> Titik sensor meragukan/ditolak tidak dimasukkan ke grafik.</p> : null}
              {trendPoints.length >= 2 ? <div className="energy-chart-wrapper">
                <LineAreaChart
                  points={trendPoints}
                  ariaLabel={usingIotTimeline ? 'Timeline akumulasi pemakaian listrik dari sensor IoT' : 'Tren pemakaian listrik per pencatatan'}
                  valueFormatter={(v) => usingIotTimeline ? `${v} kWh terpakai` : `${v} kWh`}
                  height={220}
                />
              </div> : <div className="energy-inline-state"><strong>Rentang ini diringkas menjadi satu titik</strong><span>Pilih Harian atau Mingguan untuk melihat perubahan antar pembacaan.</span></div>}
            </section>
          ) : electricityTimelineQuery.isError && hasData ? <div className="energy-timeline-error">Tren sensor belum dapat dimuat. Ringkasan periode tetap tersedia. <button type="button" onClick={() => electricityTimelineQuery.refetch()}>Coba lagi</button></div> : null}

          {hasData && allowanceKnown && canonicalElectricityEstimate != null ? (
            <section className="energy-projection-section">
              <UtilityProjection
                currentUsageKwh={periodUsage.electricityKwh}
                freeKwh={cycleFreeKwh}
                allowanceMonths={allowanceMonths}
                tariffPerKwh={canonicalElectricityTariff}
                estimatedCost={canonicalElectricityEstimate}
              />
            </section>
          ) : null}

          {hasData ? meterReadingsQuery.isLoading ? (
            <div className="energy-cumulative" role="status">Menyiapkan riwayat catatan manual…</div>
          ) : meterReadingsQuery.isError ? (
            <div className="energy-cumulative">Riwayat catatan manual belum dapat dimuat. <Button size="sm" variant="outline-secondary" onClick={() => meterReadingsQuery.refetch()}>Coba lagi</Button></div>
          ) : summary && (hasMeterElectricityUsage || (waterEnabled && hasMeterWaterUsage)) ? (
            <div className="energy-cumulative">
              Riwayat catatan manual sejak masuk:{' '}
              {hasMeterElectricityUsage ? <strong>{summary.totalElectricityKwh.toFixed(2)} kWh</strong> : null}
              {hasMeterElectricityUsage && waterEnabled && hasMeterWaterUsage ? ' · ' : null}
              {waterEnabled && hasMeterWaterUsage ? <strong>{summary.totalWaterM3.toFixed(2)} m³</strong> : null}
            </div>
          ) : (
            <div className="energy-cumulative">Belum cukup catatan manual untuk menghitung riwayat sejak masuk.</div>
          ) : null}

          <p className="energy-footer-note">
            Estimasi bukan tagihan final. Nominal resmi muncul setelah catatan meter ditinjau pengelola.
          </p>
      </div>
      </FeatureErrorBoundary>
  );
}
