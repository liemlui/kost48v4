import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Spinner } from 'react-bootstrap';
import HorizontalBarChart, { type HorizontalBarPoint } from '../../charts/HorizontalBarChart';
import { OKABE_ITO } from '../../charts/chartPalette';
import CurrencyDisplay from '../../common/CurrencyDisplay';
import { fetchOperationalSettings } from '../../../api/settings';
import { summarizeUsageSinceCheckIn, estimateUtilityCost, numeric } from '../../../utils/meterUsage';
import type { MeterReading, Stay } from '../../../types';

export default function UtilityInsightCard({
  stay,
  readings,
  isLoading,
  isError,
  canRecord,
  onCatatMeter,
}: {
  stay: Stay;
  readings: MeterReading[];
  isLoading: boolean;
  isError: boolean;
  canRecord: boolean;
  onCatatMeter: () => void;
}) {
  const settings = useQuery({ queryKey: ['operational-settings'], queryFn: fetchOperationalSettings });
  const freeKwh = settings.data?.freeElectricityKwhPerMonth ?? 30;
  const waterEnabled = Boolean(settings.data?.waterMeteringEnabled);
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

  return (
    <Card className="tenant-utility-insight border-0">
      <Card.Body>
        <div className="command-eyebrow">Konsumsi Listrik &amp; Air</div>
        <h3 className="tenant-utility-insight-title">Pemakaian &amp; estimasi biaya</h3>

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
            <div className="tenant-utility-tiles">
              <div className="tenant-utility-tile">
                <span className="ut-label">Listrik periode terakhir</span>
                <strong className="ut-usage">{lastElecUsage.toFixed(2)} kWh</strong>
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
                <HorizontalBarChart
                  points={trendPoints}
                  ariaLabel="Tren pemakaian listrik per pencatatan"
                  valueFormatter={(v) => `${v} kWh`}
                  height={Math.max(140, trendPoints.length * 34)}
                  leftWidth={64}
                  barSize={14}
                />
              </div>
            ) : null}

            <div className="tenant-utility-total">
              Total sejak masuk: <strong>{summary.totalElectricityKwh.toFixed(2)} kWh</strong>
              {waterEnabled ? <> · <strong>{summary.totalWaterM3.toFixed(2)} m³</strong></> : null}
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
