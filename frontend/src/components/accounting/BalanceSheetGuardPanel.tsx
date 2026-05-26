import { Alert, Card, Table } from 'react-bootstrap';
import type { BalanceSheetGuard, StatementLine } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

function StatementLines({ lines, emptyLabel }: { lines?: StatementLine[]; emptyLabel: string }) {
  const visible = (lines ?? []).filter((line) => (line.balanceRupiah ?? line.amountRupiah ?? 0) !== 0).slice(0, 8);
  if (!visible.length) return <tr><td colSpan={2} className="text-muted">{emptyLabel}</td></tr>;
  return (
    <>
      {visible.map((line) => {
        const value = line.balanceRupiah ?? line.amountRupiah ?? 0;
        return (
          <tr key={`${line.type}-${line.accountId}`}>
            <td>
              <strong>{line.code}</strong> · {line.presentationLabel ?? line.name}
              {line.isContraAsset ? <span className="text-muted ms-2">(contra asset)</span> : null}
            </td>
            <td className="text-end">{formatRupiah(value)}</td>
          </tr>
        );
      })}
    </>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value?: number; strong?: boolean }) {
  return (
    <tr>
      <td>{strong ? <strong>{label}</strong> : label}</td>
      <td className="text-end">{strong ? <strong>{formatRupiah(value ?? 0)}</strong> : formatRupiah(value ?? 0)}</td>
    </tr>
  );
}

export default function BalanceSheetGuardPanel({ guard }: { guard?: BalanceSheetGuard }) {
  const statement = guard?.statement;
  const disclosure = guard?.assetRegisterDisclosure;
  return (
    <Card className="content-card border-0 accounting-setup-card h-100">
      <Card.Body>
        <div className="section-kicker mb-2">Neraca</div>
        <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
          <div>
            <h3 className="panel-title mb-1">Laporan posisi keuangan</h3>
            <p className="text-muted mb-0">Ledger sebagai source of truth. Kontra-aset seperti akumulasi depresiasi mengurangi aset, bukan menambah aset.</p>
          </div>
          <span className={`status-soft-pill ${guard?.ready ? 'success' : 'warning'}`}>{guard?.ready ? 'Seimbang' : 'Perlu cek'}</span>
        </div>
        {guard?.closing?.note ? <Alert variant={guard.closing.retainedEarningsActive ? 'success' : 'info'} className="mb-3">{guard.closing.note}</Alert> : null}
        {statement ? (
          <>
            <div className="status-strip-v2">
              <div className="status-strip-item info"><span className="status-strip-label">Aset</span><strong>{formatRupiah(statement.assetsRupiah)}</strong></div>
              <div className="status-strip-item warning"><span className="status-strip-label">Liabilitas</span><strong>{formatRupiah(statement.liabilitiesRupiah)}</strong></div>
              <div className="status-strip-item success"><span className="status-strip-label">Ekuitas + Laba Ditahan</span><strong>{formatRupiah(statement.equityIncludingCurrentProfitRupiah ?? statement.equityRupiah)}</strong></div>
              <div className="status-strip-item info"><span className="status-strip-label">Selisih</span><strong>{formatRupiah(statement.differenceRupiah ?? 0)}</strong></div>
            </div>
            <Table responsive hover size="sm" className="mb-0 align-middle">
              <thead><tr><th>Kelompok akun</th><th className="text-end">Nilai</th></tr></thead>
              <tbody>
                <tr className="table-light"><td colSpan={2}><strong>Aset Lancar</strong></td></tr>
                <StatementLines lines={guard?.lines?.currentAssets ?? guard?.lines?.assets} emptyLabel="Belum ada saldo aset lancar." />
                <tr className="table-light"><td colSpan={2}><strong>Aset Tetap</strong></td></tr>
                <StatementLines lines={guard?.lines?.fixedAssets} emptyLabel="Belum ada saldo aset tetap di ledger." />
                <StatementLines lines={guard?.lines?.contraAssets} emptyLabel="Belum ada kontra-aset." />
                <SummaryRow label="Net Aset Tetap" value={statement.netFixedAssetsRupiah ?? 0} strong />
                <SummaryRow label="Total Aset" value={statement.assetsRupiah} strong />
                <tr className="table-light"><td colSpan={2}><strong>Liabilitas</strong></td></tr>
                <StatementLines lines={guard?.lines?.liabilities} emptyLabel="Belum ada saldo liabilitas." />
                <SummaryRow label="Total Liabilitas" value={statement.liabilitiesRupiah} strong />
                <tr className="table-light"><td colSpan={2}><strong>Ekuitas</strong></td></tr>
                <StatementLines lines={guard?.lines?.equity} emptyLabel="Belum ada saldo ekuitas." />
                <SummaryRow label="Laba/Rugi Berjalan" value={statement.currentProfitRupiah ?? 0} />
                <SummaryRow label="Ekuitas + Laba/Rugi Berjalan" value={statement.equityIncludingCurrentProfitRupiah ?? statement.equityRupiah} strong />
                <SummaryRow label="Liabilitas + Ekuitas + Laba Berjalan" value={statement.liabilitiesAndEquityRupiah} strong />
                <SummaryRow label="Selisih" value={statement.differenceRupiah ?? 0} strong />
              </tbody>
            </Table>
            {disclosure ? (
              <Alert variant={disclosure.aligned ? 'success' : 'info'} className="mt-3 mb-0">
                <strong>Disclosure asset register:</strong> register aset mencatat nilai buku {formatRupiah(disclosure.registerNetBookValueRupiah)} dari {disclosure.assetCount} aset. Nilai aset tetap bersih di ledger saat ini {formatRupiah(disclosure.ledgerNetFixedAssetsRupiah)}. {disclosure.warning}
              </Alert>
            ) : null}
          </>
        ) : null}
        <Alert variant={guard?.ready ? 'success' : 'warning'} className="mb-0 mt-3">
          {guard?.readinessNote || 'Belum laporan formal sampai setup accounting selesai.'}
        </Alert>
      </Card.Body>
    </Card>
  );
}
