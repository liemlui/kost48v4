import { describe, it, expect } from 'vitest';
import {
  VACANCY_WEIGHT_TABLE,
  estimateVacancy,
  estimateVacancyOnDate,
  rollsMonthly,
  termRisk,
} from '../../utils/vacancyEstimate';

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

/* ── Peluang kosong PER TANGGAL (keputusan owner 23 Okt 2026) ─────────────── */

function ymd(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

/** 14 tanggal berturut-turut mulai hari ini — periode uji khas heatmap. */
const FOURTEEN_DAYS = Array.from({ length: 14 }, (_, index) =>
  ymd(new Date(TODAY.getTime() + index * 86400000)),
);

describe('estimateVacancyOnDate — peluang kosong per tanggal', () => {
  it('tanggal SEBELUM tanggal mulai kosong selalu "rendah" (1 kamar × 14 tanggal)', () => {
    const contractEnd = ahead(5);
    const results = FOURTEEN_DAYS.map((date) =>
      estimateVacancyOnDate(
        {
          status: 'OCCUPIED',
          checkInDate: daysAgo(40),
          plannedCheckOutDate: contractEnd,
          remainingDays: 5,
        },
        date,
      ),
    );

    const before = results.filter((_, index) => FOURTEEN_DAYS[index] < ymd(contractEnd));
    // 22–26 Okt (5 tanggal) masih sebelum kontrak berakhir 27 Okt.
    expect(before).toHaveLength(5);
    for (const result of before) {
      expect(result.chance).toBe('RENDAH');
      expect(result.hasData).toBe(true);
      expect(result.basis).toBe('KONTRAK_BERAKHIR');
    }

    // Mulai tanggal kontrak berakhir, peluangnya tidak lagi dipaksa rendah.
    const after = results.filter((_, index) => FOURTEEN_DAYS[index] >= ymd(contractEnd));
    expect(after).toHaveLength(9);
    expect(after.some((result) => result.chance !== 'RENDAH')).toBe(true);
  });

  it('checkout APPROVED menang atas PENDING, dan keduanya menang atas tanggal kontrak', () => {
    const base = {
      status: 'OCCUPIED',
      checkInDate: daysAgo(40),
      plannedCheckOutDate: ahead(30),
      remainingDays: 30,
    };
    const date = ymd(ahead(20)); // sebelum kontrak habis, sesudah kedua tanggal pengajuan

    const approved = estimateVacancyOnDate(
      { ...base, checkoutRequest: { status: 'APPROVED', requestedCheckOutDate: ahead(3) } },
      date,
    );
    const pending = estimateVacancyOnDate(
      { ...base, checkoutRequest: { status: 'PENDING', requestedCheckOutDate: ahead(10) } },
      date,
    );
    const contractOnly = estimateVacancyOnDate(base, date);

    expect(approved.basis).toBe('CHECKOUT_DISETUJUI');
    expect(approved.chance).toBe('TINGGI');
    expect(approved.vacantFrom).toBe(ymd(ahead(3)));

    expect(pending.basis).toBe('CHECKOUT_DIAJUKAN');
    expect(pending.chance).toBe('SEDANG');
    expect(pending.vacantFrom).toBe(ymd(ahead(10)));

    expect(contractOnly.basis).toBe('KONTRAK_BERAKHIR');
    expect(contractOnly.chance).toBe('RENDAH');

    const rank = { BELUM_ADA_INFO: 0, RENDAH: 1, SEDANG: 2, TINGGI: 3 } as const;
    expect(rank[approved.chance]).toBeGreaterThan(rank[pending.chance]);
    expect(rank[pending.chance]).toBeGreaterThan(rank[contractOnly.chance]);
  });

  it('tanpa checkout DAN tanpa tanggal kontrak → "belum ada info", bukan pita', () => {
    for (const status of ['MAINTENANCE', 'RESERVED', 'OCCUPIED']) {
      const result = estimateVacancyOnDate(
        { status, checkInDate: null, plannedCheckOutDate: null, remainingDays: 0 },
        ymd(TODAY),
      );
      expect(result.chance, status).toBe('BELUM_ADA_INFO');
      expect(result.hasData, status).toBe(false);
      expect(result.vacantFrom).toBeNull();
      expect(result.basis).toBe('BELUM_ADA_INFO');
    }
  });

  it('kontrak sudah lewat tetap memakai lama tinggal — bukan "kosong besok"', () => {
    const baru = estimateVacancyOnDate(
      { status: 'OCCUPIED', checkInDate: daysAgo(45), plannedCheckOutDate: ahead(-10), remainingDays: 0 },
      ymd(TODAY),
    );
    const lama = estimateVacancyOnDate(
      { status: 'OCCUPIED', checkInDate: daysAgo(900), plannedCheckOutDate: ahead(-10), remainingDays: 0 },
      ymd(TODAY),
    );
    const rank = { BELUM_ADA_INFO: 0, RENDAH: 1, SEDANG: 2, TINGGI: 3 } as const;
    expect(rank[lama.chance]).toBeLessThanOrEqual(rank[baru.chance]);
    expect(lama.reason).toMatch(/sudah tinggal/);
  });

  it('ARAH: pada tanggal yang sama, makin lama tinggal peluang tidak pernah naik', () => {
    const date = ymd(ahead(20));
    const tenureDays = [30, 60, 90, 120, 180, 300, 365, 545, 730, 1095, 2000];
    const ranks = tenureDays.map((tenure) => {
      const result = estimateVacancyOnDate(
        {
          status: 'OCCUPIED',
          checkInDate: daysAgo(tenure),
          plannedCheckOutDate: ahead(10),
          remainingDays: 10,
        },
        date,
      );
      return { RENDAH: 1, SEDANG: 2, TINGGI: 3, BELUM_ADA_INFO: 0 }[result.chance];
    });
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i], `tenure ${tenureDays[i - 1]}→${tenureDays[i]}`).toBeLessThanOrEqual(ranks[i - 1]);
    }
  });

  it('perpanjangan disetujui menekan peluang kosong', () => {
    // Sewa harian (bukan kelas bergulir) supaya tanggal kontrak yang sudah lewat
    // tidak digeser P34 (a) — yang diuji di sini hanya efek perpanjangan.
    const base = {
      status: 'OCCUPIED' as const,
      checkInDate: daysAgo(60),
      plannedCheckOutDate: ahead(10),
      remainingDays: 10,
      pricingTerm: 'DAILY',
    };
    const date = ymd(ahead(20));
    const plain = estimateVacancyOnDate(base, date);
    const renewed = estimateVacancyOnDate({ ...base, hasPendingRenew: true, renewStatus: 'APPROVED' }, date);
    const rank = { BELUM_ADA_INFO: 0, RENDAH: 1, SEDANG: 2, TINGGI: 3 } as const;
    expect(rank[renewed.chance]).toBeLessThanOrEqual(rank[plain.chance]);
    expect(renewed.reason).toMatch(/diperpanjang/);
  });

  it('kamar AVAILABLE: peluang kosong tinggi untuk semua tanggal (fakta, bukan perkiraan)', () => {
    for (const date of FOURTEEN_DAYS) {
      const result = estimateVacancyOnDate({ status: 'AVAILABLE' }, date);
      expect(result.chance).toBe('TINGGI');
      expect(result.score).toBe(100);
      expect(result.basis).toBe('SUDAH_KOSONG');
      expect(result.reason).toMatch(/sudah kosong/);
    }
  });

  it('teks dasar menyebut tanggal + tidak pernah memuat nama orang', () => {
    const date = ymd(TODAY);
    const contract = estimateVacancyOnDate(
      { status: 'OCCUPIED', checkInDate: daysAgo(40), plannedCheckOutDate: ahead(9), remainingDays: 9 },
      date,
    );
    const pending = estimateVacancyOnDate(
      {
        status: 'OCCUPIED',
        checkInDate: daysAgo(40),
        plannedCheckOutDate: ahead(9),
        checkoutRequest: { status: 'PENDING', requestedCheckOutDate: ahead(4) },
      },
      date,
    );
    expect(contract.reason).toMatch(/\d+\/\d+/);
    expect(contract.reason).toMatch(/kontrak berakhir/);
    expect(pending.reason).toMatch(/menunggu persetujuan/);
    for (const result of [contract, pending]) {
      expect(result.reason).not.toMatch(/[A-Z][a-z]{3,}\s[A-Z][a-z]{3,}/); // dua kata berhuruf besar = nama
    }
  });
});

