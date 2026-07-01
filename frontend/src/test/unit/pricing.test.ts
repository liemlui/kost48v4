import { describe, it, expect } from 'vitest';
import {
  PRICING_MULTIPLIERS,
  roundUpToNearest,
  calculateRentByPricingTerm,
  isUtilitiesIncludedForPricingTerm,
  calculateOccupantSurcharge,
} from '../../utils/pricing';

describe('Y-M3 — pricing', () => {
  describe('roundUpToNearest', () => {
    it('membulatkan ke atas kelipatan 5000', () => {
      expect(roundUpToNearest(130_001)).toBe(135_000);
      expect(roundUpToNearest(130_000)).toBe(130_000);
    });
    it('amount <= 0 → 0', () => {
      expect(roundUpToNearest(0)).toBe(0);
      expect(roundUpToNearest(-100)).toBe(0);
    });
  });

  describe('calculateRentByPricingTerm', () => {
    it('MONTHLY = 1x', () => {
      expect(calculateRentByPricingTerm(1_000_000, 'MONTHLY')).toBe(1_000_000);
    });
    it('DAILY pakai multiplier lalu dibulatkan', () => {
      expect(calculateRentByPricingTerm(1_000_000, 'DAILY')).toBe(roundUpToNearest(1_000_000 * PRICING_MULTIPLIERS.DAILY));
    });
    it('YEARLY = 11x', () => {
      expect(calculateRentByPricingTerm(1_000_000, 'YEARLY')).toBe(11_000_000);
    });
    it('term tak dikenal → 0', () => {
      expect(calculateRentByPricingTerm(1_000_000, 'WHATEVER')).toBe(0);
    });
  });

  describe('isUtilitiesIncludedForPricingTerm', () => {
    it('DAILY/WEEKLY/BIWEEKLY termasuk utilitas', () => {
      expect(isUtilitiesIncludedForPricingTerm('DAILY')).toBe(true);
      expect(isUtilitiesIncludedForPricingTerm('WEEKLY')).toBe(true);
      expect(isUtilitiesIncludedForPricingTerm('BIWEEKLY')).toBe(true);
    });
    it('MONTHLY/SMESTERLY/YEARLY meteran terpisah', () => {
      expect(isUtilitiesIncludedForPricingTerm('MONTHLY')).toBe(false);
      expect(isUtilitiesIncludedForPricingTerm('YEARLY')).toBe(false);
    });
  });

  describe('calculateOccupantSurcharge', () => {
    it('di bawah/sama batas gratis → 0', () => {
      expect(calculateOccupantSurcharge(1_000_000, 'STANDARD', 2)).toBe(0);
      expect(calculateOccupantSurcharge(1_000_000, 'LARGE', 4)).toBe(0);
    });
    it('kelebihan penghuni → +20% per orang', () => {
      expect(calculateOccupantSurcharge(1_000_000, 'STANDARD', 3)).toBe(200_000);
      expect(calculateOccupantSurcharge(1_000_000, 'STANDARD', 4)).toBe(400_000);
    });
    it('roomSize null → default batas gratis 2', () => {
      expect(calculateOccupantSurcharge(1_000_000, null, 3)).toBe(200_000);
    });
  });
});
