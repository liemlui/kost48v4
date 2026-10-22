import { describe, it, expect } from 'vitest';
import { estimateVacancy } from '../../utils/vacancyEstimate';

const TODAY = new Date('2026-10-22T08:00:00+07:00');

function daysAgo(days: number) {
  return new Date(TODAY.getTime() - days * 86400000).toISOString();
}

function ahead(days: number) {
  return new Date(TODAY.getTime() + days * 86400000).toISOString();
}

describe('estimateVacancy — perkiraan peluang kamar kosong', () => {
  it('kamar yang sudah kosong bernilai 100', () => {
    const result = estimateVacancy({ status: 'AVAILABLE' }, TODAY);
    expect(result.score).toBe(100);
    expect(result.status).toBe('KOSONG');
    expect(result.hasData).toBe(true);
  });

  it('penghuni baru (<3 bulan) yang kontraknya habis ≤7 hari → kemungkinan kosong tinggi', () => {
    const result = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(40),
        plannedCheckOutDate: ahead(5),
        remainingDays: 5,
      },
      TODAY,
    );
    expect(result.score).toBe(63);
    expect(result.status).toBe('CENDERUNG_KOSONG');
    expect(result.label).toBe('Kemungkinan kosong: tinggi');
  });

  it('kontrak sudah LEWAT tidak otomatis "akan keluar" bagi penghuni lama', () => {
    const baru = estimateVacancy(
      { status: 'OCCUPIED', checkInDate: daysAgo(45), remainingDays: 0 },
      TODAY,
    );
    const lama = estimateVacancy(
      { status: 'OCCUPIED', checkInDate: daysAgo(900), remainingDays: 0 },
      TODAY,
    );
    expect(lama.score).toBeLessThan(baru.score);
    expect(lama.status).toBe('CENDERUNG_LANJUT');
  });

  it('penghuni lama (>2 tahun) dengan sisa kontrak ~120 hari → kemungkinan kosong rendah', () => {
    const result = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(800),
        plannedCheckOutDate: ahead(120),
        remainingDays: 120,
      },
      TODAY,
    );
    expect(result.score).toBe(4);
    expect(result.status).toBe('CENDERUNG_LANJUT');
  });

  it('perpanjangan pending menurunkan peluang kosong', () => {
    const base = estimateVacancy(
      { status: 'OCCUPIED', checkInDate: daysAgo(100), plannedCheckOutDate: ahead(20), remainingDays: 20 },
      TODAY,
    );
    const withRenew = estimateVacancy(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(100),
        plannedCheckOutDate: ahead(20),
        remainingDays: 20,
        hasPendingRenew: true,
        renewStatus: 'PENDING',
      },
      TODAY,
    );
    expect(withRenew.score).toBeLessThan(base.score);
  });

  it('perpanjangan DISETUJUI lebih menurunkan peluang kosong daripada yang masih pending', () => {
    const pending = estimateVacancy(
      { status: 'OCCUPIED', checkInDate: daysAgo(60), remainingDays: 0, hasPendingRenew: true, renewStatus: 'PENDING' },
      TODAY,
    );
    const approved = estimateVacancy(
      { status: 'OCCUPIED', checkInDate: daysAgo(60), remainingDays: 0, hasPendingRenew: true, renewStatus: 'APPROVED' },
      TODAY,
    );
    expect(approved.score).toBeLessThan(pending.score);
    expect(approved.status).toBe('CENDERUNG_LANJUT');
  });

  it('ARAH: semakin lama tinggal, peluang kosong tidak pernah naik (monoton turun)', () => {
    // Aturan owner: baru 1 bulan > 6 bulan > 12 bulan > 24 bulan.
    const tenureDays = [30, 60, 90, 120, 180, 300, 364, 365, 400, 545, 730, 1095, 2000];
    for (const remaining of [0, 5, 20, 45, 90, 150, 400]) {
      const scores = tenureDays.map((tenure) => estimateVacancy(
        { status: 'OCCUPIED', checkInDate: daysAgo(tenure), remainingDays: remaining },
        TODAY,
      ).score);
      for (let i = 1; i < scores.length; i += 1) {
        expect(
          scores[i],
          `sisa kontrak ${remaining}: tenure ${tenureDays[i - 1]}→${tenureDays[i]} naik ${scores[i - 1]}→${scores[i]}`,
        ).toBeLessThanOrEqual(scores[i - 1]);
      }
    }
  });

  it('ARAH: fixture 4 kamar — urutan skor mengikuti lama tinggal, bukan sisa kontrak saja', () => {
    const rooms = [
      { code: 'BARU-1BLN', tenure: 30, remaining: 30 },
      { code: 'ENAM-6BLN', tenure: 182, remaining: 30 },
      { code: 'SETAHUN-12BLN', tenure: 365, remaining: 30 },
      { code: 'LAMA-24BLN', tenure: 730, remaining: 30 },
    ].map((room) => ({
      ...room,
      estimate: estimateVacancy(
        { status: 'OCCUPIED', checkInDate: daysAgo(room.tenure), remainingDays: room.remaining },
        TODAY,
      ),
    }));
    const scores = rooms.map((r) => r.estimate.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(4);
    expect(rooms[0].estimate.status).toBe('MUNGKIN');
    expect(rooms[3].estimate.status).toBe('CENDERUNG_LANJUT');
    expect(rooms[0].estimate.score).toBeGreaterThan(rooms[3].estimate.score);
  });

  it('TIDAK MENGARANG: tanpa tanggal kontrak tidak ada pita perkiraan', () => {
    for (const status of ['MAINTENANCE', 'RESERVED', 'OCCUPIED']) {
      const result = estimateVacancy({ status, checkInDate: null, plannedCheckOutDate: null, remainingDays: 0 }, TODAY);
      expect(result.status).toBe('TIDAK_DIKETAHUI');
      expect(result.hasData).toBe(false);
      expect(result.label).not.toMatch(/kemungkinan kosong/i);
    }
    const noData = estimateVacancy({ status: 'OCCUPIED', remainingDays: null, checkInDate: null }, TODAY);
    expect(noData.hasData).toBe(false);
  });

  it('TIDAK MENGARANG: nama pita selalu salah satu dari daftar tetap', () => {
    const allowed = new Set([
      'Kosong',
      'Belum ada data kontrak',
      'Kemungkinan kosong: tinggi',
      'Kemungkinan kosong: sedang',
      'Kemungkinan kosong: rendah',
    ]);
    for (const status of ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']) {
      for (const tenure of [null, 10, 120, 400, 900]) {
        const result = estimateVacancy(
          { status, checkInDate: tenure == null ? null : daysAgo(tenure), remainingDays: 0 },
          TODAY,
        );
        expect(allowed.has(result.label), `label tak terdaftar: ${result.label}`).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    }
  });
});
