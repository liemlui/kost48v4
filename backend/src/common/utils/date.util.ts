import { BadRequestException } from '@nestjs/common';

/**
 * Shared date helpers — do not duplicate across services.
 */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfDay(next);
}

export function parseDateOnly(value: string, message: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(message);
  }
  return startOfDay(parsed);
}
