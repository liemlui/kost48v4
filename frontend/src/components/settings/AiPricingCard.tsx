import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import type { OwnerAiPricing, OwnerAiUsage } from '../../api/ai';

const MODEL_LABEL: Record<string, string> = {
  'deepseek-flash': 'deepseek-flash',
  'deepseek-v4-pro': 'deepseek-v4-pro',
};

const usd = (value: number): string => `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value)}`;

const costUsd = (value?: number): string => {
  if (value === undefined || value === null) return '—';
  if (value === 0) return '$0';
  return `$${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`;
};

type Props = {
  pricing?: OwnerAiPricing;
  usage?: OwnerAiUsage;
  isOwner: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  refreshError?: string | null;
  refreshWarnings?: string[];
};

/**
 * Kartu harga AI untuk Pengaturan OWNER. Harga resmi dalam USD per 1 juta token;
 * estimasi biaya dihitung backend dari token usage yang tersimpan di AuditLog.
 */
export default function AiPricingCard({
  pricing,
  usage,
  isOwner,
  refreshing,
  onRefresh,
  refreshError,
  refreshWarnings,
}: Props) {
  const models = pricing?.models ?? usage?.pricing?.models ?? {};
  const modelKeys = Object.keys(models);

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <div>
            <div className="fw-semibold">Harga AI (USD / 1 juta token)</div>
            <div className="small text-muted">
              Tabel resmi DeepSeek. Biaya di bawah adalah estimasi token × harga, bukan tagihan resmi.
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {pricing ? <Badge bg="light" text="dark">versi {pricing.version}</Badge> : null}
            {isOwner ? (
              <Button size="sm" variant="outline-primary" disabled={refreshing} onClick={onRefresh}>
                {refreshing ? <><Spinner animation="border" size="sm" className="me-1" />Memperbarui…</> : 'Perbarui harga via AI'}
              </Button>
            ) : null}
          </div>
        </div>

        {refreshError ? <Alert variant="warning" className="small py-2">{refreshError}</Alert> : null}
        {refreshWarnings?.length ? (
          <Alert variant="info" className="small py-2">
            {refreshWarnings.map((warning, index) => <div key={index}>ℹ️ {warning}</div>)}
          </Alert>
        ) : null}

        {modelKeys.length ? (
          <Table responsive size="sm" className="align-middle mb-2">
            <thead>
              <tr>
                <th>Model</th>
                <th>Cache hit (off / peak)</th>
                <th>Cache miss (off / peak)</th>
                <th>Output (off / peak)</th>
              </tr>
            </thead>
            <tbody>
              {modelKeys.map((key) => {
                const row = models[key];
                return (
                  <tr key={key}>
                    <td className="fw-semibold">{MODEL_LABEL[key] ?? key}</td>
                    <td>{usd(row.cacheHitInputUsdPer1M.offPeak)} / {usd(row.cacheHitInputUsdPer1M.peak)}</td>
                    <td>{usd(row.cacheMissInputUsdPer1M.offPeak)} / {usd(row.cacheMissInputUsdPer1M.peak)}</td>
                    <td>{usd(row.outputUsdPer1M.offPeak)} / {usd(row.outputUsdPer1M.peak)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <div className="small text-muted">Tabel harga belum tersedia.</div>
        )}

        <div className="small text-muted">
          {pricing ? (
            <>
              Diperbarui {new Date(pricing.updatedAt).toLocaleString('id-ID')} · sumber: {pricing.source} ·{' '}
              <a href={pricing.sourceUrl} target="_blank" rel="noopener noreferrer">halaman resmi</a>
            </>
          ) : 'Harga belum dimuat.'}
        </div>

        <hr />
        <div className="d-flex flex-wrap gap-3 small">
          <span>Token hari ini: <strong>{usage?.tokens?.total ?? 0}</strong></span>
          <span>Cache hit: <strong>{usage?.tokens?.cacheHit ?? 0}</strong></span>
          <span>Cache miss: <strong>{usage?.tokens?.cacheMiss ?? 0}</strong></span>
          <span>
            Estimasi biaya hari ini: <strong>{costUsd(usage?.estimatedCostUsd)}</strong>
            {usage?.unpricedCalls ? <span className="text-muted"> · {usage.unpricedCalls} panggilan belum bisa dihitung</span> : null}
          </span>
        </div>

        <div className="small text-muted mt-2">
          Jam sibuk: 01:00–04:00 dan 06:00–10:00 UTC, Senin–Jumat. Hari libur Tiongkok belum dimodelkan;
          angka ini estimasi, bukan tagihan.
        </div>
      </Card.Body>
    </Card>
  );
}
