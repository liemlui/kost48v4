import type { InvoiceStatus, PaymentSubmissionStatus, PricingTerm } from '../types';

export const TENANT_PAYMENT_REVIEW_MESSAGE = 'Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.';
export const TENANT_PAYMENT_REVIEW_DETAIL = 'Admin akan mencocokkan nominal dan bukti pembayaran. Kamu cukup menunggu notifikasi berikutnya.';

export function normalizeStatus(status?: string | null) {
  return (status ?? '').toUpperCase();
}

export function isPendingReviewStatus(status?: PaymentSubmissionStatus | string | null) {
  return normalizeStatus(status) === 'PENDING_REVIEW';
}

export function isClosedInvoiceStatus(status?: InvoiceStatus | string | null) {
  const normalized = normalizeStatus(status);
  return normalized === 'PAID' || normalized === 'CANCELLED';
}

export function isOpenInvoiceStatus(status?: InvoiceStatus | string | null) {
  return Boolean(status) && !isClosedInvoiceStatus(status);
}

export function isPayableInvoiceStatus(status?: InvoiceStatus | string | null) {
  const normalized = normalizeStatus(status);
  return normalized === 'ISSUED' || normalized === 'PARTIAL';
}

export function tenantInvoiceStatusLabel(status?: InvoiceStatus | string | null, overdue = false) {
  if (overdue) return 'Terlambat';
  const normalized = normalizeStatus(status);
  if (normalized === 'DRAFT') return 'Sedang disiapkan admin';
  if (normalized === 'ISSUED') return 'Belum dibayar';
  if (normalized === 'PARTIAL') return 'Dibayar sebagian';
  if (normalized === 'PAID') return 'Lunas';
  if (normalized === 'CANCELLED') return 'Dibatalkan';
  return status || '-';
}

export function tenantPricingTermLabel(term?: PricingTerm | string | null) {
  const normalized = normalizeStatus(term);
  if (normalized === 'DAILY') return 'Harian';
  if (normalized === 'WEEKLY') return 'Mingguan';
  if (normalized === 'BIWEEKLY') return '2 Mingguan';
  if (normalized === 'MONTHLY') return 'Bulanan';
  if (normalized === 'SMESTERLY') return 'Semesteran';
  if (normalized === 'YEARLY') return 'Tahunan';
  return term || '-';
}

export function tenantCategoryLabel(category?: string | null) {
  const normalized = normalizeStatus(category);
  if (normalized === 'ELECTRICITY') return 'Listrik';
  if (normalized === 'PLUMBING') return 'Air / Plumbing';
  if (normalized === 'AC') return 'AC';
  if (normalized === 'WIFI') return 'WiFi';
  if (normalized === 'DOOR_KEY') return 'Kunci / Pintu';
  if (normalized === 'FURNITURE') return 'Furniture';
  if (normalized === 'CLEANING') return 'Kebersihan';
  if (normalized === 'PEST') return 'Hama';
  if (normalized === 'SECURITY') return 'Keamanan';
  if (normalized === 'NOISE') return 'Keributan';
  if (normalized === 'CHECKIN_CHECKOUT') return 'Bantuan Masuk Kamar / Keluar';
  if (normalized === 'PAYMENT_ADMIN') return 'Tagihan / Admin';
  if (normalized === 'EMERGENCY') return 'Darurat';
  if (normalized === 'MAINTENANCE') return 'Perbaikan kamar';
  if (normalized === 'BILLING') return 'Tagihan';
  if (normalized === 'GENERAL') return 'Bantuan umum';
  if (normalized === 'OTHER') return 'Lainnya';
  return category || 'Bantuan umum';
}
