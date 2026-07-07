import { useMemo, useState } from 'react';
import { Button, Card, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import HorizontalBarChart from './HorizontalBarChart';
import ClickableRow from '../common/ClickableRow';
import { CHART_PALETTE } from './chartPalette';
import { ChartResponsiveWrapper } from '../../hooks/ChartResponsiveWrapper';

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

const CHART_COLORS = CHART_PALETTE; // F3-12 (V-5): palet Okabe-Ito colorblind-safe

export default function SmartChartPanel({ title, subtitle, points, defaultMode = 'summary', availableModes = ['summary', 'donut', 'bar', 'table'], totalLabel = 'Total', ctaLabel, ctaTo }: SmartChartPanelProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SmartChartMode>(defaultMode);
  const total = points.reduce((sum, point) => sum + Math.max(0, Number(point.value || 0)), 0);
  const safeMode = availableModes.includes(mode) ? mode : availableModes[0];
  const topPoint = useMemo(() => [...points].sort((a, b) => b.value - a.value)[0], [points]);
  const chartPoints = useMemo(
    () => points.map((point, index) => ({ ...point, value: Math.max(0, Number(point.value || 0)), color: CHART_COLORS[index % CHART_COLORS.length] })),
    [points],
  );

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
            <div className="smart-chart-donut-stage" role="img" aria-label={`${title}: ${formatNumber(total)} ${totalLabel}`}>
              {total > 0 ? (
                <ChartResponsiveWrapper height={190}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={chartPoints} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                        {chartPoints.map((point) => (
                          <Cell key={point.label} fill={point.color} cursor={point.to ? 'pointer' : 'default'} onClick={() => point.to ? navigate(point.to) : undefined} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => formatNumber(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartResponsiveWrapper>
              ) : <div className="smart-chart-empty">Belum ada data</div>}
              <div className="smart-chart-donut-center"><strong>{formatNumber(total)}</strong><span>{totalLabel}</span></div>
            </div>
            <div className="smart-chart-legend">
              {chartPoints.map((point) => <span key={point.label}><i style={{ background: point.color }} />{point.label}: {formatNumber(point.value)}</span>)}
            </div>
          </div>
        )}

        {safeMode === 'bar' && (
          <div className="smart-chart-bars">
            {chartPoints.length === 0 ? (
              <div className="smart-chart-empty">Belum ada data</div>
            ) : (
              <HorizontalBarChart
                points={chartPoints}
                ariaLabel={`${title} dalam diagram batang`}
                valueFormatter={formatNumber}
                onPointClick={(point) => point.to ? navigate(point.to) : undefined}
                isPointClickable={(point) => Boolean(point.to)}
              />
            )}
          </div>
        )}

        {safeMode === 'table' && (
          <Table responsive size="sm" className="mt-3 mb-0 smart-chart-table">
            <thead><tr><th>Kategori</th><th className="text-end">Nilai</th><th>Catatan</th></tr></thead>
            <tbody>{points.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted py-4">Belum ada data</td></tr>
            ) : (points.map((point) => point.to ? (
              <ClickableRow key={point.label} onClick={() => navigate(point.to!)} label={`Buka detail ${point.label}`}>
                <td>{point.label}</td><td className="text-end fw-semibold">{formatNumber(point.value)}</td><td className="text-muted small">{point.detail ?? '-'}</td>
              </ClickableRow>
            ) : (
              <tr key={point.label}><td>{point.label}</td><td className="text-end fw-semibold">{formatNumber(point.value)}</td><td className="text-muted small">{point.detail ?? '-'}</td></tr>
            )))}</tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
