import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type HorizontalBarPoint = {
  label: string;
  value: number;
  color?: string;
  detail?: string;
};

type HorizontalBarChartProps<T extends HorizontalBarPoint> = {
  points: T[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  maxValue?: number;
  leftWidth?: number;
  barSize?: number;
  onPointClick?: (point: T) => void;
  isPointClickable?: (point: T) => boolean;
};

const DEFAULT_COLORS = ['#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed'];

function defaultFormatter(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value || 0));
}

export default function HorizontalBarChart<T extends HorizontalBarPoint>({
  points,
  ariaLabel,
  valueFormatter = defaultFormatter,
  height = Math.max(180, points.length * 42),
  maxValue,
  leftWidth = 104,
  barSize = 18,
  onPointClick,
  isPointClickable = () => Boolean(onPointClick),
}: HorizontalBarChartProps<T>) {
  const safePoints = points.map((point, index) => ({
    ...point,
    value: Number.isFinite(point.value) ? Math.max(0, point.value) : 0,
    color: point.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));
  const domainMax = maxValue && maxValue > 0 ? maxValue : 'dataMax';

  return (
    <div className="recharts-horizontal-bars" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart layout="vertical" data={safePoints} margin={{ top: 8, right: 76, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.22)" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, domainMax]} hide />
          <YAxis type="category" dataKey="label" width={leftWidth} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as T | undefined;
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
          <Bar dataKey="value" barSize={barSize} radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148, 163, 184, 0.12)' }}>
            {safePoints.map((point) => (
              <Cell
                key={point.label}
                fill={point.color}
                cursor={isPointClickable(point as T) ? 'pointer' : 'default'}
                onClick={() => isPointClickable(point as T) ? onPointClick?.(point as T) : undefined}
              />
            ))}
            <LabelList dataKey="value" position="right" formatter={(value: unknown) => valueFormatter(Number(value ?? 0))} fill="#475569" fontSize={12} fontWeight={700} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