/* ── S3: peluang kosong berjenjang (masa sewa + bulanan bergulir) ───────────── */

describe('termRisk — bobot masa sewa (tabel yang sama dengan yang tampil di layar)', () => {
  const BASE = { status: 'OCCUPIED', checkInDate: '2026-09-01', remainingDays: 0 } as const;
  type Kelas = 'pendek' | 'menengah' | 'panjang';

  const bobot = (kelas: Kelas) =>
    VACANCY_WEIGHT_TABLE.filter((row) => row.kelas === kelas).map((row) => row.weight);

  it('tabel menutup keenam masa sewa tepat sekali + satu baris "tanpa data", semua beralasan', () => {
    const terms = VACANCY_WEIGHT_TABLE.flatMap((row) => row.terms);
    expect(terms.slice().sort()).toEqual([
      'BIWEEKLY',
      'DAILY',
      'MONTHLY',
      'SMESTERLY',
      'WEEKLY',
      'YEARLY',
    ]);
    expect(new Set(terms).size).toBe(terms.length);
    expect(VACANCY_WEIGHT_TABLE.filter((row) => row.kelas === 'tanpa data')).toHaveLength(1);
    for (const row of VACANCY_WEIGHT_TABLE) {
      expect(row.reason.length, `baris ${row.label} tanpa alasan`).toBeGreaterThan(10);
    }
  });

  it('ARAH: pendek > menengah > panjang (misi owner §8.1 butir 1)', () => {
    expect(Math.min(...bobot('pendek'))).toBeGreaterThan(Math.max(...bobot('menengah')));
    expect(Math.min(...bobot('menengah'))).toBeGreaterThan(Math.max(...bobot('panjang')));
    expect(Math.max(...bobot('panjang'))).toBe(0);
  });

  it('skor = dasar + bobot baris tabelnya (angka di layar = angka di uji)', () => {
    const dasar = estimateVacancy(BASE, TODAY).score;
    for (const row of VACANCY_WEIGHT_TABLE) {
      for (const term of row.terms) {
        expect(termRisk(term), term).toBe(row.weight);
        expect(estimateVacancy({ ...BASE, pricingTerm: term }, TODAY).score, term).toBe(
          dasar + row.weight,
        );
      }
    }
  });

  it('tanpa masa sewa / term tak dikenal: bobot 0 — skor sama dengan rumus lama', () => {
    expect(estimateVacancy(BASE, TODAY).score).toBe(53);
    expect(termRisk(null)).toBe(0);
    expect(termRisk(undefined)).toBe(0);
    expect(termRisk('')).toBe(0);
    expect(termRisk('TIDAK_DIKENAL')).toBe(0);
    expect(estimateVacancy({ ...BASE, pricingTerm: null }, TODAY).score).toBe(53);
  });

  it('hanya bulanan ke atas yang digulirkan; sewa pendek tidak', () => {
    expect(rollsMonthly('DAILY')).toBe(false);
    expect(rollsMonthly('WEEKLY')).toBe(false);
    expect(rollsMonthly('BIWEEKLY')).toBe(false);
    expect(rollsMonthly('MONTHLY')).toBe(true);
    expect(rollsMonthly('SMESTERLY')).toBe(true);
    expect(rollsMonthly('YEARLY')).toBe(true);
    expect(rollsMonthly(null)).toBe(true); // default P34 (a): kontrak lewat = bulanan
  });
});

