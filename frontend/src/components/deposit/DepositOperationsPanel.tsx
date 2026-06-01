import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import type { DepositLedgerReconciliationLite, DepositLedgerSummary } from '../../api/depositLedger';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDepositLedgerDate, getDepositLedgerTypeLabel } from './depositLedgerLabels';
import PaginationControls from '../common/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

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
  const entryPagination = useClientPagination(recentEntries, [recentEntries.length], 10);

  return (
    <Card className="content-card border-0 mb-3 deposit-operations-panel">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Dana Titipan Operasional</div>
            <h3 className="h5 mb-1">Timeline dana titipan penghuni</h3>
            <p className="text-muted mb-0">
              Panel ini membaca riwayat dana titipan untuk audit operasional. Ini berbeda dari jurnal akuntansi formal; jangan lakukan backfill tulis sebelum review owner.
            </p>
          </div>
          <div className="d-flex gap-2 align-items-start">
            <Badge bg={mismatchCount ? 'warning' : 'success'}>{mismatchCount ? `${mismatchCount} perlu review` : 'Snapshot cocok'}</Badge>
            {onRefresh ? <Button size="sm" variant="outline-primary" onClick={onRefresh}>Refresh</Button> : null}
          </div>
        </div>

        {isLoading ? <Alert variant="light" className="border"><Spinner size="sm" className="me-2" />Memuat dana titipan operasional...</Alert> : null}
            {isError ? <Alert variant="warning">Dana titipan operasional belum bisa dimuat. Coba muat ulang halaman.</Alert> : null}
        {reconciliation?.note ? <Alert variant="info" className="small">{reconciliation.note}</Alert> : null}

        <div className="deposit-ops-metrics mb-3">
          <div className="deposit-ops-metric primary"><span>Dana titipan diterima</span><strong>{formatRupiah(totals?.increaseRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Pengembalian / potongan</span><strong>{formatRupiah(totals?.decreaseRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Saldo ditahan</span><strong>{formatRupiah(totals?.ledgerHeldBalanceRupiah ?? 0)}</strong></div>
          <div className="deposit-ops-metric"><span>Masa sewa direview</span><strong>{reconciliation?.totalItems ?? 0}</strong></div>
        </div>

        {recentEntries.length ? (
          <>
            <Table responsive hover className="mb-0 deposit-ledger-table compact-data-table responsive-data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Penghuni / Kamar</th>
                  <th>Event</th>
                  <th>Jumlah</th>
                  <th>Saldo</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {entryPagination.pagedItems.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="Waktu" className="small text-muted">{formatDepositLedgerDate(entry.occurredAt)}</td>
                    <td data-label="Penghuni / Kamar">
                      <div className="fw-semibold">{entry.tenantName ?? `Penghuni #${entry.tenantId}`}</div>
                      <div className="small text-muted">Kamar {entry.roomCode ?? entry.roomId}</div>
                    </td>
                    <td data-label="Event">{getDepositLedgerTypeLabel(entry.type)}</td>
                    <td data-label="Jumlah" className="fw-semibold">{formatRupiah(entry.amountRupiah)}</td>
                    <td data-label="Saldo">{formatRupiah(entry.balanceAfterRupiah)}</td>
                    <td data-label="Aksi"><Button as={Link as any} to={`/stays/${entry.stayId}?tab=finance`} size="sm" variant="outline-primary">Buka</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {entryPagination.hasPagination ? (
              <div className="table-pagination-shell mt-3">
                <PaginationControls
                  currentPage={entryPagination.page}
                  totalPages={entryPagination.totalPages}
                  totalItems={entryPagination.totalItems}
                  pageSize={entryPagination.pageSize}
                  onPageChange={entryPagination.setPage}
                  isLoading={isLoading}
                />
              </div>
            ) : null}
          </>
        ) : (
          <Alert variant="light" className="border mb-0">Belum ada event dana titipan baru di ledger operasional. Jika ada data historis, gunakan review sebelum backfill.</Alert>
        )}
      </Card.Body>
    </Card>
  );
}
