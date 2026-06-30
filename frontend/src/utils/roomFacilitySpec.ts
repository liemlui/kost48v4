import type { Room } from '../types';

/**
 * Mirror frontend dari backend/src/modules/rooms/room-facility-spec.ts — JAGA SINKRON.
 * Menurunkan fasilitas yang seharusnya dimiliki kamar dari kriteria (category/roomType/roomSize/hasAc),
 * untuk ditampilkan ke tenant. Logika kategori→kamar mandi selaras dengan
 * frontend/src/utils/publicRoomDisplay.ts (getPublicRoomBathroom).
 */

export type FacilityKind = 'STRUCTURAL' | 'INVENTORY_BACKED';

export interface TenantFacilityChip {
  key: string;
  label: string;
  kind: FacilityKind;
}

type RoomCriteria = Pick<Room, 'category' | 'roomType' | 'roomSize'> & { hasAc?: boolean | null };

export function roomBathroomLabel(room: RoomCriteria): string {
  return String(room.category ?? '').toUpperCase() === 'ECONOMY' ? 'Kamar mandi luar' : 'Kamar mandi dalam';
}

export function roomSizeLabel(room: RoomCriteria): string {
  return String(room.roomSize ?? '').toUpperCase() === 'LARGE'
    ? 'Ukuran besar (~10,5m²)'
    : 'Ukuran standar (~7,5m²)';
}

export function roomMaxOccupants(room: RoomCriteria): number {
  return String(room.roomSize ?? '').toUpperCase() === 'LARGE' ? 4 : 2;
}

/** Label kapasitas AC. Semua kamar kos memakai AC ½ PK (keputusan owner; merek tak ditampilkan). */
export function acCapacityLabel(room: { hasAc?: boolean | null }): string | null {
  return room.hasAc ? '½ PK' : null;
}

export function expectedTenantFacilities(room: RoomCriteria): TenantFacilityChip[] {
  const list: TenantFacilityChip[] = [];

  // Pendingin
  if (room.hasAc) {
    list.push({ key: 'ac', label: 'AC', kind: 'INVENTORY_BACKED' });
  } else {
    list.push({ key: 'kipas', label: 'Kipas angin', kind: 'INVENTORY_BACKED' });
  }

  // Perabot wajib
  list.push({ key: 'kasur', label: 'Kasur', kind: 'INVENTORY_BACKED' });
  list.push({ key: 'lemari', label: 'Lemari', kind: 'INVENTORY_BACKED' });

  // Struktural
  list.push({ key: 'kamar-mandi', label: roomBathroomLabel(room), kind: 'STRUCTURAL' });
  if (String(room.roomType ?? '').toUpperCase() === 'MEZZANINE') {
    list.push({ key: 'mezzanine', label: 'Mezzanine / loteng', kind: 'STRUCTURAL' });
  }
  list.push({ key: 'ukuran', label: roomSizeLabel(room), kind: 'STRUCTURAL' });

  return list;
}
