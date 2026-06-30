/**
 * Spec "expected facility" kanonik — sumber kebenaran rekonsiliasi Fasilitas ↔ Inventaris.
 *
 * Menurunkan daftar fasilitas yang SEHARUSNYA dimiliki kamar dari KRITERIA kamar
 * (category / roomType / roomSize / hasAc). Tiap fasilitas ditandai:
 *  - STRUCTURAL      → sudah termasuk kategori (kamar mandi, mezzanine, ukuran) → TIDAK perlu inventaris.
 *  - INVENTORY_BACKED → barang fisik (AC, kipas, kasur, lemari) → WAJIB ada RoomItem yang cocok.
 *
 * Input sengaja longgar (string) agar tahan beda identitas enum Prisma vs app.enums,
 * dan agar mudah di-mirror di frontend (lihat frontend/src/utils/roomFacilitySpec.ts — JAGA SINKRON).
 */

export type FacilityKind = 'STRUCTURAL' | 'INVENTORY_BACKED';

export interface ExpectedFacility {
  key: string;
  label: string;
  kind: FacilityKind;
  /** true → kekurangan jadi gap kritis (mis. AC). */
  critical?: boolean;
  /** kata kunci pencocokan ke InventoryItem.name (lowercase) untuk INVENTORY_BACKED. */
  nameMatchers?: string[];
}

export interface RoomCriteriaInput {
  category?: string | null;
  roomType?: string | null;
  roomSize?: string | null;
  hasAc?: boolean | null;
}

export function getRoomBathroomKind(category?: string | null): 'inside' | 'outside' {
  // Selaras frontend/src/utils/publicRoomDisplay.ts getPublicRoomBathroom:
  // ECONOMY = kamar mandi luar/shared; STANDARD/DELUXE = kamar mandi dalam.
  return String(category ?? '').toUpperCase() === 'ECONOMY' ? 'outside' : 'inside';
}

export function getRoomSizeLabel(roomSize?: string | null): string {
  return String(roomSize ?? '').toUpperCase() === 'LARGE'
    ? 'Ukuran besar (~10,5m²)'
    : 'Ukuran standar (~7,5m²)';
}

export function getRoomMaxOccupants(roomSize?: string | null): number {
  return String(roomSize ?? '').toUpperCase() === 'LARGE' ? 4 : 2;
}

export function expectedFacilities(room: RoomCriteriaInput): ExpectedFacility[] {
  const list: ExpectedFacility[] = [];

  // Pendingin (INVENTORY_BACKED): AC bila hasAc, selain itu kipas.
  if (room.hasAc) {
    list.push({
      key: 'ac',
      label: 'AC',
      kind: 'INVENTORY_BACKED',
      critical: true,
      nameMatchers: ['ac', 'pendingin', 'air cond', 'aircon'],
    });
  } else {
    list.push({
      key: 'kipas',
      label: 'Kipas angin',
      kind: 'INVENTORY_BACKED',
      nameMatchers: ['kipas', 'fan'],
    });
  }

  // Perabot wajib (INVENTORY_BACKED).
  list.push({ key: 'kasur', label: 'Kasur', kind: 'INVENTORY_BACKED', nameMatchers: ['kasur', 'bed', 'spring'] });
  list.push({ key: 'lemari', label: 'Lemari', kind: 'INVENTORY_BACKED', nameMatchers: ['lemari', 'almari', 'wardrobe'] });

  // Struktural (cukup dari kategori — tidak perlu inventaris).
  list.push({
    key: 'kamar-mandi',
    label: getRoomBathroomKind(room.category) === 'inside' ? 'Kamar mandi dalam' : 'Kamar mandi luar',
    kind: 'STRUCTURAL',
  });
  if (String(room.roomType ?? '').toUpperCase() === 'MEZZANINE') {
    list.push({ key: 'mezzanine', label: 'Mezzanine / loteng', kind: 'STRUCTURAL' });
  }
  list.push({ key: 'ukuran', label: getRoomSizeLabel(room.roomSize), kind: 'STRUCTURAL' });

  return list;
}

// ── Gap computation (dipakai RoomsService & MarketingPublicRoomsService — sumber tunggal) ──

export type FacilityCheckStatus = 'OK' | 'PRESENT_PROBLEM' | 'MISSING' | 'UNLINKED';

export interface GapRoomItem {
  id: number;
  status: string;
  item?: { name?: string | null } | null;
}
export interface GapRoomFacility {
  inventoryItemId?: number | null;
}
export interface FacilityGapInput extends RoomCriteriaInput {
  roomItems?: GapRoomItem[];
  facilities?: GapRoomFacility[];
}

export interface FacilityCheckItem {
  key: string;
  label: string;
  kind: FacilityKind;
  critical: boolean;
  status: FacilityCheckStatus;
  matchedRoomItemId: number | null;
  matchedInventoryItemId: number | null;
}
export interface FacilityCheck {
  hasGap: boolean;
  acGap: boolean;
  items: FacilityCheckItem[];
}

/**
 * Bandingkan expected facility dengan RoomItem aktual. Murni (tanpa I/O).
 * Matching: name-match InventoryItem.name vs nameMatchers. STRUCTURAL selalu OK.
 * UNLINKED bila tak ada item cocok namun kamar punya fasilitas yang tertaut ke gudang.
 */
export function computeFacilityGap(room: FacilityGapInput): FacilityCheck {
  const roomItems = room.roomItems ?? [];
  const facilities = room.facilities ?? [];
  const hasAnyLink = facilities.some((f) => typeof f.inventoryItemId === 'number');

  const items: FacilityCheckItem[] = expectedFacilities(room).map((spec) => {
    const base = {
      key: spec.key,
      label: spec.label,
      kind: spec.kind,
      critical: Boolean(spec.critical),
      matchedRoomItemId: null as number | null,
      matchedInventoryItemId: null as number | null,
    };

    if (spec.kind === 'STRUCTURAL') {
      return { ...base, status: 'OK' as FacilityCheckStatus };
    }

    const matchers = (spec.nameMatchers ?? []).map((m) => m.toLowerCase());
    const matched = roomItems.find((ri) => {
      const name = String(ri.item?.name ?? '').toLowerCase();
      return matchers.some((m) => name.includes(m));
    });

    if (matched) {
      const ok = String(matched.status ?? '').toUpperCase() === 'GOOD';
      return {
        ...base,
        matchedRoomItemId: matched.id,
        status: (ok ? 'OK' : 'PRESENT_PROBLEM') as FacilityCheckStatus,
      };
    }

    const status: FacilityCheckStatus = hasAnyLink ? 'UNLINKED' : 'MISSING';
    return { ...base, status };
  });

  const inventoryBacked = items.filter((it) => it.kind === 'INVENTORY_BACKED');
  const hasGap = inventoryBacked.some((it) => it.status === 'MISSING' || it.status === 'UNLINKED');
  const acGap = Boolean(room.hasAc) && items.some((it) => it.key === 'ac' && (it.status === 'MISSING' || it.status === 'UNLINKED'));

  return { hasGap, acGap, items };
}
