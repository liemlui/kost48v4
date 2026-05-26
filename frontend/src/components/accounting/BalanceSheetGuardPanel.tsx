import { Alert, Card, Table } from 'react-bootstrap';
import type { BalanceSheetGuard, StatementLine } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

function StatementLines({ lines, emptyLabel }: { lines?: StatementLine[]; emptyLabel: string }) {
  const visible = (lines ?? []).slice(0, 6);
  if (!visible.length) return <tr><td colSpan={2} className="text-muted">{emptyLabel}</td></tr>;
  return (
    <>
      {visible.map((line) => (
        <tr key={`${line.type}-${line.accountId}`}>
          <td><strong>{line.code}</strong> · {line.name}</td>
          <td className="text-end">{formatRupiah(line.balanceRupiah ?? line.amountRupiah ?? 0)}</td>
        </tr>
      ))}
    </>
  );
}

export default function BalanceSheetGuardPanel({ guard }: { guard?: BalanceSheetGuard }) {
  const statement = guard?.statement;
  return (
    <Card className="content-card border-0 accounting-setup-card h-100">
      <Card.Body>
        <div className="section-kicker mb-2">Balance Sheet Lite Guard</div>
        <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
          <div>
            <h3 className="panel-title mb-1">Laporan posisi keuangan</h3>
            <p className="text-muted mb-0">Guarded by Trial Balance. Current profit/loss masih dipisahkan sampai closing retained earnings dibuat.</p>
          </div>
          <span className={`status-soft-pill ${guard?.ready ? 'success' : 'warning'}`}>{guard?.ready ? 'Ready' : 'Guarded'}</span>
        </div>
        {statement ? (
          <>
            <div className="status-strip-v2">
              <div className="status-strip-item info"><span className="status-strip-label">Assets</span><strong>{formatRupiah(statement.assetsRupiah)}</strong></div>
              <div className="status-strip-item warning"><span className="status-strip-label">Liabilities</span><strong>{formatRupiah(statement.liabilitiesRupiah)}</strong></div>
              <div className="status-strip-item success"><span className="status-strip-label">Equity</span><strong>{formatRupiah(statement.equityRupiah)}</strong></div>
              <div className="status-strip-item info"><span className="status-strip-label">Current Profit</span><strong>{formatRupiah(statement.currentProfitRupiah ?? 0)}</strong></div>
            </div>
            <Table responsive hover size="sm" className="mb-0 align-middle">
              <thead><tr><th>Kelompok akun</th><th className="text-end">Balance</th></tr></thead>
              <tbody>
                <tr className="table-light"><td colSpan={2}><strong>Assets</strong></td></tr>
                <StatementLines lines={guard?.lines?.assets} emptyLabel="Belum ada asset balance." />
                <tr className="table-light"><td colSpan={2}><strong>Liabilities</strong></td></tr>
                <StatementLines lines={guard?.lines?.liabilities} emptyLabel="Belum ada liability balance." />
                <tr className="table-light"><td colSpan={2}><strong>Equity</strong></td></tr>
                <StatementLines lines={guard?.lines?.equity} emptyLabel="Belum ada equity balance." />
                <tr>
                  <td><strong>Current Profit / Loss</strong></td>
                  <td className="text-end"><strong>{formatRupiah(statement.currentProfitRupiah ?? 0)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Liabilities + Equity + Current Profit</strong></td>
                  <td className="text-end"><strong>{formatRupiah(statement.liabilitiesAndEquityRupiah)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Difference</strong></td>
                  <td className="text-end"><strong>{formatRupiah(statement.differenceRupiah ?? 0)}</strong></td>
                </tr>
              </tbody>
            </Table>
          </>
        ) : null}
        <Alert variant={guard?.ready ? 'success' : 'warning'} className="mb-0 mt-3">
          {guard?.readinessNote || 'Belum laporan formal sampai setup accounting selesai.'}
        </Alert>
      </Card.Body>
    </Card>
  );
}
