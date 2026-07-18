import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Spinner } from 'react-bootstrap';
import HorizontalBarChart, { type HorizontalBarPoint } from '../../charts/HorizontalBarChart';
import LineAreaChart from '../../charts/LineAreaChart';
import Sparkline from '../../charts/Sparkline';
import UsageGauge from '../../charts/UsageGauge';
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
  const stateClass = ['ONLINE', 'NO_FLOW'].includes(device.status) ? 'is-ok' : 'is-warning';
  return (
    <div className={`tenant-live-meter ${stateClass}`}>
      <div className="tenant-live-meter-head">
        <strong>{isWater ? 'Meter air' : 'Meter listrik'}</strong>
        <span>{statusLabel[device.status]}</span>
      </div>
      <div className="tenant-live-meter-value">{liveValue(device.total, device.unit)}</div>
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

  const estimate = useMemo(
    () => estimateUtilityCost({
      electricityUsageKwh: lastElecUsage,
      waterUsageM3: lastWaterUsage,
      electricityTariff: elecTariff,
      waterTariff,
      freeKwh,
      waterEnabled,
    }),
    [lastElecUsage, lastWaterUsage, elecTariff, waterTariff, freeKwh, waterEnabled],
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
              <UsageGauge
                value={lastElecUsage}
                maxValue={freeKwh}
                unit="kWh"
                label="Listrik"
                thresholds={{ warning: 50, danger: 100 }}
                size={150}
              />
              {waterEnabled ? (
                <UsageGauge
                  value={lastWaterUsage}
                  maxValue={Math.max(lastWaterUsage * 1.5, 5)}
                  unit="m³"
                  label="Air"
                  thresholds={{ warning: 70, danger: 90 }}
                  size={150}
                />
              ) : null}
            </div>

            <div className="tenant-utility-tiles">
              <div className="tenant-utility-tile">
                <span className="ut-label">Listrik periode terakhir</span>
                <div className="ut-usage-row">
                  <strong className="ut-usage">{lastElecUsage.toFixed(2)} kWh</strong>
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
                <small className="ut-note">Jatah gratis {freeKwh} kWh/bulan</small>
              </div>
              {waterEnabled ? (
                <div className="tenant-utility-tile">
                  <span className="ut-label">Air periode terakhir</span>
                  <strong className="ut-usage">{lastWaterUsage.toFixed(2)} m³</strong>
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
                currentUsageKwh={lastElecUsage}
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
