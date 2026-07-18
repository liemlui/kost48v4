import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { OKABE_ITO } from '../charts/chartPalette';
import CurrencyDisplay from '../common/CurrencyDisplay';

export interface InvoiceLineItem {
  id?: number;
  lineType?: string;
  description?: string | null;
  qty?: string | number | null;
  unit?: string | null;
  unitPriceRupiah?: number | null;
  lineAmountRupiah?: number | null;
}

const lineTypeColors: Record<string, string> = {
  RENT: OKABE_ITO.blue,
  ELECTRICITY: OKABE_ITO.orange,
  WATER: OKABE_ITO.green,
  WIFI: OKABE_ITO.purple,
  DISCOUNT: OKABE_ITO.skyBlue,
  PENALTY: OKABE_ITO.vermillion,
  OTHER: OKABE_ITO.gray,
};

const lineTypeLabels: Record<string, string> = {
  RENT: 'Sewa',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  WIFI: 'WiFi',
  DISCOUNT: 'Diskon',
  PENALTY: 'Denda',
  OTHER: 'Lainnya',
};

type BreakdownSegment = {
  name: string;
  type: string;
  amount: number;
  color: string;
};

export default function InvoiceBreakdownDonut({
  lines,
  totalAmount,
}: {
  lines: InvoiceLineItem[] | undefined | null;
  totalAmount: number;
}) {
  const segments: BreakdownSegment[] = useMemo(() => {
    if (!lines?.length) return [];

    // Group by lineType, sum amounts
    const grouped: Record<string, number> = {};
    for (const line of lines) {
      const type = line.lineType || 'OTHER';
      const amount = Number(line.lineAmountRupiah) || 0;
      grouped[type] = (grouped[type] || 0) + Math.abs(amount);
    }

    // Filter out zero amounts and sort by amount desc
    return Object.entries(grouped)
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([type, amount]) => ({
        name: lineTypeLabels[type] || type,
        type,
        amount,
        color: lineTypeColors[type] || OKABE_ITO.gray,
      }));
  }, [lines]);

  if (segments.length === 0) return null;

  const hasMultiple = segments.length > 1;

  return (
    <div className="invoice-breakdown-donut">
      <div className="panel-title mb-1">Rincian Biaya</div>
      <div className="panel-subtitle mb-2">
        {hasMultiple
          ? 'Komposisi tagihan berdasarkan jenis'
          : 'Satu jenis tagihan'}
      </div>
      <div className="invoice-breakdown-body">
        <div className="invoice-breakdown-chart">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={56}
                paddingAngle={2}
                stroke="none"
              >
                {segments.map((seg) => (
                  <Cell key={seg.type} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const seg = payload?.[0]?.payload as BreakdownSegment | undefined;
                  if (!active || !seg) return null;
                  const pct = totalAmount > 0 ? Math.round((seg.amount / totalAmount) * 100) : 0;
                  return (
                    <div className="recharts-tooltip">
                      <strong>{seg.name}</strong>
                      <span><CurrencyDisplay amount={seg.amount} /></span>
                      <small>{pct}% dari total</small>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="invoice-breakdown-legend">
          {segments.map((seg) => {
            const pct = totalAmount > 0 ? Math.round((seg.amount / totalAmount) * 100) : 0;
            return (
              <div key={seg.type} className="invoice-breakdown-legend-item">
                <span
                  className="invoice-breakdown-dot"
                  style={{ background: seg.color }}
                />
                <span className="invoice-breakdown-label">{seg.name}</span>
                <span className="invoice-breakdown-value">
                  <CurrencyDisplay amount={seg.amount} />
                </span>
                <span className="invoice-breakdown-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
