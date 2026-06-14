import { roundRupiah } from '../../common/business/money.helper';
import { addCalendarMonthsClamped, startOfDay } from '../stays/stays.helpers';

/**
 * F4-1 (PSAK 72) — pengakuan pendapatan sewa bertahap.
 * Jumlah bulan yang dicakup term; >1 = pendapatan ditangguhkan ke Unearned (2200)
 * lalu diakui bertahap. Mekanisme berbasis "jumlah bulan N" agar bisa dipakai ulang
 * oleh prabayar fleksibel (D-18 / F4-11).
 */
export function monthsForPricingTerm(pricingTerm: string): number {
  if (pricingTerm === 'SMESTERLY') return 6;
  if (pricingTerm === 'YEARLY') return 12;
  return 1; // DAILY/WEEKLY/BIWEEKLY/MONTHLY = tak ditangguhkan (≤ 1 bulan)
}

export function isDeferredTerm(pricingTerm: string): boolean {
  return monthsForPricingTerm(pricingTerm) > 1;
}

/**
 * Bagi total sewa R rata ke N bulan (straight-line). Sisa pembulatan dilempar ke
 * bulan TERAKHIR agar Σ tepat = R (integer Rupiah, tanpa drift trial balance).
 */
export function splitRentByMonths(totalRupiah: number, months: number): number[] {
  const n = Math.max(1, Math.floor(months));
  const total = roundRupiah(totalRupiah);
  if (n === 1) return [total];
  const base = roundRupiah(total / n);
  const parts = new Array<number>(n).fill(base);
  parts[n - 1] = total - base * (n - 1);
  return parts;
}

export interface RentRecognitionPeriod {
  periodIndex: number; // 1..N
  periodStart: Date; // inklusif (UTC midnight)
  periodEnd: Date; // eksklusif
  scheduledAmountRupiah: number;
}

/**
 * Bangun jadwal bulanan: bulan ke-i mulai checkIn + (i-1) bulan (clamp akhir bulan).
 * Term ≤ 1 bulan → jadwal kosong (tak ditangguhkan).
 */
export function buildRentRecognitionSchedule(
  checkInDate: Date,
  pricingTerm: string,
  totalRentRupiah: number,
): RentRecognitionPeriod[] {
  const n = monthsForPricingTerm(pricingTerm);
  if (n <= 1) return [];
  const amounts = splitRentByMonths(totalRentRupiah, n);
  const start0 = startOfDay(checkInDate);
  const periods: RentRecognitionPeriod[] = [];
  for (let i = 0; i < n; i += 1) {
    periods.push({
      periodIndex: i + 1,
      periodStart: addCalendarMonthsClamped(start0, i),
      periodEnd: addCalendarMonthsClamped(start0, i + 1),
      scheduledAmountRupiah: amounts[i],
    });
  }
  return periods;
}
