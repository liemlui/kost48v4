import axios from 'axios';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import type { TenantBooking } from '../../types';
import { getBookingExpiryMeta } from '../../utils/bookingExpiry';
import { formatDateTimeWib } from '../../utils/dateTime';
import { toTenantFriendlyError } from '../../utils/tenantErrorCopy';

export function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const expiryMeta = getBookingExpiryMeta(expiresAt);
  return <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />;
}

export interface PortalBookingStatus {
  badgeStatus: string;
  label: string;
  helper: string;
}

export function getPortalBookingStatus(
  booking: TenantBooking,
  hasPendingPaymentSubmission?: boolean,
): PortalBookingStatus {
  const statusUpper = (booking.status ?? '').toUpperCase();
  const roomStatusUpper = (booking.room?.status ?? '').toUpperCase();
  const expiryMeta = getBookingExpiryMeta(booking.expiresAt);

  // 6. Pemesanan dibatalkan
  if (statusUpper === 'CANCELLED') {
    return {
      badgeStatus: 'DANGER',
      label: 'Pemesanan dibatalkan',
      helper: 'Pemesanan ini telah dibatalkan. Kamar dapat dipilih kembali oleh calon tenant lain.',
    };
  }

  // 5. Pemesanan kedaluwarsa
  if (statusUpper === 'EXPIRED' || expiryMeta.isExpired) {
    return {
      badgeStatus: 'WARNING',
      label: 'Pemesanan kedaluwarsa',
      helper: `Batas waktu pemesanan sudah habis${booking.expiresAt ? ` pada ${formatDateTimeWib(booking.expiresAt)}` : ''}. Sistem akan mereset pemesanan yang melewati batas, dan tenant harus ajukan pemesanan ulang jika masih ingin kamar ini.`,
    };
  }

  // 4. Kamar sudah aktif
  // Booking/stay can still use status ACTIVE while room is only RESERVED during admin/payment flow.
  // For tenant-facing UX, treat it as active only when the room is actually OCCUPIED.
  if (roomStatusUpper === 'OCCUPIED') {
    return {
      badgeStatus: 'SUCCESS',
      label: 'Kamar sudah aktif',
      helper: 'Pemesanan kamu sudah aktif. Silakan buka My Stay Guide untuk melihat kamar, masa sewa, dan tagihan.',
    };
  }

  const hasInitialInvoice =
    Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  // 3. Bukti pembayaran sedang diperiksa
  if (hasInitialInvoice && hasPendingPaymentSubmission) {
    return {
      badgeStatus: 'INFO',
      label: 'Bukti pembayaran sedang diperiksa',
      helper: booking.latestInvoiceNumber
        ? `Bukti pembayaran untuk tagihan ${booking.latestInvoiceNumber} telah dikirim. Tidak perlu upload ulang. Mohon tunggu pemeriksaan admin.`
        : 'Bukti pembayaran telah dikirim. Tidak perlu upload ulang. Mohon tunggu pemeriksaan admin.',
    };
  }

  // 2. Pemesanan disetujui --- menunggu pembayaran
  if (hasInitialInvoice) {
    return {
      badgeStatus: 'INFO',
      label: 'Pemesanan disetujui — menunggu pembayaran',
      helper: booking.latestInvoiceNumber
        ? `Admin sudah menyetujui pemesanan ini. Tagihan awal ${booking.latestInvoiceNumber} sudah tersedia. Bayar dan kirim bukti sebelum ${booking.expiresAt ? formatDateTimeWib(booking.expiresAt) : 'batas waktu yang ditentukan admin'}.`
        : `Admin sudah menyetujui pemesanan ini. Tagihan awal sudah tersedia. Bayar dan kirim bukti sebelum ${booking.expiresAt ? formatDateTimeWib(booking.expiresAt) : 'batas waktu yang ditentukan admin'}.`,
    };
  }

  // 1. Menunggu keputusan admin
  return {
    badgeStatus: 'WARNING',
    label: 'Menunggu keputusan admin',
    helper:
      'Pemesanan kamu masih menunggu keputusan admin. Kamar belum terkunci; sebelum pembayaran disetujui, kamar masih dapat diminati calon tenant lain.',
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return toTenantFriendlyError(error, fallback);
  }
  return toTenantFriendlyError(error, fallback);
}

export function getPaymentTargetLabel(targetType?: string | null) {
  return targetType === 'DEPOSIT' ? 'Deposit' : 'Sewa';
}

export function getDepositStatusLabel(status?: string | null) {
  if (!status) return 'Belum Dibayar';
  if (status === 'PAID') return 'Lunas';
  if (status === 'PARTIAL') return 'Sebagian';
  return 'Belum Dibayar';
}

export function canCancelBooking(booking: TenantBooking): boolean {
  const statusUpper = (booking.status ?? '').toUpperCase();
  const roomStatusUpper = (booking.room?.status ?? '').toUpperCase();
  const hasInvoice = Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  // Only allow cancel when:
  // - status is not already CANCELLED or EXPIRED
  // - room is RESERVED (not OCCUPIED, not AVAILABLE, not MAINTENANCE)
  // - no invoice has been created yet (admin hasn't approved)
  // - booking is not expired
  if (statusUpper === 'CANCELLED' || statusUpper === 'EXPIRED') return false;
  if (roomStatusUpper === 'OCCUPIED' || roomStatusUpper === 'ACTIVE') return false;
  if (hasInvoice) return false;

  const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
  if (expiryMeta.isExpired) return false;

  return true;
}

export function getAdminWhatsAppNumber(): string {
  return import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628';
}

export function buildWhatsAppFollowUpUrl(booking: TenantBooking): string {
  const waNumber = getAdminWhatsAppNumber().replace(/\D/g, '');
  if (!waNumber) return '#';

  const roomCode = booking.room?.code ?? `Kamar #${booking.roomId}`;
  const message = `Halo Admin KOST48, saya ingin follow up pemesanan kamar ${roomCode}. Mohon info statusnya. Terima kasih.`;

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}
