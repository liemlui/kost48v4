const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toUtcDateParts(value: string | Date): { year: number; month: number; day: number } | null {
  if (typeof value === 'string' && DATE_INPUT_RE.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return { year, month, day };
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function toUtcDateOnlyIso(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const parts = toUtcDateParts(value);
  if (!parts) return undefined;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)).toISOString();
}

export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return '';
  const parts = toUtcDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getDateInputDaysFromToday(daysFromToday = 0): string {
  const now = new Date();
  const targetUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysFromToday,
    0,
    0,
    0,
    0,
  ));
  return `${targetUtc.getUTCFullYear()}-${pad(targetUtc.getUTCMonth() + 1)}-${pad(targetUtc.getUTCDate())}`;
}

export function getTenantDateDiffInDays(value?: string | Date | null): number | null {
  const parts = value ? toUtcDateParts(value) : null;
  if (!parts) return null;

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  return Math.floor((targetUtc - todayUtc) / MS_PER_DAY);
}
