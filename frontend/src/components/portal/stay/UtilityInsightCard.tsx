import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Spinner } from 'react-bootstrap';
import { ChevronDown, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import type { HorizontalBarPoint } from '../../charts/HorizontalBarChart';
import LineAreaChart from '../../charts/LineAreaChart';
import Sparkline from '../../charts/Sparkline';
import DonutGauge from '../../charts/DonutGauge';
import { OKABE_ITO } from '../../charts/chartPalette';
import CurrencyDisplay from '../../common/CurrencyDisplay';
import { useToast } from '../../common/ToastProvider';
import { fetchPublicConfig } from '../../../api/settings';
import { iotQueryKeys, refreshMyRoomMeter } from '../../../api/iot';
import UtilityProjection from './UtilityProjection';
import AnomalyAlert from './AnomalyAlert';
import type { TenantRoomUtilityTelemetry, TenantUtilityDevice } from '../../../api/iot';
import { summarizeUsageSinceCheckIn, estimateUtilityCost, numeric } from '../../../utils/meterUsage';
import type { MeterReading, Stay } from '../../../types';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';

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

function LiveMeterTile({ device }: { device: TenantUtilityDevice }) {
  const isWater = device.utilityType === 'WATER';
  const isOnline = ['ONLINE', 'NO_FLOW'].includes(device.status);
  const qualityWarning = device.quality ? qualityLabel[device.quality] : undefined;
  const rejected = device.quality === 'REJECTED';
  const stateClass = isOnline && !qualityWarning ? 'is-ok' : 'is-warning';
  const hasLivePower = !isWater && !rejected && device.powerW != null;
  return (
    <div className={`tenant-live-meter ${stateClass}`}>
      <div className="tenant-live-meter-head">
        <strong>{isWater ? 'Meter air' : 'Meter listrik'}</strong>
        <span>{statusLabel[device.status]}{qualityWarning ? ` · ${qualityWarning}` : ''}</span>
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
      {isWater && !rejected && device.flowRateLpm != null ? <div className="tenant-live-meter-flow">Aliran saat ini: {liveValue(device.flowRateLpm, 'L/menit')}</div> : null}
      <small>{device.statusMessage}</small>
      {device.observedAt ? (
        <small className="tenant-live-meter-observed">
          Terakhir dibaca {new Date(device.observedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
        </small>
      ) : null}
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
  const { toast } = useToast();
  const [refreshCooldownSeconds, setRefreshCooldownSeconds] = useState(0);
  const publicConfig = useQuery({ queryKey: ['public-config'], queryFn: fetchPublicConfig });
  const waterEnabled = Boolean(publicConfig.data?.waterMeteringEnabled);
  const elecTariff = numeric(stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah);
  const waterTariff = numeric(stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah);
  const cycleElectricity = telemetry?.cycle?.electricity;
  const freeKwh = cycleElectricity?.freeKwh ?? 0;
  const allowanceMonths = telemetry?.cycle?.allowanceMonths ?? 1;
  const allowanceKnown = Boolean(cycleElectricity);

  const summary = useMemo(() => summarizeUsageSinceCheckIn(readings, stay.checkInDate), [readings, stay.checkInDate]);
  const hasMeterElectricityUsage = useMemo(
    () => summary.rows.filter((row) => typeof row.electricityKwh === 'number').length >= 2,
    [summary.rows],
  );
  const hasMeterWaterUsage = useMemo(
    () => summary.rows.filter((row) => typeof row.waterM3 === 'number').length >= 2,
    [summary.rows],
  );

  // Pemakaian bulan kalender berjalan (untuk gauge & estimasi biaya)
  const currentMonthUsage = useMemo(() => {
    const now = new Date();
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? '';
    const monthPrefix = `${part('year')}-${part('month')}`;
    const monthRows = summary.rows.filter((r) => r.dateKey.startsWith(monthPrefix));
    const hasWaterData = hasMeterWaterUsage && monthRows.some((row) => typeof row.waterM3 === 'number');
    const waterSum = monthRows.reduce((s, r) => s + (r.usageWaterM3 ?? 0), 0);
    return { waterM3: hasWaterData ? waterSum : 0, hasWaterData };
  }, [hasMeterWaterUsage, summary.rows]);

  const gaugeElecUsage = cycleElectricity?.usageKwh ?? 0;
  const gaugeWaterUsage = currentMonthUsage.waterM3 > 0
    ? currentMonthUsage.waterM3
    : 0;
  const isIotFallback = telemetry?.cycle?.source === 'IOT_TELEMETRY';
  const showWaterSensor = waterEnabled || Boolean(telemetry && telemetry.water.status !== 'NO_DEVICE');

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
  const electricityEstimate = cycleElectricity?.estimatedChargeRupiah ?? null;
  const canonicalElecTariff = cycleElectricity ? cycleElectricity.tariffRupiah : elecTariff;
  const remainingFreeKwh = Math.max(0, freeKwh - gaugeElecUsage);
  const excessKwh = Math.max(0, gaugeElecUsage - freeKwh);

  const periodLabel = useMemo(() => {
    if (!telemetry?.cycle) return 'Periode berjalan';
    const format = (value: string) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
    return `${format(telemetry.cycle.start)} – ${format(telemetry.cycle.end)}`;
  }, [telemetry?.cycle]);

  const sourceMeta = useMemo(() => {
    if (!telemetry?.cycle) {
      if (isTelemetryLoading) return { label: 'Menyiapkan snapshot', detail: 'Mengambil periode resmi dari server', tone: 'empty' };
      if (isTelemetryError) return { label: 'Snapshot belum tersedia', detail: 'Riwayat lokal tidak digunakan untuk menebak tagihan', tone: 'review' };
      return { label: 'Menunggu snapshot', detail: hasMeterElectricityUsage ? 'Catatan lokal tersedia, tetapi periode belum dapat diverifikasi' : 'Belum ada sumber pemakaian periode', tone: hasMeterElectricityUsage ? 'review' : 'empty' };
    }
    const source = telemetry.cycle.source;
    if (source === 'METER_READING' && cycleElectricity?.billingReady !== false) return { label: 'Catatan meter resmi', detail: 'Siap untuk perhitungan tagihan', tone: 'official' };
    if (source === 'METER_READING') return { label: 'Catatan perlu diperiksa', detail: 'Baseline atau catatan terbaru belum lengkap', tone: 'review' };
    if (source === 'IOT_TELEMETRY') return { label: 'Perkiraan sensor', detail: 'Belum menjadi dasar tagihan', tone: 'sensor' };
    return { label: 'Menunggu pencatatan', detail: 'Belum ada sumber pemakaian periode', tone: 'empty' };
  }, [cycleElectricity?.billingReady, hasMeterElectricityUsage, isTelemetryError, isTelemetryLoading, telemetry?.cycle]);

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

  const hasUsage = cycleElectricity?.usageKwh != null;

  // Manual refresh mutation
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    mutationFn: refreshMyRoomMeter,
    onSuccess: async (result) => {
      if (result.total > 0) setRefreshCooldownSeconds(120);
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

  useEffect(() => {
    if (refreshCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRefreshCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [refreshCooldownSeconds > 0]);

  return (
    <Card className="tenant-utility-insight border-0">
      <Card.Body>
        <header className="tenant-utility-heading">
          <div><div className="command-eyebrow">Konsumsi listrik &amp; air</div><h3 className="tenant-utility-insight-title">Ringkasan periode berjalan</h3></div>
          <div className="tenant-utility-context">
            <span>{periodLabel}</span>
            <span className={`tenant-utility-source is-${sourceMeta.tone}`} title={sourceMeta.detail}>{sourceMeta.label}</span>
          </div>
        </header>

        {(isLoading || isTelemetryLoading) && !hasUsage ? (
          <div className="tenant-utility-skeleton" role="status"><Spinner animation="border" size="sm" /><span>Menyiapkan ringkasan pemakaian…</span></div>
        ) : (isError || isTelemetryError) && !hasUsage ? (
          <div className="tenant-utility-message is-error"><strong>Snapshot periode belum bisa dimuat</strong><span>Catatan meter tetap aman dan tidak dihitung ulang di perangkat ini. Muat ulang halaman untuk mencoba kembali.</span></div>
        ) : !hasUsage ? (
          <div className="tenant-utility-empty">
            <p>Belum ada pemakaian periode yang dapat dihitung.</p>
            <span>Catat angka awal dan terbaru agar pemakaian serta estimasi biaya muncul.</span>
            <Button size="sm" variant="outline-primary" disabled={!canRecord} onClick={onCatatMeter} aria-describedby={!canRecord ? 'meter-window-help' : undefined}>Catat meter</Button>
            {!canRecord ? <small id="meter-window-help">Pencatatan mandiri tersedia mulai H-10 sebelum kontrak berakhir.</small> : null}
          </div>
        ) : (
          <section className="tenant-utility-period-card" aria-label={`Pemakaian ${periodLabel}`}>
            <div className={`tenant-utility-period-body${freeKwh > 0 ? '' : ' no-gauge'}`}>
              {allowanceKnown && freeKwh > 0 ? (
                <DonutGauge
                  value={gaugeElecUsage}
                  max={freeKwh}
                  center={<><strong>{Math.min(Math.round((gaugeElecUsage / freeKwh) * 100), 999)}%</strong><small>dari jatah</small></>}
                  ariaLabel={`Pemakaian listrik ${gaugeElecUsage} dari ${freeKwh} kWh`}
                  size={132}
                  innerRadius={43}
                  outerRadius={62}
                  color={gaugeElecUsage > freeKwh ? '#dc2626' : gaugeElecUsage / freeKwh > 0.5 ? '#f59e0b' : '#16a34a'}
                />
              ) : null}
              <div className="tenant-utility-primary-reading">
                <span>Listrik terpakai</span>
                <div className="ut-usage-row">
                  <strong>{gaugeElecUsage.toFixed(2)} kWh</strong>
                  {trendPoints.length >= 2 ? <Sparkline points={trendPoints} ariaLabel="Tren listrik mini" width={72} height={22} strokeColor={OKABE_ITO.blue} /> : null}
                </div>
                <small>{allowanceKnown ? freeKwh > 0 ? `Jatah ${freeKwh} kWh untuk ${allowanceMonths} bulan sewa` : `Tarif ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(canonicalElecTariff)}/kWh` : 'Menyiapkan informasi jatah listrik…'}</small>
              </div>
            </div>
            <div className="tenant-utility-facts">
              <div><span>{allowanceKnown ? excessKwh > 0 ? 'Melebihi jatah' : 'Sisa jatah' : 'Jatah listrik'}</span><strong>{allowanceKnown ? `${(excessKwh > 0 ? excessKwh : remainingFreeKwh).toFixed(2)} kWh` : '—'}</strong></div>
              <div><span>Estimasi listrik</span><strong>{electricityEstimate == null ? '—' : <CurrencyDisplay amount={electricityEstimate} showZero />}</strong><small>{electricityEstimate == null ? 'Ditahan sampai sumber dan baseline valid' : sourceMeta.tone === 'official' ? 'Berdasar catatan meter' : 'Belum menjadi nominal final'}</small></div>
              {waterEnabled ? <div><span>Air bulan berjalan</span><strong>{isLoading ? '…' : isError || !currentMonthUsage.hasWaterData ? '—' : `${gaugeWaterUsage.toFixed(2)} m³`}</strong><small>{isLoading ? 'Memuat catatan air…' : isError ? 'Riwayat air belum dapat dimuat' : currentMonthUsage.hasWaterData ? <>Est. <CurrencyDisplay amount={estimate.water} showZero /></> : 'Belum cukup catatan air bulan ini'}</small></div> : null}
            </div>
          </section>
        )}

        {telemetry?.cycle?.electricity?.resetDetected ? <div className="tenant-utility-message is-warning"><strong>Perubahan angka meter terdeteksi</strong><span>Pengelola perlu memeriksa baseline sebelum angka digunakan untuk tagihan.</span></div> : null}
        {isIotFallback ? <div className="ut-iot-notice"><ShieldCheck size={16} aria-hidden="true" /><div><strong>Angka periode sementara berasal dari sensor</strong><span>Gunakan sebagai pemantauan. Tagihan resmi tetap menunggu catatan meter yang ditinjau pengelola.</span></div></div> : null}

        <AnomalyAlert readings={readings} utilityType="ELECTRICITY" />
        <AnomalyAlert readings={readings} utilityType="WATER" />

        <details className="tenant-monitoring-disclosure">
          <summary>
            <span className="tenant-monitoring-icon" aria-hidden="true"><Radio size={18} /></span>
            <span className="tenant-monitoring-copy"><strong>Pemantauan otomatis</strong><small>Tidak digunakan langsung untuk tagihan</small></span>
            <span className="tenant-monitoring-status">{isTelemetryLoading ? 'Memeriksa sensor…' : telemetry ? `${statusLabel[telemetry.electricity.status]}${showWaterSensor ? ` · Air ${statusLabel[telemetry.water.status]}` : ''}` : 'Status belum tersedia'}</span>
            <ChevronDown className="tenant-monitoring-chevron" size={18} aria-hidden="true" />
          </summary>
          <div className="tenant-live-meter-panel" aria-live="polite" aria-busy={isTelemetryLoading}>
            <div className="tenant-live-meter-panel-head">
              <div><strong>Status sensor terbaru</strong><span>{telemetry?.refreshedAt ? `Diperbarui ${new Date(telemetry.refreshedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : 'Pembaruan diperiksa otomatis setiap menit'}</span></div>
              <Button size="sm" variant="outline-secondary" className="btn-refresh-meter" disabled={refreshMutation.isPending || refreshCooldownSeconds > 0} onClick={() => refreshMutation.mutate()} aria-label={refreshCooldownSeconds > 0 ? `Tunggu ${refreshCooldownSeconds} detik sebelum menyegarkan kembali` : 'Segarkan status sensor'}>
                {refreshMutation.isPending ? <><Spinner animation="border" size="sm" /> Menyegarkan…</> : <><RefreshCw size={15} aria-hidden="true" /> {refreshCooldownSeconds > 0 ? `Tunggu ${refreshCooldownSeconds} dtk` : 'Segarkan'}</>}
              </Button>
            </div>
            {isTelemetryLoading ? <div className="tenant-live-meter-loading"><Spinner animation="border" size="sm" /> Memuat status sensor…</div>
              : isTelemetryError ? <p className="tenant-live-meter-error">Pemantauan otomatis sedang tidak tersedia. Catatan dan tagihan resmi tidak terpengaruh.</p>
                : telemetry ? <><div className="tenant-live-meter-grid"><LiveMeterTile device={telemetry.electricity} />{showWaterSensor ? <LiveMeterTile device={telemetry.water} /> : null}</div><p className="tenant-live-meter-notice">{telemetry.billingNotice}</p></>
                  : <p className="tenant-live-meter-error">Belum ada sensor yang terhubung ke kamar ini.</p>}
          </div>
        </details>

        {hasUsage && trendPoints.length >= 2 ? <div className="tenant-utility-trend"><div className="ut-trend-head">Tren listrik berdasarkan pencatatan</div><LineAreaChart points={trendPoints} ariaLabel="Tren pemakaian listrik per pencatatan" valueFormatter={(v) => `${v} kWh`} height={180} /></div> : null}

        {hasUsage ? <>
          {allowanceKnown && electricityEstimate != null ? <div className="mt-3"><UtilityProjection currentUsageKwh={gaugeElecUsage} freeKwh={freeKwh} allowanceMonths={allowanceMonths} tariffPerKwh={canonicalElecTariff} estimatedCost={electricityEstimate} /></div> : null}
          {isLoading ? (
            <div className="tenant-utility-total" role="status">Menyiapkan total catatan sejak masuk…</div>
          ) : isError ? (
            <div className="tenant-utility-total">Total catatan sejak masuk belum dapat dimuat.</div>
          ) : hasMeterElectricityUsage || (waterEnabled && hasMeterWaterUsage) ? (
            <div className="tenant-utility-total">Total catatan sejak masuk: {hasMeterElectricityUsage ? <strong>{summary.totalElectricityKwh.toFixed(2)} kWh</strong> : null}{hasMeterElectricityUsage && waterEnabled && hasMeterWaterUsage ? ' · ' : null}{waterEnabled && hasMeterWaterUsage ? <strong>{summary.totalWaterM3.toFixed(2)} m³</strong> : null}</div>
          ) : (
            <div className="tenant-utility-total">Belum cukup catatan manual untuk menghitung total sejak masuk.</div>
          )}
          <p className="tenant-utility-final-note">Estimasi bukan tagihan final. Nominal resmi muncul setelah catatan meter ditinjau pengelola.</p>
        </> : null}
      </Card.Body>
    </Card>
  );
}
