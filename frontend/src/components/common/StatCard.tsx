import type { ReactNode } from 'react';

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
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon = '•',
  variant = 'default',
  trend,
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
    <div className={`card stat-card stat-card--${variant} border-0`}>
      <div className="card-body">
        <div className="stat-card-header">
          <div>
            <div className="card-title-soft">{title}</div>
          </div>
          <div className="stat-card-icon" role="img" aria-label={`Ikon ${title}`}>
            {icon}
          </div>
        </div>

        <div className="stat-card-value">{value}</div>
        {trendLabel ? <div className={`stat-card-trend ${trendClassName}`}>{trendLabel}</div> : null}
        {subtitle ? <div className="stat-card-subtitle">{subtitle}</div> : null}
      </div>
    </div>
  );
}
