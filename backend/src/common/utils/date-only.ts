/**
 * Shared date-only utilities — SATU sumber kebenaran untuk normalisasi tanggal.
 *
 * Sebelumnya ada 5 implementasi berbeda di module akuntansi:
 *  - accounting.service.ts (setUTCHours, non-WIB)
 *  - accounting-posting-helpers.ts (WIB-aware, canonical)
 *  - accounting-period-close.service.ts (setUTCHours, non-WIB)
 *  - accounting-readiness.service.ts (Date.UTC, NaN-safe, non-WIB)
 *  - rent-recognition.service.ts (WIB-aware, duplikat)
 *
 * Kini semua pakai file ini. Unifikasi 2026-07-07 — Reasonix Audit.
 */

/**
 * Normalisasi tanggal ke UTC-midnight dari tanggal KALENDER WIB (UTC+7).
 * Aman untuk transaksi dini hari (00:00–07:00 WIB) agar tidak jatuh ke tanggal kemarin UTC.
 *
 * @param value Date object atau string tanggal.
 * @param fallbackToToday Jika true dan value invalid → return hari ini WIB. Default false.
 * @returns Date object pada UTC-midnight dari tanggal WIB yang sesuai.
 */
export function dateOnlyWib(value: Date | string, fallbackToToday = false): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    if (fallbackToToday) return dateOnlyWib(new Date());
    return new Date(NaN); // caller tangani sendiri
  }

  // Konversi ke WIB (UTC+7), lalu ambil komponen tanggal WIB, buat UTC-midnight
  const wib = new Date(parsed.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

/**
 * Hari ini dalam UTC-midnight WIB.
 */
export function todayWib(): Date {
  return dateOnlyWib(new Date());
}

/**
 * Format tanggal ISO (YYYY-MM-DD) dari Date.
 */
export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
