import type { ScoreGrade } from './scoring';

export function businessHealthHeadline(grade: ScoreGrade): string {
  switch (grade) {
    case 'AMAN': return 'Bisnis terlihat aman dari data yang tersedia.';
    case 'PERHATIAN': return 'Ada beberapa sinyal yang perlu dipantau.';
    case 'RISIKO': return 'Beberapa flow bisnis mulai menahan uang atau okupansi.';
    case 'KRITIS': return 'Butuh keputusan cepat agar cashflow dan operasional tidak macet.';
    default: return 'Kesehatan bisnis dihitung dari data operasional.';
  }
}

export function tenantFriendlyStatus(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'PENDING_REVIEW') return 'Sedang diperiksa';
  if (normalized === 'ISSUED') return 'Perlu dibayar';
  if (normalized === 'PARTIAL') return 'Sebagian sudah dibayar';
  if (normalized === 'PAID') return 'Sudah lunas';
  if (normalized === 'DRAFT') return 'Sedang disiapkan admin';
  if (normalized === 'CANCELLED') return 'Dibatalkan';
  return status;
}

export function financeLockedReason(): string {
  return 'Belum tersedia karena data kas/bank, kewajiban lancar, aset, dan ekuitas belum dimodelkan sebagai balance sheet formal.';
}

export function compactRiskCopy(count: number, singular: string, plural: string): string {
  if (count <= 0) return 'Tidak ada isu aktif dari data yang dimuat.';
  return `${count} ${count === 1 ? singular : plural}`;
}
