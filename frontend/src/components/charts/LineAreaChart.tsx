import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OKABE_ITO } from './chartPalette';
import { ChartResponsiveWrapper } from '../../hooks/ChartResponsiveWrapper';

export type LineAreaPoint = {
  label: string;
  value: number;
  detail?: string;
};

type LineAreaChartProps = {
  points: LineAreaPoint[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  color?: string;
  fillOpacity?: number;
  curve?: 'linear' | 'monotone' | 'step' | 'natural';
};

function defaultFormatter(value: number) {
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)} kWh`;
}

export default function LineAreaChart({
  points,
  ariaLabel,
  valueFormatter = defaultFormatter,
  height = 200,
  color = OKABE_ITO.blue,
  fillOpacity = 0.12,
  curve = 'monotone',
}: LineAreaChartProps) {
  const safePoints = points.map((p) => ({
    ...p,
    value: Number.isFinite(p.value) ? Math.max(0, p.value) : 0,
  }));

  if (safePoints.length < 2) {
    return (
      <div className="recharts-line-area recharts-line-area--empty" role="img" aria-label={ariaLabel}>
        <div className="smart-chart-empty">Butuh minimal 2 titik data untuk grafik tren</div>
      </div>
    );
  }

  return (
    <div className="recharts-line-area" role="img" aria-label={ariaLabel}>
      <ChartResponsiveWrapper height={height}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={safePoints}
            margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
          >
            <defs>
              <linearGradient id={`lineAreaGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(148, 163, 184, 0.18)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as LineAreaPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="recharts-tooltip">
                    <strong>{point.label}</strong>
                    <span>{valueFormatter(point.value)}</span>
                    {point.detail ? <small>{point.detail}</small> : null}
                  </div>
                );
              }}
            />
            <Area
              type={curve}
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#lineAreaGradient-${color.replace('#', '')})`}
              fillOpacity={1}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartResponsiveWrapper>
    </div>
  );
}
