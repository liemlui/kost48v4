import { Card, Table } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';
import type { TrialBalance } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';
import { useClientPagination } from '../../hooks/useClientPagination';

export default function TrialBalancePreview({ trial }: { trial?: TrialBalance }) {
  const lines = (trial?.lines ?? []).filter((line) => line.debitRupiah || line.creditRupiah || line.balanceRupiah);
  const linePagination = useClientPagination(lines, [lines.length], 10);
  return (
    <Card className="content-card border-0 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Trial Balance Preview</div>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h3 className="panel-title mb-1">Neraca saldo</h3>
            <p className="text-muted mb-0">Akumulasi semua jurnal yang sudah diposting, termasuk saldo awal jika ada.</p>
          </div>
          <span className={`status-soft-pill ${trial?.isBalanced ? 'success' : 'danger'}`}>{trial?.isBalanced ? 'Balanced' : 'Belum balance'}</span>
        </div>
        <div className="status-strip-v2 mb-3">
          <div className="status-strip-item success"><span className="status-strip-label">Debit</span><strong>{formatRupiah(trial?.totalDebitRupiah ?? 0)}</strong></div>
          <div className="status-strip-item info"><span className="status-strip-label">Kredit</span><strong>{formatRupiah(trial?.totalCreditRupiah ?? 0)}</strong></div>
        </div>
        <Table responsive hover className="mb-0 small">
          <thead><tr><th>COA</th><th>Tipe</th><th>Debit</th><th>Kredit</th><th>Balance</th></tr></thead>
          <tbody>
            {lines.length ? linePagination.pagedItems.map((line) => (
              <tr key={line.accountId}>
                <td><strong>{line.code}</strong> · {line.name}</td>
                <td>{line.type}</td>
                <td>{formatRupiah(line.debitRupiah)}</td>
                <td>{formatRupiah(line.creditRupiah)}</td>
                <td>{formatRupiah(line.balanceRupiah)}</td>
              </tr>
            )) : <tr><td colSpan={5} className="text-muted">Belum ada saldo yang diposting.</td></tr>}
          </tbody>
        </Table>
        {linePagination.hasPagination ? (
          <div className="table-pagination-shell mt-3">
            <PaginationControls
              currentPage={linePagination.page}
              totalPages={linePagination.totalPages}
              totalItems={linePagination.totalItems}
              pageSize={linePagination.pageSize}
              onPageChange={linePagination.setPage}
            />
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