describe('estimateVacancyOnDate — kontrak lewat = bulanan bergulir (P34 a)', () => {
  const ROOM = {
    status: 'OCCUPIED',
    checkInDate: '2026-09-01',
    plannedCheckOutDate: '2026-10-01',
    remainingDays: 0,
    pricingTerm: 'MONTHLY',
  };

  it('kontrak lewat dinilai pada siklus bulan berikutnya, bukan tanggal lama', () => {
    const today = estimateVacancyOnDate(ROOM, '2026-10-23');
    expect(today.basis).toBe('KONTRAK_BERAKHIR');
    expect(today.vacantFrom).toBe('2026-11-01');
    expect(today.chance).toBe('RENDAH'); // masih terikat sampai siklus berikutnya
    expect(today.reason).toMatch(/bulanan bergulir, siklus bulanan berikutnya 1\/11/);
  });

  it('pada siklus berikutnya skor = sisa 0 + lama tinggal + bobot bulanan (63)', () => {
    const atCycle = estimateVacancyOnDate(ROOM, '2026-11-01');
    expect(atCycle.vacantFrom).toBe('2026-11-01');
    expect(atCycle.score).toBe(63); // 28 + 25 + 10
    expect(atCycle.chance).toBe('TINGGI');
  });

  it('siklus bergulir maju lagi saat tanggal yang dinilai melewatinya', () => {
    expect(estimateVacancyOnDate(ROOM, '2026-11-02').vacantFrom).toBe('2026-12-01');
    expect(estimateVacancyOnDate(ROOM, '2026-12-01').vacantFrom).toBe('2026-12-01');
    expect(estimateVacancyOnDate(ROOM, '2027-01-15').vacantFrom).toBe('2027-02-01');
  });

  it('tanggal dijepit ke akhir bulan (kontrak 31 Januari → 28 Februari)', () => {
    const room = { ...ROOM, checkInDate: '2026-01-01', plannedCheckOutDate: '2026-01-31' };
    expect(estimateVacancyOnDate(room, '2026-02-15').vacantFrom).toBe('2026-02-28');
  });

  it('sewa pendek TIDAK digulirkan: kontrak lewat tetap tanggal kosongnya', () => {
    const daily = { ...ROOM, pricingTerm: 'DAILY' };
    const today = estimateVacancyOnDate(daily, '2026-10-23');
    expect(today.vacantFrom).toBe('2026-10-01');
    expect(today.score).toBe(77); // 28 + 25 + 24 (harian)
    expect(today.chance).toBe('TINGGI');
    expect(today.reason).not.toMatch(/bergulir/);
  });

  it('pengajuan keluar menang atas aturan bergulir (tanggal penghuni, bukan siklus)', () => {
    const withCheckout = estimateVacancyOnDate(
      { ...ROOM, checkoutRequest: { status: 'APPROVED', requestedCheckOutDate: '2026-10-25' } },
      '2026-10-23',
    );
    expect(withCheckout.basis).toBe('CHECKOUT_DISETUJUI');
    expect(withCheckout.vacantFrom).toBe('2026-10-25');
  });

  it('perpanjangan disetujui tetap menekan kamar yang kontraknya sudah lewat', () => {
    const renewed = estimateVacancyOnDate(
      { ...ROOM, hasPendingRenew: true, renewStatus: 'APPROVED' },
      '2026-11-01',
    );
    expect(renewed.chance).toBe('RENDAH');
    expect(renewed.reason).toMatch(/sudah diperpanjang/);
  });

  it('label tetap perkiraan: teks dasar tidak pernah menjanjikan kepastian', () => {
    for (const iso of ['2026-10-23', '2026-11-01', '2026-12-01']) {
      const result = estimateVacancyOnDate(ROOM, iso);
      expect(result.reason).not.toMatch(/pasti|dijamin/i);
      expect(result.hasData).toBe(true);
    }
  });
});
