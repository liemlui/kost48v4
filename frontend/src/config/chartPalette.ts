// O-02: Warna chart dari CSS token — runtime read agar ikut tema.
export function getChartColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

export const CHART_COLORS = {
  revenue:   { var: '--blue-600',    fallback: '#2563eb' },
  expense:   { var: '--orange-500',  fallback: '#f97316' },
  profit:    { var: '--green-600',   fallback: '#16a34a' },
  trend:     { var: '--purple-700',  fallback: '#7c3aed' },
  occupancy: { var: '--blue-400',    fallback: '#60a5fa' },
  cash:      { var: '--green-500',   fallback: '#22c55e' },
  grid:      { var: '--gray-200',    fallback: '#e2e8f0' },
  tickLabel: { var: '--gray-500',    fallback: '#64748b' },
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;

export function cc(key: ChartColorKey): string {
  const { var: v, fallback } = CHART_COLORS[key];
  return getChartColor(v, fallback);
}
