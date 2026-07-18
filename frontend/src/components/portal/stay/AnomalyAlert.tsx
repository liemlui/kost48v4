import { useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import type { MeterReading } from '../../../types';

type AnomalyAlertProps = {
  readings: MeterReading[];
  utilityType: 'ELECTRICITY' | 'WATER';
  threshold?: number;
};

/**
 * Detects unusual spikes in utility usage by comparing the latest reading
 * against the average of the previous readings.
 * Shows a warning alert if the latest usage is anomalously high.
 */
export default function AnomalyAlert({
  readings,
  utilityType,
  threshold = 2.0,
}: AnomalyAlertProps) {
  const anomaly = useMemo(() => {
    if (readings.length < 3) return null;

    // Extract usage values (most recent first)
    const usages = readings
      .map((r) => {
        const val = utilityType === 'ELECTRICITY' ? r.usageElectricityKwh : r.usageWaterM3;
        return val != null ? Number(val) : null;
      })
      .filter((v): v is number => v !== null && v > 0);

    if (usages.length < 3) return null;

    const latest = usages[0];
    const historical = usages.slice(1); // previous readings
    const avg = historical.reduce((s, v) => s + v, 0) / historical.length;

    if (avg <= 0) return null;

    const ratio = latest / avg;

    if (ratio < threshold) return null;

    return {
      latest,
      avg,
      ratio,
      unit: utilityType === 'ELECTRICITY' ? 'kWh' : 'm³',
      label: utilityType === 'ELECTRICITY' ? 'listrik' : 'air',
    };
  }, [readings, utilityType, threshold]);

  if (!anomaly) return null;

  const multiplierText = anomaly.ratio >= 2 ? `${anomaly.ratio.toFixed(1)}×` : 'lebih tinggi';

  return (
    <Alert variant="warning" className="utility-anomaly-alert d-flex align-items-start gap-2 py-2 small">
      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
      <div>
        <strong>Pemakaian {anomaly.label} tidak biasa</strong>
        <div className="mt-1">
          Pemakaian terbaru <strong>{anomaly.latest.toFixed(2)} {anomaly.unit}</strong> —{' '}
          {multiplierText} dari rata-rata periode sebelumnya ({anomaly.avg.toFixed(2)} {anomaly.unit}).
          {utilityType === 'WATER' ? ' Mungkin ada kebocoran?' : ' Cek perangkat elektronik yang menyala.'}
        </div>
      </div>
    </Alert>
  );
}
