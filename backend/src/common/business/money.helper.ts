/**
 * Helper pembulatan Rupiah terpusat (F4-10 / temuan F-31).
 *
 * Rupiah TIDAK memiliki pecahan sen; setiap nominal yang dipersist, diposting ke
 * jurnal, atau dibandingkan WAJIB bilangan bulat. Sebelumnya pembulatan tersebar di
 * banyak modul (`Math.round` mentah pada util/DP/depresiasi/revenue-per-kamar, dan
 * `Math.max(0, Math.round())` yang diduplikasi di dua modul akuntansi) sehingga rawan
 * drift pecahan kecil yang me-masking selisih di trial balance (F-31). Helper ini =
 * SATU sumber kebenaran pembulatan Rupiah.
 *
 * Konvensi: bulatkan ke bilangan bulat terdekat; tepat 0,5 dibulatkan MENJAUHI nol
 * (half away from zero) agar nominal berlawanan tanda (debit vs kredit) saling
 * meniadakan secara simetris — menghindari asimetri `Math.round` pada nilai negatif
 * (`Math.round(-0.5) === -0`, bukan `-1`). Untuk nilai non-negatif (kasus mayoritas)
 * hasilnya identik dengan `Math.round`, jadi nilai yang sudah teruji tidak berubah.
 * NaN / ±Infinity → 0.
 */
export function roundRupiah(value?: number | null): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

/**
 * Nominal Rupiah non-negatif (debit/kredit jurnal, line amount invoice, depresiasi
 * bulanan): dibulatkan lalu di-clamp ke >= 0.
 */
export function rupiahAmount(value?: number | null): number {
  return Math.max(0, roundRupiah(value));
}
