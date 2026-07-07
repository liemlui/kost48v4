export type PaymentAmountTone = 'EXACT' | 'PARTIAL' | 'OVERPAY' | 'UNKNOWN';
export type PaymentPolicyKind = 'BOOKING_INITIAL' | 'INVOICE_ONLY';
export type AcceptedPaymentKind = 'DOWN_PAYMENT' | 'SETTLEMENT' | 'INVOICE_FULL';

export type AcceptedPaymentAmount = {
  kind: AcceptedPaymentKind;
  label: string;
  amountRupiah: number;
};

export type PaymentPolicyInput = {
  amountRupiah: number;
  invoiceStatus: string;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
  isBookingPath: boolean;
  stayDepositAmountRupiah?: number | null;
  stayDepositPaidAmountRupiah?: number | null;
  stayDownPaymentAmountRupiah?: number | null;
  stayDownPaymentPaidRupiah?: number | null;
};

export type PaymentPolicyResult = {
  policyKind: PaymentPolicyKind;
  canApprove: boolean;
  amountTone: PaymentAmountTone;
  expectedAmountRupiah: number;
  invoiceRemainingAmountRupiah: number;
  depositRemainingAmountRupiah: number;
  downPaymentRemainingAmountRupiah: number;
  acceptedAmounts: AcceptedPaymentAmount[];
  matchedAcceptedKind: AcceptedPaymentKind | null;
  blockingReason: string | null;
  impactText: string;
};

