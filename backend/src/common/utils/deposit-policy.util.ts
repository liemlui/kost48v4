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
