import { useMemo } from 'react';

export type GaugeChartProps = {
  /** Nilai saat ini (0–max) */
  value: number;
  /** Nilai maksimum (default 100) */
  max?: number;
  /** Label yang ditampilkan di tengah gauge */
  label?: string;
  /** Satuan (%, Rp, dll) */
  unit?: string;
  /** Ukuran gauge dalam px (default 160) */
  size?: number;
  /** Warna berdasarkan threshold */
  thresholds?: Array<{ from: number; to: number; color: string }>;
  /** Warna default jika tidak ada threshold cocok */
  defaultColor?: string;
  /** Lebar stroke arc (default 12) */
  strokeWidth?: number;
  /** Label bantuan di bawah gauge */
  helperText?: string;
  /** Kelas CSS tambahan */
  className?: string;
};

const DEFAULT_THRESHOLDS = [
  { from: 0, to: 33, color: '#dc2626' },    // red — kritis
  { from: 33, to: 66, color: '#f59e0b' },   // amber — perhatian
  { from: 66, to: 100, color: '#16a34a' },  // green — sehat
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function GaugeChart({
  value,
  max = 100,
  label,
  unit,
  size = 160,
  thresholds = DEFAULT_THRESHOLDS,
  defaultColor = '#64748b',
  strokeWidth = 12,
  helperText,
  className = '',
}: GaugeChartProps) {
  const safeValue = Math.max(0, Math.min(value, max));
  const percent = max > 0 ? (safeValue / max) * 100 : 0;

  const color = useMemo(() => {
    const match = thresholds.find((t) => percent >= t.from && percent < t.to);
    return match?.color ?? defaultColor;
  }, [percent, thresholds, defaultColor]);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const startAngle = 180;
  const endAngle = 180 + (percent / 100) * 180;
  const bgEndAngle = 360;

  const arcPath = describeArc(cx, cy, r, startAngle, endAngle);
  const bgPath = describeArc(cx, cy, r, startAngle, bgEndAngle);

  const needleAngle = startAngle + (percent / 100) * 180;
  const needleLen = r * 0.7;
  const needleEnd = polarToCartesian(cx, cy, needleLen, needleAngle);
  const needleBaseR = 4;

  return (
    <div className={`gauge-chart ${className}`} style={{ width: size, height: size + 36 }} role="img" aria-label={`${label ?? 'Gauge'}: ${safeValue}${unit ? ` ${unit}` : ''} dari ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Value arc */}
        <path d={arcPath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth={2} strokeLinecap="round" style={{ transition: 'all 0.6s ease' }} />
        <circle cx={cx} cy={cy} r={needleBaseR} fill={color} />
        {/* Center value */}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central" fill="#1e293b" fontSize={Math.round(size * 0.1)} fontWeight={700}>
          {safeValue}
        </text>
        {unit ? (
          <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize={Math.round(size * 0.055)}>
            {unit}
          </text>
        ) : null}
        {/* Label */}
        {label ? (
          <text x={cx} y={cy + 32} textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize={Math.round(size * 0.05)}>
            {label}
          </text>
        ) : null}
      </svg>
      {helperText ? <div className="gauge-helper-text" style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 2 }}>{helperText}</div> : null}
    </div>
  );
}