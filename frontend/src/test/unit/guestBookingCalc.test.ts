import { describe, it, expect } from 'vitest';
import { getDurationOptions, computeCheckOutDate, formatDate } from '../../pages/bookings/guestBookingUtils';

describe('Y-M5 — guest booking calculation helpers', () => {
  describe('getDurationOptions', () => {
    it('DAILY memberi opsi hari', () => {
      const opts = getDurationOptions('DAILY');
      expect(opts[0]).toEqual({ value: 1, label: '1 Hari' });
      expect(opts.map((o) => o.value)).toEqual([1, 2, 3, 4, 5, 7, 10, 14]);
    });
    it('MONTHLY memberi opsi bulan', () => {
      expect(getDurationOptions('MONTHLY').map((o) => o.value)).toEqual([1, 2, 3, 4, 6, 12]);
    });
    it('term tak dikenal → default bulan', () => {
      expect(getDurationOptions('???').map((o) => o.value)).toEqual([1, 2, 3, 4, 6, 12]);
    });
  });

  describe('computeCheckOutDate', () => {
    it('MONTHLY menambah bulan', () => {
      expect(computeCheckOutDate('2026-01-01', 'MONTHLY', 3)).toBe('2026-04-01');
    });
    it('DAILY menambah hari', () => {
      expect(computeCheckOutDate('2026-01-01', 'DAILY', 5)).toBe('2026-01-06');
    });
    it('YEARLY menambah tahun', () => {
      expect(computeCheckOutDate('2026-01-01', 'YEARLY', 1)).toBe('2027-01-01');
    });
    it('count <= 0 atau tanggal invalid → string kosong', () => {
      expect(computeCheckOutDate('2026-01-01', 'MONTHLY', 0)).toBe('');
      expect(computeCheckOutDate('bukan-tanggal', 'MONTHLY', 1)).toBe('');
      expect(computeCheckOutDate('', 'MONTHLY', 1)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('memformat ISO ke tanggal id-ID', () => {
      expect(formatDate('2026-01-15')).toBe('15 Januari 2026');
    });
    it('string kosong → kosong', () => {
      expect(formatDate('')).toBe('');
    });
    it('ISO invalid → dikembalikan apa adanya', () => {
      expect(formatDate('bukan-tanggal')).toBe('bukan-tanggal');
    });
  });
});
