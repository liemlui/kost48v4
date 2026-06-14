import type { RenewRequest } from '../types';

type SafetyTone = 'success' | 'warning' | 'danger' | 'info';
export type RenewApprovalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

type SafetyMessage = {
  id: string;
  title: string;
  message: string;
  tone: SafetyTone;
};

type RenewApprovalSafetyInput = {
  request?: RenewRequest | null;
  plannedCheckOutDate?: string;
  approvedRentAmount?: string;
  electricityReadingValue?: string;
  waterReadingValue?: string;
  meterReadingAt?: string;
};

export type RenewApprovalSafety = {
  riskLevel: RenewApprovalRiskLevel;
  riskLabel: string;
  riskTone: SafetyTone;
  blockers: SafetyMessage[];
  warnings: SafetyMessage[];
  checklist: string[];
  requiresAcknowledgement: boolean;
  canApprove: boolean;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumberInput(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeDateOnly(value?: string | null): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function getRenewApprovalSafety(input: RenewApprovalSafetyInput): RenewApprovalSafety {
  const blockers: SafetyMessage[] = [];
  const warnings: SafetyMessage[] = [];
  const currentEnd = normalizeDateOnly(input.request?.stay?.plannedCheckOutDate ?? null);
  const requestedEnd = normalizeDateOnly(input.request?.requestedCheckOutDate ?? null);
  const approvedEnd = input.plannedCheckOutDate?.trim() || requestedEnd;

  const electricityReading = parseNumberInput(input.electricityReadingValue);
  const waterReading = parseNumberInput(input.waterReadingValue);
  const meterDate = parseDate(input.meterReadingAt);
  const currentRent = Number(input.request?.stay?.agreedRentAmountRupiah ?? 0);
  const approvedRentRaw = input.approvedRentAmount?.replace(/\D/g, '') ?? '';
  const approvedRent = approvedRentRaw ? Number(approvedRentRaw) : null;

  if (electricityReading === null) {
    blockers.push({ id: 'electricity-empty', title: 'Meter listrik kosong', message: 'Isi angka meter listrik terbaru.', tone: 'danger' });
  } else if (Number.isNaN(electricityReading) || electricityReading < 0) {
    blockers.push({ id: 'electricity-invalid', title: 'Meter listrik salah', message: 'Angka meter tidak boleh negatif.', tone: 'danger' });
  }

  if (waterReading === null) {
    blockers.push({ id: 'water-empty', title: 'Meter air kosong', message: 'Isi angka meter air terbaru.', tone: 'danger' });
  } else if (Number.isNaN(waterReading) || waterReading < 0) {
    blockers.push({ id: 'water-invalid', title: 'Meter air salah', message: 'Angka meter tidak boleh negatif.', tone: 'danger' });
  }

  if (!input.meterReadingAt?.trim()) {
    blockers.push({ id: 'meter-date-empty', title: 'Waktu meter kosong', message: 'Isi waktu catat meter.', tone: 'danger' });
  } else if (!meterDate) {
    blockers.push({ id: 'meter-date-invalid', title: 'Waktu meter salah', message: 'Format waktu catat meter belum valid.', tone: 'danger' });
  }

  if (currentEnd && approvedEnd && approvedEnd < currentEnd) {
    blockers.push({ id: 'date-before-current', title: 'Tanggal mundur', message: 'Akhir masa sewa baru tidak boleh sebelum tanggal lama.', tone: 'danger' });
  }

  if (!approvedEnd) {
    warnings.push({ id: 'date-missing', title: 'Tanggal belum jelas', message: 'Cek tanggal akhir masa sewa sebelum approve.', tone: 'warning' });
  } else if (requestedEnd && approvedEnd !== requestedEnd) {
    warnings.push({ id: 'date-changed', title: 'Tanggal diubah', message: 'Pastikan tenant paham tanggal baru.', tone: 'warning' });
  }

  if (approvedRent !== null && Number.isFinite(approvedRent) && currentRent > 0 && approvedRent !== currentRent) {
    warnings.push({ id: 'rent-changed', title: 'Tarif diubah', message: 'Pastikan tarif renew sudah disetujui.', tone: 'warning' });
  }

  if (input.request?.createdAt) {
    const createdAt = parseDate(input.request.createdAt);
    if (createdAt && Date.now() - createdAt.getTime() > 6 * 60 * 60 * 1000) {
      warnings.push({ id: 'sla-late', title: 'Lewat SLA', message: 'Request sudah lama menunggu review.', tone: 'warning' });
    }
  }

  const riskLevel: RenewApprovalRiskLevel = blockers.length ? 'HIGH' : warnings.length ? 'MEDIUM' : 'LOW';
  const riskLabel = riskLevel === 'HIGH' ? 'Risiko tinggi' : riskLevel === 'MEDIUM' ? 'Perlu cek' : 'Siap approve';
  const riskTone: SafetyTone = riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' ? 'warning' : 'success';
  const requiresAcknowledgement = riskLevel !== 'LOW' && blockers.length === 0;

  return {
    riskLevel,
    riskLabel,
    riskTone,
    blockers,
    warnings,
    checklist: [
      'Meter listrik & air sudah dicatat.',
      'Tanggal akhir masa sewa sudah benar.',
      'Invoice pelunasan akan diterbitkan.',
      'Masa sewa baru aktif hanya setelah invoice PAID.',
    ],
    requiresAcknowledgement,
    canApprove: blockers.length === 0,
  };
}

export function getRenewRequestRiskBadge(request: RenewRequest): { label: string; tone: SafetyTone } {
  if (request.status === 'PENDING_DECISION') return { label: 'Menunggu tenant', tone: 'info' };
  if (request.status === 'AWAITING_DP') {
    return request.downPaymentInvoice?.status === 'PAID'
      ? { label: 'DP siap dikonfirmasi', tone: 'warning' }
      : { label: 'Menunggu DP', tone: 'warning' };
  }
  if (request.status === 'DP_SECURED') {
    if (!request.settlementInvoiceId) return { label: 'Butuh meter', tone: 'warning' };
    return request.settlementInvoice?.status === 'PAID'
      ? { label: 'Siap finalisasi', tone: 'success' }
      : { label: 'Menunggu pelunasan', tone: 'warning' };
  }
  if (request.status !== 'PENDING') return { label: 'Selesai', tone: 'info' };

  const currentEnd = normalizeDateOnly(request.stay?.plannedCheckOutDate ?? null);
  const requestedEnd = normalizeDateOnly(request.requestedCheckOutDate ?? null);
  if (!requestedEnd || (currentEnd && requestedEnd < currentEnd)) return { label: 'Cek tanggal', tone: 'danger' };

  const createdAt = parseDate(request.createdAt);
  if (createdAt && Date.now() - createdAt.getTime() > 6 * 60 * 60 * 1000) return { label: 'Lewat SLA', tone: 'warning' };

  return { label: 'Butuh meter', tone: 'warning' };
}
