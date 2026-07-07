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
  const policyExpected = asPaymentNumber(item.paymentPolicy?.expectedAmountRupiah);
  if (policyExpected > 0) return policyExpected;
  return item.targetType === 'DEPOSIT'
    ? asPaymentNumber(item.deposit?.remainingAmountRupiah ?? item.deposit?.amountRupiah)
    : asPaymentNumber(item.invoice?.remainingAmountRupiah ?? item.invoice?.totalAmountRupiah);
}

/**
 * Nominal yang sama persis dengan sisa DP 30% pada stay booking adalah
 * pembayaran DP yang sah (A18) — bukan "parsial" yang mencurigakan.
 */
export function isDownPaymentExactAmount(item: PaymentSubmission | null | undefined): boolean {
  if (!item) return false;
  if (item.paymentPolicy?.matchedAcceptedKind === 'DOWN_PAYMENT') return true;
  const stay = (item as { stay?: { downPaymentAmountRupiah?: number | null; downPaymentPaidRupiah?: number | null } }).stay;
  const dpRemaining = Math.max(
    asPaymentNumber(stay?.downPaymentAmountRupiah) - asPaymentNumber(stay?.downPaymentPaidRupiah),
    0,
  );
  return dpRemaining > 0 && asPaymentNumber(item.amountRupiah) === dpRemaining;
}

export function getPaymentAmountTone(item: PaymentSubmission | null | undefined): PaymentAmountTone {
  if (!item) return 'UNKNOWN';
  if (item.paymentPolicy?.amountTone) return item.paymentPolicy.amountTone as PaymentAmountTone;
  const remaining = getPaymentRemainingAmount(item);
  const submitted = asPaymentNumber(item.amountRupiah);
  if (remaining <= 0 || submitted <= 0) return 'UNKNOWN';
  if (submitted === remaining) return 'EXACT';
  if (submitted < remaining) {
    if (isDownPaymentExactAmount(item)) return 'EXACT';
    return 'PARTIAL';
  }
  return 'OVERPAY';
}

export function getPaymentAmountLabel(tone: PaymentAmountTone) {
  if (tone === 'EXACT') return 'Pas';
  if (tone === 'PARTIAL') return 'Parsial';
  if (tone === 'OVERPAY') return 'Lebih';
  return 'Perlu cek';
}

function getAmountImpact(item: PaymentSubmission, amountTone: PaymentAmountTone) {
  if (item.paymentPolicy?.impactText) return item.paymentPolicy.impactText;
  if (item.targetType === 'DEPOSIT') {
    return 'Deposit titipan, bukan omzet.';
  }
  if (amountTone === 'PARTIAL') {
    return 'Pembayaran sebagian tidak diterima. Tolak atau minta tenant koreksi nominal.';
  }
  if (amountTone === 'OVERPAY') {
    return 'Nominal lebih ditolak sistem. Tolak atau minta tenant koreksi nominal.';
  }
  if (amountTone === 'EXACT') {
    if (isDownPaymentExactAmount(item)) {
      return 'DP 30%: kamar terkunci untuk tenant ini; pelunasan menyusul paling lambat saat check-in.';
    }
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
  const policy = item?.paymentPolicy ?? null;
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

  if (item && policy && !policy.canApprove) {
    blockers.push({
      id: 'policy-blocker',
      title: amountTone === 'PARTIAL'
        ? 'Pembayaran sebagian tidak diterima'
        : amountTone === 'OVERPAY'
          ? 'Nominal lebih ditolak sistem'
          : 'Nominal belum sesuai kebijakan',
      message: policy.blockingReason ?? 'Nominal ini belum masuk daftar nominal yang diterima sistem.',
      tone: 'danger',
    });
  }

  if (item && !policy && amountTone === 'OVERPAY') {
    blockers.push({
      id: 'overpay',
      title: 'Nominal lebih besar dari kewajiban',
      message: 'Nominal lebih ditolak sistem. Tolak atau minta tenant koreksi nominal.',
      tone: 'danger',
    });
  }

  if (item && !policy && amountTone === 'PARTIAL') {
    blockers.push({
      id: 'partial',
      title: 'Pembayaran sebagian tidak diterima',
      message: 'Tidak ada cicilan bebas. Tolak atau minta tenant mengirim nominal yang tepat.',
      tone: 'danger',
    });
  }

  if (item && amountTone === 'UNKNOWN') {
    blockers.push({
      id: 'unknown-remaining',
      title: 'Sisa kewajiban belum terbaca jelas',
      message: 'Cek invoice/booking detail sebelum approve agar tidak salah memutasi flow.',
      tone: 'danger',
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

  const highRisk = blockers.length > 0;
  const mediumRisk = !highRisk && (isDeposit || isReviewOverdue);
  const riskLevel: PaymentRiskLevel = highRisk ? 'HIGH' : mediumRisk ? 'MEDIUM' : 'LOW';
  const riskLabel = riskLevel === 'HIGH' ? 'Risiko tinggi' : riskLevel === 'MEDIUM' ? 'Perlu cek manual' : 'Aman dicek';
  const riskTone: SafetyTone = riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' ? 'warning' : 'success';
  const requiresChecklist = riskLevel !== 'LOW' && blockers.length === 0;

  const checklist: PaymentSafetyChecklistItem[] = [
    {
      id: 'amount-checked',
      label: 'Nominal sudah dicocokkan dengan kewajiban aktif.',
      helper: policy?.acceptedAmounts?.length
        ? `Sistem menerima: ${policy.acceptedAmounts.map((amount) => `${amount.label} Rp ${asPaymentNumber(amount.amountRupiah).toLocaleString('id-ID')}`).join(' atau ')}.`
        : amountTone === 'EXACT' ? 'Nominal pas.' : `Status nominal: ${amountLabel}.`,
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
      helper: 'Persetujuan pembayaran adalah alur sensitif dan tetap mengikuti pengaman sistem.',
      required: true,
      tone: 'info',
    },
  ];

  if (amountTone === 'PARTIAL') {
    checklist.push({
      id: 'partial-understood',
      label: 'Pembayaran sebagian tidak boleh disetujui.',
      helper: 'Arahkan ke reject/koreksi nominal, bukan approve.',
      required: true,
      tone: 'danger',
    });
  }

  if (amountTone === 'OVERPAY') {
    checklist.push({
      id: 'overpay-understood',
      label: 'Nominal lebih tidak boleh disetujui.',
      helper: 'Arahkan ke reject/koreksi nominal, bukan approve.',
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
  else if (amountTone === 'PARTIAL') approveLabel = 'Nominal Parsial - Tolak/Koreksi';
  else if (amountTone === 'OVERPAY') approveLabel = 'Nominal Lebih - Tolak/Koreksi';
  else if (amountTone === 'UNKNOWN') approveLabel = 'Belum Aman Disetujui';
  else if (isDeposit) approveLabel = 'Setujui Deposit Titipan';

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
