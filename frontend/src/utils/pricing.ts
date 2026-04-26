/** Pricing multipliers derived from monthly rent (same as backend). */
export const PRICING_MULTIPLIERS: Record<string, number> = {
  DAILY: 0.13,
  WEEKLY: 0.45,
  BIWEEKLY: 0.75,
  MONTHLY: 1.0,
  SMESTERLY: 5.5,
  YEARLY: 10.0,
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

export const ALL_PRICING_TERMS = [
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'SMESTERLY',
  'YEARLY',
] as const;