import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { OKABE_ITO } from './chartPalette';
import { ChartResponsiveWrapper } from '../../hooks/ChartResponsiveWrapper';

type DonutGaugeProps = {
  value: number;
  max?: number;
  center: ReactNode;
  ariaLabel: string;
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  centerClassName?: string;
};

function clamp(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

export default function DonutGauge({
  value,
  max = 100,
  center,
  ariaLabel,
  size = 190,
  innerRadius = 66,
  outerRadius = 92,
  color = OKABE_ITO.blue,
  trackColor = 'rgba(148, 163, 184, 0.18)',
  className = '',
  centerClassName = '',
}: DonutGaugeProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = clamp(value, safeMax);
  const data = [
    { name: 'Nilai', value: safeValue, color },
    { name: 'Sisa', value: Math.max(safeMax - safeValue, 0), color: trackColor },
  ];

  return (
    <div
      className={`recharts-donut-gauge ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <ChartResponsiveWrapper height={size}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive
            >
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartResponsiveWrapper>
      <div className={`recharts-donut-center ${centerClassName}`.trim()}>{center}</div>
    </div>
  );
}
