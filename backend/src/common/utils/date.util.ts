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

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export function startOfJakartaBusinessDay(date: Date): Date {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function parseJakartaDateOnly(value: string | Date, message: string): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(message);
  }
  return startOfJakartaBusinessDay(parsed);
}
