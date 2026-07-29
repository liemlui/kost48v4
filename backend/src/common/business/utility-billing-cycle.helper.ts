import { startOfJakartaBusinessDay } from '../utils/date.util';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type UtilityBillingCycle = {
  /** Inclusive, represented as the UTC date for the Jakarta business day. */
  start: Date;
  /** Exclusive, represented as the UTC date for the Jakarta business day. */
  end: Date;
  key: string;
};

export type UtilityLeasePeriod = {
  /** Inclusive start of a paid initial/renewal lease period. */
  start: Date;
  /** Exclusive end of a paid initial/renewal lease period. */
  end: Date;
};

function dateAtAnchor(year: number, month: number, anchorDay: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay)));
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

/**
 * A paid initial/renewal lease period is the primary utility cycle. When a
 * paid lease invoice is unavailable (legacy data), the fallback follows the
 * tenant's check-in day each month. Dates use Jakarta business-day convention.
 */
export function getUtilityBillingCycle(
  checkInDate: Date,
  asOf = new Date(),
  paidLeasePeriod?: UtilityLeasePeriod | null,
): UtilityBillingCycle {
  const checkIn = startOfJakartaBusinessDay(checkInDate);
  const target = startOfJakartaBusinessDay(asOf);

  // A paid lease invoice is authoritative. This makes the free allowance reset
  // when a renewal is finalized, even when its boundary differs from the
  // original check-in calendar date.
  if (paidLeasePeriod) {
    const leaseStart = startOfJakartaBusinessDay(paidLeasePeriod.start);
    const leaseEnd = startOfJakartaBusinessDay(paidLeasePeriod.end);
    if (
      leaseEnd.getTime() > leaseStart.getTime()
      && target.getTime() >= leaseStart.getTime()
      && target.getTime() < leaseEnd.getTime()
    ) {
      return { start: leaseStart, end: leaseEnd, key: dateKey(leaseStart) };
    }
  }

  const anchorDay = checkIn.getUTCDate();

  let start = dateAtAnchor(target.getUTCFullYear(), target.getUTCMonth(), anchorDay);
  if (start.getTime() > target.getTime()) {
    start = dateAtAnchor(target.getUTCFullYear(), target.getUTCMonth() - 1, anchorDay);
  }
  // A pre-check-in date can occur only while looking at historical corrections.
  // Its first cycle must never begin before the tenant's actual check-in date.
  if (start.getTime() < checkIn.getTime()) start = checkIn;

  const end = dateAtAnchor(start.getUTCFullYear(), start.getUTCMonth() + 1, anchorDay);
  return { start, end, key: dateKey(start) };
}

export function toUtilityCycleDateKey(value: Date) {
  return dateKey(value);
}

/**
 * Utility cycles are UTC-midnight date labels for PostgreSQL `date` columns.
 * Telemetry uses real instants, so Jakarta midnight is seven hours earlier.
 */
export function toUtilityCycleInstantRange(cycle: Pick<UtilityBillingCycle, 'start' | 'end'>) {
  return {
    start: new Date(cycle.start.getTime() - JAKARTA_OFFSET_MS),
    end: new Date(cycle.end.getTime() - JAKARTA_OFFSET_MS),
  };
}

/**
 * Number of monthly allowances contained in a utility cycle. A 3-month paid
 * renewal therefore receives 3 × the configured monthly electricity quota.
 * A partial calendar month is counted as one allowance so short valid stays
 * never receive a zero quota.
 */
export function getUtilityAllowanceMonths(cycle: Pick<UtilityBillingCycle, 'start' | 'end'>) {
  const start = startOfJakartaBusinessDay(cycle.start);
  const end = startOfJakartaBusinessDay(cycle.end);
  if (end.getTime() <= start.getTime()) return 1;

  const anchorDay = start.getUTCDate();
  let cursor = start;
  let months = 0;
  while (cursor.getTime() < end.getTime() && months < 120) {
    const next = dateAtAnchor(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, anchorDay);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
    months += 1;
  }
  return Math.max(1, months);
}
