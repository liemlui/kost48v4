const DEFAULT_TIME_ZONE = 'Asia/Jakarta';
const DEFAULT_TIME_ZONE_LABEL = 'WIB';

export function parseDateTimeSafe(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(plural(days, 'hari'));
  if (hours > 0) parts.push(plural(hours, 'jam'));
  if (minutes > 0 || parts.length === 0) parts.push(plural(minutes, 'menit'));

  return parts.slice(0, 3).join(' ');
}

export function formatDurationCompact(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

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
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
