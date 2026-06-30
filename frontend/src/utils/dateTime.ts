import { addHours, isValid, intervalToDuration, differenceInCalendarDays } from 'date-fns';

const DEFAULT_TIME_ZONE = 'Asia/Jakarta';
const DEFAULT_TIME_ZONE_LABEL = 'WIB';

export function parseDateTimeSafe(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return isValid(date) ? date : null;
}

export function formatDateTimeWib(value?: string | Date | null): string {
  const date = parseDateTimeSafe(value);
  if (!date) return '-';

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatted.replace('.', ':')} ${DEFAULT_TIME_ZONE_LABEL}`;
}

export function formatDateOnly(value?: string | Date | null): string {
  const date = parseDateTimeSafe(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatClockWib(value?: string | Date | null): string {
  const date = parseDateTimeSafe(value);
  if (!date) return '-';

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatted.replace('.', ':')} ${DEFAULT_TIME_ZONE_LABEL}`;
}

function plural(value: number, singular: string): string {
  return `${value} ${singular}`;
}

export function formatDurationDetailed(ms: number): string {
  const absMs = Math.max(0, Math.abs(ms));
  const { days = 0, hours = 0, minutes = 0 } = intervalToDuration({ start: 0, end: absMs });
  const parts: string[] = [];
  if (days > 0) parts.push(plural(days, 'hari'));
  if (hours > 0) parts.push(plural(hours, 'jam'));
  if (minutes > 0 || parts.length === 0) parts.push(plural(minutes, 'menit'));
  return parts.slice(0, 3).join(' ');
}

export function formatDurationCompact(ms: number): string {
  const absMs = Math.max(0, Math.abs(ms));
  const { days = 0, hours = 0, minutes = 0 } = intervalToDuration({ start: 0, end: absMs });
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}h`);
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.slice(0, 3).join(' ');
}

export type DeadlineMeta = {
  hasDate: boolean;
  isExpired: boolean;
  absoluteLabel: string;
  clockLabel: string;
  relativeLabel: string;
  compactLabel: string;
  detailLabel: string;
  actionLabel: string;
  diffMs: number | null;
};

export function getDeadlineMeta(value?: string | Date | null, label = 'Batas waktu'): DeadlineMeta {
  const date = parseDateTimeSafe(value);
  if (!date) {
    return {
      hasDate: false,
      isExpired: false,
      absoluteLabel: '-',
      clockLabel: '-',
      relativeLabel: 'Batas waktu belum tersedia',
      compactLabel: 'Tanpa jam',
      detailLabel: `${label}: belum tersedia`,
      actionLabel: 'Belum ada batas jam yang tercatat',
      diffMs: null,
    };
  }

  const diffMs = date.getTime() - Date.now();
  const isExpired = diffMs <= 0;
  const duration = formatDurationDetailed(diffMs);
  const compactDuration = formatDurationCompact(diffMs);
  const absoluteLabel = formatDateTimeWib(date);
  const clockLabel = formatClockWib(date);
  const relativeLabel = isExpired ? `Terlambat ${duration}` : `Sisa ${duration}`;
  const compactLabel = isExpired ? `Terlambat ${compactDuration}` : `Sisa ${compactDuration}`;

  return {
    hasDate: true,
    isExpired,
    absoluteLabel,
    clockLabel,
    relativeLabel,
    compactLabel,
    detailLabel: `${label}: ${absoluteLabel} · ${relativeLabel}`,
    actionLabel: isExpired
      ? `Seharusnya selesai ${absoluteLabel}. ${relativeLabel}.`
      : `Selesaikan sebelum ${absoluteLabel}. ${relativeLabel}.`,
    diffMs,
  };
}

export function getCreatedToDeadlineLabel(createdAt?: string | Date | null, deadline?: string | Date | null): string | null {
  const created = parseDateTimeSafe(createdAt);
  const end = parseDateTimeSafe(deadline);
  if (!created || !end) return null;
  const diffMs = end.getTime() - created.getTime();
  if (diffMs <= 0) return null;
  return formatDurationDetailed(diffMs);
}

export function addHoursToDate(value: string | Date | null | undefined, hours: number): Date | null {
  const date = parseDateTimeSafe(value);
  if (!date) return null;
  return addHours(date, hours);
}

export function daysFromToday(value?: string | Date | null): number | null {
  const date = parseDateTimeSafe(value);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
}

export type LeaseProgress = {
  hasRange: boolean;
  percentElapsed: number; // 0..100
  daysElapsed: number;
  daysRemaining: number;  // negatif bila lewat jadwal
  totalDays: number;
};

export function getLeaseProgress(checkInDate?: string | Date | null, endDate?: string | Date | null): LeaseProgress {
  const start = parseDateTimeSafe(checkInDate);
  const end = parseDateTimeSafe(endDate);
  if (!start || !end) {
    return { hasRange: false, percentElapsed: 0, daysElapsed: 0, daysRemaining: 0, totalDays: 0 };
  }
  const now = new Date();
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const daysElapsed = Math.min(totalDays, Math.max(0, differenceInCalendarDays(now, start)));
  const daysRemaining = differenceInCalendarDays(end, now);
  const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
  return { hasRange: true, percentElapsed, daysElapsed, daysRemaining, totalDays };
}

export function formatTenure(checkInDate?: string | Date | null): string {
  const start = parseDateTimeSafe(checkInDate);
  if (!start) return '-';
  const { years = 0, months = 0, days = 0 } = intervalToDuration({ start, end: new Date() });
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (parts.length === 0) parts.push(`${days} hari`);
  return parts.join(' ');
}
