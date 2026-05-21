export type ScoreGrade = 'AMAN' | 'PERHATIAN' | 'RISIKO' | 'KRITIS';

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function gradeFromScore(score: number): ScoreGrade {
  const safe = clampScore(score);
  if (safe >= 85) return 'AMAN';
  if (safe >= 65) return 'PERHATIAN';
  if (safe >= 40) return 'RISIKO';
  return 'KRITIS';
}

export function scoreStatus(score: number): 'SUCCESS' | 'INFO' | 'WARNING' | 'DANGER' {
  const grade = gradeFromScore(score);
  if (grade === 'AMAN') return 'SUCCESS';
  if (grade === 'PERHATIAN') return 'INFO';
  if (grade === 'RISIKO') return 'WARNING';
  return 'DANGER';
}

export function safePercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return clampScore((value / total) * 100);
}

export function weightedRiskScore(parts: Array<{ value: number; weight: number }>, base = 100): number {
  const risk = parts.reduce((sum, part) => sum + Math.max(0, part.value) * Math.max(0, part.weight), 0);
  return clampScore(base - risk);
}
