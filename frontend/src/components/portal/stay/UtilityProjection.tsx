import CurrencyDisplay from '../../common/CurrencyDisplay';
import AnimatedCounter from '../../common/AnimatedCounter';

type UtilityProjectionProps = {
  /** Current electricity usage this period (kWh) */
  currentUsageKwh: number;
  /** Free kWh allowance for the active paid lease period */
  freeKwh: number;
  /** Number of monthly quotas included in the active paid lease period. */
  allowanceMonths?: number;
  /** Tariff per kWh (rupiah) */
  tariffPerKwh: number;
  /** Current estimated electricity cost */
  estimatedCost: number;
  /** Days elapsed in current period */
  daysElapsed?: number;
  /** Total days in period */
  daysTotal?: number;
};

/**
 * Monthly bill projection — shows current usage vs free allowance,
 * estimated bill, and extrapolated end-of-month projection.
 */
export default function UtilityProjection({
  currentUsageKwh,
  freeKwh,
  allowanceMonths = 1,
  tariffPerKwh,
  estimatedCost,
  daysElapsed,
  daysTotal,
}: UtilityProjectionProps) {
  const usagePct = freeKwh > 0 ? Math.min(Math.round((currentUsageKwh / freeKwh) * 100), 200) : 0;
  const overFree = currentUsageKwh > freeKwh;
  const overFreeKwh = overFree ? currentUsageKwh - freeKwh : 0;

  // Extrapolate to end of period
  const canProject = daysElapsed && daysTotal && daysElapsed > 0 && daysTotal > 0;
  const projectedKwh = canProject ? (currentUsageKwh / daysElapsed) * daysTotal : null;
  const projectedCost = projectedKwh != null
    ? Math.max(0, (projectedKwh - freeKwh) * tariffPerKwh)
    : null;

  return (
    <div className="utility-projection">
      <div className="utility-projection-header">
        <span className="utility-projection-title">📊 Proyeksi Tagihan</span>
      </div>

      <div className="utility-projection-body">
        <div className="utility-projection-row">
          <span>Pemakaian saat ini</span>
          <strong>
            <AnimatedCounter value={currentUsageKwh} duration={700} formatter={(v) => `${v.toFixed(1)} kWh`} />
          </strong>
        </div>

        {overFree ? (
          <div className="utility-projection-row text-danger">
            <span>Melebihi jatah gratis</span>
            <strong>
              <AnimatedCounter value={overFreeKwh} duration={700} formatter={(v) => `+${v.toFixed(1)} kWh`} />
            </strong>
          </div>
        ) : (
          <div className="utility-projection-row text-success">
            <span>Sisa jatah gratis</span>
            <strong>
              <AnimatedCounter value={freeKwh - currentUsageKwh} duration={700} formatter={(v) => `${v.toFixed(1)} kWh`} />
            </strong>
          </div>
        )}

        {/* Usage progress bar */}
        <div className="utility-projection-bar-track">
          <div
            className={`utility-projection-bar-fill ${overFree ? 'over' : ''}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
          {overFree ? (
            <div
              className="utility-projection-bar-over"
              style={{ width: `${Math.min(usagePct - 100, 100)}%` }}
            />
          ) : null}
        </div>

        <div className="utility-projection-row">
          <span>Estimasi biaya listrik</span>
          <strong>
            <CurrencyDisplay amount={estimatedCost} showZero />
          </strong>
        </div>

        {canProject && projectedCost != null ? (
          <div className="utility-projection-row utility-projection-extrapolate">
            <span>Proyeksi akhir periode</span>
            <strong>
              <CurrencyDisplay amount={projectedCost} showZero />
            </strong>
            <small>
              (jika pemakaian tetap ~{(currentUsageKwh / daysElapsed).toFixed(1)} kWh/hari × {daysTotal} hari)
            </small>
          </div>
        ) : null}

        <div className="utility-projection-rate">
          <small>
            {allowanceMonths === 1 ? <>
            Tarif: <CurrencyDisplay amount={tariffPerKwh} />/kWh · Jatah gratis {freeKwh} kWh/bulan
            </> : <>Tarif: <CurrencyDisplay amount={tariffPerKwh} />/kWh · Jatah gratis {freeKwh} kWh untuk {allowanceMonths} bulan sewa</>}
          </small>
        </div>
      </div>
    </div>
  );
}
