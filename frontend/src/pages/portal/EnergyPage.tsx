import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Spinner } from 'react-bootstrap';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import LineAreaChart from '../../components/charts/LineAreaChart';
import ChartRangeSelector, { type ChartGranularity } from '../../components/charts/ChartRangeSelector';
import UsageGauge from '../../components/charts/UsageGauge';
import HorizontalBarChart, { type HorizontalBarPoint } from '../../components/charts/HorizontalBarChart';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { OKABE_ITO } from '../../components/charts/chartPalette';
import WaterFlowIndicator from '../../components/portal/stay/WaterFlowIndicator';
import UtilityProjection from '../../components/portal/stay/UtilityProjection';
import AnomalyAlert from '../../components/portal/stay/AnomalyAlert';
import {
  getMyRoomElectricityTimeline,
  getMyRoomUtilityTelemetry,
  type TenantElectricityTimeline,
  type TenantRoomUtilityTelemetry,
  type TenantUtilityDevice,
} from '../../api/iot';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { fetchPublicConfig } from '../../api/settings';
import { getResource } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { useIotTelemetrySse } from '../../hooks/useIotTelemetrySse';
import { summarizeUsageSinceCheckIn, estimateUtilityCost, numeric } from '../../utils/meterUsage';
import { toDateKey } from '../../pages/portal/myStayShared';
import type { MeterReading, Stay } from '../../types';

const statusLabel: Record<TenantUtilityDevice['status'], string> = {
  NO_DEVICE: 'Belum terpasang',
  NOT_CONNECTED: 'Belum terhubung',
  OFFLINE: 'Perlu diperiksa',
  STALE: 'Perlu diperiksa',
  NO_FLOW: 'Tidak ada aliran',
  ONLINE: 'Online',
};

