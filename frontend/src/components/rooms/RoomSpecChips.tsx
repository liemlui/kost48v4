import type { PublicRoom } from '../../types';
import {
  getPublicRoomBathroom,
  getPublicRoomBathroomLabel,
  getPublicRoomCooling,
  getPublicRoomCoolingLabel,
} from '../../utils/publicRoomDisplay';

// ── Props ──────────────────────────────────────────────────────────────────
export interface RoomSpecChipsProps {
  room: PublicRoom;
  variant?: 'card' | 'detail' | 'compare';
}

// ── Component ──────────────────────────────────────────────────────────────
export default function RoomSpecChips({ room, variant = 'card' }: RoomSpecChipsProps) {
  const isMezzanine = String(room.roomType ?? '').toUpperCase() === 'MEZZANINE';
  const isLarge = String(room.roomSize ?? '').toUpperCase() === 'LARGE';

  if (variant === 'compare') {
    // Untuk compare panel: return data — parent yang render
    return null;
  }

  return (
    <div className="rm-card-specs">
      <span>
        {getPublicRoomBathroom(room) === 'inside' ? '🚿' : '🪣'} KM {getPublicRoomBathroomLabel(room)}
      </span>
      <span>
        {getPublicRoomCooling(room) === 'ac' ? '❄️' : '🌬️'} {getPublicRoomCoolingLabel(room)}
      </span>
      <span>{isLarge ? '📐 Besar' : '📏 Standar'}</span>
      <span>{isMezzanine ? '🏗️ Mezzanine' : '🛏️ Biasa'}</span>
    </div>
  );
}