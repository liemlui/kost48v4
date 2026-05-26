import { Alert, Card, ProgressBar } from 'react-bootstrap';
import type { AccountingReadiness } from '../../api/accounting';

export default function AccountingReadinessCard({ readiness }: { readiness?: AccountingReadiness }) {
  const score = readiness?.score ?? 0;
  const gates = readiness?.gates ?? [];
  return (
    <Card className="content-card border-0 h-100 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Kesiapan ledger</div>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h3 className="panel-title mb-1">Gate laporan keuangan</h3>
            <p className="text-muted mb-0">Laporan owner aman dibaca jika COA, cash/bank, periode, saldo awal, dan jurnal pembuka sudah lengkap.</p>
          </div>
          <div className="accounting-score-pill">{score}%</div>
        </div>
        <ProgressBar now={score} className="mb-3" />
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
