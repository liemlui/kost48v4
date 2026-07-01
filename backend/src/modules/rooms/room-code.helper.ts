/**
 * Room code generation utilities for KOST48.
 *
 * Convention: "{floor-prefix}-{NN}" where floor-prefix is a letter A-Z
 * and NN is a zero-padded 2-digit sequence number.
 * Examples: A-01, B-12, C-03
 *
 * This is a helper for generating suggested codes — the actual
 * validation of uniqueness is handled by the Prisma @unique constraint.
 */

/** Regex for valid room code format: letter-digit(s) or letter-digit(s) pattern */
const ROOM_CODE_REGEX = /^[A-Za-z]-\d{2}$/;

/** Floor letter map: 1→A, 2→B, ..., 26→Z */
const FLOOR_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a room code given floor number and sequence position.
 *
 * @param floor - Floor number (1-based, max 26)
 * @param sequence - Sequence number (1-based, max 99)
 * @returns Room code string like "A-01", "B-12"
 * @throws Error if floor or sequence out of range
 */
export function generateRoomCode(floor: number, sequence: number): string {
  if (floor < 1 || floor > 26) {
    throw new Error(`Floor must be between 1 and 26, got ${floor}`);
  }
  if (sequence < 1 || sequence > 99) {
    throw new Error(`Sequence must be between 1 and 99, got ${sequence}`);
  }

  const letter = FLOOR_LETTERS[floor - 1];
  const seqPadded = sequence.toString().padStart(2, '0');
  return `${letter}-${seqPadded}`;
}

/**
 * Validate a room code format.
 * Does NOT check uniqueness — only structural validity.
 */
export function validateRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}

/**
 * Parse a room code into its components.
 * Returns null for invalid codes.
 */
export function parseRoomCode(code: string): { floor: number; sequence: number } | null {
  if (!ROOM_CODE_REGEX.test(code)) return null;

  const letter = code[0].toUpperCase();
  const floor = FLOOR_LETTERS.indexOf(letter) + 1;
  const sequence = Number.parseInt(code.slice(2), 10);

  return { floor, sequence };
}
