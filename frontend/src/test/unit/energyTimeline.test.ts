import { describe, expect, it } from 'vitest';
import { timelineBucket, timelineLabel } from '../../pages/portal/EnergyPage';

describe('timeline energi', () => {
  it('mengelompokkan tanggal secara konsisten untuk harian, mingguan, dan bulanan', () => {
    expect(timelineBucket('2026-07-29', 'daily')).toBe('2026-07-29');
    expect(timelineBucket('2026-07-29', 'weekly')).toBe('2026-07-27');
    expect(timelineBucket('2026-07-29', 'monthly')).toBe('2026-07');
  });

  it('membuat label bulanan dari tanggal eksplisit yang portabel', () => {
    expect(timelineLabel('2026-07', 'monthly')).toMatch(/Jul 26/i);
    expect(timelineLabel('2026-07-27', 'weekly')).toMatch(/27 Jul/i);
  });
});
