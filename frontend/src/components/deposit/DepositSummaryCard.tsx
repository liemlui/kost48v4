import { Badge, Card } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';
import type { DepositLedgerStaySnapshot } from '../../api/depositLedger';
import { formatRupiah } from '../../utils/formatCurrency';

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type Props = {
  snapshot?: DepositLedgerStaySnapshot | null;
  tenantView?: boolean;
  isLoading?: boolean;
};

export default function DepositSummaryCard({ snapshot, tenantView = false, isLoading = false }: Props) {
  const paid = asNumber(snapshot?.depositPaidAmountRupiah);
  const deducted = asNumber(snapshot?.depositDeductionRupiah);
  const refunded = asNumber(snapshot?.depositRefundedRupiah);
  const held = snapshot?.depositHeldBalanceRupiah !== undefined && snapshot?.depositHeldBalanceRupiah !== null
    ? asNumber(snapshot.depositHeldBalanceRupiah)
    : Math.max(paid - deducted - refunded, 0);

  return (
    <Card className="deposit-summary-card border-0 h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="section-kicker mb-1">{tenantView ? 'Deposit Saya' : 'Deposit Masa Sewa'}</div>
            <h3 className="h5 mb-1">{tenantView ? 'Status deposit masa sewa' : 'Ringkasan deposit operasional'}</h3>
            <p className="text-muted small mb-0">
              {tenantView
                ? 'Deposit bukan tagihan baru. Ini uang jaminan yang ditahan selama masa sewa dan diproses saat keluar final.'
                : 'Data masa sewa tetap menjadi status operasional, sedangkan timeline menampilkan riwayat deposit.'}
            </p>
          </div>
          <div className="d-flex flex-column align-items-end gap-1">
            {snapshot?.depositStatus ? <StatusBadge status={snapshot.depositStatus} tone={tenantView ? 'tenant' : 'admin'} domain="deposit" /> : <Badge bg="secondary">Belum ada status</Badge>}
            {snapshot?.depositPaymentStatus ? <Badge bg="light" text="dark">{snapshot.depositPaymentStatus === 'PAID' ? 'Sudah dibayar' : snapshot.depositPaymentStatus === 'PARTIAL' ? 'Dibayar sebagian' : 'Belum dibayar'}</Badge> : null}
          </div>
        </div>

        <div className="deposit-summary-grid">
          <div className="deposit-summary-item primary">
            <span>{tenantView ? 'Deposit dibayar' : 'Dibayar'}</span>
            <strong>{isLoading ? '...' : formatRupiah(paid)}</strong>
          </div>
          <div className="deposit-summary-item">
            <span>{tenantView ? 'Masih ditahan' : 'Saldo ditahan'}</span>
            <strong>{isLoading ? '...' : formatRupiah(held)}</strong>
          </div>
          <div className="deposit-summary-item">
            <span>{tenantView ? 'Dikembalikan' : 'Refund'}</span>
            <strong>{isLoading ? '...' : formatRupiah(refunded)}</strong>
          </div>
          <div className="deposit-summary-item">
            <span>{tenantView ? 'Dipotong' : 'Potongan'}</span>
            <strong>{isLoading ? '...' : formatRupiah(deducted)}</strong>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
