import { describe, it, expect } from 'vitest';
import { estimateVacancy } from '../../utils/vacancyEstimate';

const TODAY = new Date('2026-10-22T08:00:00+07:00');

function daysAgo(days: number) {
  return new Date(TODAY.getTime() - days * 86400000).toISOString();
}

describe('estimateVacancy — perkiraan peluang kamar kosong', () => {
  it('kamar yang sudah kosong bernilai 100', () => {
    const result = estimateVacancy({ status: 'AVAILABLE' }, TODAY);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Kosong');
  });

  it('penghuni baru (<3 bulan) yang kontraknya habis ≤7 hari → cenderung kosong', () => {
    const result = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(40),
        plannedCheckOutDate: new Date(TODAY.getTime() + 5 * 86400000).toISOString(),
        remainingDays: 5,
      },
      TODAY,
    );
    expect(result.score).toBe(75);
    expect(result.label).toBe('Cenderung kosong');
  });

  it('penghuni lama (>1 tahun) dengan sisa kontrak ~45 hari → cenderung lanjut', () => {
    const result = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(400),
        plannedCheckOutDate: new Date(TODAY.getTime() + 45 * 86400000).toISOString(),
        remainingDays: 45,
      },
      TODAY,
    );
    expect(result.score).toBe(15);
    expect(result.label).toBe('Cenderung lanjut');
  });

  it('perpanjangan pending menurunkan peluang kosong', () => {
    const result = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(100),
        plannedCheckOutDate: new Date(TODAY.getTime() + 20 * 86400000).toISOString(),
        remainingDays: 20,
        hasPendingRenew: true,
      },
      TODAY,
    );
    expect(result.score).toBe(10);
    expect(result.label).toBe('Cenderung lanjut');
  });
});
