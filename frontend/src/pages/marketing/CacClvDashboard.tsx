import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';
import EmptyState from '../../components/common/EmptyState';
import { getCacClvSnapshot, analyzeCacClv, type CacClvSnapshot, type CacClvAnalyzeResult } from '../../api/marketAnalysis';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';

function formatDate(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

type Props = {
  snapshotQuery: ReturnType<typeof useQuery<CacClvSnapshot>>;
};

export default function CacClvDashboard({ snapshotQuery }: Props) {
  const queryClient = useQueryClient();
  const [aiResult, setAiResult] = useState<CacClvAnalyzeResult | null>(null);
  const [aiError, setAiError] = useState('');

  const analyzeMutation = useMutation({
    mutationFn: analyzeCacClv,
    onSuccess: (res) => {
      setAiResult(res);
      setAiError('');
    },
    onError: (e) => setAiError(getApiErrorMessage(e, 'Gagal menjalankan analisa AI.')),
  });

  const snapshot = snapshotQuery.data;

  if (snapshotQuery.isLoading) {
    return <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>;
  }
  if (!snapshot) {
    return <EmptyState icon="📊" title="Belum ada data" description="Data CAC/CLV belum tersedia." />;
  }

  const channels = snapshot.bookingByChannel;
  const totals = snapshot.totals;
  const retention = snapshot.retention;
  const clv = snapshot.clvEstimate;
  const referral = snapshot.referral;
  const loyalty = snapshot.loyalty;

  return (
    <div>
      {/* Periode */}
      <Card className="border-0 mb-3" style={{ background: 'linear-gradient(135deg,#fef3c7,#fffbeb)' }}>
        <Card.Body className="py-2 px-3">
          <span className="fw-semibold">📅 Periode data: </span>
          <span>{formatDate(snapshot.period.from)} — {formatDate(snapshot.period.to)}</span>
        </Card.Body>
      </Card>

      {/* Metrik Utama */}
      <Row className="g-2 mb-3">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body className="py-2">
              <div className="text-muted small">Total Booking</div>
              <div className="fs-4 fw-bold">{totals.totalBooking}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body className="py-2">
              <div className="text-muted small">Konversi Huni</div>
              <div className="fs-4 fw-bold">{totals.conversionPercent}%</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>{totals.promoted} dari {totals.totalBooking} booking jadi huni</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body className="py-2">
              <div className="text-muted small">Renewal Rate</div>
              <div className="fs-4 fw-bold">{retention.renewalRate}%</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm text-center h-100">
            <Card.Body className="py-2">
              <div className="text-muted small">Estimasi CLV</div>
              <div className="fs-4 fw-bold">{clv ? formatRupiah(clv.value) : '—'}</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                {clv ? `${retention.avgStayMonths ?? '?'} bln × ${formatRupiah(retention.avgMonthlyRent)} × ${clv.multiplier}x` : 'Data belum cukup'}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart Booking per Kanal */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Card.Title className="fs-6">📈 Booking per Kanal Akuisisi</Card.Title>
          {channels.length > 0 ? (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <HorizontalBarChart
                points={channels.map((c) => ({ label: c.source, value: c.total, color: '#3b82f6' }))}
                ariaLabel="Booking per kanal akuisisi"
              />
            </div>
          ) : (
            <div className="text-muted small py-2">Belum ada data booking dengan sumber kanal. Pastikan bookingSource terisi.</div>
          )}
        </Card.Body>
      </Card>

      {/* Tabel detail per kanal */}
      {channels.length > 0 ? (
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <Card.Title className="fs-6">📋 Detail Kanal Akuisisi</Card.Title>
            <Table size="sm" responsive>
              <thead>
                <tr>
                  <th>Kanal</th>
                  <th className="text-end">Booking</th>
                  <th className="text-end">Aktif</th>
                  <th className="text-end">Selesai</th>
                  <th className="text-end">Batal</th>
                  <th className="text-end">Konversi</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.source}>
                    <td>{ch.source}</td>
                    <td className="text-end">{ch.total}</td>
                    <td className="text-end">{ch.active}</td>
                    <td className="text-end">{ch.completed}</td>
                    <td className="text-end">{ch.cancelled}</td>
                    <td className="text-end">
                      <Badge bg={ch.conversionPercent >= 70 ? 'success' : ch.conversionPercent >= 40 ? 'warning' : 'secondary'}>
                        {ch.conversionPercent}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ) : null}

      {/* Retensi & Loyalitas */}
      <Row className="g-2 mb-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fs-6">🔁 Retensi</Card.Title>
              <div className="mb-1"><strong>Renewal:</strong> {retention.renewalRate}%</div>
              <div className="mb-1"><strong>Rata-rata tinggal:</strong> {retention.avgStayMonths != null ? `${retention.avgStayMonths} bulan (${retention.avgStayDays} hari)` : '—'}</div>
              <div><strong>Sewa rata-rata:</strong> {formatRupiah(retention.avgMonthlyRent)}/bln</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fs-6">🎯 Referral</Card.Title>
              <div className="mb-1"><strong>Total referral:</strong> {referral.total}</div>
              <div><strong>Referral aktif:</strong> {referral.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title className="fs-6">⭐ Loyalitas</Card.Title>
              <div className="mb-1"><strong>Poin diberikan:</strong> {formatRupiahWithoutSymbol(loyalty.pointsGiven)}</div>
              <div className="mb-1"><strong>Poin ditukar:</strong> {formatRupiahWithoutSymbol(loyalty.pointsRedeemed)}</div>
              <div><strong>Penukaran:</strong> {loyalty.redemptionCount}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* AI Insight Section */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <Card.Title className="fs-6 mb-0">🤖 Analisa CAC/CLV dengan AI</Card.Title>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? <Spinner size="sm" /> : 'Minta Analisa AI'}
            </Button>
          </div>

          {aiError ? <Alert variant="danger" dismissible onClose={() => setAiError('')}>{aiError}</Alert> : null}

          {aiResult ? (
            aiResult.fallback ? (
              <Alert variant="info">
                <strong>Mode Offline.</strong> {aiResult.message ?? 'Analisa AI tidak tersedia.'}
                <br />Data di atas tetap akurat — dihitung langsung dari sistem KOST48.
              </Alert>
            ) : aiResult.result ? (
              <div>
                <p><strong>Ringkasan:</strong> {(aiResult.result as any).summary ?? '—'}</p>
                {(aiResult.result as any).channelInsights?.length > 0 ? (
                  <div className="mb-2">
                    <strong>Insight per kanal:</strong>
                    <ul className="mb-0">
                      {(aiResult.result as any).channelInsights.map((ci: any, i: number) => (
                        <li key={i} className="small">
                          <strong>{ci.channel}</strong> ({ci.volume} booking, konversi {ci.conversionRate}%): {ci.assessment}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(aiResult.result as any).retentionInsight ? (
                  <div className="mb-2"><strong>Retensi:</strong> {(aiResult.result as any).retentionInsight}</div>
                ) : null}
                {(aiResult.result as any).clvEstimate ? (
                  <div className="mb-2">
                    <strong>CLV:</strong> {(aiResult.result as any).clvEstimate.explanation}
                    {aiResult.result && (aiResult.result as any).clvEstimate?.value ? (
                      <span className="ms-2 badge bg-primary">{formatRupiah((aiResult.result as any).clvEstimate.value)}</span>
                    ) : null}
                  </div>
                ) : null}
                {(aiResult.result as any).recommendations?.length > 0 ? (
                  <div>
                    <strong>Rekomendasi:</strong>
                    <ul className="mb-0">
                      {(aiResult.result as any).recommendations.map((r: string, i: number) => (
                        <li key={i} className="small">{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiResult.reply && !aiResult.result ? (
                  <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>{aiResult.reply}</div>
                ) : null}
              </div>
            ) : (
              <Alert variant="warning">AI merespon tapi hasil tidak terbaca. Coba lagi.</Alert>
            )
          ) : !analyzeMutation.isPending ? (
            <div className="text-muted small">Klik "Minta Analisa AI" untuk insight dan rekomendasi berbasis data di atas.</div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}