import DonutGauge from '../../charts/DonutGauge';
import { OKABE_ITO } from '../../charts/chartPalette';
import { getLeaseProgress, formatTenure, formatDateOnly } from '../../../utils/dateTime';
import type { Stay } from '../../../types';

function formatShortDate(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return formatDateOnly(d);
}

export default function LeaseProgressHero({ stay }: { stay: Stay }) {
  const progress = getLeaseProgress(stay.checkInDate, stay.plannedCheckOutDate);
  const overdue = progress.hasRange && progress.daysRemaining < 0;
  const nearEnd = progress.hasRange && progress.daysRemaining >= 0 && progress.daysRemaining <= 10;
  const ringColor = overdue ? OKABE_ITO.vermillion : nearEnd ? OKABE_ITO.orange : OKABE_ITO.blue;

  const centerNum = !progress.hasRange
    ? '—'
    : overdue
      ? 'Lewat'
      : progress.daysRemaining === 0
        ? 'Hari ini'
        : String(progress.daysRemaining);
  const centerSub = !progress.hasRange
    ? 'belum ditentukan'
    : overdue
      ? 'dari jadwal'
      : progress.daysRemaining === 0
        ? 'berakhir'
        : 'hari lagi';

  const countdownLabel = !progress.hasRange
    ? ''
    : overdue
      ? ` · Lewat ${Math.abs(progress.daysRemaining)} hari`
      : progress.daysRemaining === 0
        ? ' · Hari ini'
        : ` · Sisa ${progress.daysRemaining} hari`;

  const periodeLabel = progress.hasRange
    ? `${formatShortDate(stay.checkInDate)} – ${formatShortDate(stay.plannedCheckOutDate)}${countdownLabel}`
    : 'Periode belum ditentukan';

  return (
    <div className="tenant-lease-hero">
      <DonutGauge
        value={progress.percentElapsed}
        max={100}
        color={ringColor}
        size={148}
        innerRadius={50}
        outerRadius={70}
        ariaLabel={`Masa sewa terlewati ${progress.percentElapsed} persen`}
        center={
          <div className="tenant-lease-hero-center">
            <strong>{centerNum}</strong>
            <small>{centerSub}</small>
          </div>
        }
      />
      <div className="tenant-lease-hero-stats">
        <div className="tenant-lease-hero-pct">
          {progress.hasRange ? `${progress.percentElapsed}% terlewati` : 'Periode belum ditentukan'}
        </div>
        <ul className="tenant-lease-hero-list">
          <li><span>Periode</span><strong>{periodeLabel}</strong></li>
          <li><span>Lama tinggal</span><strong>{formatTenure(stay.checkInDate)}</strong></li>
        </ul>
      </div>
    </div>
  );
}
