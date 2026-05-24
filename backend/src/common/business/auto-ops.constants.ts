export const AUTO_OPS_DEADLINES = {
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
