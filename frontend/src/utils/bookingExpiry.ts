export function parseDateSafe(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateId(value?: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateSafe(value);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', options ?? {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
};

export function getBookingExpiryMeta(expiresAt?: string | Date | null): BookingExpiryMeta {
  const expiryDate = parseDateSafe(expiresAt);
  const daysRemaining = daysUntilDate(expiresAt);

  if (!expiryDate || daysRemaining === null) {
    return {
      variant: 'SECONDARY',
      badgeLabel: 'Tanpa Batas Waktu',
      helperText: 'Masa berlaku booking belum tersedia',
      daysRemaining: null,
      isExpired: false,
    };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const isExpired = diffMs <= 0;

  if (isExpired) {
    return {
      variant: 'DANGER',
      badgeLabel: 'Expired',
      helperText: 'Booking sudah lewat masa berlaku 3 jam dari pembuatan',
      daysRemaining,
      isExpired: true,
    };
  }

  const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));

  if (hoursRemaining <= 24) {
    const label = `Sisa ${hoursRemaining} Jam`;
    return {
      variant: hoursRemaining <= 6 ? 'DANGER' : 'WARNING',
      badgeLabel: label,
      helperText: `Booking masih berlaku sekitar ${hoursRemaining} jam lagi`,
      daysRemaining,
      isExpired: false,
    };
  }

  if (daysRemaining <= 3) {
    return {
      variant: 'WARNING',
      badgeLabel: `Sisa ${daysRemaining} Hari`,
      helperText: `Booking masih berlaku ${daysRemaining} hari lagi`,
      daysRemaining,
      isExpired: false,
    };
  }

  return {
    variant: 'INFO',
    badgeLabel: 'Masih Berlaku',
    helperText: `Booking masih berlaku ${daysRemaining} hari lagi`,
    daysRemaining,
    isExpired: false,
  };
}
