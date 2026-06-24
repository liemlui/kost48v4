/** Pricing multipliers derived from monthly rent — harus sinkron dengan backend pricing.helper.ts. */
export const PRICING_MULTIPLIERS: Record<string, number> = {
  DAILY: 0.13,
  WEEKLY: 0.5,
  BIWEEKLY: 0.75,
  MONTHLY: 1.0,
  SMESTERLY: 5.7,
  YEARLY: 11.0,
};

export const PRICING_ROUND_TO = 5000;

/** Round up to the nearest multiple of `nearest`. */
export function roundUpToNearest(amount: number, nearest = PRICING_ROUND_TO): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / nearest) * nearest;
}

/** Calculate the rent for a given pricing term based on the room's monthly rate. */
export function calculateRentByPricingTerm(
  monthlyRateRupiah: number,
  pricingTerm: string,
): number {
  const multiplier = PRICING_MULTIPLIERS[pricingTerm];
  if (multiplier === undefined) return 0;
  const raw = monthlyRateRupiah * multiplier;
  return roundUpToNearest(raw);
}

/**
 * Which pricing terms have utilities included in the rent.
 * DAILY, WEEKLY, BIWEEKLY include utilities. Others are metered separately.
 */
export function isUtilitiesIncludedForPricingTerm(pricingTerm: string): boolean {
  return ['DAILY', 'WEEKLY', 'BIWEEKLY'].includes(pricingTerm);
}

/** Max free occupants per room size. Excess → +20% of base rent per extra person. */
export const ROOM_MAX_FREE_OCCUPANTS: Record<string, number> = {
  STANDARD: 2,
  LARGE: 4,
};

/**
 * Hard cap penghuni per ukuran kamar (batas booking sistem).
 * Extra bed mengisi hampir seluruh lantai kamar, tidak nyaman di atas batas ini.
 * Keputusan owner D-24: maks +2 orang ekstra per ukuran.
 */
export const ROOM_MAX_OCCUPANTS: Record<string, number> = {
  STANDARD: 4,
  LARGE: 6,
};

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

export const ALL_PRICING_TERMS = [
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'SMESTERLY',
  'YEARLY',
] as const;