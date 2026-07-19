import { type ReactNode } from 'react';
import AnimatedCounter from '../common/AnimatedCounter';
import Sparkline, { type SparklinePoint } from '../charts/Sparkline';

type ComplicationData = {
  key: string;
  label: string;
  value: number;
  valueFormatter?: (v: number) => string;
  subtitle?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  sparkline?: SparklinePoint[];
  onClick?: () => void;
};

type ComplicationsClusterProps = {
  /** 2-4 complications to display in a grid */
  items: ComplicationData[];
  /** Grid columns (default: 2) */
  columns?: 2 | 4;
};

/**
 * Compact metric cluster — like Apple Watch complications.
 * 2×2 or 4×1 grid of small data widgets, each showing:
 *   label + animated value + optional sparkline + trend indicator
 * 
 * Designed for dashboard headers — high information density in small space.
 */
export default function ComplicationsCluster({
  items,
  columns = 2,
}: ComplicationsClusterProps) {
  if (items.length === 0) return null;

  const gridClass = columns === 4 ? 'complications-grid--4col' : 'complications-grid--2col';

  return (
    <div className={`complications-grid ${gridClass}`}>
      {items.slice(0, columns * 2).map((item) => (
        <button
          key={item.key}
          type="button"
          className={`complication-card${item.onClick ? ' is-clickable' : ''}`}
          onClick={item.onClick}
          disabled={!item.onClick}
          style={item.color ? { borderLeftColor: item.color } : undefined}
        >
          <div className="complication-header">
            {item.icon ? <span className="complication-icon">{item.icon}</span> : null}
            <span className="complication-label">{item.label}</span>
            {item.trend ? (
              <span className={`complication-trend complication-trend--${item.trend}`}>
                {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '—'}
              </span>
            ) : null}
          </div>
          <div className="complication-value">
            <AnimatedCounter
              value={item.value}
              duration={600}
              formatter={item.valueFormatter}
            />
          </div>
          {item.subtitle ? (
            <div className="complication-subtitle">{item.subtitle}</div>
          ) : null}
          {item.sparkline && item.sparkline.length >= 2 ? (
            <div className="complication-spark">
              <Sparkline
                points={item.sparkline}
                width={72}
                height={20}
                strokeColor={item.color ?? '#0072B2'}
                ariaLabel={`Tren ${item.label}`}
              />
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
