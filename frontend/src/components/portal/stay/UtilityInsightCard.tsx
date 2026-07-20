import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Spinner } from 'react-bootstrap';
import HorizontalBarChart, { type HorizontalBarPoint } from '../../charts/HorizontalBarChart';
import LineAreaChart from '../../charts/LineAreaChart';
import Sparkline from '../../charts/Sparkline';
import UsageGauge from '../../charts/UsageGauge';
import DonutGauge from '../../charts/DonutGauge';
import { OKABE_ITO } from '../../charts/chartPalette';
import CurrencyDisplay from '../../common/CurrencyDisplay';
import AnimatedCounter from '../../common/AnimatedCounter';
import { fetchPublicConfig } from '../../../api/settings';
import { refreshMyRoomMeter } from '../../../api/iot';
import WaterFlowIndicator from './WaterFlowIndicator';
import UtilityProjection from './UtilityProjection';
import AnomalyAlert from './AnomalyAlert';
import type { TenantRoomUtilityTelemetry, TenantUtilityDevice } from '../../../api/iot';
import { summarizeUsageSinceCheckIn, estimateUtilityCost, numeric } from '../../../utils/meterUsage';
import type { MeterReading, Stay } from '../../../types';

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

function LiveMeterTile({ device }: { device: TenantUtilityDevice }) {
  const isWater = device.utilityType === 'WATER';
  const isOnline = ['ONLINE', 'NO_FLOW'].includes(device.status);
  const stateClass = isOnline ? 'is-ok' : 'is-warning';
  const hasLivePower = !isWater && device.powerW != null;
  return (
    <div className={`tenant-live-meter ${stateClass}`}>
      <div className="tenant-live-meter-head">
        <strong>{isWater ? 'Meter air' : 'Meter listrik'}</strong>
        <span>{statusLabel[device.status]}</span>
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
      {isWater && device.flowRateLpm != null ? <div className="tenant-live-meter-flow">Aliran saat ini: {liveValue(device.flowRateLpm, 'L/menit')}</div> : null}
      <small>{device.statusMessage}</small>
    </div>
  );
}

