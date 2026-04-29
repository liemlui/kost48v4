/**
 * Shared phone number normalization utilities.
 * Canonical format: 628xxxxxxxxxx (country code + digits, no leading 0 or +)
 * Display format: 0xxxxxxxxxx (leading 0 for Indonesian display)
 */

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

export function denormalizePhone(value: string): string {
  if (value.startsWith('62')) {
    return `0${value.slice(2)}`;
  }
  return value;
}