import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartResponsiveWrapper } from '../../hooks/ChartResponsiveWrapper';

export type StackedBarSegment = {
  /** Segment key (must match dataKey in Bar) */
  key: string;
  /** Display label */
  label: string;
  /** Color for this segment */
  color: string;
};

export type StackedBarPoint = {
  label: string;
  /** Dynamic keys mapping to segment values */
  [key: string]: number | string;
};

type StackedBarChartProps = {
  points: StackedBarPoint[];
  segments: StackedBarSegment[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  /** Show thin white separators between stacked segments (aids distinction) */
  showSeparators?: boolean;
  /** Show value labels on each bar segment */
  showLabels?: boolean;
};

function defaultFormatter(value: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/**
 * Stacked bar chart with optional visual separators between segments.
 * Separators help distinguish individual marks in contiguous color areas,
 * improving comprehension per data visualization best practices.
 * 
 * Built on Recharts BarChart with stacked bars.
 */
export default function StackedBarChart({
  points,
  segments,
  ariaLabel,
  valueFormatter = defaultFormatter,
  height = 280,
  showSeparators = true,
  showLabels = false,
}: StackedBarChartProps) {
  const safePoints = points.map((p) => {
    const clean: Record<string, string | number> = { label: String(p.label) };
    segments.forEach((seg) => {
      const val = Number(p[seg.key] ?? 0);
      clean[seg.key] = Number.isFinite(val) ? Math.max(0, val) : 0;
    });
    return clean as unknown as StackedBarPoint;
  });

  if (safePoints.length === 0 || segments.length === 0) {
    return (
      <div className="recharts-stacked-bar recharts-stacked-bar--empty" role="img" aria-label={ariaLabel}>
        <div className="smart-chart-empty">Belum ada data untuk ditampilkan</div>
      </div>
    );
  }

  return (
    <div className="recharts-stacked-bar" role="img" aria-label={ariaLabel}>
      <ChartResponsiveWrapper height={height}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={safePoints}
            margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
            barCategoryGap={showSeparators ? '20%' : '10%'}
          >
            <CartesianGrid
              stroke="rgba(148, 163, 184, 0.15)"
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
              width={45}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as StackedBarPoint | undefined;
                return (
                  <div className="recharts-tooltip">
                    <strong>{point?.label}</strong>
                    {payload.map((entry) => (
                      <span key={String(entry.dataKey)} style={{ color: entry.color }}>
                        {segments.find((s) => s.key === entry.dataKey)?.label ?? String(entry.dataKey)}:{' '}
                        {valueFormatter(Number(entry.value ?? 0))}
                      </span>
                    ))}
                  </div>
                );
              }}
            />
            {segments.map((seg) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                stackId="stack"
                fill={seg.color}
                radius={[0, 0, 0, 0]}
                // Visual separator: thin white stroke between stacked bars
                stroke={showSeparators ? '#fff' : undefined}
                strokeWidth={showSeparators ? 1.5 : 0}
                label={
                  showLabels
                    ? {
                        position: 'inside',
                        fontSize: 10,
                        fill: '#fff',
                        fontWeight: 600,
                        formatter: (v: any) => (Number(v) > 0 ? valueFormatter(Number(v)) : ''),
                      }
                    : undefined
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartResponsiveWrapper>
    </div>
  );
}
