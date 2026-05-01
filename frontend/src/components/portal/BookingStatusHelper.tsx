import axios from 'axios';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import type { TenantBooking } from '../../types';
import { getBookingExpiryMeta } from '../../utils/bookingExpiry';

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

  // 6. Booking dibatalkan
  if (statusUpper === 'CANCELLED') {
    return {
      badgeStatus: 'DANGER',
      label: 'Booking dibatalkan',
      helper: 'Booking ini telah dibatalkan dan tidak dapat diproses lebih lanjut.',
    };
  }

  // 5. Booking kadaluarsa
  if (statusUpper === 'EXPIRED' || expiryMeta.isExpired) {
    return {
      badgeStatus: 'WARNING',
      label: 'Booking kadaluarsa',
      helper: 'Masa berlaku booking sudah habis. Silakan lakukan pemesanan baru jika masih berminat.',
    };
  }

  // 4. Booking aktif / kamar sudah ditempati
  if (statusUpper === 'ACTIVE' || roomStatusUpper === 'OCCUPIED') {
    return {
      badgeStatus: 'SUCCESS',
      label: 'Booking aktif / kamar sudah ditempati',
      helper: 'Booking Anda sudah aktif. Silakan buka halaman Hunian Saya untuk detail hunian.',
    };
  }

  const hasInitialInvoice =
    Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  // 3. Pembayaran sedang direview
  if (hasInitialInvoice && hasPendingPaymentSubmission) {
    return {
      badgeStatus: 'INFO',
      label: 'Pembayaran sedang direview',
      helper: booking.latestInvoiceNumber
        ? `Bukti pembayaran untuk invoice ${booking.latestInvoiceNumber} telah dikirim dan sedang menunggu verifikasi admin. Mohon tunggu hasil review.`
        : 'Bukti pembayaran telah dikirim dan sedang menunggu verifikasi admin. Mohon tunggu hasil review.',
    };
  }

  // 2. Booking disetujui --- menunggu pembayaran
  if (hasInitialInvoice) {
    return {
      badgeStatus: 'INFO',
      label: 'Booking disetujui — menunggu pembayaran',
      helper: booking.latestInvoiceNumber
        ? `Admin sudah menyetujui booking ini. Invoice awal ${booking.latestInvoiceNumber} sudah terbentuk dan menunggu pembayaran sewa pertama dan deposit.`
        : 'Admin sudah menyetujui booking ini. Invoice awal sudah terbentuk dan menunggu pembayaran sewa pertama dan deposit.',
    };
  }

  // 1. Menunggu review admin
  return {
    badgeStatus: 'WARNING',
    label: 'Menunggu review admin',
    helper:
      'Booking Anda masih menunggu review admin. Jika belum ada update, Anda dapat membatalkan booking atau menghubungi admin.',
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
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
  if (statusUpper === 'ACTIVE') return false;

  const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
  if (expiryMeta.isExpired) return false;

  return true;
}

export function getAdminWhatsAppNumber(): string {
  return import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '';
}

export function buildWhatsAppFollowUpUrl(booking: TenantBooking): string {
  const waNumber = getAdminWhatsAppNumber().replace(/\D/g, '');
  if (!waNumber) return '#';

  const roomCode = booking.room?.code ?? `Kamar #${booking.roomId}`;
  const message = `Halo Admin KOST48, saya ingin follow up booking ${roomCode}. Mohon info statusnya. Terima kasih.`;

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}
