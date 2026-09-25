import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  getPaymentSubmissionImpact: vi.fn(),
  analyzePaymentProof: vi.fn(),
  reviewPaymentSubmission: vi.fn(),
}));

vi.mock('../../api/paymentSubmissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/paymentSubmissions')>();
  return { ...actual, getPaymentSubmissionImpact: mocks.getPaymentSubmissionImpact };
});

vi.mock('../../api/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/ai')>();
  return {
    ...actual,
    analyzePaymentProof: mocks.analyzePaymentProof,
    reviewPaymentSubmission: mocks.reviewPaymentSubmission,
  };
});

import ReviewPaymentModal from '../../components/payments/ReviewPaymentModal';
import type { PaymentImpactPreview, PaymentSubmission } from '../../types';

const RENT = 1_700_000;
const DEPOSIT = 500_000;
const DP = 510_000;

const submission = {
  id: 91,
  stayId: 41,
  invoiceId: 71,
  tenantId: 12,
  amountRupiah: DP,
  paidAt: '2026-09-01T02:00:00.000Z',
  paymentMethod: 'TRANSFER',
  targetType: 'INVOICE',
  status: 'PENDING_REVIEW',
  createdAt: '2026-09-01T02:05:00.000Z',
  fileUrl: '/payment-submissions/proofs/12_bukti.jpg',
  originalFilename: 'bukti.jpg',
  mimeType: 'image/jpeg',
  tenant: { id: 12, fullName: 'Tenant Uji', phone: '0800' },
  room: { id: 5, code: 'A1', name: 'Kamar A1', status: 'AVAILABLE' },
  stay: {
    id: 41,
    status: 'ACTIVE',
    expiresAt: '2026-09-03T00:00:00.000Z',
    initialMetersPromotedAt: null,
    depositAmountRupiah: DEPOSIT,
    depositPaidAmountRupiah: 0,
    depositPaymentStatus: 'UNPAID',
    downPaymentAmountRupiah: DP,
    downPaymentPaidRupiah: 0,
  },
  invoice: {
    id: 71,
    invoiceNumber: 'INV-2026-071',
    status: 'ISSUED',
    totalAmountRupiah: RENT,
    paidAmountRupiah: 0,
    remainingAmountRupiah: RENT,
  },
  paymentPolicy: {
    policyKind: 'BOOKING_INITIAL',
    canApprove: true,
    amountTone: 'EXACT',
    expectedAmountRupiah: DP,
    acceptedAmounts: [{ kind: 'DOWN_PAYMENT', label: 'DP tepat', amountRupiah: DP }],
    matchedAcceptedKind: 'DOWN_PAYMENT',
    blockingReason: null,
    impactText: 'DP tepat: kamar menjadi RESERVED, tetapi belum lunas dan belum OCCUPIED.',
  },
} as unknown as PaymentSubmission;

// Angka di bawah ini berasal dari backend (payment-impact.helper) — frontend hanya menampilkan.
const preview: PaymentImpactPreview = {
  submissionId: 91,
  invoiceNumber: 'INV-2026-071',
  isBookingPath: true,
  policy: submission.paymentPolicy as PaymentImpactPreview['policy'],
  allocation: { rentPortionRupiah: DP, depositPortionRupiah: 0, excessRupiah: 0 },
  before: {
    invoiceStatus: 'ISSUED',
    invoicePaidAmountRupiah: 0,
    invoiceRemainingAmountRupiah: RENT,
    roomStatus: 'AVAILABLE',
    stayStatus: 'ACTIVE',
    depositPaidAmountRupiah: 0,
    depositPaymentStatus: 'UNPAID',
    downPaymentPaidRupiah: 0,
    expiresAt: '2026-09-03T00:00:00.000Z',
  },
  after: {
    invoiceStatus: 'PARTIAL',
    invoicePaidAmountRupiah: DP,
    invoiceRemainingAmountRupiah: RENT - DP,
    roomStatus: 'RESERVED',
    stayStatus: 'ACTIVE',
    depositPaidAmountRupiah: 0,
    depositPaymentStatus: 'UNPAID',
    downPaymentPaidRupiah: DP,
    expiresAt: null,
  },
  accounting: {
    uangDiterimaRupiah: DP,
    jurnalKasMasukRupiah: DP,
    piutangTurunRupiah: DP,
    depositLiabilityNaikRupiah: 0,
    depositJournalDeferred: false,
  },
  notes: ['Kamar menjadi RESERVED saat approve; OCCUPIED terjadi saat check-in.'],
};

function renderModal(onApprove = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewPaymentModal
        show
        mode="approve"
        submission={submission}
        onHide={vi.fn()}
        onApprove={onApprove}
        onReject={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ReviewPaymentModal — ringkasan dampak (IMPACT-01)', () => {
  it('menampilkan angka dampak dari backend (sebelum → sesudah)', async () => {
    mocks.getPaymentSubmissionImpact.mockResolvedValue(preview);

    renderModal();

    const panel = await screen.findByTestId('payment-impact-preview');
    expect(mocks.getPaymentSubmissionImpact).toHaveBeenCalledWith(91);

    const view = within(panel);
    expect(view.getByText(/Ringkasan dampak/)).toBeInTheDocument();
    expect(await view.findByText(/Masuk tagihan sewa/)).toBeInTheDocument();
    expect(view.getAllByText(/510\.000/).length).toBeGreaterThan(0);
    expect(view.getByText(/Piutang 1100 turun/)).toBeInTheDocument();
    expect(view.getByText(/Deposit 2000 naik/)).toBeInTheDocument();

    // sebelum → sesudah: status invoice, kamar, dan DP.
    expect(view.getAllByText('ISSUED').length).toBeGreaterThan(0);
    expect(view.getAllByText('PARTIAL').length).toBeGreaterThan(0);
    expect(view.getAllByText('AVAILABLE').length).toBeGreaterThan(0);
    expect(view.getAllByText('RESERVED').length).toBeGreaterThan(0);
  });

  it('memblokir approve bila ringkasan dampak gagal diambil', async () => {
    mocks.getPaymentSubmissionImpact.mockRejectedValue(new Error('gagal'));

    renderModal();

    expect(
      await screen.findByText(/Ringkasan dampak belum tersedia/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve|setujui/i })).toBeDisabled();
  });

  it('melepas blocker preview setelah ringkasan dampak tersedia', async () => {
    mocks.getPaymentSubmissionImpact.mockResolvedValue(preview);

    renderModal();

    await screen.findByText(/Masuk tagihan sewa/);
    expect(screen.getByRole('button', { name: /approve|setujui/i })).toHaveAttribute(
      'title',
      'Centang checklist dulu.',
    );
  });
});
