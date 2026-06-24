import { PricingTerm } from '../../common/enums/app.enums';

/** Nearest value to round up to (in Rupiah). */
export const PRICING_ROUND_TO = 5000;

/**
 * Pricing multipliers derived from monthly rent.
 *
 * DAILY = 13% × monthly rent, utilities included.
 * WEEKLY = 50% × monthly rent, utilities included.
 * BIWEEKLY = 75% × monthly rent, utilities included.
 * MONTHLY = 100% × monthly rent, utilities metered.
 * SMESTERLY = 5.7 × monthly rent, utilities metered.
 * YEARLY = 11 × monthly rent, utilities metered.
 */
export const PRICING_MULTIPLIERS: Record<PricingTerm, number> = {
  DAILY: 0.13,
  WEEKLY: 0.5,
  BIWEEKLY: 0.75,
  MONTHLY: 1.0,
  SMESTERLY: 5.7,
  YEARLY: 11.0,
};

/** Round up to the nearest multiple of `nearest`. */
export function roundUpToNearest(amount: number, nearest = PRICING_ROUND_TO): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / nearest) * nearest;
}

/** Calculate the rent for a given pricing term based on the room's monthly rate. */
export function calculateRentByPricingTerm(
  monthlyRateRupiah: number,
  pricingTerm: PricingTerm,
): number {
  const multiplier = PRICING_MULTIPLIERS[pricingTerm];
  if (multiplier === undefined) return 0;
  const raw = monthlyRateRupiah * multiplier;
  return roundUpToNearest(raw);
}

/** Which pricing terms have utilities included in the rent. */
export function isUtilitiesIncludedForPricingTerm(pricingTerm: PricingTerm): boolean {
  return [PricingTerm.DAILY, PricingTerm.WEEKLY, PricingTerm.BIWEEKLY].includes(pricingTerm);
}

/**
 * Max free occupants per room size (tidak kena surcharge).
 * Melebihi batas ini → +20% sewa per kepala ekstra.
 */
export const ROOM_MAX_FREE_OCCUPANTS: Record<string, number> = {
  STANDARD: 2,
  LARGE: 4,
};

/**
 * Hard cap penghuni per ukuran kamar (batas booking sistem).
 * Maks tambahan = 2 orang ekstra — lebih dari itu kamar tidak lagi layak huni
 * (extra bed mengisi hampir seluruh lantai). Keputusan owner D-24.
 */
export const ROOM_MAX_OCCUPANTS: Record<string, number> = {
  STANDARD: 4, // 2 free + maks 2 ekstra (tidak direkomendasikan di atas 2)
  LARGE: 6,    // 4 free + maks 2 ekstra (tidak direkomendasikan di atas 4)
};

/**
 * Calculate extra-occupant surcharge.
 * @param baseRent - rent for the chosen pricing term (no surcharge)
 * @param roomSize - 'STANDARD' | 'LARGE' | null
 * @param occupantCount - total number of occupants
 */
export function calculateOccupantSurcharge(
  baseRent: number,
  roomSize: string | null | undefined,
  occupantCount: number,
): number {
  const key = String(roomSize ?? '').toUpperCase();
  const maxFree = ROOM_MAX_FREE_OCCUPANTS[key] ?? 2;
  const extra = Math.max(0, occupantCount - maxFree);
  if (extra === 0) return 0;
  return roundUpToNearest(baseRent * 0.20 * extra);
}