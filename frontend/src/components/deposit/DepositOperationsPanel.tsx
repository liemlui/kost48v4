import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import type { DepositLedgerReconciliationLite, DepositLedgerSummary } from '../../api/depositLedger';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDepositLedgerDate, getDepositLedgerTypeLabel } from './depositLedgerLabels';

type Props = {
  summary?: DepositLedgerSummary;
  reconciliation?: DepositLedgerReconciliationLite;
  isLoading?: boolean;
  isError?: boolean;
  onRefresh?: () => void;
};

export default function DepositOperationsPanel({ summary, reconciliation, isLoading = false, isError = false, onRefresh }: Props) {
  const totals = summary?.totals;
  const recentEntries = summary?.recentEntries ?? [];
  const mismatchCount = reconciliation?.mismatchCount ?? 0;

  return (
    <Card className="content-card border-0 mb-3 deposit-operations-panel">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Deposit Operasional</div>
            <h3 className="h5 mb-1">Timeline deposit tenant</h3>
            <p className="text-muted mb-0">
              Panel ini membaca TenantDepositLedgerEntry untuk audit operasional deposit. Ini berbeda dari JournalEntry accounting formal; jangan gunakan backfill tulis sebelum review owner.
            </p>
          </div>
          <div className="d-flex gap-2 align-items-start">
            <Badge bg={mismatchCount ? 'warning' : 'success'}>{mismatchCount ? `${mismatchCount} perlu review` : 'Snapshot cocok'}</Badge>
            {onRefresh ? <Button size="sm" variant="outline-primary" onClick={onRefresh}>Refresh</Button> : null}
          </div>
        </div>

        {isLoading ? <Alert variant="light" className="border"><Spinner size="sm" className="me-2" />Memuat deposit operasional...</Alert> : null}
            {isError ? <Alert variant="warning">Deposit operasional belum bisa dimuat. Pastikan endpoint deposit aktif sebelum audit UI.</Alert> : null}
        {reconciliation?.note ? <Alert variant="info" className="small">{reconciliation.note}</Alert> : null}

        <div className="deposit-ops-metrics mb-3">
          <div className="deposit-ops-metric primary"><span>Deposit diterima</span><strong>{formatRupiah(totals?.increaseRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Refund / potongan</span><strong>{formatRupiah(totals?.decreaseRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Saldo ditahan</span><strong>{formatRupiah(totals?.ledgerHeldBalanceRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Masa sewa direview</span><strong>{reconciliation?.totalItems ?? 0}</strong></div>
        </div>

        {recentEntries.length ? (
          <Table responsive hover className="mb-0 deposit-ledger-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tenant / Kamar</th>
                <th>Event</th>
                <th>Jumlah</th>
                <th>Saldo</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.slice(0, 8).map((entry) => (
                <tr key={entry.id}>
                  <td className="small text-muted">{formatDepositLedgerDate(entry.occurredAt)}</td>
                  <td>
                    <div className="fw-semibold">{entry.tenantName ?? `Tenant #${entry.tenantId}`}</div>
                    <div className="small text-muted">Kamar {entry.roomCode ?? entry.roomId}</div>
                  </td>
                  <td>{getDepositLedgerTypeLabel(entry.type)}</td>
                  <td className="fw-semibold">{formatRupiah(entry.amountRupiah)}</td>
                  <td>{formatRupiah(entry.balanceAfterRupiah)}</td>
                  <td><Button as={Link as any} to={`/stays/${entry.stayId}?tab=finance`} size="sm" variant="outline-primary">Buka Masa Sewa</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Alert variant="light" className="border mb-0">Belum ada event deposit baru di ledger operasional. Jika ada deposit historis, gunakan dry-run/review sebelum backfill.</Alert>
        )}
      </Card.Body>
    </Card>
  );
}
