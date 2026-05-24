import { Alert, Card } from 'react-bootstrap';
import type { BalanceSheetGuard } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

export default function BalanceSheetGuardPanel({ guard }: { guard?: BalanceSheetGuard }) {
  const statement = guard?.statement;
  return (
    <Card className="content-card border-0 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Balance Sheet Guard</div>
        <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
          <div>
            <h3 className="panel-title mb-1">Laporan posisi keuangan</h3>
            <p className="text-muted mb-0">Panel ini sengaja terkunci sampai accounting setup selesai. Tidak ada fake Balance Sheet.</p>
          </div>
          <span className={`status-soft-pill ${guard?.ready ? 'success' : 'warning'}`}>{guard?.ready ? 'Ready' : 'Guarded'}</span>
        </div>
        {statement ? (
          <div className="status-strip-v2">
            <div className="status-strip-item info"><span className="status-strip-label">Assets</span><strong>{formatRupiah(statement.assetsRupiah)}</strong></div>
            <div className="status-strip-item warning"><span className="status-strip-label">Liabilities</span><strong>{formatRupiah(statement.liabilitiesRupiah)}</strong></div>
            <div className="status-strip-item success"><span className="status-strip-label">Equity</span><strong>{formatRupiah(statement.equityRupiah)}</strong></div>
          </div>
        ) : null}
        <Alert variant={guard?.ready ? 'success' : 'warning'} className="mb-0 mt-3">
          {guard?.readinessNote || 'Belum laporan formal sampai setup accounting selesai.'}
        </Alert>
      </Card.Body>
    </Card>
  );
}
