import { Alert, Badge, Card, Table } from 'react-bootstrap';
import type { ProfitLossLite, StatementLine } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

function StatementRows({ lines, emptyLabel }: { lines: StatementLine[]; emptyLabel: string }) {
  if (!lines.length) return <tr><td colSpan={3} className="text-muted">{emptyLabel}</td></tr>;
  return (
    <>
      {lines.slice(0, 8).map((line) => (
        <tr key={`${line.type}-${line.accountId}`}>
          <td><strong>{line.code}</strong> · {line.name}</td>
          <td>{line.type}</td>
          <td className="text-end">{formatRupiah(line.amountRupiah ?? line.balanceRupiah ?? 0)}</td>
        </tr>
      ))}
    </>
  );
}

export default function ProfitLossLitePanel({ profitLoss }: { profitLoss?: ProfitLossLite }) {
  const totals = profitLoss?.totals;
  const hasActivity = Boolean((totals?.revenueRupiah ?? 0) || (totals?.expenseRupiah ?? 0) || (totals?.cogsRupiah ?? 0));
  const netProfit = totals?.netProfitRupiah ?? 0;

  return (
    <Card className="content-card border-0 accounting-setup-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
          <div>
            <div className="section-kicker mb-2">Profit &amp; Loss Lite</div>
            <h3 className="panel-title mb-1">Laba rugi dari posted ledger</h3>
            <p className="text-muted mb-0">Revenue berasal dari invoice issued journal. Pembayaran invoice hanya pelunasan A/R, bukan revenue kedua.</p>
          </div>
          <Badge bg={profitLoss?.formalStatementReady ? 'success' : 'warning'}>{profitLoss?.formalStatementReady ? 'Ledger ready' : 'Guarded'}</Badge>
        </div>

        <div className="status-strip-v2 mb-3">
          <div className="status-strip-item success"><span className="status-strip-label">Revenue</span><strong>{formatRupiah(totals?.revenueRupiah ?? 0)}</strong></div>
          <div className="status-strip-item warning"><span className="status-strip-label">COGS</span><strong>{formatRupiah(totals?.cogsRupiah ?? 0)}</strong></div>
          <div className="status-strip-item danger"><span className="status-strip-label">Expense</span><strong>{formatRupiah(totals?.expenseRupiah ?? 0)}</strong></div>
          <div className="status-strip-item info"><span className="status-strip-label">Net</span><strong>{formatRupiah(netProfit)}</strong><small>{totals?.netProfitMarginPercent ?? 0}% margin</small></div>
        </div>

        {!hasActivity ? <Alert variant="light" className="border">Belum ada revenue/expense yang terjurnal. Buat transaksi nyata untuk mulai membentuk P&amp;L.</Alert> : null}

        <Table responsive hover size="sm" className="mb-0 align-middle">
          <thead><tr><th>Akun</th><th>Tipe</th><th className="text-end">Amount</th></tr></thead>
          <tbody>
            <tr className="table-light"><td colSpan={3}><strong>Revenue</strong></td></tr>
            <StatementRows lines={profitLoss?.lines.revenue ?? []} emptyLabel="Belum ada revenue terjurnal." />
            <tr className="table-light"><td colSpan={3}><strong>COGS</strong></td></tr>
            <StatementRows lines={profitLoss?.lines.cogs ?? []} emptyLabel="Belum ada COGS terjurnal." />
            <tr className="table-light"><td colSpan={3}><strong>Expenses</strong></td></tr>
            <StatementRows lines={profitLoss?.lines.expenses ?? []} emptyLabel="Belum ada expense terjurnal." />
          </tbody>
        </Table>
        {profitLoss?.note ? <small className="text-muted d-block mt-3">{profitLoss.note}</small> : null}
      </Card.Body>
    </Card>
  );
}
