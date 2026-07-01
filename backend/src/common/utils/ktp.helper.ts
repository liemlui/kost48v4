/**
 * KTP (NIK) validation utilities for Indonesian ID cards.
 *
 * NIK format: 16 digits
 * - 6 digit province/city/district code
 * - 6 digit birth date (DDMMYY with female offset +40 on day)
 * - 4 digit serial number
 *
 * Reference: Permendagri No. 19/2011 & No. 11/2019
 */

/** Regex: exactly 16 digits */
const NIK_REGEX = /^\d{16}$/;

/** Valid month range */
const MIN_MONTH = 1;
const MAX_MONTH = 12;

/** Birth-day ranges: male 1-31, female 41-71 (day + 40) */
const MIN_DAY_MALE = 1;
const MAX_DAY_MALE = 31;
const MIN_DAY_FEMALE = 41;
const MAX_DAY_FEMALE = 71;

export interface KTPInfo {
  /** Full 16-digit NIK */
  nik: string;
  /** Province code (first 2 digits) */
  provinceCode: string;
  /** City code (digits 3-4) */
  cityCode: string;
  /** District code (digits 5-6) */
  districtCode: string;
  /** Birth date extracted from NIK, WIB timezone assumed */
  birthDate: string; // "YYYY-MM-DD" or "0000-00-00" if invalid
  /** Gender inferred from birth day offset */
  gender: 'MALE' | 'FEMALE';
  /** Whether the NIK is structurally valid */
  valid: boolean;
}

/**
 * Validate a NIK string — 16 digits, valid date parts, reasonable ranges.
 * Returns `true` if structurally valid.
 */
export function isValidKTP(value?: string | null): boolean {
  if (!value) return false;
  if (!NIK_REGEX.test(value)) return false;
  return parseNIKParts(value).valid;
}

/** Internal: parse date parts from a 16-digit NIK and return validity + parsed components. */
function parseNIKParts(value: string): {
  valid: boolean;
  rawDay: number;
  month: number;
  rawYear: number;
  isFemale: boolean;
  birthDay: number;
  fullYear: number;
} {
  const rawDay = Number.parseInt(value.slice(6, 8), 10);
  const month = Number.parseInt(value.slice(8, 10), 10);
  const rawYear = Number.parseInt(value.slice(10, 12), 10);

  const isFemale = rawDay > 40;
  const birthDay = isFemale ? rawDay - 40 : rawDay;
  const fullYear = rawYear + (rawYear >= 25 ? 1900 : 2000);

  const valid =
    month >= MIN_MONTH &&
    month <= MAX_MONTH &&
    birthDay >= MIN_DAY_MALE &&
    birthDay <= MAX_DAY_MALE &&
    rawDay >= MIN_DAY_MALE &&
    rawDay <= MAX_DAY_FEMALE &&
    (isFemale ? rawDay >= MIN_DAY_FEMALE : rawDay <= MAX_DAY_MALE);

  return { valid, rawDay, month, rawYear, isFemale, birthDay, fullYear };
}

/**
 * Validate NIK and return structured info (including gender, birth date, regions).
 * Never throws — returns `{ valid: false, ... }` for invalid input.
 */
export function getKTPInfo(value?: string | null): KTPInfo {
  if (!value || !NIK_REGEX.test(value)) {
    return {
      nik: value ?? '',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      birthDate: '0000-00-00',
      gender: 'MALE',
      valid: false,
    };
  }

  const provinceCode = value.slice(0, 2);
  const cityCode = value.slice(2, 4);
  const districtCode = value.slice(4, 6);

  const { valid, birthDay, month, fullYear, isFemale } = parseNIKParts(value);

  const birthDate = valid
    ? `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`
    : '0000-00-00';

  return {
    nik: value,
    provinceCode,
    cityCode,
    districtCode,
    birthDate,
    gender: isFemale ? 'FEMALE' : 'MALE',
    valid,
  };
}
