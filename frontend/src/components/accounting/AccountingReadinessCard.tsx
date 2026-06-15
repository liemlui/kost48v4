import { Alert, Badge, Card, ProgressBar } from 'react-bootstrap';
import type { AccountingReadiness } from '../../api/accounting';

export default function AccountingReadinessCard({ readiness }: { readiness?: AccountingReadiness }) {
  const score = readiness?.score ?? 0;
  const gates = readiness?.gates ?? [];
  const postingPeriod = readiness?.postingPeriod;
  return (
    <Card className="content-card border-0 h-100 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Kesiapan ledger</div>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h3 className="panel-title mb-1">Gate laporan keuangan</h3>
            <p className="text-muted mb-0">Laporan owner aman dibaca jika Bagan Akun (COA), kas/bank, periode, saldo awal, dan jurnal pembuka sudah lengkap.</p>
          </div>
          <div className="accounting-score-pill">{score}%</div>
        </div>
        <ProgressBar now={score} className="mb-3" />
        {postingPeriod ? (
          <div className={`p-3 rounded-3 border mb-3 ${postingPeriod.ready ? 'bg-light' : 'border-warning bg-warning-subtle'}`}>
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="small text-muted">Periode posting tagihan baru</div>
                <strong>{postingPeriod.key ?? 'Belum ada periode'} · {postingPeriod.postingDate}</strong>
              </div>
              <Badge bg={postingPeriod.ready ? 'success' : 'warning'} text={postingPeriod.ready ? undefined : 'dark'}>
                {postingPeriod.ready ? 'OPEN' : postingPeriod.status ?? 'Belum siap'}
              </Badge>
            </div>
            {!postingPeriod.ready && postingPeriod.warning ? (
              <div className="small mt-2">{postingPeriod.warning}</div>
            ) : null}
          </div>
        ) : null}
        <div className="accounting-gate-list">
          {gates.map((gate) => (
            <div key={gate.key} className={`accounting-gate ${gate.ready ? 'is-ready' : 'is-missing'}`}>
              <span>{gate.ready ? '✓' : '!'}</span>
              <div>
                <strong>{gate.label}</strong>
                <small>{gate.note || (gate.count !== undefined ? `${gate.count} data` : 'Gate ledger')}</small>
              </div>
            </div>
          ))}
        </div>
        {readiness?.warnings?.length ? (
          <Alert variant="warning" className="mt-3 mb-0 small">
            {readiness.warnings[0]}
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
}
