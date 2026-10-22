/**
 * Perkiraan peluang kamar kosong (W-OWN-019, diperbaiki sesi audit UI/UX 22 Okt 2026).
 *
 * Heuristik dari data kontrak yang sudah ada — BUKAN prediksi pasti.
 * Aturan arah (keputusan owner): semakin lama penghuni tinggal, semakin KECIL
 * peluang ia keluar. Jadi skor harus TURUN secara monoton terhadap lama tinggal.
 *
 * Sumbangan skor:
 *  - sisa kontrak (backend mengirim number, 0 = habis/lewat): ≤7 +38 · ≤30 +22
 *    · ≤60 +10 · ≤120 +4 · >120 0 · SUDAH LEWAT (0) +28 — sengaja lebih kecil dari
 *    ≤7: kontrak lewat tidak otomatis berarti penghuni akan keluar, apalagi bila
 *    ia sudah tinggal lama (data produksi memakai 0 untuk SEMUA kontrak lewat)
 *  - lama tinggal (monoton turun, tanpa lompatan): <90 +25 · <180 +15 · <365 +8 · <730 +3 · ≥730 0
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
