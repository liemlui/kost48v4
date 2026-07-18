import type { ReactNode, MouseEventHandler } from 'react';
import AnimatedCounter from './AnimatedCounter';

export type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  trend?: {
    value: number;
    label?: string;
  };
  onClick?: MouseEventHandler<HTMLDivElement>;
  loading?: boolean;
  /** Animate the value with AnimatedCounter (number values only) */
  animated?: boolean;
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon = '•',
  variant = 'default',
  trend,
  onClick,
  loading = false,
  animated = false,
}: StatCardProps) {
  const trendClassName = trend
    ? trend.value > 0
      ? 'text-soft-success'
      : trend.value < 0
        ? 'text-soft-danger'
        : 'text-muted'
    : '';

  const trendLabel = trend
    ? trend.value > 0
      ? `↑ ${Math.abs(trend.value)}${trend.label ? ` ${trend.label}` : ''}`
      : trend.value < 0
        ? `↓ ${Math.abs(trend.value)}${trend.label ? ` ${trend.label}` : ''}`
        : `— stabil${trend.label ? ` ${trend.label}` : ''}`
    : null;

  return (
    <div className={`card stat-card stat-card--${variant} border-0${onClick ? ' clickable-row' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (onClick as any)(e); } } : undefined}>
      <div className="card-body">
        <div className="stat-card-header">
          <div>
            <div className="card-title-soft">{title}</div>
          </div>
          <div className="stat-card-icon" role="img" aria-label={`Ikon ${title}`}>
            {icon}
          </div>
        </div>

        {loading ? (
          <div className="stat-card-value">
            <span className="skeleton-inline skeleton-value" style={{ width: 64, height: 28, display: 'inline-block', borderRadius: 4 }}>&nbsp;</span>
          </div>
        ) : (
          <div className="stat-card-value">
            {animated && typeof value === 'number' ? (
              <AnimatedCounter value={value} duration={1000} />
            ) : (
              value
            )}
          </div>
        )}
        {loading ? null : trendLabel ? <div className={`stat-card-trend ${trendClassName}`}>{trendLabel}</div> : null}
        {loading ? <div className="stat-card-subtitle"><span className="skeleton-inline" style={{ width: 120, height: 14, display: 'inline-block', borderRadius: 4 }}>&nbsp;</span></div> : subtitle ? <div className="stat-card-subtitle">{subtitle}</div> : null}
        <div className="stat-card-spark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
