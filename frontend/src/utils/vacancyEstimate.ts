/**
 * Perkiraan peluang kamar kosong (W-OWN-019).
 *
 * Heuristik sederhana dari data kontrak yang sudah ada — BUKAN prediksi pasti.
 * Aturan (lihat docs/kerja/TASK-RUANG-WIZARD.md):
 *  - kamar sudah kosong → 100
 *  - sisa kontrak ≤7 hari +45 · ≤30 +25 · ≤60 +10
 *  - lama tinggal <90 hari +30 · <180 +15 · ≥365 +5
 *  - perpanjangan pending −30 · sudah disetujui/selesai −40
 *  - di-clamp 0..100
 */

export type VacancyStatus = 'KOSONG' | 'CENDERUNG_KOSONG' | 'MUNGKIN' | 'CENDERUNG_LANJUT';

export type VacancyInput = {
  status: string;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  /** Dari server: sisa hari menuju akhir kontrak (bila ada). */
  remainingDays?: number | null;
  hasPendingRenew?: boolean | null;
  renewStatus?: string | null;
};

export type VacancyEstimate = {
  score: number;
  status: VacancyStatus;
  label: string;
  note: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function estimateVacancy(input: VacancyInput, today: Date = new Date()): VacancyEstimate {
  const empty: VacancyEstimate = {
    score: 0,
    status: 'CENDERUNG_LANJUT',
    label: 'Cenderung lanjut',
    note: 'Perkiraan dari tanggal kontrak dan lama tinggal — bukan janji.',
  };

  if (String(input.status).toUpperCase() === 'AVAILABLE') {
    return { score: 100, status: 'KOSONG', label: 'Kosong', note: 'Kamar siap dihuni.' };
  }

  const checkIn = parseDate(input.checkInDate);
  const checkOut = parseDate(input.plannedCheckOutDate);
  const remaining = input.remainingDays != null
    ? Number(input.remainingDays)
    : checkOut
      ? daysBetween(today, checkOut)
      : null;

  let score = 0;
  if (remaining != null) {
    if (remaining <= 7) score += 45;
    else if (remaining <= 30) score += 25;
    else if (remaining <= 60) score += 10;
  }

  if (checkIn) {
    const tenure = Math.max(0, daysBetween(checkIn, today));
    if (tenure < 90) score += 30;
    else if (tenure < 180) score += 15;
    else if (tenure >= 365) score += 5;
  }

  const renew = String(input.renewStatus ?? '').toUpperCase();
  if (input.hasPendingRenew || renew === 'PENDING' || renew === 'AWAITING_DP' || renew === 'DP_SECURED') {
    score -= 30;
  } else if (['APPROVED', 'COMPLETED', 'ACCEPTED'].includes(renew)) {
    score -= 40;
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) return { ...empty, score, status: 'CENDERUNG_KOSONG', label: 'Cenderung kosong' };
  if (score >= 40) return { ...empty, score, status: 'MUNGKIN', label: 'Mungkin kosong' };
  return { ...empty, score };
}
