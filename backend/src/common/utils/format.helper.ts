/**
 * Shared format/normalization helpers — currency, phone, date, text.
 *
 * Convention:
 * - "format*" produces human-readable display strings.
 * - "normalize*" produces canonical/storage values.
 */

/**
 * Format a number as Indonesian Rupiah string.
 * Example: 1500000 → "Rp1.500.000"
 * Returns "Rp0" for null/undefined/NaN.
 */
export function formatRupiah(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return 'Rp0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const integer = Math.floor(abs);
  const formatted = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Rp${formatted}`;
}

/**
 * Format Indonesian phone number for display.
 * Input: canonical "6281xxxxxxxxx" → output "08xx-xxxx-xxxx"
 * Falls back to raw input if not recognized.
 */
export function formatPhone(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;

  let local = digits;
  if (local.startsWith('62')) local = `0${local.slice(2)}`;

  // Format: 0xxx-xxxx-xxxx for 10-13 digit numbers
  if (local.length >= 10 && local.length <= 13) {
    const prefix = local.slice(0, 4);
    const mid = local.slice(4, 8);
    const suffix = local.slice(8);
    return `${prefix}-${mid}-${suffix}`;
  }

  return local;
}

/**
 * Format a Date to Indonesian date string (WIB, no time).
 * Output: "15 Juni 2026"
 * Returns empty string for null/undefined/invalid.
 */
export function formatDateToLongWIB(date?: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const wibDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wibDate.getUTCDate();
  const month = monthNames[wibDate.getUTCMonth()];
  const year = wibDate.getUTCFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Truncate text to maxLength, appending "..." if trimmed.
 */
export function truncate(value?: string | null, maxLength = 100): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

/**
 * Normalize a name: trim, collapse whitespace, title-case each word.
 */
export function normalizeName(value?: string | null): string {
  if (!value) return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
