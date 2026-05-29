export type DepositAction = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT';

export const depositActionMeta: Record<DepositAction, { label: string; helper: string; tone: 'success' | 'warning' | 'danger' }> = {
  FULL_REFUND: {
    label: 'Kembalikan penuh',
    helper: 'Seluruh deposit dikembalikan ke tenant. Tidak ada potongan.',
    tone: 'success',
  },
  PARTIAL_REFUND: {
    label: 'Potong sebagian, sisanya dikembalikan',
    helper: 'Sebagian deposit dipakai untuk kerusakan/kewajiban, sisanya dikembalikan.',
    tone: 'warning',
  },
  FORFEIT: {
    label: 'Deposit hangus',
    helper: 'Seluruh deposit tidak dikembalikan. Wajib ada alasan yang jelas.',
    tone: 'danger',
  },
};

export function parseRupiahInput(value: string) {
  const normalized = value.replace(/[^0-9]/g, '');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getDepositSettlementNumbers(depositAmount: number, action: DepositAction, deductionAmount: number) {
  const safeDeposit = Math.max(0, Number(depositAmount || 0));
  const safeDeduction = Math.max(0, Number(deductionAmount || 0));

  if (action === 'FULL_REFUND') {
    return {
      depositAmount: safeDeposit,
      deductionAmount: 0,
      refundAmount: safeDeposit,
      processedAmount: safeDeposit,
    };
  }

  if (action === 'FORFEIT') {
    return {
      depositAmount: safeDeposit,
      deductionAmount: safeDeposit,
      refundAmount: 0,
      processedAmount: safeDeposit,
    };
  }

  const cappedDeduction = Math.min(safeDeposit, safeDeduction);
  const refundAmount = Math.max(0, safeDeposit - cappedDeduction);

  return {
    depositAmount: safeDeposit,
    deductionAmount: cappedDeduction,
    refundAmount,
    processedAmount: cappedDeduction + refundAmount,
  };
}

export function validateDepositSettlement({
  depositAmount,
  action,
  deductionAmount,
  note,
}: {
  depositAmount: number;
  action: DepositAction;
  deductionAmount: number;
  note: string;
}) {
  if (depositAmount <= 0) {
    return 'Nominal deposit tidak tersedia atau nol. Cek data masa sewa sebelum memproses deposit.';
  }

  if (deductionAmount < 0) {
    return 'Potongan tidak boleh negatif.';
  }

  if (action === 'PARTIAL_REFUND') {
    if (deductionAmount <= 0) {
      return 'Untuk potong sebagian, isi nominal potongan lebih dari 0. Jika tidak ada potongan, pilih kembalikan penuh.';
    }
    if (deductionAmount >= depositAmount) {
      return 'Untuk potong sebagian, potongan harus lebih kecil dari deposit. Jika seluruh deposit hangus, pilih Deposit hangus.';
    }
  }

  if ((action === 'PARTIAL_REFUND' || action === 'FORFEIT') && note.trim().length < 8) {
    return 'Catatan minimal 8 karakter wajib diisi untuk potongan atau deposit hangus.';
  }

  return null;
}
