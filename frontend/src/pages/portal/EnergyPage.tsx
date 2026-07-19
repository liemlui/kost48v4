import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Spinner } from 'react-bootstrap';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import LineAreaChart from '../../components/charts/LineAreaChart';
import UsageGauge from '../../components/charts/UsageGauge';
import HorizontalBarChart, { type HorizontalBarPoint } from '../../components/charts/HorizontalBarChart';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { OKABE_ITO } from '../../components/charts/chartPalette';
import WaterFlowIndicator from '../../components/portal/stay/WaterFlowIndicator';
import UtilityProjection from '../../components/portal/stay/UtilityProjection';
import AnomalyAlert from '../../components/portal/stay/AnomalyAlert';
import { getMyRoomUtilityTelemetry, type TenantRoomUtilityTelemetry, type TenantUtilityDevice } from '../../api/iot';
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

  useIotTelemetrySse(Boolean(stay?.roomId));

  const readings: MeterReading[] = meterReadingsQuery.data ?? [];
  const telemetry = utilityTelemetryQuery.data;

  // Derived data
  const summary = useMemo(() => {
    if (!stay?.checkInDate || readings.length === 0) return null;
    return summarizeUsageSinceCheckIn(readings, stay.checkInDate);
  }, [readings, stay?.checkInDate]);

  const currentMonthUsage = useMemo(() => {
    if (!summary) return { electricityKwh: 0, waterM3: 0, isPartialMonth: true };
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRows = summary.rows.filter((r) => r.dateKey.startsWith(monthPrefix));
    if (monthRows.length === 0) {
      const last = summary.latestRow;
      return { electricityKwh: last?.usageElectricityKwh ?? 0, waterM3: last?.usageWaterM3 ?? 0, isPartialMonth: true };
    }
    const elecSum = monthRows.reduce((s, r) => s + (r.usageElectricityKwh ?? 0), 0);
    const waterSum = monthRows.reduce((s, r) => s + (r.usageWaterM3 ?? 0), 0);
    const isPartial = (stay?.checkInDate && stay.checkInDate.startsWith(monthPrefix)) || now.getDate() < 25;
    return { electricityKwh: elecSum, waterM3: waterSum, isPartialMonth: isPartial };
  }, [summary, stay?.checkInDate]);

  const estimate = useMemo(() => estimateUtilityCost({
    electricityUsageKwh: currentMonthUsage.electricityKwh,
    waterUsageM3: currentMonthUsage.waterM3,
    electricityTariff: elecTariff,
    waterTariff,
    freeKwh,
    waterEnabled,
  }), [currentMonthUsage, elecTariff, waterTariff, freeKwh, waterEnabled]);

  const trendPoints: HorizontalBarPoint[] = useMemo(() => {
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
  }, [summary]);

  const hasUsage = summary && summary.rows.length > 1;
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

          {/* Gauges */}
          {hasUsage ? (
            <section className="energy-gauge-section">
              <h2 className="energy-section-title">
                Pemakaian Bulan Ini{currentMonthUsage.isPartialMonth ? ' (parsial)' : ''}
              </h2>
              <div className="energy-gauge-row">
                <UsageGauge
                  value={currentMonthUsage.electricityKwh}
                  maxValue={freeKwh}
                  unit="kWh"
                  label={currentMonthUsage.isPartialMonth ? 'Listrik (parsial)' : 'Listrik'}
                  thresholds={{ warning: 50, danger: 100 }}
                  size={200}
                />
                {waterEnabled ? (
                  <UsageGauge
                    value={currentMonthUsage.waterM3}
                    maxValue={Math.max(currentMonthUsage.waterM3 * 1.5, 5)}
                    unit="m³"
                    label="Air"
                    thresholds={{ warning: 70, danger: 90 }}
                    size={200}
                  />
                ) : null}
              </div>

              {/* Summary tiles */}
              <div className="energy-summary-tiles">
                <div className="energy-summary-tile">
                  <span className="est-label">Listrik bulan ini</span>
                  <strong>{currentMonthUsage.electricityKwh.toFixed(2)} kWh</strong>
                  <span className="est-cost">est. <CurrencyDisplay amount={estimate.electricity} showZero /></span>
                  <small>Jatah gratis {freeKwh} kWh/bulan</small>
                </div>
                {waterEnabled ? (
                  <div className="energy-summary-tile">
                    <span className="est-label">Air bulan ini</span>
                    <strong>{currentMonthUsage.waterM3.toFixed(2)} m³</strong>
                    <span className="est-cost">est. <CurrencyDisplay amount={estimate.water} showZero /></span>
                    <small>Tarif <CurrencyDisplay amount={waterTariff} />/m³</small>
                  </div>
                ) : null}
              </div>
            </section>
          ) : isLoading ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
          ) : isError ? (
            <p className="text-muted">Data meter belum bisa dimuat.</p>
          ) : (
            <div className="energy-empty">
              <p>Belum ada pemakaian tercatat. Catat meter secara berkala untuk melihat estimasi.</p>
            </div>
          )}

          {/* Anomaly alerts */}
          <AnomalyAlert readings={readings} utilityType="ELECTRICITY" />
          <AnomalyAlert readings={readings} utilityType="WATER" />

          {/* Trend chart */}
          {trendPoints.length >= 2 ? (
            <section className="energy-trend-section">
              <h2 className="energy-section-title">Tren Pemakaian Listrik (kWh)</h2>
              <div className="energy-chart-wrapper">
                <LineAreaChart
                  points={trendPoints}
                  ariaLabel="Tren pemakaian listrik per pencatatan"
                  valueFormatter={(v) => `${v} kWh`}
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
          {hasUsage ? (
            <section className="energy-projection-section">
              <UtilityProjection
                currentUsageKwh={currentMonthUsage.electricityKwh}
                freeKwh={freeKwh}
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
