import CurrencyDisplay from '../../common/CurrencyDisplay';

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
 * Period cost estimate — shows the canonical usage snapshot vs free allowance,
 * estimated bill, and (when dates are supplied) an end-of-period projection.
 * Billing values are intentionally static: animating between stale and refreshed
 * values can briefly display a contradictory cost/usage combination.
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
  const hasAllowance = freeKwh > 0;
  const usagePct = hasAllowance ? Math.min(Math.round((currentUsageKwh / freeKwh) * 100), 200) : 0;
  const overFree = hasAllowance && currentUsageKwh > freeKwh;
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
        <span className="utility-projection-title">📊 Estimasi biaya periode</span>
      </div>

      <div className="utility-projection-body">
        <div className="utility-projection-row">
          <span>Pemakaian saat ini</span>
          <strong>{currentUsageKwh.toFixed(1)} kWh</strong>
        </div>

        {!hasAllowance ? (
          <div className="utility-projection-row">
            <span>Skema listrik</span>
            <strong>Tanpa jatah gratis</strong>
          </div>
        ) : overFree ? (
          <div className="utility-projection-row text-danger">
            <span>Melebihi jatah gratis</span>
            <strong>+{overFreeKwh.toFixed(1)} kWh</strong>
          </div>
        ) : (
          <div className="utility-projection-row text-success">
            <span>Sisa jatah gratis</span>
            <strong>{(freeKwh - currentUsageKwh).toFixed(1)} kWh</strong>
          </div>
        )}

        {/* Progress terhadap jatah hanya bermakna ketika jatah lebih dari nol. */}
        {hasAllowance ? <div
          className="utility-projection-bar-track"
          role="progressbar"
          aria-label="Pemakaian terhadap jatah listrik"
          aria-valuemin={0}
          aria-valuemax={Math.max(freeKwh, 1)}
          aria-valuenow={Math.min(currentUsageKwh, Math.max(freeKwh, 1))}
          aria-valuetext={`${currentUsageKwh.toFixed(1)} kWh terpakai dari jatah ${freeKwh.toFixed(1)} kWh`}
        >
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
        </div> : null}

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
            {!hasAllowance ? <>Tarif: <CurrencyDisplay amount={tariffPerKwh} />/kWh · Seluruh pemakaian dihitung sesuai tarif</> : allowanceMonths === 1 ? <>
            Tarif: <CurrencyDisplay amount={tariffPerKwh} />/kWh · Jatah gratis {freeKwh} kWh/bulan
            </> : <>Tarif: <CurrencyDisplay amount={tariffPerKwh} />/kWh · Jatah gratis {freeKwh} kWh untuk {allowanceMonths} bulan sewa</>}
          </small>
        </div>
      </div>
    </div>
  );
}
