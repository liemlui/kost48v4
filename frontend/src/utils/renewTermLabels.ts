import type { PricingTerm } from '../types';

const TERM_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  BIWEEKLY: '2 Mingguan',
  MONTHLY: 'Bulanan',
  SEMESTERLY: 'Semesteran',
  SMESTERLY: 'Semesteran',
  YEARLY: 'Tahunan',
};

export function getRenewTermLabel(term?: PricingTerm | string | null): string {
  if (!term) return '-';
  const key = String(term).toUpperCase();
  return TERM_LABELS[key] ?? String(term).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
