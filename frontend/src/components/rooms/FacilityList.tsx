import { Badge } from 'react-bootstrap';
import type { RoomFacility } from '../../types';

interface FacilityListProps {
  facilities: RoomFacility[];
  emptyMessage?: string;
  maxItems?: number;
  compact?: boolean;
}

/** Map common Indonesian facility category text to a single emoji */
function categoryEmoji(category?: string | null): string {
  if (!category) return '✦';
  const c = category.toLowerCase().trim();
  if (
    c.includes('kamar') ||
    c.includes('tidur') ||
    c.includes('bed') ||
    c.includes('kasur') ||
    c.includes('ranjang') ||
    c.includes('bantal') ||
    c.includes('sprei') ||
    c.includes('lemari') ||
    c.includes('nakas')
  )
    return '🛏️';
  if (c.includes('lampu') || c.includes('listrik') || c.includes('light') || c.includes('led'))
    return '💡';
  if (c.includes('meja') || c.includes('kursi') || c.includes('furniture') || c.includes('sofa'))
    return '🪑';
  if (
    c.includes('mandi') ||
    c.includes('wc') ||
    c.includes('toilet') ||
    c.includes('kamar mandi') ||
    c.includes('shower') ||
    c.includes('bath') ||
    c.includes('kloset')
  )
    return '🚿';
  if (c.includes('internet') || c.includes('wifi') || c.includes('wi-fi'))
    return '📶';
  if (c.includes('cctv') || c.includes('keamanan') || c.includes('security') || c.includes('satpam'))
    return '🛡️';
  if (
    c.includes('dapur') ||
    c.includes('kitchen') ||
    c.includes('kompor') ||
    c.includes('kulkas') ||
    c.includes('rice') ||
    c.includes('dispenser')
  )
    return '🍳';
  if (c.includes('ac') || c.includes('air condition') || c.includes('pendingin'))
    return '❄️';
  if (c.includes('tv') || c.includes('televisi'))
    return '📺';
  if (c.includes('jemuran') || c.includes('laundry') || c.includes('cuci'))
    return '👕';
  if (c.includes('parkir') || c.includes('motor') || c.includes('mobil'))
    return '🅿️';
  return '✦';
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
            <span className="me-1">{categoryEmoji(f.category)}</span>
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