function rupiah(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function formatRupiah(value: number) {
  return `Rp ${rupiah(value).toLocaleString('id-ID')}`;
}

export function formatAcceptedPaymentAmounts(acceptedAmounts: AcceptedPaymentAmount[]) {
  return acceptedAmounts
    .map((item) => `${item.label} ${formatRupiah(item.amountRupiah)}`)
    .join(' atau ');
}

export function evaluatePaymentPolicy(input: PaymentPolicyInput): PaymentPolicyResult {
  const amount = rupiah(input.amountRupiah);
  const total = rupiah(input.invoiceTotalAmountRupiah);
  const paid = rupiah(input.invoicePaidAmountRupiah);
  const invoiceRemaining = Math.max(total - paid, 0);
  const depositRemaining = Math.max(
    rupiah(input.stayDepositAmountRupiah) - rupiah(input.stayDepositPaidAmountRupiah),
    0,
  );
  const downPaymentRemaining = Math.max(
    rupiah(input.stayDownPaymentAmountRupiah) - rupiah(input.stayDownPaymentPaidRupiah),
    0,
  );

  const kind: PaymentPolicyKind = input.isBookingPath ? 'BOOKING_INITIAL' : 'INVOICE_ONLY';
  const acceptedAmounts: AcceptedPaymentAmount[] = [];

  if (input.invoiceStatus === 'DRAFT') {
    return buildBlockedResult({
      kind,
      amount,
      invoiceRemaining,
      depositRemaining,
      downPaymentRemaining,
      acceptedAmounts,
      reason: 'Invoice masih draft dan belum dapat menerima pembayaran.',
    });
  }

  if (input.invoiceStatus === 'PAID' || input.invoiceStatus === 'CANCELLED') {
    return buildBlockedResult({
      kind,
      amount,
      invoiceRemaining,
      depositRemaining,
      downPaymentRemaining,
      acceptedAmounts,
      reason: 'Invoice ini tidak dapat menerima approval pembayaran baru.',
    });
  }

  if (kind === 'BOOKING_INITIAL') {
    const settlementAmount = invoiceRemaining + depositRemaining;
    if (downPaymentRemaining > 0 && downPaymentRemaining !== settlementAmount) {
      acceptedAmounts.push({
        kind: 'DOWN_PAYMENT',
        label: 'DP tepat',
        amountRupiah: downPaymentRemaining,
      });
    }
    if (settlementAmount > 0) {
      acceptedAmounts.push({
        kind: 'SETTLEMENT',
        label: 'pelunasan penuh',
        amountRupiah: settlementAmount,
      });
    }
  } else if (invoiceRemaining > 0) {
    acceptedAmounts.push({
      kind: 'INVOICE_FULL',
      label: 'pelunasan tagihan',
      amountRupiah: invoiceRemaining,
    });
  }

  if (acceptedAmounts.length === 0) {
    return buildBlockedResult({
      kind,
      amount,
      invoiceRemaining,
      depositRemaining,
      downPaymentRemaining,
      acceptedAmounts,
      reason: kind === 'BOOKING_INITIAL'
        ? 'Pembayaran awal sewa dan deposit sudah lunas.'
        : 'Tagihan ini sudah lunas.',
    });
  }

  const matched = acceptedAmounts.find((item) => item.amountRupiah === amount) ?? null;
  const maxAccepted = Math.max(...acceptedAmounts.map((item) => item.amountRupiah));
  const amountTone: PaymentAmountTone = matched ? 'EXACT' : amount > maxAccepted ? 'OVERPAY' : 'PARTIAL';
  const acceptedText = formatAcceptedPaymentAmounts(acceptedAmounts);
  const blockingReason = matched
    ? null
    : amountTone === 'OVERPAY'
      ? `Nominal melebihi kewajiban. Sistem hanya menerima ${acceptedText}.`
      : `Nominal pembayaran harus tepat: ${acceptedText}. Tidak ada pembayaran sebagian.`;

  const expectedAmountRupiah = matched?.amountRupiah ?? maxAccepted;
  return {
    policyKind: kind,
    canApprove: Boolean(matched),
    amountTone,
    expectedAmountRupiah,
    invoiceRemainingAmountRupiah: invoiceRemaining,
    depositRemainingAmountRupiah: depositRemaining,
    downPaymentRemainingAmountRupiah: downPaymentRemaining,
    acceptedAmounts,
    matchedAcceptedKind: matched?.kind ?? null,
    blockingReason,
    impactText: buildImpactText(kind, matched?.kind ?? null, amountTone),
  };
}

function buildBlockedResult(params: {
  kind: PaymentPolicyKind;
  amount: number;
  invoiceRemaining: number;
  depositRemaining: number;
  downPaymentRemaining: number;
  acceptedAmounts: AcceptedPaymentAmount[];
  reason: string;
}): PaymentPolicyResult {
  return {
    policyKind: params.kind,
    canApprove: false,
    amountTone: 'UNKNOWN',
    expectedAmountRupiah: 0,
    invoiceRemainingAmountRupiah: params.invoiceRemaining,
    depositRemainingAmountRupiah: params.depositRemaining,
    downPaymentRemainingAmountRupiah: params.downPaymentRemaining,
    acceptedAmounts: params.acceptedAmounts,
    matchedAcceptedKind: null,
    blockingReason: params.reason,
    impactText: params.reason,
  };
}

function buildImpactText(kind: PaymentPolicyKind, acceptedKind: AcceptedPaymentKind | null, tone: PaymentAmountTone) {
  if (tone === 'OVERPAY') return 'Nominal lebih. Admin perlu reject atau minta koreksi bukti.';
  if (tone === 'PARTIAL') return 'Pembayaran sebagian tidak diterima oleh kebijakan KOST48.';
  if (acceptedKind === 'DOWN_PAYMENT') {
    return 'DP tepat: kamar menjadi RESERVED, tetapi belum lunas dan belum OCCUPIED.';
  }
  if (acceptedKind === 'SETTLEMENT') {
    return 'Pelunasan penuh: tagihan sewa dan deposit booking siap diselesaikan.';
  }
  if (acceptedKind === 'INVOICE_FULL') {
    return 'Pelunasan tagihan: invoice menjadi lunas setelah approval.';
  }
  return kind === 'BOOKING_INITIAL'
    ? 'Booking hanya menerima DP tepat atau pelunasan penuh.'
    : 'Invoice hanya menerima pelunasan penuh.';
}
