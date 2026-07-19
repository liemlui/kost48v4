import { useMemo } from 'react';

type UsageGaugeProps = {
  /** Current usage value */
  value: number;
  /** Maximum/reference value (e.g. free kWh limit) */
  maxValue: number;
  /** Unit label shown below value */
  unit?: string;
  /** Label shown below the gauge */
  label?: string;
  /** Custom thresholds for color zones (as percentage of max) */
  thresholds?: { warning: number; danger: number };
  /** Size in px (default 160) */
  size?: number;
  /** Whether to show numeric value in center */
  showValue?: boolean;
};

/**
 * Semi-circular usage gauge — like a car speedometer.
 * Color zones: green (safe) → yellow (warning) → red (danger).
 * Ideal for showing electricity usage vs. free kWh allowance.
 */
export default function UsageGauge({
  value,
  maxValue,
  unit = 'kWh',
  label = 'Pemakaian',
  thresholds = { warning: 50, danger: 100 },
  size = 160,
  showValue = true,
}: UsageGaugeProps) {
  const safeMax = maxValue > 0 ? maxValue : 1;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const isEmpty = maxValue <= 0 || (value <= 0 && maxValue <= 0);

  const color = isEmpty
    ? '#94a3b8'   // grey — empty state
    : pct >= thresholds.danger
    ? '#D55E00'   // vermillion (danger)
    : pct >= thresholds.warning
      ? '#E69F00'   // orange (warning)
      : '#009E73';  // green (safe)

  // SVG arc calculations for semicircle
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size * 0.75; // push down to make room for semicircle
  const r = radius;

  // Arc: from 180° (left) to 0° (right) = top semicircle
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°
  const totalArc = startAngle - endAngle; // PI radians (180°)

  const filledAngle = startAngle - (totalArc * pct) / 100;

  // Background arc path
  const bgStartX = cx + r * Math.cos(startAngle);
  const bgStartY = cy - r * Math.sin(startAngle);
  const bgEndX = cx + r * Math.cos(endAngle);
  const bgEndY = cy - r * Math.sin(endAngle);

  const bgPath = `M ${bgStartX.toFixed(1)} ${bgStartY.toFixed(1)} A ${r} ${r} 0 0 1 ${bgEndX.toFixed(1)} ${bgEndY.toFixed(1)}`;

  // Filled arc path
  const fillEndX = cx + r * Math.cos(filledAngle);
  const fillEndY = cy - r * Math.sin(filledAngle);
  const fillLargeArc = pct > 50 ? 1 : 0;
  const fillPath = `M ${bgStartX.toFixed(1)} ${bgStartY.toFixed(1)} A ${r} ${r} 0 ${fillLargeArc} 1 ${fillEndX.toFixed(1)} ${fillEndY.toFixed(1)}`;

  // Needle
  const needleAngle = filledAngle;
  const needleLen = r - 6;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  // Threshold marks
  const markAngles = useMemo(() => {
    if (!thresholds) return [];
    return [
      { pct: thresholds.warning, color: '#E69F00' },
      { pct: thresholds.danger, color: '#D55E00' },
    ].map(({ pct: markPct, color: markColor }) => {
      const a = startAngle - (totalArc * Math.min(markPct, 100)) / 100;
      const mx = cx + (r - 3) * Math.cos(a);
      const my = cy - (r - 3) * Math.sin(a);
      const mx2 = cx + (r + 2) * Math.cos(a);
      const my2 = cy - (r + 2) * Math.sin(a);
      return { x1: mx, y1: my, x2: mx2, y2: my2, color: markColor, pct: markPct };
    });
  }, [thresholds, r, cx, cy, startAngle, totalArc]);

  return (
    <div className="usage-gauge" role="img" aria-label={`${label}: ${value.toFixed(1)} dari ${maxValue} ${unit} (${Math.round(pct)}%)`}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Threshold marks */}
        {markAngles.map((m) => (
          <line key={m.pct} x1={m.x1.toFixed(1)} y1={m.y1.toFixed(1)} x2={m.x2.toFixed(1)} y2={m.y2.toFixed(1)} stroke={m.color} strokeWidth="1.5" opacity="0.8" />
        ))}

        {/* Filled arc */}
        <path d={fillPath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX.toFixed(1)} y2={needleY.toFixed(1)} stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#334155" />
        <circle cx={cx} cy={cy} r="3" fill="#fff" />
      </svg>

      {showValue ? (
        <div className="usage-gauge-value" style={{ color }}>
          <strong>{isEmpty ? '—' : value.toFixed(1)}</strong>
          <span>{unit}</span>
        </div>
      ) : null}
      <div className="usage-gauge-label">
        {label}
        {isEmpty ? (
          <small>Belum ada data</small>
        ) : (
          <small>{Math.round(pct)}% dari jatah gratis {maxValue} {unit}</small>
        )}
      </div>
    </div>
  );
}
