import type { ReactNode } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export type SnippetCardProps = {
  /** Icon atau emoji */
  icon?: ReactNode;
  /** Judul */
  title: string;
  /** Nilai utama */
  value: string | number;
  /** Satuan */
  unit?: string;
  /** Label bantuan */
  helper?: string;
  /** Warna aksen (default #3b82f6) */
  accentColor?: string;
  /** Navigasi saat diklik */
  to?: string;
  /** Trend: naik/turun/tetap */
  trend?: 'up' | 'down' | 'flat';
  /** Label trend */
  trendLabel?: string;
  /** Badge kecil */
  badge?: string;
  /** Badge color */
  badgeColor?: string;
  /** Kelas CSS tambahan */
  className?: string;
  /** Konten tambahan */
  children?: ReactNode;
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <span style={{ color: '#16a34a' }}>↑</span>;
  if (trend === 'down') return <span style={{ color: '#dc2626' }}>↓</span>;
  return <span style={{ color: '#64748b' }}>→</span>;
}

export default function SnippetCard({
  icon,
  title,
  value,
  unit,
  helper,
  accentColor = '#3b82f6',
  to,
  trend,
  trendLabel,
  badge,
  badgeColor,
  className = '',
  children,
}: SnippetCardProps) {
  const navigate = useNavigate();
  const isClickable = Boolean(to);

  return (
    <Card
      className={`snippet-card ${isClickable ? 'snippet-card-clickable' : ''} ${className}`}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onClick={() => isClickable ? navigate(to!) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          navigate(to!);
        }
      }}
    >
      <Card.Body className="d-flex align-items-start gap-3 py-2 px-3">
        {icon ? (
          <div className="snippet-card-icon" style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: `${accentColor}15`, color: accentColor, fontSize: 18 }}>
            {icon}
          </div>
        ) : null}
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2">
            <span className="snippet-card-title" style={{ fontSize: 12, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3 }}>{title}</span>
            {badge ? (
              <span className="snippet-card-badge" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: badgeColor ?? '#e2e8f0', color: badgeColor ? '#fff' : '#475569', fontWeight: 600 }}>{badge}</span>
            ) : null}
          </div>
          <div className="d-flex align-items-baseline gap-1">
            <span className="snippet-card-value" style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</span>
            {unit ? <span className="snippet-card-unit" style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{unit}</span> : null}
            {trend ? (
              <span className="snippet-card-trend" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, marginLeft: 6 }}>
                <TrendIcon trend={trend} />
                {trendLabel ? <span style={{ color: '#64748b' }}>{trendLabel}</span> : null}
              </span>
            ) : null}
          </div>
          {helper ? <div className="snippet-card-helper" style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{helper}</div> : null}
          {children ? <div className="snippet-card-children" style={{ marginTop: 4 }}>{children}</div> : null}
        </div>
      </Card.Body>
    </Card>
  );
}