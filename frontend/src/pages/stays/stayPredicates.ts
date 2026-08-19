import { listStays } from '../../api/stays';
import { daysUntilDate, getBookingExpiryMeta } from '../../utils/bookingExpiry';
import { formatDateTimeWib } from '../../utils/dateTime';
import type { PaginatedResponse, Stay } from '../../types';

export function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateTimeWib(dateValue);
}

export function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  return daysUntilDate(targetDate);
}

export function isReservedBooking(stay: Stay): boolean {
  // M17 Iterasi 4: "booking" = stay aktif yang belum jadi hunian (room belum OCCUPIED)
  // dan berasal dari booking online. Room tetap AVAILABLE/MAINTENANCE sebelum DP/LUNAS
  // di-approve; setelah approve payment baru RESERVED. expiresAt boleh null (sudah bayar).
  return (
    stay.status === 'ACTIVE' &&
    stay.bookingSource === 'WEBSITE' &&
    Boolean(stay.room?.status && ['AVAILABLE', 'RESERVED', 'MAINTENANCE'].includes(stay.room.status))
  );
}

export function isExpiredReservedBooking(stay: Stay): boolean {
  return isReservedBooking(stay) && getBookingExpiryMeta(stay.expiresAt).isExpired;
}

export function isOperationalActiveStay(stay: Stay): boolean {
  return stay.status === 'ACTIVE' && stay.room?.status === 'OCCUPIED';
}

export function getDepositSettlementLabel(stay: Stay) {
  const hasDeductionAndRefund = Number(stay.depositDeductionRupiah ?? 0) > 0 && Number(stay.depositRefundedRupiah ?? 0) > 0;
  if (stay.depositStatus === 'REFUNDED') return hasDeductionAndRefund ? 'Sebagian dikembalikan & sebagian dipotong' : 'Dikembalikan';
  if (stay.depositStatus === 'PARTIALLY_REFUNDED') return 'Sebagian dikembalikan';
  if (stay.depositStatus === 'FORFEITED') return 'Hangus';
  return stay.depositStatus;
}

export function isCheckoutDueOrOverdue(stay: Stay): boolean {
  if (stay.status !== 'ACTIVE' || stay.room?.status !== 'OCCUPIED' || !stay.plannedCheckOutDate) return false;
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  return daysLeft !== null && daysLeft <= 10;
}

export function getCheckoutReminderBadge(stay: Stay): { label: string; status: string } | null {
  if (stay.status !== 'ACTIVE' || stay.room?.status !== 'OCCUPIED' || !stay.plannedCheckOutDate) return null;
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  if (daysLeft === null || daysLeft < 0 || daysLeft > 10) return null;
  if (daysLeft >= 8) return { label: 'H-10', status: 'WARNING' };
  if (daysLeft >= 4) return { label: 'H-7', status: 'INFO' };
  return { label: 'H-3', status: 'DANGER' };
}

export function getBookingApprovalMeta(stay: Stay) {
  const hasInitialInvoice = Number(stay.invoiceCount ?? 0) > 0 || Boolean(stay.latestInvoiceId);
  if (hasInitialInvoice) {
    return {
      isPendingApproval: false,
      label: 'Menunggu Pembayaran',
      variant: 'INFO',
      helper: stay.latestInvoiceNumber
        ? `Tagihan awal ${stay.latestInvoiceNumber} sudah terbentuk. Booking ini tidak lagi menunggu persetujuan.`
        : 'Tagihan awal booking sudah terbentuk. Booking ini tidak lagi menunggu persetujuan.',
    };
  }
  return {
    isPendingApproval: true,
    label: 'Menunggu Persetujuan',
    variant: 'WARNING',
    helper: 'Booking ini masih menunggu persetujuan admin dan pembuatan tagihan awal.',
  };
}

// KOST48 = 48 kamar maks; stay aktif tidak mungkin >48. Single call limit 200 cukup untuk semua skenario.
export async function listAllActiveStaysForBookings(): Promise<PaginatedResponse<Stay>> {
  return listStays({ status: 'ACTIVE', page: 1, limit: 200 });
}
