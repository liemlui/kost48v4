import axios from 'axios';
import StatusBadge, { getStatusLabel } from '../common/StatusBadge';
import type { TenantBooking } from '../../types';
import { getBookingExpiryMeta } from '../../utils/bookingExpiry';

export function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  const expiryMeta = getBookingExpiryMeta(expiresAt);
  return <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />;
}

export function getPortalBookingStatus(booking: TenantBooking) {
  const hasInitialInvoice =
    Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);

  if (hasInitialInvoice) {
    return {
      badgeStatus: 'INFO',
      label: 'Menunggu Pembayaran',
      helper: booking.latestInvoiceNumber
        ? `Admin sudah menyetujui booking ini. Invoice awal ${booking.latestInvoiceNumber} sudah terbentuk dan menunggu pembayaran.`
        : 'Admin sudah menyetujui booking ini. Invoice awal booking sudah terbentuk dan menunggu pembayaran.',
    };
  }

  return {
    badgeStatus: 'WARNING',
    label: 'Menunggu Approval',
    helper:
      'Booking Anda masih menunggu persetujuan admin sebelum invoice awal dibuat.',
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