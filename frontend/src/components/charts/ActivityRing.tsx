import { useMemo } from 'react';

export type RingSegment = {
  /** Label ring */
  label: string;
  /** Nilai saat ini (0–1) */
  value: number;
  /** Warna ring */
  color: string;
  /** Warna background ring (default lebih transparan) */
  bgColor?: string;
  /** Label detail di tooltip */
  detail?: string;
};

export type ActivityRingProps = {
  /** Segmen ring (maks 4) */
  segments: RingSegment[];
  /** Ukuran total ring dalam px (default 120) */
  size?: number;
  /** Lebar stroke ring (default 10) */
  strokeWidth?: number;
  /** Gap antar ring dalam px (default 4) */
  gap?: number;
  /** Label tengah */
  centerLabel?: string;
  /** Nilai tengah */
  centerValue?: string;
  /** Kelas CSS tambahan */
  className?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeFullArc(cx: number, cy: number, r: number) {
  const start = polarToCartesian(cx, cy, r, 359.999);
  const end = polarToCartesian(cx, cy, r, 0);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 1 0 ${end.x} ${end.y}`;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function ActivityRing({
  segments,
  size = 120,
  strokeWidth = 10,
  gap = 4,
  centerLabel,
  centerValue,
  className = '',
}: ActivityRingProps) {
  const safeSegments = useMemo(() => segments.slice(0, 4), [segments]);

  if (safeSegments.length === 0) {
    return (
      <div className={`activity-ring ${className}`} style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Tidak ada data</span>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const totalStroke = safeSegments.length * strokeWidth + (safeSegments.length - 1) * gap;
  const maxR = (size - totalStroke) / 2;

  const rings = safeSegments.map((segment, index) => {
    const offset = index * (strokeWidth + gap);
    const r = maxR - offset;
    const circumference = 2 * Math.PI * r;
    const progressOffset = circumference * (1 - Math.min(1, Math.max(0, segment.value)));

    return { segment, r, circumference, progressOffset };
  });

  return (
    <div className={`activity-ring ${className}`} style={{ width: size, height: size, position: 'relative' }} role="img" aria-label={safeSegments.map((s) => `${s.label}: ${Math.round(s.value * 100)}%`).join(', ')}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0 }}>
        {rings.map((ring, index) => (
          <g key={ring.segment.label}>
            {/* Background ring */}
            <circle
              cx={cx}
              cy={cy}
              r={ring.r}
              fill="none"
              stroke={ring.segment.bgColor ?? `${ring.segment.color}22`}
              strokeWidth={strokeWidth}
            />
            {/* Progress ring — stroke-dashoffset untuk animasi */}
            <circle
              cx={cx}
              cy={cy}
              r={ring.r}
              fill="none"
              stroke={ring.segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={ring.circumference}
              strokeDashoffset={ring.progressOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </g>
        ))}
      </svg>
      {/* Center content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        {centerValue ? <div style={{ fontSize: Math.round(size * 0.11), fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>{centerValue}</div> : null}
        {centerLabel ? <div style={{ fontSize: Math.round(size * 0.045), color: '#64748b', marginTop: 1 }}>{centerLabel}</div> : null}
      </div>
      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: -24,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        {safeSegments.map((segment) => (
          <div key={segment.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: segment.color, display: 'inline-block' }} />
            <span>{segment.label}</span>
            <span style={{ fontWeight: 600 }}>{Math.round(segment.value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}