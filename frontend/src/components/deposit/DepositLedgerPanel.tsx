import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Col, Row, Spinner } from 'react-bootstrap';
import type { Stay } from '../../types';
import {
  fetchDepositLedgerByStay,
  fetchDepositLedgerReconciliationLite,
  type DepositLedgerStaySnapshot,
} from '../../api/depositLedger';
import DepositSummaryCard from './DepositSummaryCard';
import DepositTimeline from './DepositTimeline';
import DepositStatusBanner from './DepositStatusBanner';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackSnapshot(stay: Stay): DepositLedgerStaySnapshot {
  const paid = toNumber(stay.depositPaidAmountRupiah);
  const deducted = toNumber(stay.depositDeductionRupiah);
  const refunded = toNumber(stay.depositRefundedRupiah);
  return {
    id: stay.id,
    status: stay.status,
    tenantId: stay.tenantId,
    tenantName: stay.tenant?.fullName ?? null,
    roomId: stay.roomId,
    roomCode: stay.room?.code ?? null,
    depositAmountRupiah: toNumber(stay.depositAmountRupiah),
    depositPaidAmountRupiah: paid,
    depositDeductionRupiah: deducted,
    depositRefundedRupiah: refunded,
    depositHeldBalanceRupiah: Math.max(paid - deducted - refunded, 0),
    depositStatus: stay.depositStatus ?? null,
    depositPaymentStatus: stay.depositPaymentStatus ?? null,
  };
}

type Props = {
  stay: Stay;
  enabled?: boolean;
  tenantView?: boolean;
  compact?: boolean;
};

export default function DepositLedgerPanel({ stay, enabled = true, tenantView = false, compact = false }: Props) {
  const ledgerQuery = useQuery({
    queryKey: ['deposit-ledger', 'stay', stay.id],
    queryFn: () => fetchDepositLedgerByStay(stay.id, { limit: compact ? 20 : 100 }),
    enabled: enabled && Boolean(stay?.id),
    staleTime: 30_000,
    retry: false,
  });

  const reconciliationQuery = useQuery({
    queryKey: ['deposit-ledger', 'reconciliation-lite', stay.id],
    queryFn: () => fetchDepositLedgerReconciliationLite({ limit: 200 }),
    enabled: enabled && !tenantView && Boolean(stay?.id),
    staleTime: 30_000,
    retry: false,
  });

  const snapshot = ledgerQuery.data?.stay ?? fallbackSnapshot(stay);
  const entries = ledgerQuery.data?.entries ?? [];
  const mismatch = useMemo(() => (
    reconciliationQuery.data?.items.find((item) => item.stayId === stay.id && Number(item.gapRupiah ?? 0) !== 0) ?? null
  ), [reconciliationQuery.data?.items, stay.id]);

  return (
    <div className="deposit-ledger-panel mb-4">
      {ledgerQuery.isLoading ? (
        <Alert variant="light" className="border d-flex align-items-center gap-2">
          <Spinner size="sm" /> Memuat riwayat deposit...
        </Alert>
      ) : null}

      {ledgerQuery.isError ? (
        <Alert variant={tenantView ? 'info' : 'warning'}>
          {tenantView
            ? 'Riwayat detail deposit belum bisa dimuat. Ringkasan deposit tetap mengikuti data masa sewa.'
            : 'Gagal memuat riwayat deposit. Coba muat ulang halaman sebelum melanjutkan proses refund atau potongan.'}
        </Alert>
      ) : null}

      <DepositStatusBanner snapshot={snapshot} entries={entries} mismatch={mismatch} tenantView={tenantView} />

      <Row className="g-3">
        <Col xl={compact ? 5 : 4} lg={5}>
          <DepositSummaryCard snapshot={snapshot} tenantView={tenantView} isLoading={ledgerQuery.isLoading} />
        </Col>
        <Col xl={compact ? 7 : 8} lg={7}>
          <DepositTimeline
            entries={entries}
            tenantView={tenantView}
            compact={compact}
            title={tenantView ? 'Riwayat deposit kamu' : 'Timeline deposit masa sewa'}
            subtitle={tenantView ? 'Status deposit selama masa sewa, termasuk saldo ditahan, pengembalian, atau potongan.' : 'Riwayat deposit dari pembayaran awal sampai proses penyelesaian.'}
          />
        </Col>
      </Row>
    </div>
  );
}
