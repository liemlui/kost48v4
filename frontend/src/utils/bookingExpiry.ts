import { formatDateOnly, formatDateTimeWib, getDeadlineMeta, parseDateTimeSafe } from './dateTime';

export function parseDateSafe(value?: string | Date | null): Date | null {
  return parseDateTimeSafe(value);
}

export function formatDateId(value?: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateSafe(value);
  if (!date) return '-';
  if (options) return new Intl.DateTimeFormat('id-ID', options).format(date);
  return formatDateOnly(date);
}

export function formatDateTimeId(value?: string | Date | null): string {
  return formatDateTimeWib(value);
}

export function daysUntilDate(value?: string | Date | null): number | null {
  const date = parseDateSafe(value);
  if (!date) return null;

  const target = new Date(date.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Check if a date is in the past (actual timestamp comparison, not midnight-normalized) */
export function isDateExpired(value?: string | Date | null): boolean {
  const date = parseDateSafe(value);
  if (!date) return false;
  return date.getTime() <= Date.now();
}

export type BookingExpiryMeta = {
  variant: 'SECONDARY' | 'INFO' | 'WARNING' | 'DANGER';
  badgeLabel: string;
  helperText: string;
  daysRemaining: number | null;
  isExpired: boolean;
  absoluteLabel: string;
  clockLabel: string;
  relativeLabel: string;
  compactLabel: string;
};

export function getBookingExpiryMeta(expiresAt?: string | Date | null): BookingExpiryMeta {
  const expiryDate = parseDateSafe(expiresAt);
  const daysRemaining = daysUntilDate(expiresAt);
  const deadline = getDeadlineMeta(expiresAt, 'Berakhir');

  if (!expiryDate || daysRemaining === null) {
    return {
      variant: 'SECONDARY',
      badgeLabel: 'Tanpa jam batas',
      helperText: 'Masa berlaku pemesanan belum tersedia. Hubungi admin jika status tidak berubah.',
      daysRemaining: null,
      isExpired: false,
      absoluteLabel: '-',
      clockLabel: '-',
      relativeLabel: 'Batas waktu belum tersedia',
      compactLabel: 'Tanpa jam',
    };
  }

  const diffMs = expiryDate.getTime() - Date.now();
  const isExpired = diffMs <= 0;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (isExpired) {
    return {
      variant: 'DANGER',
      badgeLabel: deadline.compactLabel,
      helperText: `Batas waktu sudah lewat. ${deadline.relativeLabel}. Tenant harus ajukan pemesanan ulang jika sistem sudah mereset booking ini.`,
      daysRemaining,
      isExpired: true,
      absoluteLabel: deadline.absoluteLabel,
      clockLabel: deadline.clockLabel,
      relativeLabel: deadline.relativeLabel,
      compactLabel: deadline.compactLabel,
    };
  }

  if (hoursRemaining <= 6) {
    return {
      variant: 'DANGER',
      badgeLabel: deadline.compactLabel,
      helperText: `${deadline.relativeLabel}. Berakhir ${deadline.absoluteLabel}.`,
      daysRemaining,
      isExpired: false,
      absoluteLabel: deadline.absoluteLabel,
      clockLabel: deadline.clockLabel,
      relativeLabel: deadline.relativeLabel,
      compactLabel: deadline.compactLabel,
    };
  }

  if (hoursRemaining <= 24) {
    return {
      variant: 'WARNING',
      badgeLabel: deadline.compactLabel,
      helperText: `${deadline.relativeLabel}. Berakhir ${deadline.absoluteLabel}.`,
      daysRemaining,
      isExpired: false,
      absoluteLabel: deadline.absoluteLabel,
      clockLabel: deadline.clockLabel,
      relativeLabel: deadline.relativeLabel,
      compactLabel: deadline.compactLabel,
    };
  }

  return {
    variant: 'INFO',
    badgeLabel: deadline.compactLabel,
    helperText: `${deadline.relativeLabel}. Berakhir ${deadline.absoluteLabel}.`,
    daysRemaining,
    isExpired: false,
    absoluteLabel: deadline.absoluteLabel,
    clockLabel: deadline.clockLabel,
    relativeLabel: deadline.relativeLabel,
    compactLabel: deadline.compactLabel,
  };
}
