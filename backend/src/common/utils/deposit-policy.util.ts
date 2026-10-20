import { BadRequestException } from '@nestjs/common';

/**
 * F-01/P27: deposit jaminan tidak boleh di-override.
 *
 * Nilai yang sah = nilai yang sudah ditetapkan sistem: default kamar, atau
 * default + deposit hewan yang tersimpan pada booking publik. Permintaan yang
 * berbeda ditolak 400 — bukan diabaikan diam-diam — agar admin tidak mengira
 * nominalnya berlaku.
 */
export function resolveDepositWithoutOverride(
  expectedRupiah: number | null | undefined,
  requestedRupiah?: number | null,
): number {
  const expected = Number(expectedRupiah ?? 0);
  if (requestedRupiah != null && Number(requestedRupiah) !== expected) {
    throw new BadRequestException(
      `Deposit mengikuti ketetapan sistem (Rp${expected}); override tidak diizinkan.`,
    );
  }
  return expected;
}

/**
 * F-01 lanjutan: cegah deposit dicatat dua kali saat aktivasi booking.
 * Booking RESERVED sudah mencatat deposit lewat persetujuan pembayaran;
 * checkbox "Jaminan sudah diterima" tidak boleh menambah catatan lagi.
 */
export function assertDepositNotCollectedTwice(
  depositCollected: boolean | undefined,
  depositPaidAmountRupiah: number | null | undefined,
  depositPaymentStatus: string | null | undefined,
): void {
  if (!depositCollected) return;
  if (Number(depositPaidAmountRupiah ?? 0) > 0 || depositPaymentStatus === 'PAID') {
    throw new BadRequestException(
      'Jaminan sudah tercatat dibayar untuk booking ini. Jangan centang "Jaminan sudah diterima" saat aktivasi; deposit tidak boleh dicatat dua kali.',
    );
  }
}
