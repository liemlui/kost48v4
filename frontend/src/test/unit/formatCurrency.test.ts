import { describe, it, expect } from 'vitest';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';

// normalisasi non-breaking space yg dipakai Intl id-ID
const norm = (s: string) => s.replace(/ /g, ' ');

describe('Y-M1 — formatCurrency', () => {
  describe('formatRupiah', () => {
    it('format angka besar jadi Rupiah bertitik', () => {
      expect(norm(formatRupiah(1_500_000))).toMatch(/^Rp\s?1\.500\.000$/);
    });
    it('0 → "Rp 0"', () => {
      expect(formatRupiah(0)).toBe('Rp 0');
    });
    it('null/undefined → "-"', () => {
      expect(formatRupiah(null)).toBe('-');
      expect(formatRupiah(undefined)).toBe('-');
    });
    it('string numerik di-parse', () => {
      expect(norm(formatRupiah('2500000'))).toMatch(/^Rp\s?2\.500\.000$/);
    });
    it('string non-numerik / NaN → "-"', () => {
      expect(formatRupiah('abc')).toBe('-');
      expect(formatRupiah(NaN)).toBe('-');
    });
  });

  describe('formatRupiahWithoutSymbol', () => {
    it('tanpa simbol Rp', () => {
      expect(formatRupiahWithoutSymbol(1_500_000)).toBe('1.500.000');
    });
    it('0 → "0"', () => {
      expect(formatRupiahWithoutSymbol(0)).toBe('0');
    });
    it('null → "-"', () => {
      expect(formatRupiahWithoutSymbol(null)).toBe('-');
    });
  });
});
