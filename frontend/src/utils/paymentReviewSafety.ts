import type { PaymentSubmission } from '../types';
import { addHoursToDate, getDeadlineMeta } from './dateTime';

export type PaymentAmountTone = 'EXACT' | 'PARTIAL' | 'OVERPAY' | 'UNKNOWN';
export type PaymentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SafetyTone = 'success' | 'info' | 'warning' | 'danger';

export type PaymentSafetyMessage = {
  id: string;
  title: string;
  message: string;
  tone: SafetyTone;
};

export type PaymentSafetyChecklistItem = {
  id: string;
  label: string;
  helper: string;
  required: boolean;
  tone: SafetyTone;
};

export type PaymentReviewSafety = {
  riskLevel: PaymentRiskLevel;
  riskLabel: string;
  riskTone: SafetyTone;
  amountTone: PaymentAmountTone;
  amountLabel: string;
  remainingAmountRupiah: number;
  submittedAmountRupiah: number;
  differenceRupiah: number;
  hasProof: boolean;
  isDeposit: boolean;
  isReviewOverdue: boolean;
  blockers: PaymentSafetyMessage[];
  warnings: PaymentSafetyMessage[];
  checklist: PaymentSafetyChecklistItem[];
  requiresChecklist: boolean;
  approveLabel: string;
  approveDisabledReason?: string;
  impactText: string;
};

export function asPaymentNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPaymentRemainingAmount(item: PaymentSubmission | null | undefined) {
  if (!item) return 0;
  return item.targetType === 'DEPOSIT'
    ? asPaymentNumber(item.deposit?.remainingAmountRupiah ?? item.deposit?.amountRupiah)
    : asPaymentNumber(item.invoice?.remainingAmountRupiah ?? item.invoice?.totalAmountRupiah);
}

export function getPaymentAmountTone(item: PaymentSubmission | null | undefined): PaymentAmountTone {
  if (!item) return 'UNKNOWN';
  const remaining = getPaymentRemainingAmount(item);
  const submitted = asPaymentNumber(item.amountRupiah);
  if (remaining <= 0 || submitted <= 0) return 'UNKNOWN';
  if (submitted === remaining) return 'EXACT';
  if (submitted < remaining) return 'PARTIAL';
  return 'OVERPAY';
}

export function getPaymentAmountLabel(tone: PaymentAmountTone) {
  if (tone === 'EXACT') return 'Pas';
  if (tone === 'PARTIAL') return 'Parsial';
  if (tone === 'OVERPAY') return 'Lebih';
  return 'Perlu cek';
}

function getAmountImpact(item: PaymentSubmission, amountTone: PaymentAmountTone) {
  if (item.targetType === 'DEPOSIT') {
    return 'Deposit titipan, bukan omzet.';
  }
  if (amountTone === 'PARTIAL') {
    return 'Parsial: blocker tetap ada sampai lunas.';
  }
  if (amountTone === 'OVERPAY') {
    return 'Nominal lebih. Backend bisa menolak.';
  }
  if (amountTone === 'EXACT') {
    return 'Jika lunas, blocker bisa terbuka.';
  }
  return 'Sisa belum jelas. Cek manual.';
}

