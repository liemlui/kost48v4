import { Table } from 'react-bootstrap';
import type { PublicRoom } from '../../types';
import { calculateRentByPricingTerm, ALL_PRICING_TERMS } from '../../utils/pricing';
import { formatRupiah } from '../../utils/formatCurrency';

// ── Constants ──────────────────────────────────────────────────────────────
const TERM_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  BIWEEKLY: '2 Mingguan',
  MONTHLY: 'Bulanan',
  SMESTERLY: 'Semesteran',
  YEARLY: 'Tahunan',
};

const fmt = formatRupiah;

// ── Props ──────────────────────────────────────────────────────────────────
export interface RoomPriceTableProps {
  room: PublicRoom;
  monthlyRate?: number;
  variant?: 'card' | 'detail' | 'compare';
}

// ── Component ──────────────────────────────────────────────────────────────
export default function RoomPriceTable({
  room,
  monthlyRate: forcedRate,
  variant = 'card',
}: RoomPriceTableProps) {
  const monthlyRate = forcedRate ?? room.pricing?.monthlyRateRupiah ?? 0;

  if (variant === 'compare') {
    // Untuk compare panel: return array data — parent yang render
    return null;
  }

  return (
    <Table
      responsive
      className={variant === 'detail' ? 'room-detail-rate-table mb-0' : 'rm-card-price-table'}
      aria-label="Daftar harga sewa"
    >
      <tbody>
        {ALL_PRICING_TERMS.map((term) => {
          const rate = monthlyRate > 0 ? calculateRentByPricingTerm(monthlyRate, term) : 0;
          return (
            <tr key={term} className={term === 'MONTHLY' ? 'rm-price-monthly' : ''}>
              <td>{TERM_LABELS[term] ?? term}</td>
              <td>{rate > 0 ? fmt(rate) : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}