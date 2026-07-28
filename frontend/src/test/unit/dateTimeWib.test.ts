import { describe, expect, it } from 'vitest';
import { toDateKeyWib } from '../../utils/dateTime';

describe('toDateKeyWib', () => {
  it('mengikuti pergantian hari Asia/Jakarta, bukan timezone browser', () => {
    expect(toDateKeyWib('2026-07-05T16:59:59.000Z')).toBe('2026-07-05');
    expect(toDateKeyWib('2026-07-05T17:00:00.000Z')).toBe('2026-07-06');
  });

  it('mengembalikan string kosong untuk tanggal tidak valid', () => {
    expect(toDateKeyWib('bukan-tanggal')).toBe('');
  });
});
