import type { PaymentSubmission, Stay, TenantBooking } from '../types';
import { getBookingExpiryMeta } from './bookingExpiry';
import { isPendingReviewStatus } from './tenantCopy';

export function isTenantBookingInactive(booking: TenantBooking): boolean {
  const status = (booking.status ?? '').toUpperCase();
  const expiry = getBookingExpiryMeta(booking.expiresAt);

  return (
    status === 'CANCELLED' ||
    status === 'EXPIRED' ||
    status === 'COMPLETED' ||
    status === 'REJECTED' ||
    expiry.isExpired
  );
}

export function isTenantBookingOccupied(booking: TenantBooking): boolean {
  const roomStatus = (booking.room?.status ?? '').toUpperCase();
  return roomStatus === 'OCCUPIED';
}

export function isTenantBookingActionable(booking: TenantBooking): boolean {
  if (isTenantBookingInactive(booking)) return false;
  if (isTenantBookingOccupied(booking)) return false;
  return true;
}


export function stayToTenantBooking(stay: Stay | null | undefined): TenantBooking | null {
  if (!stay) return null;
  return {
    id: stay.id,
    tenantId: stay.tenantId,
    roomId: stay.roomId,
    status: stay.status,
    pricingTerm: stay.pricingTerm,
    agreedRentAmountRupiah: stay.agreedRentAmountRupiah,
    checkInDate: stay.checkInDate,
    plannedCheckOutDate: stay.plannedCheckOutDate,
    expiresAt: stay.expiresAt,
    depositAmountRupiah: stay.depositAmountRupiah,
    depositPaidAmountRupiah: stay.depositPaidAmountRupiah,
    depositPaymentStatus: stay.depositPaymentStatus,
    electricityTariffPerKwhRupiah: stay.electricityTariffPerKwhRupiah,
    waterTariffPerM3Rupiah: stay.waterTariffPerM3Rupiah,
    bookingSource: stay.bookingSource,
    stayPurpose: stay.stayPurpose,
    notes: stay.notes,
    createdAt: (stay as { createdAt?: string }).createdAt,
    updatedAt: (stay as { updatedAt?: string }).updatedAt,
    tenant: stay.tenant ? { id: stay.tenant.id, fullName: stay.tenant.fullName, phone: stay.tenant.phone, email: stay.tenant.email } : null,
    room: stay.room ? { id: stay.room.id, code: stay.room.code, name: stay.room.name, floor: stay.room.floor, status: stay.room.status } : null,
    invoiceCount: stay.invoiceCount ?? stay.openInvoiceCount ?? 0,
    latestInvoiceId: stay.latestInvoiceId ?? null,
    latestInvoiceNumber: stay.latestInvoiceNumber ?? null,
    latestInvoiceStatus: stay.latestInvoiceStatus ?? null,
    invoiceTotalAmountRupiah: stay.invoiceTotalAmountRupiah ?? null,
    invoicePaidAmountRupiah: stay.invoicePaidAmountRupiah ?? null,
    invoiceRemainingAmountRupiah: stay.invoiceRemainingAmountRupiah ?? null,
  };
}

export function getActionableTenantBookings(bookings: TenantBooking[]): TenantBooking[] {
  return bookings.filter(isTenantBookingActionable);
}

export function getPrimaryTenantBooking(bookings: TenantBooking[]): TenantBooking | null {
  const active = getActionableTenantBookings(bookings);
  return active.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0] ?? null;
}

export function hasPendingPaymentForBooking(booking: TenantBooking | null | undefined, submissions: PaymentSubmission[]): boolean {
  if (!booking) return false;
  return submissions.some((submission) => submission.stayId === booking.id && isPendingReviewStatus(submission.status));
}

export type TenantBookingGuideState = 'WAITING_ADMIN' | 'PAY_INITIAL_INVOICE' | 'PAYMENT_UNDER_REVIEW' | 'READY_TO_STAY' | 'CLOSED';

export function getTenantBookingGuideState(
  booking: TenantBooking | null | undefined,
  submissions: PaymentSubmission[] = [],
): TenantBookingGuideState {
  if (!booking || isTenantBookingInactive(booking)) return 'CLOSED';
  if (isTenantBookingOccupied(booking)) return 'READY_TO_STAY';
  if (hasPendingPaymentForBooking(booking, submissions)) return 'PAYMENT_UNDER_REVIEW';

  const hasInvoice = Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);
  if (hasInvoice) return 'PAY_INITIAL_INVOICE';

  return 'WAITING_ADMIN';
}

export function getTenantBookingGuideCopy(state: TenantBookingGuideState) {
  switch (state) {
    case 'WAITING_ADMIN':
      return {
        icon: '⏳',
        title: 'Menunggu review admin',
        description: 'Pemesanan kamu sudah masuk, tetapi belum mengunci kamar. Admin mengecek kesiapan kamar; setelah tagihan dibuka kamu wajib bayar dan kirim bukti sebelum jam deadline yang tampil di badge.',
        actionLabel: 'Lihat status pemesanan',
        tone: 'warning' as const,
      };
    case 'PAY_INITIAL_INVOICE':
      return {
        icon: '🧾',
        title: 'Pemesanan disetujui — bayar tagihan awal',
        description: 'Tagihan awal sewa pertama + deposit sudah tersedia. Bayar dan kirim bukti dalam satu langkah sebelum jam deadline yang tampil di badge. Kamar baru aman setelah pembayaran disetujui admin.',
        actionLabel: 'Bayar tagihan awal',
        tone: 'info' as const,
      };
    case 'PAYMENT_UNDER_REVIEW':
      return {
        icon: '🔎',
        title: 'Bukti pembayaran sedang diperiksa',
        description: 'Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang. Selama bukti masih direview, sistem tidak melepas kamar karena kamu sudah melakukan aksi.',
        actionLabel: 'Lihat status pembayaran',
        tone: 'info' as const,
      };
    case 'READY_TO_STAY':
      return {
        icon: '🏠',
        title: 'Kamar sudah aktif',
        description: 'Pemesanan sudah menjadi masa sewa aktif. Buka My Stay Guide untuk melihat kamar, tagihan, dan aksi berikutnya.',
        actionLabel: 'Buka My Stay Guide',
        tone: 'success' as const,
      };
    default:
      return {
        icon: '🛏️',
        title: 'Belum ada pemesanan aktif',
        description: 'Pilih kamar dari katalog. Ingat, pemesanan saja belum mengunci kamar sampai pembayaran disetujui.',
        actionLabel: 'Pilih kamar',
        tone: 'secondary' as const,
      };
  }
}
