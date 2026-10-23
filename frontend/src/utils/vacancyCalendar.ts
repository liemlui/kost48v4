/**
 * Seleksi peristiwa "kamar mulai kosong" untuk kalender publik `/rooms`.
 *
 * Keputusan owner 23 Okt 2026 (memperbaiki tampilan heatmap rilis 1.6.0):
 * sel tanggal hanya boleh memuat kamar yang MULAI kosong tepat di tanggal itu —
 * bukan semua kamar yang kebetulan kosong pada tanggal itu. Kamar yang sudah
 * kosong sejak sebelumnya tidak diulang di hari-hari berikutnya.
 *
 * Rumus peluang tetap milik `utils/vacancyEstimate.ts` (`estimateVacancyOnDate`):
 * berkas ini hanya MEMILIH, tidak menghitung ulang skor apa pun.
 */
import type { VacancyOnDateEstimate } from './vacancyEstimate';

/** Peluang yang dianggap layak tampil sebagai peristiwa kosong. */
const SHOWN_CHANCES = new Set(['TINGGI', 'SEDANG']);

export type VacancyDated = { vacancy: VacancyOnDateEstimate };

/**
 * true bila kamar ini MULAI kosong pada `isoDate`.
 *
 * Syarat:
 *  - `vacantFrom` estimator jatuh tepat di tanggal itu (bukan sebelum/sesudah), dan
 *  - peluangnya TINGGI atau SEDANG. Perpanjangan yang disetujui/diajukan menekan
 *    peluang ke RENDAH, sehingga kamar yang diperpanjang otomatis tidak muncul —
 *    walaupun tanggal kontraknya jatuh di hari itu.
 */
export function isVacancyStart(estimate: VacancyOnDateEstimate, isoDate: string): boolean {
  const iso = String(isoDate).slice(0, 10);
  if (!estimate.vacantFrom) return false;
  if (estimate.vacantFrom !== iso) return false;
  return SHOWN_CHANCES.has(estimate.chance);
}

/**
 * Saring daftar kamar-satu-tanggal menjadi hanya yang mulai kosong di tanggal itu.
 * Urutan masukan dipertahankan; pemanggil yang menentukan pengurutan tampilan.
 */
export function pickVacancyStarts<T extends VacancyDated>(items: T[], isoDate: string): T[] {
  return items.filter((item) => isVacancyStart(item.vacancy, isoDate));
}