export default function UtilityInsightCard({
  stay,
  readings,
  isLoading,
  isError,
  telemetry,
  isTelemetryLoading,
  isTelemetryError,
  canRecord,
  onCatatMeter,
}: {
  stay: Stay;
  readings: MeterReading[];
  isLoading: boolean;
  isError: boolean;
  telemetry?: TenantRoomUtilityTelemetry;
  isTelemetryLoading: boolean;
  isTelemetryError: boolean;
  canRecord: boolean;
  onCatatMeter: () => void;
}) {
  const publicConfig = useQuery({ queryKey: ['public-config'], queryFn: fetchPublicConfig });
  const freeKwh = publicConfig.data?.freeElectricityKwhPerMonth ?? 30;
  const waterEnabled = Boolean(publicConfig.data?.waterMeteringEnabled);
  const elecTariff = numeric(stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah);
  const waterTariff = numeric(stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah);

  const summary = useMemo(() => summarizeUsageSinceCheckIn(readings, stay.checkInDate), [readings, stay.checkInDate]);
  const lastElecUsage = summary.latestRow?.usageElectricityKwh ?? 0;
  const lastWaterUsage = summary.latestRow?.usageWaterM3 ?? 0;

  // Pemakaian bulan kalender berjalan (untuk gauge & estimasi biaya)
  const currentMonthUsage = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRows = summary.rows.filter((r) => r.dateKey.startsWith(monthPrefix));
    if (monthRows.length === 0) {
      // Belum ada pencatatan bulan ini — fallback ke periode terakhir
      return { electricityKwh: lastElecUsage, waterM3: lastWaterUsage, isPartialMonth: true };
    }
    const elecSum = monthRows.reduce((s, r) => s + (r.usageElectricityKwh ?? 0), 0);
    const waterSum = monthRows.reduce((s, r) => s + (r.usageWaterM3 ?? 0), 0);
    // Parsial jika tenant masuk pertengahan bulan atau bulan belum berakhir
    const isPartial = (stay.checkInDate && stay.checkInDate.startsWith(monthPrefix)) || now.getDate() < 25;
    return { electricityKwh: elecSum, waterM3: waterSum, isPartialMonth: isPartial };
  }, [summary.rows, stay.checkInDate, lastElecUsage, lastWaterUsage]);

  const gaugeElecUsage = currentMonthUsage.electricityKwh > 0
    ? currentMonthUsage.electricityKwh
    : Number(telemetry?.electricity?.total ?? 0);
  const gaugeWaterUsage = currentMonthUsage.waterM3 > 0
    ? currentMonthUsage.waterM3
    : Number(telemetry?.water?.total ?? 0);
  const isIotFallback = currentMonthUsage.electricityKwh === 0 && gaugeElecUsage > 0;

  const estimate = useMemo(
    () => estimateUtilityCost({
      electricityUsageKwh: gaugeElecUsage,
      waterUsageM3: gaugeWaterUsage,
      electricityTariff: elecTariff,
      waterTariff,
      freeKwh,
      waterEnabled,
    }),
    [gaugeElecUsage, gaugeWaterUsage, elecTariff, waterTariff, freeKwh, waterEnabled],
  );

  const trendPoints: HorizontalBarPoint[] = useMemo(
    () => summary.rows
      .filter((r) => (r.usageElectricityKwh ?? 0) > 0)
      .slice(-6)
      .map((r) => ({
        label: r.dateKey.slice(5),
        value: Number((r.usageElectricityKwh ?? 0).toFixed(2)),
        detail: `${(r.usageElectricityKwh ?? 0).toFixed(2)} kWh`,
        color: OKABE_ITO.blue,
      })),
    [summary.rows],
  );

  const hasUsage = summary.rows.length > 1;

  // Manual refresh mutation
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    mutationFn: refreshMyRoomMeter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-utility-telemetry'] });
      queryClient.invalidateQueries({ queryKey: ['portal-meter-readings'] });
    },
  });

  return (
    <Card className="tenant-utility-insight border-0">
      <Card.Body>
        <div className="command-eyebrow">Konsumsi Listrik &amp; Air</div>
        <h3 className="tenant-utility-insight-title">Pemakaian &amp; estimasi biaya</h3>

        <section className="tenant-live-meter-panel" aria-live="polite" aria-label="Status meter otomatis">
          <div className="tenant-live-meter-panel-head">
            <strong>Status meter otomatis</strong>
            <div className="d-flex align-items-center gap-2">
              <span>Pembaruan dicek tiap menit</span>
              <Button
                size="sm"
                variant="outline-secondary"
                className="btn-refresh-meter"
                disabled={refreshMutation.isPending}
                onClick={() => refreshMutation.mutate()}
                title="Sinkronkan data terbaru dari meteran (maks 1× per 2 menit)"
              >
                {refreshMutation.isPending ? (
                  <><Spinner animation="border" size="sm" className="me-1" /> Menyegarkan…</>
                ) : (
                  <>🔄 Segarkan</>
                )}
              </Button>
            </div>
          </div>
          {isTelemetryLoading ? (
            <div className="tenant-live-meter-loading"><Spinner animation="border" size="sm" /> Memuat status meter…</div>
          ) : isTelemetryError ? (
            <p className="tenant-live-meter-error">Status meter otomatis belum tersedia. Pembacaan tagihan tidak terpengaruh.</p>
          ) : telemetry ? (
            <>
              <div className="tenant-live-meter-grid">
                <LiveMeterTile device={telemetry.electricity} />
                <LiveMeterTile device={telemetry.water} />
              </div>
              {telemetry.water.status !== 'NO_DEVICE' ? (
                <WaterFlowIndicator
                  flowRateLpm={telemetry.water.flowRateLpm}
                  totalM3={telemetry.water.total}
                  status={telemetry.water.status}
                  statusMessage={telemetry.water.statusMessage}
                />
              ) : null}
              <p className="tenant-live-meter-notice">{telemetry.billingNotice}</p>
            </>
          ) : null}
        </section>

        {/* Anomaly detection alerts */}
        <AnomalyAlert readings={readings} utilityType="ELECTRICITY" />
        <AnomalyAlert readings={readings} utilityType="WATER" />

        {isLoading ? (
          <div className="py-4 text-center"><Spinner animation="border" size="sm" /></div>
        ) : isError ? (
          <p className="text-muted small mb-0">Status meter belum bisa dimuat. Coba muat ulang halaman.</p>
        ) : !hasUsage ? (
          <div className="tenant-utility-empty">
            <p className="text-muted small mb-2">
              Belum ada pemakaian tercatat untuk periode ini. Catat angka meter agar estimasi biaya muncul.
            </p>
            <Button size="sm" variant="outline-primary" disabled={!canRecord} onClick={onCatatMeter}
              title={canRecord ? undefined : 'Pencatatan meter dibuka H-10 sebelum akhir kontrak'}>
              Catat Meter
            </Button>
          </div>
        ) : (
          <>
            {/* Live electricity usage gauge */}
            <div className="tenant-utility-gauge-row">
              <DonutGauge
                value={gaugeElecUsage}
                max={freeKwh}
                center={<><strong>{Math.min(Math.round((gaugeElecUsage / freeKwh) * 100), 999)}%</strong><small>dari {freeKwh} kWh</small></>}
                ariaLabel={`Pemakaian listrik ${gaugeElecUsage} dari ${freeKwh} kWh`}
                size={140}
                color={gaugeElecUsage > freeKwh ? '#dc2626' : gaugeElecUsage / freeKwh > 0.5 ? '#f59e0b' : '#16a34a'}
              />
              <UsageGauge
                value={gaugeElecUsage}
                maxValue={freeKwh}
                unit="kWh"
                label={currentMonthUsage.isPartialMonth ? 'Listrik (parsial)' : 'Listrik'}
                thresholds={{ warning: 50, danger: 100 }}
                size={150}
              />
              {waterEnabled ? (
                <UsageGauge
                  value={gaugeWaterUsage}
                  maxValue={Math.max(gaugeWaterUsage * 1.5, 5)}
                  unit="m³"
                  label="Air"
                  thresholds={{ warning: 70, danger: 90 }}
                  size={150}
                />
              ) : null}
            </div>

            <div className="tenant-utility-tiles">
              <div className="tenant-utility-tile">
                <span className="ut-label">Listrik bulan ini</span>
                <div className="ut-usage-row">
                  <strong className="ut-usage">{gaugeElecUsage.toFixed(2)} kWh</strong>
                  {trendPoints.length >= 2 ? (
                    <Sparkline
                      points={trendPoints}
                      ariaLabel="Tren listrik mini"
                      width={72}
                      height={22}
                      strokeColor={OKABE_ITO.blue}
                    />
                  ) : null}
                </div>
                <span className="ut-cost">est. <CurrencyDisplay amount={estimate.electricity} showZero /></span>
                <small className="ut-note">Jatah gratis {freeKwh} kWh/bulan{currentMonthUsage.isPartialMonth ? ' · parsial' : ''}</small>
              </div>
              {waterEnabled ? (
                <div className="tenant-utility-tile">
                  <span className="ut-label">Air bulan ini</span>
                  <strong className="ut-usage">{gaugeWaterUsage.toFixed(2)} m³</strong>
                  <span className="ut-cost">est. <CurrencyDisplay amount={estimate.water} showZero /></span>
                  <small className="ut-note">Tarif <CurrencyDisplay amount={waterTariff} />/m³</small>
                </div>
              ) : (
                <div className="tenant-utility-tile">
                  <span className="ut-label">Air</span>
                  <strong className="ut-usage">—</strong>
                  <small className="ut-note">Tagihan air belum diaktifkan pengelola</small>
                </div>
              )}
            </div>

            {isIotFallback ? (
              <div className="ut-iot-notice">📡 Data sensor IoT — bukan dasar tagihan</div>
            ) : null}

            {trendPoints.length >= 2 ? (
              <div className="tenant-utility-trend">
                <div className="ut-trend-head">Tren pemakaian listrik (kWh)</div>
                <LineAreaChart
                  points={trendPoints}
                  ariaLabel="Tren pemakaian listrik per pencatatan"
                  valueFormatter={(v) => `${v} kWh`}
                  height={180}
                />
                {/* Mobile: fallback ke bar chart ringkas */}
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
            ) : null}

            <div className="mt-3">
              <UtilityProjection
                currentUsageKwh={gaugeElecUsage}
                freeKwh={freeKwh}
                tariffPerKwh={elecTariff}
                estimatedCost={estimate.electricity}
              />
            </div>

            <div className="tenant-utility-total">
              Total sejak masuk:{' '}
              <strong>
                <AnimatedCounter value={summary.totalElectricityKwh} duration={900} formatter={(v) => `${v.toFixed(2)} kWh`} />
              </strong>
              {waterEnabled ? <> · <strong><AnimatedCounter value={summary.totalWaterM3} duration={900} formatter={(v) => `${v.toFixed(2)} m³`} /></strong></> : null}
            </div>
            <p className="text-muted small mb-0 mt-2">
              Estimasi — nominal final dihitung admin saat siklus meter &amp; muncul di tagihan.
            </p>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
