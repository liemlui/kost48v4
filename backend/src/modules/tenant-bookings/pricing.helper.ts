import { PricingTerm } from '../../common/enums/app.enums';

/** Nearest value to round up to (in Rupiah). */
export const PRICING_ROUND_TO = 5000;

/**
 * Pricing multipliers derived from monthly rent.
 *
 * DAILY = 13% × monthly rent, utilities included.
 * WEEKLY = 45% × monthly rent, utilities included.
 * BIWEEKLY = 75% × monthly rent, utilities included.
 * MONTHLY = 100% × monthly rent, utilities metered.
 * SMESTERLY = 5.5 × monthly rent, utilities metered.
 * YEARLY = 10 × monthly rent, utilities metered.
 */
export const PRICING_MULTIPLIERS: Record<PricingTerm, number> = {
  DAILY: 0.13,
  WEEKLY: 0.45,
  BIWEEKLY: 0.75,
  MONTHLY: 1.0,
  SMESTERLY: 5.5,
  YEARLY: 10.0,
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