function liveValue(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)} ${unit === 'm3' ? 'm³' : unit}`;
}

function timelineBucket(dateKey: string, granularity: ChartGranularity) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (granularity === 'monthly') return dateKey.slice(0, 7);
  if (granularity === 'weekly') {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
  }
  return dateKey;
}

function timelineLabel(bucket: string, granularity: ChartGranularity) {
  const date = new Date(`${bucket}T00:00:00.000Z`);
  if (granularity === 'monthly') {
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function LiveMeterTileLarge({ device }: { device: TenantUtilityDevice }) {
  const isWater = device.utilityType === 'WATER';
  const isOnline = ['ONLINE', 'NO_FLOW'].includes(device.status);
  const stateClass = isOnline ? 'is-ok' : 'is-warning';
  const hasLivePower = !isWater && device.powerW != null;
  return (
    <div className={`tenant-live-meter tenant-live-meter--large ${stateClass}`}>
      <div className="tenant-live-meter-head">
        <strong>{isWater ? '💧 Meter Air' : '⚡ Meter Listrik'}</strong>
        <span className={`tenant-live-meter-status-badge ${isOnline ? 'badge-ok' : 'badge-warn'}`}>
          {statusLabel[device.status]}
        </span>
      </div>
      <div className="tenant-live-meter-value">{liveValue(device.total, device.unit)}</div>
      {hasLivePower ? (
        <div className="tenant-live-meter-power">
          <span className="live-power-watt" title="Daya real-time">
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
      {isWater && device.flowRateLpm != null ? (
        <div className="tenant-live-meter-flow">Aliran saat ini: {liveValue(device.flowRateLpm, 'L/menit')}</div>
      ) : null}
      <small>{device.statusMessage}</small>
      {device.observedAt ? (
        <small className="tenant-live-meter-observed">
          Terakhir diperbarui: {new Date(device.observedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </small>
      ) : null}
    </div>
  );
}

/** Halaman dedicated untuk monitoring energi (listrik & air) real-time. */
export default function EnergyPage() {
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId as number | undefined;

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
  const freeKwh = publicConfig.data?.freeElectricityKwhPerMonth ?? 30;
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
    queryKey: ['energy-meter-readings', stay?.roomId],
    queryFn: () => getMeterReadingsByRoom(stay!.roomId, {
      from: meterWindow.startKey,
      to: meterWindow.endKey,
      limit: 50,
    }),
    enabled: Boolean(stay?.roomId),
    staleTime: 60_000,
    retry: false,
  });

  // IoT telemetry
  const utilityTelemetryQuery = useQuery<TenantRoomUtilityTelemetry>({
    queryKey: ['energy-utility-telemetry', stay?.roomId],
    queryFn: getMyRoomUtilityTelemetry,
    enabled: Boolean(stay?.roomId),
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const electricityTimelineQuery = useQuery<TenantElectricityTimeline>({
    queryKey: ['energy-electricity-timeline', stay?.roomId],
    queryFn: getMyRoomElectricityTimeline,
    enabled: Boolean(stay?.roomId),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });

  useIotTelemetrySse(Boolean(stay?.roomId));

  const readings: MeterReading[] = meterReadingsQuery.data ?? [];
  const telemetry = utilityTelemetryQuery.data;
  const cycleFreeKwh = telemetry?.cycle?.electricity?.freeKwh ?? freeKwh;
  const allowanceMonths = telemetry?.cycle?.allowanceMonths ?? 1;
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('monthly');

  // Derived data
  const summary = useMemo(() => {
    if (!stay?.checkInDate || readings.length === 0) return null;
    return summarizeUsageSinceCheckIn(readings, stay.checkInDate);
  }, [readings, stay?.checkInDate]);

  // Backend supplies one canonical tenant cycle (anchored to check-in) with a
  // baseline. Never treat the cumulative IoT counter itself as period usage.
  const periodUsage = useMemo(() => {
    const cycleUsage = telemetry?.cycle?.electricity?.usageKwh;
    if (cycleUsage != null) {
      return { electricityKwh: cycleUsage, waterM3: summary?.totalWaterM3 ?? 0 };
    }
    if (summary) return { electricityKwh: summary.totalElectricityKwh, waterM3: summary.totalWaterM3 };
    return { electricityKwh: 0, waterM3: 0 };
  }, [summary, telemetry]);

  const isIotFallback = telemetry?.cycle?.source === 'IOT_TELEMETRY';

  // Label periode: "8 Jul – 8 Agu"
  const periodLabel = useMemo(() => {
    if (telemetry?.cycle) {
      const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return `${fmt(telemetry.cycle.start)} - ${fmt(telemetry.cycle.end)}`;
    }
    if (!stay?.checkInDate) return '';
    const checkIn = new Date(stay.checkInDate);
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${fmt(checkIn)} – ${fmt(now)}`;
  }, [stay?.checkInDate, telemetry?.cycle]);

  const estimate = useMemo(() => estimateUtilityCost({
    electricityUsageKwh: periodUsage.electricityKwh,
    waterUsageM3: periodUsage.waterM3,
    electricityTariff: elecTariff,
    waterTariff,
    freeKwh: cycleFreeKwh,
    waterEnabled,
  }), [periodUsage, elecTariff, waterTariff, cycleFreeKwh, waterEnabled]);

  const trendPoints: HorizontalBarPoint[] = useMemo(() => {
    const sensorPoints = electricityTimelineQuery.data?.points ?? [];
    if (sensorPoints.length >= 2) {
      const buckets = new Map<string, (typeof sensorPoints)[number]>();
      sensorPoints.forEach((point) => {
        buckets.set(timelineBucket(point.date, chartGranularity), point);
      });
      return [...buckets.entries()].map(([bucket, point]) => ({
        label: timelineLabel(bucket, chartGranularity),
        value: Number(point.totalUsageKwh.toFixed(2)),
        detail: `Akumulasi ${point.totalUsageKwh.toFixed(2)} kWh sejak awal periode`,
        color: OKABE_ITO.blue,
      }));
    }
    if (!summary) return [];
    return summary.rows
      .filter((r) => (r.usageElectricityKwh ?? 0) > 0)
      .slice(-12)
      .map((r) => ({
        label: r.dateKey.slice(5),
        value: Number((r.usageElectricityKwh ?? 0).toFixed(2)),
        detail: `${(r.usageElectricityKwh ?? 0).toFixed(2)} kWh`,
        color: OKABE_ITO.blue,
      }));
  }, [chartGranularity, electricityTimelineQuery.data?.points, summary]);

  const usingIotTimeline = (electricityTimelineQuery.data?.points.length ?? 0) >= 2;

  const hasData = telemetry?.cycle?.electricity?.usageKwh != null || summary !== null;
  const isLoading = meterReadingsQuery.isLoading || utilityTelemetryQuery.isLoading;
  const isError = meterReadingsQuery.isError;

  // Loading / no stay
  if (stayQuery.isLoading) {
    return (
      <div className="energy-page text-center py-5">
        <Spinner animation="border" size="sm" /> Memuat data kamar…
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="energy-page">
        <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <h3>⚡ Energi</h3>
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
          {/* Breadcrumb */}
          <div className="energy-breadcrumb">
            <Link to="/portal/stay">← Kembali ke Panduan Kos</Link>
          </div>

          {/* Header */}
          <div className="energy-header">
            <h1>⚡ Energi Kamar {stay.room?.code ?? ''}</h1>
            <p className="energy-subtitle">
              Monitoring real-time listrik{waterEnabled ? ' & air' : ''}. Data diperbarui setiap 60 detik.
            </p>
          </div>

          {/* Live Meter Status */}
          <section className="energy-live-section" aria-live="polite">
            <h2 className="energy-section-title">Status Meter Otomatis</h2>
            {utilityTelemetryQuery.isLoading ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /> Memuat status meter…</div>
            ) : utilityTelemetryQuery.isError ? (
              <p className="text-muted small">Status meter otomatis belum tersedia.</p>
            ) : telemetry ? (
              <>
                <div className="energy-live-grid">
                  <LiveMeterTileLarge device={telemetry.electricity} />
                  <LiveMeterTileLarge device={telemetry.water} />
                </div>
                {telemetry.water.status !== 'NO_DEVICE' ? (
                  <WaterFlowIndicator
                    flowRateLpm={telemetry.water.flowRateLpm}
                    totalM3={telemetry.water.total}
                    status={telemetry.water.status}
                    statusMessage={telemetry.water.statusMessage}
                  />
                ) : null}
                <p className="energy-billing-notice">{telemetry.billingNotice}</p>
              </>
            ) : null}
          </section>

          {/* Gauges — selalu terlihat */}
          <section className="energy-gauge-section">
            <h2 className="energy-section-title">
              Pemakaian Periode Ini
              {periodLabel ? <span className="energy-period-badge">📅 {periodLabel}</span> : null}
            </h2>
            <div className="energy-gauge-row">
              <UsageGauge
                value={periodUsage.electricityKwh}
                maxValue={cycleFreeKwh}
                unit="kWh"
                label="Listrik"
                thresholds={{ warning: 50, danger: 100 }}
                size={200}
              />
              {waterEnabled ? (
                <UsageGauge
                  value={periodUsage.waterM3}
                  maxValue={Math.max(periodUsage.waterM3 * 1.5, 5)}
                  unit="m³"
                  label="Air"
                  thresholds={{ warning: 70, danger: 90 }}
                  size={200}
                />
              ) : null}
            </div>

            {isIotFallback ? (
              <div className="energy-iot-notice">
                📡 Data dari sensor IoT — bukan dasar tagihan. Catat meter secara berkala untuk akurasi billing.
              </div>
            ) : null}

            {hasData ? (
              <div className="energy-summary-tiles">
                <div className="energy-summary-tile">
                  <span className="est-label">Listrik periode ini</span>
                  <strong>{periodUsage.electricityKwh.toFixed(2)} kWh</strong>
                  <span className="est-cost">est. <CurrencyDisplay amount={estimate.electricity} showZero /></span>
                  <small>Jatah gratis {cycleFreeKwh} kWh untuk {allowanceMonths} bulan sewa</small>
                </div>
                {waterEnabled ? (
                  <div className="energy-summary-tile">
                    <span className="est-label">Air periode ini</span>
                    <strong>{periodUsage.waterM3.toFixed(2)} m³</strong>
                    <span className="est-cost">est. <CurrencyDisplay amount={estimate.water} showZero /></span>
                    <small>Tarif <CurrencyDisplay amount={waterTariff} />/m³</small>
                  </div>
                ) : null}
              </div>
            ) : isLoading ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /> <span className="text-muted ms-2">Memuat data meter...</span></div>
            ) : isError ? (
              <p className="text-muted">Data meter belum bisa dimuat.</p>
            ) : (
              <div className="energy-empty-state">
                <p>⏳ Menunggu pencatatan meter pertama.</p>
                <small className="text-muted">Catat meter secara berkala untuk melihat estimasi biaya. Gauge di atas akan terisi otomatis.</small>
              </div>
            )}
          </section>

          {/* Anomaly alerts */}
          <AnomalyAlert readings={readings} utilityType="ELECTRICITY" />
          <AnomalyAlert readings={readings} utilityType="WATER" />

          {/* Trend chart */}
          {trendPoints.length >= 2 ? (
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
              <div className="energy-chart-wrapper">
                <LineAreaChart
                  points={trendPoints}
                  ariaLabel={usingIotTimeline ? 'Timeline akumulasi pemakaian listrik dari sensor IoT' : 'Tren pemakaian listrik per pencatatan'}
                  valueFormatter={(v) => usingIotTimeline ? `${v} kWh terpakai` : `${v} kWh`}
                  height={220}
                />
                <div className="d-sm-none mt-2">
                  <HorizontalBarChart
                    points={trendPoints}
                    ariaLabel="Tren pemakaian listrik per pencatatan"
                    valueFormatter={(v) => `${v} kWh`}
                    height={Math.max(120, trendPoints.length * 32)}
                    leftWidth={64}
                    barSize={12}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* Projection */}
          {hasData ? (
            <section className="energy-projection-section">
              <UtilityProjection
                currentUsageKwh={periodUsage.electricityKwh}
                freeKwh={cycleFreeKwh}
                allowanceMonths={allowanceMonths}
                tariffPerKwh={elecTariff}
                estimatedCost={estimate.electricity}
              />
            </section>
          ) : null}

          {/* Cumulative total */}
          {summary ? (
            <div className="energy-cumulative">
              Total sejak masuk:{' '}
              <strong>
                <AnimatedCounter value={summary.totalElectricityKwh} duration={900} formatter={(v) => `${v.toFixed(2)} kWh`} />
              </strong>
              {waterEnabled ? <> · <strong><AnimatedCounter value={summary.totalWaterM3} duration={900} formatter={(v) => `${v.toFixed(2)} m³`} /></strong></> : null}
            </div>
          ) : null}

          <p className="energy-footer-note">
            Estimasi — nominal final dihitung admin saat siklus meter &amp; muncul di tagihan.
          </p>
        </div>
      </FeatureErrorBoundary>
  );
}
