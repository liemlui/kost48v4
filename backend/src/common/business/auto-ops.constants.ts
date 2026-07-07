// AutoOps SLA deadlines — sumber: OperationalSetting (DB) dengan fallback env.
// Nilai di-cache di memori; panggil refreshAutoOpsDeadlines() setelah owner update settings.

import type { PrismaService } from '../../prisma/prisma.service';

// ── Default (env fallback) ──────────────────────────────────────────────────
const defaults = {
  BOOKING_REVIEW_DEADLINE_HOURS: Number(process.env.BOOKING_REVIEW_DEADLINE_HOURS ?? 3),
  APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS: Number(process.env.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS ?? 3),
  PAYMENT_REVIEW_URGENT_HOURS: Number(process.env.PAYMENT_REVIEW_URGENT_HOURS ?? 1),
  PAYMENT_REVIEW_ESCALATE_HOURS: Number(process.env.PAYMENT_REVIEW_ESCALATE_HOURS ?? 3),
  PAYMENT_REVIEW_MAX_HOURS: Number(process.env.PAYMENT_REVIEW_MAX_HOURS ?? 6),
  INVOICE_URGENT_AFTER_HOURS: Number(process.env.INVOICE_URGENT_AFTER_HOURS ?? 6),
  INVOICE_DUE_AFTER_HOURS: Number(process.env.INVOICE_DUE_AFTER_HOURS ?? 24),
  RENEW_REMINDER_DAYS: Number(process.env.RENEW_REMINDER_DAYS ?? 3),
  RENEW_LAST_CALL_HOURS: Number(process.env.RENEW_LAST_CALL_HOURS ?? 24),
  RENEW_PAYMENT_DEADLINE_HOURS: Number(process.env.RENEW_PAYMENT_DEADLINE_HOURS ?? 3),
  RENEW_REVIEW_URGENT_HOURS: Number(process.env.RENEW_REVIEW_URGENT_HOURS ?? 3),
  RENEW_REVIEW_ESCALATE_HOURS: Number(process.env.RENEW_REVIEW_ESCALATE_HOURS ?? 6),
  CHECKOUT_REVIEW_URGENT_HOURS: Number(process.env.CHECKOUT_REVIEW_URGENT_HOURS ?? 3),
  CHECKOUT_REVIEW_ESCALATE_HOURS: Number(process.env.CHECKOUT_REVIEW_ESCALATE_HOURS ?? 6),
  CHECKOUT_FINAL_URGENT_HOURS: Number(process.env.CHECKOUT_FINAL_URGENT_HOURS ?? 6),
  LATE_TENANT_VACATE_HOURS: Number(process.env.LATE_TENANT_VACATE_HOURS ?? 3),
  AUTO_OPS_INTERVAL_MINUTES: Number(process.env.AUTO_OPS_INTERVAL_MINUTES ?? 5),
};

// ── Runtime cache — diawali dari env, di-refresh saat owner update settings ─
export const AUTO_OPS_DEADLINES = { ...defaults };

// ── Map key DB → key cache ──────────────────────────────────────────────────
const DB_TO_CACHE: Record<string, keyof typeof AUTO_OPS_DEADLINES> = {
  bookingReviewDeadlineHours: 'BOOKING_REVIEW_DEADLINE_HOURS',
  approvedBookingPaymentDeadlineHours: 'APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS',
  paymentReviewUrgentHours: 'PAYMENT_REVIEW_URGENT_HOURS',
  paymentReviewEscalateHours: 'PAYMENT_REVIEW_ESCALATE_HOURS',
  paymentReviewMaxHours: 'PAYMENT_REVIEW_MAX_HOURS',
  invoiceUrgentAfterHours: 'INVOICE_URGENT_AFTER_HOURS',
  invoiceDueAfterHours: 'INVOICE_DUE_AFTER_HOURS',
  renewReminderDays: 'RENEW_REMINDER_DAYS',
  renewLastCallHours: 'RENEW_LAST_CALL_HOURS',
  renewPaymentDeadlineHours: 'RENEW_PAYMENT_DEADLINE_HOURS',
  renewReviewUrgentHours: 'RENEW_REVIEW_URGENT_HOURS',
  renewReviewEscalateHours: 'RENEW_REVIEW_ESCALATE_HOURS',
  checkoutReviewUrgentHours: 'CHECKOUT_REVIEW_URGENT_HOURS',
  checkoutReviewEscalateHours: 'CHECKOUT_REVIEW_ESCALATE_HOURS',
  checkoutFinalUrgentHours: 'CHECKOUT_FINAL_URGENT_HOURS',
  lateTenantVacateHours: 'LATE_TENANT_VACATE_HOURS',
  autoOpsIntervalMinutes: 'AUTO_OPS_INTERVAL_MINUTES',
};

/** Panggil saat startup dan setelah owner update settings — refresh cache dari DB (env fallback). */
export async function refreshAutoOpsDeadlines(prisma: PrismaService): Promise<void> {
  try {
    const db = await prisma.operationalSetting.findUnique({
      where: { id: 1 },
      select: Object.fromEntries(Object.keys(DB_TO_CACHE).map((k) => [k, true])) as any,
    });
    for (const [dbKey, cacheKey] of Object.entries(DB_TO_CACHE)) {
      const dbVal = (db as any)?.[dbKey];
      if (typeof dbVal === 'number') AUTO_OPS_DEADLINES[cacheKey] = dbVal;
      else AUTO_OPS_DEADLINES[cacheKey] = (defaults as any)[cacheKey];
    }
  } catch {
    // DB not ready — keep env defaults
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function hoursFromNow(hours: number, base = new Date()): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

export function hoursAfter(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

export function daysAfter(value: Date, days: number): Date {
  return hoursAfter(value, days * 24);
}

export function deadlineLabel(hours: number): string {
  if (hours < 24) return `${hours} jam`;
  const days = Math.round(hours / 24);
  return `${days} hari`;
}
