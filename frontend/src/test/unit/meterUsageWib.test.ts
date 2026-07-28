import { describe, expect, it } from 'vitest';
import type { MeterReading } from '../../types';
import { buildMeterRows, categorizeReadings } from '../../utils/meterUsage';

function reading(id: number, readingAt: string, readingValue: number): MeterReading {
  return { id, roomId: 1, utilityType: 'ELECTRICITY', readingAt, readingValue };
}

describe('meterUsage dengan kalender WIB', () => {
  it('mengelompokkan pembacaan setelah 17:00 UTC ke tanggal WIB berikutnya', () => {
    const rows = buildMeterRows([
      reading(1, '2026-07-31T16:30:00.000Z', 100),
      reading(2, '2026-07-31T17:30:00.000Z', 105),
    ]);

    expect(rows.map((row) => row.dateKey)).toEqual(['2026-07-31', '2026-08-01']);
    expect(rows[1].usageElectricityKwh).toBe(5);
  });

  it('membandingkan tanggal masuk dan pembacaan memakai hari WIB', () => {
    const before = reading(1, '2026-07-05T16:59:59.000Z', 100);
    const since = reading(2, '2026-07-05T18:00:00.000Z', 105);

    const categorized = categorizeReadings([before, since], '2026-07-06');

    expect(categorized.beforeCheckIn.map((item) => item.id)).toEqual([1]);
    expect(categorized.sinceCheckIn.map((item) => item.id)).toEqual([2]);
  });
});
