import { describe, expect, it } from 'vitest';
import { isVacancyStart, pickVacancyStarts } from '../../utils/vacancyCalendar';
import { estimateVacancyOnDate, type VacancyOnDateEstimate } from '../../utils/vacancyEstimate';

/** Bangun estimate minimal — bentuknya mengikuti keluaran `estimateVacancyOnDate`. */
function estimate(partial: Partial<VacancyOnDateEstimate> = {}): VacancyOnDateEstimate {
  return {
    chance: 'TINGGI',
    score: 60,
    basis: 'KONTRAK_BERAKHIR',
    vacantFrom: '2026-11-04',
    reason: 'kontrak berakhir 4/11',
    hasData: true,
    ...partial,
  };
}

describe('vacancyCalendar — peristiwa "kamar mulai kosong"', () => {
  it('menampilkan kamar tepat di tanggal vacantFrom-nya', () => {
    expect(isVacancyStart(estimate(), '2026-11-04')).toBe(true);
  });

  it('tidak mengulang kamar di hari setelah tanggal kosong (bukan kumulatif)', () => {
    expect(isVacancyStart(estimate(), '2026-11-05')).toBe(false);
    expect(isVacancyStart(estimate(), '2026-11-30')).toBe(false);
  });

  it('tidak menampilkan kamar sebelum tanggal kosong', () => {
    expect(isVacancyStart(estimate(), '2026-11-03')).toBe(false);
  });

  it('peluang SEDANG (checkout diajukan) tetap tampil di tanggalnya', () => {
    expect(isVacancyStart(estimate({ chance: 'SEDANG', basis: 'CHECKOUT_DIAJUKAN' }), '2026-11-04')).toBe(true);
  });

  it('kamar yang diperpanjang (peluang ditekan ke RENDAH) tidak tampil walau tanggalnya cocok', () => {
    expect(isVacancyStart(estimate({ chance: 'RENDAH', reason: 'kontrak berakhir 4/11 · sudah diperpanjang' }), '2026-11-04')).toBe(false);
  });

  it('kamar tanpa dasar tanggal (vacantFrom null) tidak pernah tampil', () => {
    expect(isVacancyStart(estimate({ vacantFrom: null, chance: 'BELUM_ADA_INFO', hasData: false }), '2026-11-04')).toBe(false);
  });

  it('kamar yang sudah kosong (basis SUDAH_KOSONG, tanpa tanggal) tidak muncul sebagai peristiwa', () => {
    expect(isVacancyStart(estimate({ basis: 'SUDAH_KOSONG', vacantFrom: null, score: 100 }), '2026-11-04')).toBe(false);
  });

  it('menerima tanggal berjam (ISO datetime) dengan memotong 10 karakter pertama', () => {
    expect(isVacancyStart(estimate(), '2026-11-04T00:00:00')).toBe(true);
  });

  it('pickVacancyStarts menyaring dan mempertahankan urutan masukan', () => {
    const items = [
      { code: 'C', vacancy: estimate({ vacantFrom: '2026-11-04' }) },
      { code: 'F1', vacancy: estimate({ vacantFrom: '2026-11-07' }) },
      { code: 'A', vacancy: estimate({ vacantFrom: '2026-11-04', chance: 'SEDANG' }) },
      { code: 'B', vacancy: estimate({ vacantFrom: '2026-10-20' }) },
    ];
    expect(pickVacancyStarts(items, '2026-11-04').map((item) => item.code)).toEqual(['C', 'A']);
    expect(pickVacancyStarts(items, '2026-11-07').map((item) => item.code)).toEqual(['F1']);
    expect(pickVacancyStarts(items, '2026-11-08')).toEqual([]);
  });

  it('kontrak lewat (bulanan bergulir, P34 a) muncul di siklus berikutnya — bukan diulang tiap hari', () => {
    // Estimator milik `vacancyEstimate.ts`; berkas ini hanya memilih, jadi bukti
    // "satu sumber" diuji dengan merangkai keduanya pada data kontrak nyata.
    const room = {
      status: 'OCCUPIED',
      checkInDate: '2026-09-01',
      plannedCheckOutDate: '2026-10-01',
      remainingDays: 0,
      pricingTerm: 'MONTHLY',
    };

    // Tepat di tanggal akhir kontrak: belum digulirkan, jadi masih peristiwa tanggal itu.
    const atOldDate = estimateVacancyOnDate(room, '2026-10-01');
    expect(atOldDate.vacantFrom).toBe('2026-10-01');
    expect(isVacancyStart(atOldDate, '2026-10-01')).toBe(true);

    // Sesudah kontrak lewat: peristiwa pindah ke siklus bulan berikutnya dan TIDAK
    // diulang di setiap hari setelah tanggal lama.
    for (const iso of ['2026-10-02', '2026-10-15', '2026-10-31']) {
      const estimateAfter = estimateVacancyOnDate(room, iso);
      expect(estimateAfter.vacantFrom, iso).toBe('2026-11-01');
      expect(isVacancyStart(estimateAfter, iso), iso).toBe(false);
    }

    const atCycle = estimateVacancyOnDate(room, '2026-11-01');
    expect(atCycle.vacantFrom).toBe('2026-11-01');
    expect(isVacancyStart(atCycle, '2026-11-01')).toBe(true);
  });
});
