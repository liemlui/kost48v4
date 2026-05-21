import { useMemo, useState, type CSSProperties } from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export type SmartChartMode = 'summary' | 'donut' | 'bar' | 'table';
export type SmartChartPoint = {
  label: string;
  value: number;
  detail?: string;
  to?: string;
};

type SmartChartPanelProps = {
  title: string;
  subtitle?: string;
  points: SmartChartPoint[];
  defaultMode?: SmartChartMode;
  availableModes?: SmartChartMode[];
  totalLabel?: string;
  ctaLabel?: string;
  ctaTo?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value || 0));
}

export default function SmartChartPanel({ title, subtitle, points, defaultMode = 'summary', availableModes = ['summary', 'donut', 'bar', 'table'], totalLabel = 'Total', ctaLabel, ctaTo }: SmartChartPanelProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SmartChartMode>(defaultMode);
  const total = points.reduce((sum, point) => sum + Math.max(0, Number(point.value || 0)), 0);
  const safeMode = availableModes.includes(mode) ? mode : availableModes[0];
  const topPoint = useMemo(() => [...points].sort((a, b) => b.value - a.value)[0], [points]);

  return (
    <Card className="content-card smart-chart-card border-0 h-100">
      <Card.Body>
        <div className="table-meta align-items-start gap-2">
          <div>
            <div className="panel-title">{title}</div>
            {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
          </div>
          <div className="smart-chart-actions">
            <div className="smart-chart-mode-group" role="tablist" aria-label={`${title} chart mode`}>
              {availableModes.map((item) => (
                <button key={item} type="button" className={safeMode === item ? 'active' : ''} onClick={() => setMode(item)}>
                  {item === 'summary' ? 'Ringkas' : item === 'donut' ? 'Donut' : item === 'bar' ? 'Bar' : 'Tabel'}
                </button>
              ))}
            </div>
            {ctaTo ? <Button size="sm" variant="outline-primary" onClick={() => navigate(ctaTo)}>{ctaLabel ?? 'Detail'}</Button> : null}
          </div>
        </div>

        {safeMode === 'summary' && (
          <div className="smart-chart-summary">
            <div>
              <span>{totalLabel}</span>
              <strong>{formatNumber(total)}</strong>
              <small>{topPoint ? `Terbesar: ${topPoint.label} (${formatNumber(topPoint.value)})` : 'Belum ada data'}</small>
            </div>
            <div className="smart-chart-summary-grid">
              {points.map((point) => (
                <button key={point.label} type="button" className="smart-chart-chip" onClick={() => point.to ? navigate(point.to) : undefined} disabled={!point.to}>
                  <span>{point.label}</span>
                  <strong>{formatNumber(point.value)}</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        {safeMode === 'donut' && (
          <div className="smart-chart-donut-wrap">
            <div className="smart-chart-donut" style={{ '--a': `${total ? (points[0]?.value ?? 0) / total * 100 : 0}%`, '--b': `${total ? ((points[0]?.value ?? 0) + (points[1]?.value ?? 0)) / total * 100 : 0}%` } as CSSProperties}>
              <div><strong>{formatNumber(total)}</strong><span>{totalLabel}</span></div>
            </div>
            <div className="smart-chart-legend">
              {points.map((point, index) => <span key={point.label}><i className={`smart-tone-${index % 4}`} />{point.label}: {formatNumber(point.value)}</span>)}
            </div>
          </div>
        )}

        {safeMode === 'bar' && (
          <div className="smart-chart-bars">
            {points.map((point) => {
              const pct = total ? Math.max(3, (point.value / total) * 100) : 0;
              return (
                <button key={point.label} type="button" className="smart-chart-bar-row" onClick={() => point.to ? navigate(point.to) : undefined} disabled={!point.to}>
                  <span>{point.label}</span>
                  <div><i style={{ width: `${pct}%` }} /></div>
                  <strong>{formatNumber(point.value)}</strong>
                </button>
              );
            })}
          </div>
        )}

        {safeMode === 'table' && (
          <Table responsive size="sm" className="mt-3 mb-0 smart-chart-table">
            <thead><tr><th>Kategori</th><th className="text-end">Nilai</th><th>Catatan</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.label} className={point.to ? 'clickable-row' : undefined} onClick={() => point.to ? navigate(point.to) : undefined}><td>{point.label}</td><td className="text-end fw-semibold">{formatNumber(point.value)}</td><td className="text-muted small">{point.detail ?? '-'}</td></tr>)}</tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
