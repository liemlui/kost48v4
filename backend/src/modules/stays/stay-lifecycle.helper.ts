export type StayLifecycleStatus = 'ACTIVE' | 'GRACE' | 'OVERSTAY' | 'COMPLETED' | 'CANCELLED';

export interface StayLifecycleInput {
  status: string;
  plannedCheckOutDate?: Date | string | null;
  /** Batas grace renewal (settlementDueDate DP_SECURED), bila ada. */
  renewalGraceUntil?: Date | string | null;
}

/** 12.00 WIB pada tanggal kontrak berakhir = 05.00 UTC. */
function contractEndAtNoonJakarta(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 5, 0, 0));
}

/** Akhir hari WIB (23.59.59) = 16.59.59 UTC. */
function endOfDayJakarta(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 16, 59, 59, 999));
}

/**
 * S-03: satu definisi status turunan.

 * - status non-ACTIVE dikembalikan apa adanya (COMPLETED/CANCELLED).
 * - sebelum H-day 12.00 WIB: ACTIVE.
 * - setelah H-day 12.00 WIB: GRACE bila renewal DP_SECURED masih dalam
 *   batas settlementDueDate (H+7), selain itu OVERSTAY.
 * Status tidak disimpan di DB; UI dan API memakai fungsi yang sama.
 */
export function deriveStayLifecycle(
  input: StayLifecycleInput,
  now: Date = new Date(),
): StayLifecycleStatus {
  if (input.status !== 'ACTIVE') {
    return input.status as StayLifecycleStatus;
  }
  if (!input.plannedCheckOutDate) return 'ACTIVE';

  const contractEnd = contractEndAtNoonJakarta(new Date(input.plannedCheckOutDate));
  if (now < contractEnd) return 'ACTIVE';

  if (input.renewalGraceUntil) {
    const graceEnd = endOfDayJakarta(new Date(input.renewalGraceUntil));
    if (now <= graceEnd) return 'GRACE';
  }

  return 'OVERSTAY';
}
