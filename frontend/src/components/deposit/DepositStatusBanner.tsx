import { Alert } from 'react-bootstrap';
import type { DepositLedgerReconciliationItem, DepositLedgerStaySnapshot, TenantDepositLedgerEntry } from '../../api/depositLedger';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  snapshot?: DepositLedgerStaySnapshot | null;
  entries?: TenantDepositLedgerEntry[];
  mismatch?: DepositLedgerReconciliationItem | null;
  tenantView?: boolean;
};

export default function DepositStatusBanner({ snapshot, entries = [], mismatch, tenantView = false }: Props) {
  const paid = Number(snapshot?.depositPaidAmountRupiah ?? 0);
  const held = Number(snapshot?.depositHeldBalanceRupiah ?? 0);
  const refunded = Number(snapshot?.depositRefundedRupiah ?? 0);
  const deducted = Number(snapshot?.depositDeductionRupiah ?? 0);
  const hasEntries = entries.length > 0;

  if (mismatch && !tenantView) {
    return (
      <Alert variant="warning" className="deposit-status-banner mb-3">
        <strong>Riwayat dana titipan perlu direview.</strong>{' '}
        Saldo data masa sewa {formatRupiah(mismatch.snapshotHeldBalanceRupiah)} berbeda dari saldo riwayat {formatRupiah(mismatch.ledgerHeldBalanceRupiah)}.
        Jangan proses pengembalian/potongan ulang sebelum admin mengecek histori dana titipan.
      </Alert>
    );
  }

  if (paid > 0 && !hasEntries) {
    return (
      <Alert variant={tenantView ? 'info' : 'warning'} className="deposit-status-banner mb-3">
        <strong>{tenantView ? 'Dana titipan kamu sudah tercatat.' : 'Dana titipan tercatat di data masa sewa.'}</strong>{' '}
        {tenantView
          ? 'Riwayat detail dana titipan lama belum tersedia, tetapi status dana titipan tetap mengikuti data masa sewa.'
          : 'Belum ada riwayat dana titipan detail untuk masa sewa ini. Ini kemungkinan data lama sebelum ledger aktif; gunakan rekonsiliasi sebelum mengambil keputusan.'}
      </Alert>
    );
  }

  if (tenantView && paid > 0 && held > 0) {
    return (
      <Alert variant="info" className="deposit-status-banner mb-3">
        <strong>Dana titipan kamu sedang ditahan selama masa sewa.</strong>{' '}
        Saldo dana titipan yang masih ditahan saat ini {formatRupiah(held)}. Saat proses keluar final, admin akan memproses pengembalian atau potongan jika ada.
      </Alert>
    );
  }

  if (tenantView && refunded > 0 && held <= 0) {
    return (
      <Alert variant="success" className="deposit-status-banner mb-3">
        <strong>Dana titipan sudah selesai diproses.</strong>{' '}
        Total dikembalikan {formatRupiah(refunded)}{deducted > 0 ? ` dan dipotong ${formatRupiah(deducted)}.` : '.'}
      </Alert>
    );
  }

  return null;
}
