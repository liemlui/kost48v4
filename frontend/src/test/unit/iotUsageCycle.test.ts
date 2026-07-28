import { describe, expect, it } from 'vitest';
import { getUsageCycle, hasCumulativeReset } from '../../pages/iot/IotOverviewPage';

describe('siklus pemakaian IoT owner', () => {
  it('mengikuti tanggal masuk dalam zona Asia/Jakarta', () => {
    const cycle = getUsageCycle('2026-05-05T00:00:00+07:00', new Date('2026-07-03T12:00:00+07:00'));
    expect(cycle?.start.toISOString()).toBe('2026-06-04T17:00:00.000Z');
    expect(cycle?.end.toISOString()).toBe('2026-07-04T17:00:00.000Z');
  });

  it('menjepit anchor akhir bulan tanpa bergeser ke bulan berikutnya', () => {
    const cycle = getUsageCycle('2026-01-31T00:00:00+07:00', new Date('2026-02-15T12:00:00+07:00'));
    expect(cycle?.start.toISOString()).toBe('2026-01-30T17:00:00.000Z');
    expect(cycle?.end.toISOString()).toBe('2026-02-27T17:00:00.000Z');
  });
});

describe('reset counter kumulatif', () => {
  it('mendeteksi counter yang turun lalu kembali melampaui baseline', () => {
    expect(hasCumulativeReset([100, 112, 4, 130])).toBe(true);
  });

  it('menerima rangkaian kumulatif yang stabil atau naik', () => {
    expect(hasCumulativeReset([100, 100, 112, 130])).toBe(false);
  });
});
