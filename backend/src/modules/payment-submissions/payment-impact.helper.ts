// FILE: payment-impact.helper.ts — ringkasan dampak approve pembayaran (READ-ONLY).
// IMPACT-01: seluruh angka dampak memakai fungsi yang SAMA dengan jalur approve
// (evaluatePaymentPolicy + compute* di bawah). Tidak ada rumus uang baru dan tidak ada
// perubahan aturan: modul ini hanya menampilkan apa yang akan/ sudah terjadi.
import {
  BookingDepositPaymentStatus,
  InvoiceStatus,
  RoomStatus,
} from '../../common/enums/app.enums';
import type { PaymentPolicyResult } from './payment-policy.helper';
import type { SubmissionDetail } from './payment-submissions.helpers';

function rupiah(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type ImpactStateSnapshot = {
  invoiceStatus: string;
  invoicePaidAmountRupiah: number;
  invoiceRemainingAmountRupiah: number;
  roomStatus: string;
  stayStatus: string;
  depositPaidAmountRupiah: number;
  depositPaymentStatus: string;
  downPaymentPaidRupiah: number;
  expiresAt: string | null;
};

export type PaymentAllocationInput = {
  amountRupiah: number;
  invoiceRemainingAmountRupiah: number;
  depositRemainingAmountRupiah: number;
  isBookingPath: boolean;
};

export type PaymentAllocation = {
  rentPortionRupiah: number;
  depositPortionRupiah: number;
  excessRupiah: number;
};

export type NextInvoiceStateInput = {
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountBeforeRupiah: number;
  rentPortionRupiah: number;
};

export type NextInvoiceState = {
  paidAmountAfterRupiah: number;
  remainingAmountAfterRupiah: number;
  statusAfter: InvoiceStatus;
};

export type NextDepositStateInput = {
  depositAmountRupiah: number;
  depositPaidBeforeRupiah: number;
  downPaymentAmountRupiah: number;
  downPaymentPaidBeforeRupiah: number;
  rentPortionRupiah: number;
  depositPortionRupiah: number;
};

export type NextDepositState = {
  depositPaidAfterRupiah: number;
  depositPaymentStatusAfter: BookingDepositPaymentStatus;
  downPaymentPaidAfterRupiah: number;
};

export type PaymentImpactAccounting = {
  /** Nominal bukti bayar yang diterima. */
  uangDiterimaRupiah: number;
  /** Total debit akun kas/bank yang benar-benar terbentuk di jurnal saat approve. */
  jurnalKasMasukRupiah: number;
  /** Kredit akun 1100 Accounts Receivable (piutang turun) = porsi sewa. */
  piutangTurunRupiah: number;
  /** Kredit akun 2000 Tenant Deposit Liability (deposit titipan, bukan omzet). */
  depositLiabilityNaikRupiah: number;
  /** true bila jurnal deposit belum terbentuk karena deposit titipan belum lunas. */
  depositJournalDeferred: boolean;
};

/** Status deposit booking — aturan yang sama dengan approveSubmission. */
export function deriveDepositPaymentStatus(
  depositAmountRupiah: number,
  depositPaidAmountRupiah: number,
): BookingDepositPaymentStatus {
  const depositAmount = rupiah(depositAmountRupiah);
  const depositPaid = rupiah(depositPaidAmountRupiah);
  if (depositPaid >= depositAmount && depositAmount > 0) return BookingDepositPaymentStatus.PAID;
  return depositPaid > 0 ? BookingDepositPaymentStatus.PARTIAL : BookingDepositPaymentStatus.UNPAID;
}

/** Porsi sewa (invoice) vs deposit jaminan — rumus sama dengan approveSubmission. */
export function computePaymentAllocation(input: PaymentAllocationInput): PaymentAllocation {
  const amount = rupiah(input.amountRupiah);
  const invoiceRemaining = rupiah(input.invoiceRemainingAmountRupiah);
  const depositRemaining = rupiah(input.depositRemainingAmountRupiah);

  if (!input.isBookingPath) {
    return {
      rentPortionRupiah: amount,
      depositPortionRupiah: 0,
      excessRupiah: Math.max(amount - invoiceRemaining, 0),
    };
  }

  const rentPortion = Math.min(amount, invoiceRemaining);
  const rawDeposit = Math.max(0, amount - rentPortion);
  const depositPortion = Math.min(rawDeposit, depositRemaining);
  return {
    rentPortionRupiah: rentPortion,
    depositPortionRupiah: depositPortion,
    excessRupiah: Math.max(rawDeposit - depositPortion, 0),
  };
}

/** Status & nominal invoice setelah approve — rumus sama dengan approveSubmission. */
export function computeNextInvoiceState(input: NextInvoiceStateInput): NextInvoiceState {
  const total = rupiah(input.invoiceTotalAmountRupiah);
  const paidAfter = rupiah(input.invoicePaidAmountBeforeRupiah) + rupiah(input.rentPortionRupiah);
  const statusAfter =
    paidAfter >= total
      ? InvoiceStatus.PAID
      : paidAfter > 0
        ? InvoiceStatus.PARTIAL
        : InvoiceStatus.ISSUED;

  return {
    paidAmountAfterRupiah: paidAfter,
    remainingAmountAfterRupiah: Math.max(total - paidAfter, 0),
    statusAfter,
  };
}

/** Status & nominal deposit/DP setelah approve — rumus sama dengan approveSubmission. */
export function computeNextDepositState(input: NextDepositStateInput): NextDepositState {
  const depositAmount = rupiah(input.depositAmountRupiah);
  const depositPaidAfter = rupiah(input.depositPaidBeforeRupiah) + rupiah(input.depositPortionRupiah);
  const downPaymentPaidAfter = Math.min(
    rupiah(input.downPaymentAmountRupiah),
    rupiah(input.downPaymentPaidBeforeRupiah) + rupiah(input.rentPortionRupiah),
  );

  return {
    depositPaidAfterRupiah: depositPaidAfter,
    depositPaymentStatusAfter: deriveDepositPaymentStatus(depositAmount, depositPaidAfter),
    downPaymentPaidAfterRupiah: downPaymentPaidAfter,
  };
}
export type ImpactOutcomeInput = {
  before: ImpactStateSnapshot;
  allocation: PaymentAllocation;
  isBookingPath: boolean;
  totalInvoiceAmountRupiah: number;
  depositAmountRupiah: number;
  downPaymentAmountRupiah: number;
};

export type ImpactOutcome = {
  after: ImpactStateSnapshot;
  accounting: PaymentImpactAccounting;
};

/**
 * Dampak terpadu — dipakai jalur preview MAUPUN hasil nyata setelah approve, supaya
 * angka sebelum→sesudah tidak pernah dihitung dua kali dengan cara berbeda.
 */
export function computeImpactOutcome(input: ImpactOutcomeInput): ImpactOutcome {
  const { before, allocation } = input;

  const nextInvoice = computeNextInvoiceState({
    invoiceTotalAmountRupiah: input.totalInvoiceAmountRupiah,
    invoicePaidAmountBeforeRupiah: before.invoicePaidAmountRupiah,
    rentPortionRupiah: allocation.rentPortionRupiah,
  });

  const nextDeposit = input.isBookingPath
    ? computeNextDepositState({
        depositAmountRupiah: input.depositAmountRupiah,
        depositPaidBeforeRupiah: before.depositPaidAmountRupiah,
        downPaymentAmountRupiah: input.downPaymentAmountRupiah,
        downPaymentPaidBeforeRupiah: before.downPaymentPaidRupiah,
        rentPortionRupiah: allocation.rentPortionRupiah,
        depositPortionRupiah: allocation.depositPortionRupiah,
      })
    : {
        depositPaidAfterRupiah: before.depositPaidAmountRupiah,
        depositPaymentStatusAfter: deriveDepositPaymentStatus(
          input.depositAmountRupiah,
          before.depositPaidAmountRupiah,
        ),
        downPaymentPaidAfterRupiah: before.downPaymentPaidRupiah,
      };

  const after: ImpactStateSnapshot = {
    invoiceStatus: nextInvoice.statusAfter,
    invoicePaidAmountRupiah: nextInvoice.paidAmountAfterRupiah,
    invoiceRemainingAmountRupiah: nextInvoice.remainingAmountAfterRupiah,
    roomStatus: input.isBookingPath ? RoomStatus.RESERVED : before.roomStatus,
    stayStatus: before.stayStatus,
    depositPaidAmountRupiah: nextDeposit.depositPaidAfterRupiah,
    depositPaymentStatus: nextDeposit.depositPaymentStatusAfter,
    downPaymentPaidRupiah: nextDeposit.downPaymentPaidAfterRupiah,
    expiresAt: input.isBookingPath ? null : before.expiresAt,
  };

  const depositAmount = rupiah(input.depositAmountRupiah);
  const depositJournalRupiah =
    depositAmount > 0 && after.depositPaidAmountRupiah >= depositAmount ? depositAmount : 0;
  const rentPortionRupiah = rupiah(allocation.rentPortionRupiah);
  const depositPortionRupiah = rupiah(allocation.depositPortionRupiah);

  return {
    after,
    accounting: {
      uangDiterimaRupiah: rentPortionRupiah + depositPortionRupiah,
      jurnalKasMasukRupiah: rentPortionRupiah + depositJournalRupiah,
      piutangTurunRupiah: rentPortionRupiah,
      depositLiabilityNaikRupiah: depositJournalRupiah,
      depositJournalDeferred: depositPortionRupiah > 0 && depositJournalRupiah === 0,
    },
  };
}

export type PaymentImpactPreview = {
  submissionId: number;
  invoiceNumber: string;
  isBookingPath: boolean;
  policy: PaymentPolicyResult;
  allocation: PaymentAllocation;
  before: ImpactStateSnapshot;
  after: ImpactStateSnapshot;
  accounting: PaymentImpactAccounting;
  notes: string[];
};

export type PaymentImpactReference = { id: number; entryNumber: string } | null;

export type PaymentImpactRealized = {
  submissionId: number;
  invoiceNumber: string;
  isBookingPath: boolean;
  allocation: PaymentAllocation;
  before: ImpactStateSnapshot;
  after: ImpactStateSnapshot;
  accounting: PaymentImpactAccounting;
  references: {
    invoicePaymentId: number | null;
    journalInvoicePayment: PaymentImpactReference;
    journalDeposit: PaymentImpactReference;
    depositLedgerEntryId: number | null;
  };
  notes: string[];
};

function buildNotes(params: {
  isBookingPath: boolean;
  accounting: PaymentImpactAccounting;
  excessRupiah: number;
}): string[] {
  const notes: string[] = [];
  if (params.excessRupiah > 0) {
    notes.push('Nominal melebihi kewajiban aktif: approve akan ditolak kebijakan.');
  }
  if (params.isBookingPath) {
    notes.push('Kamar menjadi RESERVED saat approve; OCCUPIED terjadi saat check-in.');
    if (params.accounting.depositJournalDeferred) {
      notes.push('Jurnal deposit ditunda sampai deposit titipan lunas (aturan posting yang ada).');
    }
  } else {
    notes.push('Deposit tidak berubah pada jalur tagihan ini.');
  }
  return notes;
}

/** Dampak yang akan terjadi bila submission ini di-approve (angka dari backend). */
export function buildPaymentImpactPreview(submission: SubmissionDetail): PaymentImpactPreview {
  const isBookingPath = submission.stay.initialMetersPromotedAt == null;
  const invoicePaidBefore = rupiah(submission.invoice.paidAmountRupiah);
  const invoiceTotal = rupiah(submission.invoice.totalAmountRupiah);
  const depositAmount = rupiah(submission.stay.depositAmountRupiah);
  const depositPaidBefore = rupiah(submission.stay.depositPaidAmountRupiah);
  const downPaymentAmount = rupiah(submission.stay.downPaymentAmountRupiah);
  const downPaymentPaidBefore = rupiah(submission.stay.downPaymentPaidRupiah);

  const before: ImpactStateSnapshot = {
    invoiceStatus: submission.invoice.status,
    invoicePaidAmountRupiah: invoicePaidBefore,
    invoiceRemainingAmountRupiah: Math.max(invoiceTotal - invoicePaidBefore, 0),
    roomStatus: submission.room.status,
    stayStatus: submission.stay.status,
    depositPaidAmountRupiah: depositPaidBefore,
    depositPaymentStatus:
      submission.stay.depositPaymentStatus ??
      deriveDepositPaymentStatus(depositAmount, depositPaidBefore),
    downPaymentPaidRupiah: downPaymentPaidBefore,
    expiresAt: isoOrNull(submission.stay.expiresAt),
  };

  const allocation = computePaymentAllocation({
    amountRupiah: submission.amountRupiah,
    invoiceRemainingAmountRupiah: before.invoiceRemainingAmountRupiah,
    depositRemainingAmountRupiah: isBookingPath
      ? Math.max(depositAmount - depositPaidBefore, 0)
      : 0,
    isBookingPath,
  });

  const outcome = computeImpactOutcome({
    before,
    allocation,
    isBookingPath,
    totalInvoiceAmountRupiah: invoiceTotal,
    depositAmountRupiah: depositAmount,
    downPaymentAmountRupiah: downPaymentAmount,
  });

  return {
    submissionId: submission.id,
    invoiceNumber: submission.invoice.invoiceNumber,
    isBookingPath,
    policy: submission.paymentPolicy,
    allocation,
    before,
    after: outcome.after,
    accounting: outcome.accounting,
    notes: buildNotes({
      isBookingPath,
      accounting: outcome.accounting,
      excessRupiah: allocation.excessRupiah,
    }),
  };
}

export type PaymentImpactRealizedInput = {
  submissionId: number;
  invoiceNumber: string;
  isBookingPath: boolean;
  allocation: PaymentAllocation;
  before: ImpactStateSnapshot;
  totalInvoiceAmountRupiah: number;
  depositAmountRupiah: number;
  downPaymentAmountRupiah: number;
  references: PaymentImpactRealized['references'];
};

/** Dampak nyata setelah approve = outcome yang sama dengan preview + rujukan transaksi. */
export function buildPaymentImpactRealized(input: PaymentImpactRealizedInput): PaymentImpactRealized {
  const outcome = computeImpactOutcome({
    before: input.before,
    allocation: input.allocation,
    isBookingPath: input.isBookingPath,
    totalInvoiceAmountRupiah: input.totalInvoiceAmountRupiah,
    depositAmountRupiah: input.depositAmountRupiah,
    downPaymentAmountRupiah: input.downPaymentAmountRupiah,
  });

  return {
    submissionId: input.submissionId,
    invoiceNumber: input.invoiceNumber,
    isBookingPath: input.isBookingPath,
    allocation: input.allocation,
    before: input.before,
    after: outcome.after,
    accounting: outcome.accounting,
    references: input.references,
    notes: buildNotes({
      isBookingPath: input.isBookingPath,
      accounting: outcome.accounting,
      excessRupiah: input.allocation.excessRupiah,
    }),
  };
}

