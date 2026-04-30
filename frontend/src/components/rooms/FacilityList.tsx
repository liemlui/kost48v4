import { Alert } from 'react-bootstrap';
import type { RoomFacility } from '../../types';

interface FacilityListProps {
  facilities: RoomFacility[];
  emptyMessage?: string;
}

export default function FacilityList({ facilities, emptyMessage = 'Belum ada fasilitas.' }: FacilityListProps) {
  if (!facilities || facilities.length === 0) {
    return (
      <Alert variant="light" className="mb-0 small">
        {emptyMessage}
      </Alert>
    );
  }

  return (
    <div>
      <div className="card-title-soft mb-2">Fasilitas Kamar</div>
      <div className="d-flex flex-wrap gap-2">
        {facilities.map((f) => (
          <span
            key={f.id}
            className="badge bg-light text-dark border"
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
      </div>
    </div>
  );
}