export function getPaymentReviewSafety(item: PaymentSubmission | null | undefined): PaymentReviewSafety {
  const submittedAmountRupiah = asPaymentNumber(item?.amountRupiah);
  const remainingAmountRupiah = getPaymentRemainingAmount(item);
  const differenceRupiah = submittedAmountRupiah - remainingAmountRupiah;
  const amountTone = getPaymentAmountTone(item);
  const amountLabel = getPaymentAmountLabel(amountTone);
  const hasProof = Boolean(item?.fileUrl);
  const isDeposit = item?.targetType === 'DEPOSIT';
  const reviewDeadline = item ? getDeadlineMeta(addHoursToDate(item.createdAt ?? item.paidAt, 6), 'Batas review') : null;
  const isReviewOverdue = Boolean(reviewDeadline?.isExpired);

  const blockers: PaymentSafetyMessage[] = [];
  const warnings: PaymentSafetyMessage[] = [];

  if (!item) {
    blockers.push({
      id: 'no-submission',
      title: 'Bukti belum dipilih',
      message: 'Pilih bukti dulu.',
      tone: 'danger',
    });
  }

  if (item && !hasProof) {
    blockers.push({
      id: 'missing-proof',
      title: 'File bukti belum tersedia',
      message: 'Approve nonaktif. Minta upload ulang.',
      tone: 'danger',
    });
  }

  if (item && amountTone === 'OVERPAY') {
    warnings.push({
      id: 'overpay',
      title: 'Nominal lebih besar dari kewajiban',
      message: 'Cek manual. Bisa salah transfer.',
      tone: 'danger',
    });
  }

  if (item && amountTone === 'PARTIAL') {
    warnings.push({
      id: 'partial',
      title: 'Pembayaran parsial',
      message: 'Masih ada sisa tagihan.',
      tone: 'warning',
    });
  }

  if (item && amountTone === 'UNKNOWN') {
    warnings.push({
      id: 'unknown-remaining',
      title: 'Sisa kewajiban belum terbaca jelas',
      message: 'Cek invoice/booking detail sebelum approve agar tidak salah memutasi flow.',
      tone: 'warning',
    });
  }

  if (item && isDeposit) {
    warnings.push({
      id: 'deposit-liability',
      title: 'Deposit bukan omzet',
      message: 'Deposit adalah dana titipan. Approve deposit tidak boleh dibaca sebagai pendapatan.',
      tone: 'info',
    });
  }

  if (item && isReviewOverdue) {
    warnings.push({
      id: 'review-overdue',
      title: 'Review melewati SLA',
      message: 'Bukti ini sudah melewati batas review. Prioritaskan keputusan agar flow tenant/kamar tidak tertahan.',
      tone: 'warning',
    });
  }

  const highRisk = blockers.length > 0 || amountTone === 'OVERPAY' || amountTone === 'UNKNOWN';
  const mediumRisk = !highRisk && (amountTone === 'PARTIAL' || isDeposit || isReviewOverdue);
  const riskLevel: PaymentRiskLevel = highRisk ? 'HIGH' : mediumRisk ? 'MEDIUM' : 'LOW';
  const riskLabel = riskLevel === 'HIGH' ? 'Risiko tinggi' : riskLevel === 'MEDIUM' ? 'Perlu cek manual' : 'Aman dicek';
  const riskTone: SafetyTone = riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' ? 'warning' : 'success';
  const requiresChecklist = riskLevel !== 'LOW';

  const checklist: PaymentSafetyChecklistItem[] = [
    {
      id: 'amount-checked',
      label: 'Nominal sudah dicocokkan dengan kewajiban aktif.',
      helper: amountTone === 'EXACT' ? 'Nominal pas.' : `Status nominal: ${amountLabel}.`,
      required: true,
      tone: amountTone === 'EXACT' ? 'success' : amountTone === 'OVERPAY' ? 'danger' : 'warning',
    },
    {
      id: 'proof-opened',
      label: 'File bukti sudah dibuka dan dibaca manual.',
      helper: hasProof ? 'Gunakan preview/link bukti sebelum approve.' : 'Tidak ada file bukti.',
      required: true,
      tone: hasProof ? 'info' : 'danger',
    },
    {
      id: 'mutation-understood',
      label: 'Saya paham approve dapat memengaruhi tagihan, masa sewa, kamar, meter, atau deposit.',
      helper: 'Payment approval adalah flow sensitif dan tetap mengikuti guard backend.',
      required: true,
      tone: 'info',
    },
  ];

  if (amountTone === 'PARTIAL') {
    checklist.push({
      id: 'partial-understood',
      label: 'Saya paham pembayaran parsial belum menyelesaikan semua blocker.',
      helper: 'Tenant masih perlu melunasi sisa tagihan.',
      required: true,
      tone: 'warning',
    });
  }

  if (amountTone === 'OVERPAY') {
    checklist.push({
      id: 'overpay-understood',
      label: 'Saya paham nominal lebih besar dan backend bisa menolak approve.',
      helper: 'Koreksi dengan tenant lebih aman jika nominal memang salah.',
      required: true,
      tone: 'danger',
    });
  }

  if (isDeposit) {
    checklist.push({
      id: 'deposit-understood',
      label: 'Saya paham deposit adalah dana titipan, bukan omzet.',
      helper: 'Deposit akan masuk kewajiban/deposit tracking, bukan pendapatan bersih.',
      required: true,
      tone: 'info',
    });
  }

  let approveLabel = 'Setujui Pembayaran';
  if (!hasProof && item) approveLabel = 'Bukti Belum Ada';
  else if (isDeposit) approveLabel = 'Setujui Deposit Titipan';
  else if (amountTone === 'PARTIAL') approveLabel = 'Setujui Pembayaran Parsial';
  else if (amountTone === 'OVERPAY') approveLabel = 'Kirim untuk Dicek Backend';
  else if (amountTone === 'UNKNOWN') approveLabel = 'Setujui Setelah Cek Manual';

  const approveDisabledReason = blockers[0]?.message;

  return {
    riskLevel,
    riskLabel,
    riskTone,
    amountTone,
    amountLabel,
    remainingAmountRupiah,
    submittedAmountRupiah,
    differenceRupiah,
    hasProof,
    isDeposit,
    isReviewOverdue,
    blockers,
    warnings,
    checklist,
    requiresChecklist,
    approveLabel,
    approveDisabledReason,
    impactText: item ? getAmountImpact(item, amountTone) : 'Pilih bukti pembayaran dulu.',
  };
}

export function getPaymentRiskBadgeClass(tone: SafetyTone) {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'info';
}

export function getRejectNoteQuality(note: string) {
  const trimmed = note.trim();
  if (trimmed.length < 8) {
    return {
      ok: false,
      message: 'Alasan penolakan minimal 8 karakter agar tenant tahu apa yang harus diperbaiki.',
    };
  }
  return { ok: true, message: null };
}

export const rejectNoteExamples = [
  'Nominal belum sesuai tagihan. Mohon upload ulang bukti dengan nominal yang benar.',
  'Bukti pembayaran kurang jelas. Mohon upload ulang foto yang lebih terang dan tidak terpotong.',
  'Tanggal atau nomor referensi tidak terbaca. Mohon kirim bukti yang lebih lengkap.',
];
