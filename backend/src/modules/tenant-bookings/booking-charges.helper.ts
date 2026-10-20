import { BadRequestException } from '@nestjs/common';
import { calculateOccupantSurcharge, ROOM_MAX_FREE_OCCUPANTS, ROOM_MAX_OCCUPANTS } from './pricing.helper';

export interface BookingChargeInput {
  baseRentRupiah: number;
  roomSize?: string | null;
  occupantCount?: number | null;
  hasPet?: boolean | null;
  petDepositRupiah?: number | null;
  defaultDepositRupiah?: number | null;
}

export interface BookingChargeResult {
  occupantCount: number;
  occupantSurchargeRupiah: number;
  agreedRentAmountRupiah: number;
  petDepositRupiah: number;
  depositAmountRupiah: number;
}

/**
 * F-02/F-12: satu aturan biaya booking untuk tiga kanal (publik, portal, walk-in).
 * Sewa final = sewa dasar + 20% per kepala ekstra (2+2 STANDARD / 4+2 LARGE);
 * deposit = default kamar + deposit hewan bila ada.
 */
export function calculateBookingCharges(input: BookingChargeInput): BookingChargeResult {
  const occupantCount = Math.max(1, Number(input.occupantCount ?? 1));
  const roomSizeKey = String(input.roomSize ?? '').toUpperCase();
  const hardCap = ROOM_MAX_OCCUPANTS[roomSizeKey] ?? (ROOM_MAX_FREE_OCCUPANTS[roomSizeKey] ?? 2) + 2;
  if (occupantCount > hardCap) {
    throw new BadRequestException(
      `Jumlah penghuni melebihi batas maksimal untuk kamar ${roomSizeKey === 'LARGE' ? 'besar' : 'standar'} (maks ${hardCap} orang).`,
    );
  }

  const baseRent = Number(input.baseRentRupiah ?? 0);
  const occupantSurchargeRupiah = calculateOccupantSurcharge(baseRent, input.roomSize, occupantCount);
  const petDepositRupiah = input.hasPet ? Number(input.petDepositRupiah ?? 100000) : 0;

  return {
    occupantCount,
    occupantSurchargeRupiah,
    agreedRentAmountRupiah: baseRent + occupantSurchargeRupiah,
    petDepositRupiah,
    depositAmountRupiah: Number(input.defaultDepositRupiah ?? 0) + petDepositRupiah,
  };
}
