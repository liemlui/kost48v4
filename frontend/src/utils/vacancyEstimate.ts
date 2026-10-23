/**
 * Perkiraan peluang kamar kosong (W-OWN-019, diperbaiki sesi audit UI/UX 22 Okt 2026;
 * masa sewa berjenjang ditambahkan di S3 program ROOMS & AKUN V2, 23 Okt 2026).
 *
 * Heuristik dari data kontrak yang sudah ada — BUKAN prediksi pasti.
 * Aturan arah (keputusan owner): semakin lama penghuni tinggal, semakin KECIL
 * peluang ia keluar. Jadi skor harus TURUN secara monoton terhadap lama tinggal.
 *
 * Sumbangan skor (satu-satunya tempat rumus — jangan menyalin ke komponen):
 *  - sisa kontrak (backend mengirim number, 0 = habis/lewat): ≤7 +38 · ≤30 +22
 *    · ≤60 +10 · ≤120 +4 · >120 0 · SUDAH LEWAT (0) +28 — sengaja lebih kecil dari
 *    ≤7: kontrak lewat tidak otomatis berarti penghuni akan keluar, apalagi bila
 *    ia sudah tinggal lama (data produksi memakai 0 untuk SEMUA kontrak lewat)
 *  - lama tinggal (monoton turun, tanpa lompatan): <90 +25 · <180 +15 · <365 +8 · <730 +3 · ≥730 0
 *  - masa sewa (`termRisk` + `VACANCY_WEIGHT_TABLE`): pendek (harian/mingguan/
 *    2-mingguan) tertinggi → menengah (bulanan/semesteran) → tahunan terendah
 *  - perpanjangan: APPROVED/COMPLETED/ACCEPTED −45 · PENDING/AWAITING_DP/DP_SECURED −25
 *  - hasil di-clamp 0..100
 *
 * Kejujuran data: bila tanggal check-in tidak ada (kamar MAINTENANCE, DP booking,
 * atau kontrak tanpa tanggal), estimator TIDAK mengarang pita — statusnya
 * `TIDAK_DIKETAHUI`. `remainingDays = 0` tidak boleh disimpulkan sebagai
 * "kamar kosong besok" tanpa tanggal kontrak.
 */

export type VacancyStatus =
  | 'KOSONG'
  | 'CENDERUNG_KOSONG'
  | 'MUNGKIN'
  | 'CENDERUNG_LANJUT'
  | 'TIDAK_DIKETAHUI';

export type VacancyInput = {
  status: string;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  /** Dari server: sisa hari menuju akhir kontrak (0 = habis atau sudah lewat). */
  remainingDays?: number | null;
  hasPendingRenew?: boolean | null;
  renewStatus?: string | null;
  /**
   * Masa sewa stay aktif (DAILY…YEARLY). `null`/tidak ada = belum dikirim server:
   * tidak menambah skor (lihat baris "tanpa data" di `VACANCY_WEIGHT_TABLE`).
   */
  pricingTerm?: string | null;
};

