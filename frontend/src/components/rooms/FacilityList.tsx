import { Badge } from 'react-bootstrap';
import type { RoomFacility } from '../../types';

interface FacilityListProps {
  facilities: RoomFacility[];
  emptyMessage?: string;
  maxItems?: number;
  compact?: boolean;
}

export default function FacilityList({
  facilities,
  emptyMessage = 'Belum ada fasilitas.',
  maxItems,
  compact = false,
}: FacilityListProps) {
  const visible = (facilities ?? []).filter((f) => f.publicVisible !== false);

  if (visible.length === 0) {
    if (emptyMessage === '') return null;
    return <div className="text-muted small mb-0">{emptyMessage}</div>;
  }

  const displayed = maxItems ? visible.slice(0, maxItems) : visible;
  const remaining = maxItems ? visible.length - maxItems : 0;

  return (
    <div>
      <div className={compact ? 'card-title-soft small mb-1' : 'card-title-soft mb-2'}>Fasilitas Kamar</div>
      <div className={`d-flex flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
        {displayed.map((f) => (
          <span
            key={f.id}
            className={`badge bg-light text-dark border ${compact ? 'badge-sm' : ''}`}
            title={
              [
                f.quantity > 1 ? `×${f.quantity}` : '',
                f.category ? `Kategori: ${f.category}` : '',
                f.condition ? `Kondisi: ${f.condition}` : '',
                f.note ? `Catatan: ${f.note}` : '',
              ]
                .filter(Boolean)
                .join(' \n')
            }
          >
            {f.name}
            {f.quantity > 1 ? ` (${f.quantity})` : ''}
          </span>
        ))}
        {remaining > 0 && (
          <Badge bg="secondary" className={compact ? 'badge-sm' : ''}>
            +{remaining} lainnya
          </Badge>
        )}
      </div>
    </div>
  );
}
