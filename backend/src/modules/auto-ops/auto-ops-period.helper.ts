export function jakartaYearMonth(now: Date): { year: number; month: number } {
  const nowWib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: nowWib.getUTCFullYear(),
    month: nowWib.getUTCMonth() + 1,
  };
}

export function previousJakartaYearMonth(now: Date): { year: number; month: number } {
  const current = jakartaYearMonth(now);
  if (current.month === 1) return { year: current.year - 1, month: 12 };
  return { year: current.year, month: current.month - 1 };
}
