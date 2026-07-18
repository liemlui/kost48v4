import { useMemo } from 'react';

export type SparklinePoint = {
  label: string;
  value: number;
};

type SparklineProps = {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  ariaLabel: string;
};

/**
 * Tiny inline SVG sparkline — no axis, no labels, just the trend line.
 * Shows at least 2 points. Fits in compact spaces like fact chips.
 */
export default function Sparkline({
  points,
  width = 80,
  height = 24,
  strokeColor = '#0072B2',
  strokeWidth = 1.8,
  ariaLabel,
}: SparklineProps) {
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // avoid div by zero

    const xStep = (width - 4) / (points.length - 1);
    const yScale = (height - 6) / range;

    return points
      .map((p, i) => {
        const x = 2 + i * xStep;
        const y = height - 3 - (p.value - min) * yScale;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points, width, height]);

  if (points.length < 2) return null;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at last point */}
      {(() => {
        const lastVal = points[points.length - 1].value;
        const values = points.map((p) => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const xStep = (width - 4) / (points.length - 1);
        const yScale = (height - 6) / range;
        const cx = 2 + (points.length - 1) * xStep;
        const cy = height - 3 - (lastVal - min) * yScale;
        return <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="3" fill={strokeColor} />;
      })()}
    </svg>
  );
}