export type VacancyEstimate = {
  score: number;
  status: VacancyStatus;
  label: string;
  note: string;
  /** false = tidak ada dasar tanggal untuk memperkirakan (jangan tampilkan pita). */
  hasData: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTE = 'Perkiraan dari tanggal kontrak, lama tinggal, dan status perpanjangan — bukan janji.';
const NOTE_NO_DATA = 'Belum ada tanggal kontrak yang bisa dipakai untuk memperkirakan.';

const APPROVED_RENEW = ['APPROVED', 'COMPLETED', 'ACCEPTED'];
const PENDING_RENEW = ['PENDING', 'AWAITING_DP', 'DP_SECURED'];

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Sumbangan lama tinggal — WAJIB tidak pernah naik seiring bertambahnya lama tinggal. */
export function tenureRisk(tenureDays: number): number {
  const tenure = Math.max(0, tenureDays);
  if (tenure < 90) return 25;
  if (tenure < 180) return 15;
  if (tenure < 365) return 8;
  if (tenure < 730) return 3;
  return 0;
}

/**
 * Sumbangan sisa kontrak — makin dekat akhir kontrak, makin besar.
 * `remainingDays <= 0` = kontrak sudah lewat; backend memakai 0 sebagai nilai
 * "tidak ada sisa", jadi nilainya dibuat lebih rendah daripada ≤7 hari supaya
 * penghuni lama yang kontraknya lewat tidak otomatis dicap akan keluar.
 */
export function remainingRisk(remainingDays: number): number {
  if (remainingDays <= 0) return 28;
  if (remainingDays <= 7) return 38;
  if (remainingDays <= 30) return 22;
  if (remainingDays <= 60) return 10;
  if (remainingDays <= 120) return 4;
  return 0;
}

/* ────────────────────────────────────────────────────────────────────────────
 * BOBOT MASA SEWA (S3 program ROOMS & AKUN V2 — misi owner §8.1 butir 1)
 *
 * Arah yang diminta owner: sewa **pendek** (harian/mingguan/2-mingguan) = peluang
 * kosong PALING TINGGI, lalu **menengah** (bulanan/semesteran), lalu **panjang**
 * (tahunan) = paling rendah. Tabel ini sumber angkanya — dipakai rumus DAN
 * ditampilkan apa adanya di layar (tabel bobot di heatmap), supaya angka yang
 * dibaca owner = angka yang diuji.
 *
 * Penalarannya satu baris per kelas: makin pendek masa sewa, makin sering
 * kontraknya berakhir, jadi makin besar sumbangannya ke peluang kosong.
 * `tanpa data` sengaja 0 — kalau server belum mengirim masa sewa, estimator
 * tidak boleh mengarang asumsi.
 * ──────────────────────────────────────────────────────────────────────────── */

export type VacancyTermClass = 'pendek' | 'menengah' | 'panjang' | 'tanpa data';

export type VacancyWeightRow = {
  kelas: VacancyTermClass;
  /** Nama masa sewa dalam bahasa manusia — dipakai tabel bobot di layar. */
  label: string;
  /** Nilai enum `PricingTerm` yang masuk baris ini. */
  terms: string[];
  /** Poin yang DITAMBAHKAN ke skor peluang kosong. */
  weight: number;
  /** Satu baris alasan — wajib terbaca owner, jangan disembunyikan di kode. */
  reason: string;
};

export const VACANCY_WEIGHT_TABLE: VacancyWeightRow[] = [
  {
    kelas: 'pendek',
    label: 'Harian',
    terms: ['DAILY'],
    weight: 24,
    reason: 'Kontrak harian paling cepat berakhir → peluang kosong tertinggi.',
  },
  {
    kelas: 'pendek',
    label: 'Mingguan',
    terms: ['WEEKLY'],
    weight: 20,
    reason: 'Mingguan masih kelas pendek, sedikit lebih lama dari harian.',
  },
  {
    kelas: 'pendek',
    label: '2-mingguan',
    terms: ['BIWEEKLY'],
    weight: 16,
    reason: 'Dua mingguan: kelas pendek terpanjang.',
  },
  {
    kelas: 'menengah',
    label: 'Bulanan',
    terms: ['MONTHLY'],
    weight: 10,
    reason: 'Bulanan = arus keluar menengah.',
  },
  {
    kelas: 'menengah',
    label: 'Semesteran',
    terms: ['SMESTERLY'],
    weight: 6,
    reason: 'Semesteran lebih terikat daripada bulanan.',
  },
  {
    kelas: 'panjang',
    label: 'Tahunan',
    terms: ['YEARLY'],
    weight: 0,
    reason: 'Kontrak setahun = peluang kosong paling rendah.',
  },
  {
    kelas: 'tanpa data',
    label: 'Tidak diketahui',
    terms: [],
    weight: 0,
    reason: 'Masa sewa belum dikirim server → tidak menambah skor (jangan mengarang).',
  },
];

/** Bobot untuk term yang tidak dikenal/ kosong — sama dengan baris "tanpa data". */
export const VACANCY_UNKNOWN_TERM_WEIGHT = 0;

const TERM_ROW_BY_TERM = new Map<string, VacancyWeightRow>();
for (const row of VACANCY_WEIGHT_TABLE) {
  for (const term of row.terms) TERM_ROW_BY_TERM.set(term, row);
}

function normalizeTerm(pricingTerm?: string | null): string {
  return String(pricingTerm ?? '').trim().toUpperCase();
}

/** Baris tabel bobot untuk satu masa sewa; `undefined` = term tak dikenal. */
export function vacancyTermRow(pricingTerm?: string | null): VacancyWeightRow | undefined {
  return TERM_ROW_BY_TERM.get(normalizeTerm(pricingTerm));
}

/**
 * Sumbangan masa sewa ke skor peluang kosong.
 * Pendek > menengah > panjang; term kosong/tak dikenal = 0 (tanpa asumsi).
 */
export function termRisk(pricingTerm?: string | null): number {
  return vacancyTermRow(pricingTerm)?.weight ?? VACANCY_UNKNOWN_TERM_WEIGHT;
}

/**
 * Apakah kontrak yang sudah lewat tanggalnya dinilai dengan **bulanan bergulir**
 * (keputusan owner P34 a): siklus bulan berikutnya, bukan tanggal lama yang lewat.
 *
 * Sewa pendek (harian/mingguan/2-mingguan) TIDAK digulirkan: kontraknya memang
 * sudah jatuh tempo dan kelasnya justru paling mungkin kosong — menggulirkannya
 * sebulan ke depan akan menurunkan peluang pada kelas yang seharusnya tertinggi.
 * Term kosong/tak dikenal tetap digulirkan (default P34: kontrak lewat = bulanan).
 */
export function rollsMonthly(pricingTerm?: string | null): boolean {
  const row = vacancyTermRow(pricingTerm);
  if (!row) return true;
  return row.kelas !== 'pendek';
}

export function estimateVacancy(input: VacancyInput, today: Date = new Date()): VacancyEstimate {
  const unknown: VacancyEstimate = {
    score: 0,
    status: 'TIDAK_DIKETAHUI',
    label: 'Belum ada data kontrak',
    note: NOTE_NO_DATA,
    hasData: false,
  };

  if (String(input.status).toUpperCase() === 'AVAILABLE') {
    return { score: 100, status: 'KOSONG', label: 'Kosong', note: 'Kamar siap dihuni.', hasData: true };
  }

  const checkIn = parseDate(input.checkInDate);
  const checkOut = parseDate(input.plannedCheckOutDate);
  const remaining = input.remainingDays != null && Number.isFinite(Number(input.remainingDays))
    ? Number(input.remainingDays)
    : checkOut
      ? daysBetween(today, checkOut)
      : null;

  // Tanpa tanggal check-in DAN tanpa sisa kontrak yang berarti: tidak ada dasar apa pun.
  // `remainingDays = 0` tanpa tanggal check-in berarti "tidak ada data kontrak",
  // bukan "kontrak habis hari ini" — backend memakai 0 sebagai nilai default.
  if (!checkIn && (remaining == null || remaining <= 0)) return unknown;

  let score = 0;
  if (remaining != null) score += remainingRisk(remaining);
  if (checkIn) score += tenureRisk(daysBetween(checkIn, today));
  score += termRisk(input.pricingTerm);

  const renew = String(input.renewStatus ?? '').toUpperCase();
  if (APPROVED_RENEW.includes(renew)) score -= 45;
  else if (input.hasPendingRenew || PENDING_RENEW.includes(renew)) score -= 25;

  score = Math.max(0, Math.min(100, score));

  if (score >= 60) {
    return { score, status: 'CENDERUNG_KOSONG', label: 'Kemungkinan kosong: tinggi', note: NOTE, hasData: true };
  }
  if (score >= 35) {
    return { score, status: 'MUNGKIN', label: 'Kemungkinan kosong: sedang', note: NOTE, hasData: true };
  }
  return { score, status: 'CENDERUNG_LANJUT', label: 'Kemungkinan kosong: rendah', note: NOTE, hasData: true };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PELUANG KOSONG PER TANGGAL (keputusan owner 23 Okt 2026)
 *
 * Permintaan owner: "harusnya di tanggal tenant akan habis, baru ada kemungkinan
 * kosongnya. Jadi setiap tanggal ada indikator kemungkinan kosong pakai warna."
 *
 * Urutan penetapan tanggal mulai kosong (pertama yang cocok menang):
 *   1. CheckoutRequest APPROVED  → requestedCheckOutDate
 *   2. CheckoutRequest PENDING   → requestedCheckOutDate (lebih lemah)
 *   3. tidak ada checkout        → plannedCheckOutDate (akhir kontrak)
 *   4. tidak ada keduanya        → BELUM_ADA_INFO (jangan mengarang pita)
 *
 * Sebelum tanggal itu peluang SELALU `RENDAH` — penghuni masih terikat.
 * Sejak tanggal itu, nilainya mengikuti `estimateVacancy` pada tanggal tersebut
 * (rumus kedua TIDAK boleh ditulis di sini) dan ditekan oleh perpanjangan.
 * ──────────────────────────────────────────────────────────────────────────── */

export type VacancyChance = 'BELUM_ADA_INFO' | 'RENDAH' | 'SEDANG' | 'TINGGI';

/** Potongan `CheckoutRequest` yang boleh dipakai publik (tanpa PII). */
export type VacancyCheckoutRequest = {
  status: 'PENDING' | 'APPROVED';
  requestedCheckOutDate: string;
};

export type VacancyOnDateInput = VacancyInput & {
  checkoutRequest?: VacancyCheckoutRequest | null;
};

export type VacancyOnDateBasis =
  | 'SUDAH_KOSONG'
  | 'CHECKOUT_DISETUJUI'
  | 'CHECKOUT_DIAJUKAN'
  | 'KONTRAK_BERAKHIR'
  | 'BELUM_ADA_INFO';

export type VacancyOnDateEstimate = {
  chance: VacancyChance;
  score: number;
  /** Dari mana tanggal mulai kosong diambil — dipakai untuk teks dasar di panel. */
  basis: VacancyOnDateBasis;
  /** Tanggal mulai kosong (YYYY-MM-DD) atau null bila tidak ada dasar tanggal. */
  vacantFrom: string | null;
  /** Dasar perkiraan dalam bahasa manusia, mis. "kontrak berakhir 4/11". */
  reason: string;
  hasData: boolean;
};

/** Label pendek pita "peluang kosong" — 4 nilai, dipakai legenda + aria-label. */
export const VACANCY_CHANCE_LABEL: Record<VacancyChance, string> = {
  BELUM_ADA_INFO: 'belum ada info',
  RENDAH: 'rendah',
  SEDANG: 'sedang',
  TINGGI: 'tinggi',
};

/** Teks ketidakpastian yang WAJIB terlihat di halaman (bukan hanya title). */
export const VACANCY_NOTE =
  'Peluang kosong = perkiraan dari tanggal kontrak, tanggal keluar yang diajukan penghuni, lama tinggal, dan masa sewa — bukan janji.';

const CHANCE_RANK: Record<VacancyChance, number> = {
  BELUM_ADA_INFO: 0,
  RENDAH: 1,
  SEDANG: 2,
  TINGGI: 3,
};

function isoDayOf(value?: string | null): string | null {
  if (!value) return null;
  const ymd = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/** "4/11" — tanggal pendek untuk teks dasar. */
function shortId(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(day)}/${Number(month)}`;
}

/** Geser tanggal `YYYY-MM-DD` maju `months` bulan; tanggal dijepit ke akhir bulan. */
function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clamped = Math.min(day, lastDay);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

/**
 * Siklus bulanan berikutnya: geser `isoFrom` maju per bulan sampai ≥ `isoNotBefore`.
 * Dipakai aturan owner P34 (a) — "kontrak lewat tanggal = bulanan bergulir".
 */
function rollToMonthlyCycle(isoFrom: string, isoNotBefore: string): string {
  let rolled = addMonths(isoFrom, 1);
  // Pagar: data tanggal yang aneh tidak boleh membuat perulangan tak berujung.
  for (let guard = 0; rolled < isoNotBefore && guard < 240; guard += 1) {
    rolled = addMonths(rolled, 1);
  }
  return rolled;
}

function tenureText(checkIn: string | null, isoDate: string): string {
  if (!checkIn) return '';
  const start = parseDate(`${checkIn}T00:00:00`);
  const end = parseDate(`${isoDate}T00:00:00`);
  if (!start || !end) return '';
  const days = daysBetween(start, end);
  if (days < 0) return '';
  if (days < 31) return 'baru masuk';
  return `sudah tinggal ${Math.floor(days / 30.44)} bulan`;
}

/** Petakan status estimator lama ke 4 nilai pita per-tanggal. Jangan menambah rumus. */
function chanceFromEstimate(estimate: VacancyEstimate): VacancyChance {
  if (estimate.status === 'KOSONG' || estimate.status === 'CENDERUNG_KOSONG') return 'TINGGI';
  if (estimate.status === 'MUNGKIN') return 'SEDANG';
  if (estimate.status === 'CENDERUNG_LANJUT') return 'RENDAH';
  return 'BELUM_ADA_INFO';
}

/**
 * Peluang kamar kosong PADA satu tanggal.
 *
 * @param input data kamar + `checkoutRequest` (bila ada pengajuan keluar)
 * @param isoDate tanggal yang dinilai, format `YYYY-MM-DD`
 */
export function estimateVacancyOnDate(
  input: VacancyOnDateInput,
  isoDate: string,
): VacancyOnDateEstimate {
  const iso = isoDayOf(isoDate) ?? String(isoDate).slice(0, 10);
  const day = parseDate(`${iso}T00:00:00`) ?? new Date();

  // Kamar sudah kosong = fakta, bukan perkiraan.
  if (String(input.status).toUpperCase() === 'AVAILABLE') {
    return {
      chance: 'TINGGI',
      score: 100,
      basis: 'SUDAH_KOSONG',
      vacantFrom: null,
      reason: 'kamar sudah kosong dan siap dihuni',
      hasData: true,
    };
  }

  // 1–3: tentukan tanggal mulai kosong.
  const checkoutDate = isoDayOf(input.checkoutRequest?.requestedCheckOutDate);
  const checkoutStatus = String(input.checkoutRequest?.status ?? '').toUpperCase();
  const contractEnd = isoDayOf(input.plannedCheckOutDate);
  const checkIn = isoDayOf(input.checkInDate);
  const tenure = tenureText(checkIn, iso);

  let vacantFrom: string | null = null;
  let basis: VacancyOnDateBasis = 'BELUM_ADA_INFO';
  let reason = 'belum ada tanggal kontrak maupun pengajuan keluar';

  if (checkoutDate && checkoutStatus === 'APPROVED') {
    vacantFrom = checkoutDate;
    basis = 'CHECKOUT_DISETUJUI';
    reason = `pengajuan keluar ${shortId(checkoutDate)} sudah disetujui`;
  } else if (checkoutDate && checkoutStatus === 'PENDING') {
    vacantFrom = checkoutDate;
    basis = 'CHECKOUT_DIAJUKAN';
    reason = `penghuni mengajukan keluar ${shortId(checkoutDate)} (menunggu persetujuan)`;
  } else if (contractEnd) {
    vacantFrom = contractEnd;
    basis = 'KONTRAK_BERAKHIR';
    reason = `kontrak berakhir ${shortId(contractEnd)}`;
  }

  // Aturan owner P34 (a): kontrak yang tanggalnya sudah LEWAT dinilai memakai
  // siklus bulanan berikutnya ("bulanan bergulir"), bukan tanggal lama yang lewat.
  // Pengajuan keluar menang lebih dulu (tanggalnya eksplisit dari penghuni).
  let contractAnchor = contractEnd;
  if (
    basis === 'KONTRAK_BERAKHIR'
    && contractEnd
    && contractEnd < iso
    && rollsMonthly(input.pricingTerm)
  ) {
    contractAnchor = rollToMonthlyCycle(contractEnd, iso);
    vacantFrom = contractAnchor;
    reason = `kontrak berakhir ${shortId(contractEnd)} · bulanan bergulir, siklus bulanan berikutnya ${shortId(contractAnchor)}`;
  }

  // 4: tidak ada dasar tanggal sama sekali — jangan mengarang pita.
  if (!vacantFrom) {
    return {
      chance: 'BELUM_ADA_INFO',
      score: 0,
      basis: 'BELUM_ADA_INFO',
      vacantFrom: null,
      reason,
      hasData: false,
    };
  }

  // Perpanjangan (disetujui maupun masih diajukan) menekan peluang dan selalu
  // disebut di teks dasar — termasuk saat tanggalnya masih di depan `vacantFrom`.
  const renew = String(input.renewStatus ?? '').toUpperCase();
  const renewApproved = APPROVED_RENEW.includes(renew);
  const renewPending = Boolean(input.hasPendingRenew) || PENDING_RENEW.includes(renew);
  const renewSuffix = renewApproved
    ? ' · sudah diperpanjang'
    : renewPending
      ? ' · perpanjangan diajukan'
      : '';

  const reasonWithTenure = `${reason}${tenure ? ` · ${tenure}` : ''}${renewSuffix}`;

  // Sebelum tanggal mulai kosong: penghuni masih terikat → SELALU rendah.
  if (iso < vacantFrom) {
    return {
      chance: 'RENDAH',
      score: 0,
      basis,
      vacantFrom,
      reason: reasonWithTenure,
      hasData: true,
    };
  }

  // Sejak tanggal mulai kosong: ikuti estimator lama, dinilai pada tanggal itu.
  const estimate = estimateVacancy(
    {
      status: input.status,
      checkInDate: input.checkInDate ?? null,
      // `contractAnchor` = siklus bulanan berikutnya bila kontraknya sudah lewat
      // (aturan P34 a); selain itu tetap tanggal akhir kontrak asli.
      plannedCheckOutDate: contractAnchor ?? input.plannedCheckOutDate ?? null,
      // remainingDays dari server dihitung terhadap HARI INI; untuk tanggal lain
      // biarkan estimator menghitung sendiri dari tanggal kontrak.
      remainingDays: null,
      hasPendingRenew: input.hasPendingRenew ?? null,
      renewStatus: input.renewStatus ?? null,
      pricingTerm: input.pricingTerm ?? null,
    },
    day,
  );

  let chance: VacancyChance;
  if (basis === 'CHECKOUT_DISETUJUI') chance = 'TINGGI';
  else if (basis === 'CHECKOUT_DIAJUKAN') chance = 'SEDANG';
  else chance = chanceFromEstimate(estimate);

  // Perpanjangan menekan peluang: kamar diperpanjang tidak pernah lebih tinggi
  // daripada nilai estimator. Teks dasarnya sudah membawa `renewSuffix` di atas.
  if (renewApproved || renewPending) {
    const capped = chanceFromEstimate(estimate);
    if (CHANCE_RANK[capped] < CHANCE_RANK[chance]) chance = capped;
  }

  return {
    chance,
    score: basis === 'CHECKOUT_DISETUJUI' ? 100 : estimate.score,
    basis,
    vacantFrom,
    reason: reasonWithTenure,
    hasData: chance !== 'BELUM_ADA_INFO',
  };
}

/**
 * Peristiwa kosong BERIKUTNYA untuk satu kamar (dipakai chip di kartu katalog).
 *
 * Fungsi ini hanya MEMILIH tanggal, tidak menambah rumus: panggil
 * `estimateVacancyOnDate` pada hari ini untuk tahu `vacantFrom`, lalu panggil lagi
 * pada tanggal itu untuk tahu peluang saat kamar mulai kosong. Dengan begitu kartu
 * katalog, heatmap, dan test memakai fungsi yang sama.
 */
export function estimateNextVacancy(
  input: VacancyOnDateInput,
  isoToday: string,
): VacancyOnDateEstimate {
  const today = estimateVacancyOnDate(input, isoToday);
  if (!today.vacantFrom) return today;
  return estimateVacancyOnDate(input, today.vacantFrom);
}
