// FILE: booking-source.helper.ts — sumber booking mandiri tenant yang boleh direview admin
import { LeadSource } from '../../common/enums/app.enums';

/**
 * FE-003 T2 (18 Sep 2026): approve/reject booking (`TenantBookingsService`) dulu
 * hanya menerima `LeadSource.WEBSITE`, sedangkan booking yang dibuat tenant dari
 * portal disimpan sebagai `LeadSource.PORTAL` (`tenant-bookings.service.ts`
 * `createBooking`). Akibatnya booking portal muncul di antrean admin
 * (`/stays?status=BOOKINGS`) tetapi selalu gagal 409 — tanpa jalur lain, karena
 * invoice awal hanya dibuat oleh `approveBooking`.
 *
 * Satu predikat dipakai bersama approve, reject, dan riwayat booking tenant supaya
 * tidak terjadi drift lagi. Sumber lain (WALK_IN, OTA, referral, dsb.) tetap berada
 * di luar flow review booking.
 */
export const REVIEWABLE_BOOKING_SOURCES: readonly LeadSource[] = [
  LeadSource.WEBSITE,
  LeadSource.PORTAL,
];

export function isReviewableBookingSource(source: LeadSource | string | null | undefined): boolean {
  if (!source) return false;
  return REVIEWABLE_BOOKING_SOURCES.includes(source as LeadSource);
}