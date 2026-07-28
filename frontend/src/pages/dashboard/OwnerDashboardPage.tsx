// FILE: OwnerDashboardPage.tsx — dashboard owner: KPI, tren pendapatan, okupansi (JALUR UANG)
import { useMemo, useState, type ReactNode } from 'react';
import { formatRupiahWithoutSymbol, formatCompactRupiah } from '../../utils/formatCurrency';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatCardSkeleton, TableSkeleton } from '../../components/common/SkeletonLoader';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OwnerDashboardTrendMonth } from '../../api/finance';
import { fetchOwnerDashboardAggregate } from '../../api/ownerDashboard';
import { getIotOverview, iotQueryKeys } from '../../api/iot';
import { cc } from '../../config/chartPalette';
import { generateBrief, getOwnerAiStatus, type BriefResult } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import AiResultPanel from '../../components/ai/AiResultPanel';
import '../../styles/admin-area';

// ═══════════════════════════════════════════════════════════
//  COMPONENT: OwnerDashboardPage
// ═══════════════════════════════════════════════════════════

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Catatan: key ini terpisah dari `kost48_owner_view_mode` (toggle Kokpit/Area Admin di AppLayout).
const VIEW_MODE_KEY = 'kost48_owner_density';

function useOwnerViewMode() {
  const [mode, setModeState] = useState<'compact' | 'full'>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'compact' || saved === 'full') return saved;
    return window.innerWidth <= 834 ? 'compact' : 'full';
  });

  const setMode = (next: 'compact' | 'full') => {
    localStorage.setItem(VIEW_MODE_KEY, next);
    setModeState(next);
  };

  const toggle = () => setMode(mode === 'compact' ? 'full' : 'compact');

  return { mode, setMode, toggle };
}

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(ym: { year: number; month: number }) {
  return new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}



type ChangeMeta = { label: string; color: string };

function changeLabel(value: number | null): ChangeMeta | null {
  if (value === null || value === undefined) return null;
  if (value > 0) return { label: `+${value}%`, color: '#15803d' };
  if (value < 0) return { label: `-${Math.abs(value)}%`, color: '#dc2626' };
  return { label: '0%', color: '#64748b' };
}

function gradeBadge(grade: string): { label: string; tone: string } {
  switch (grade) {
    case 'SEHAT': return { label: 'Sehat', tone: 'good' };
    case 'PERHATIAN': return { label: 'Perhatian', tone: 'watch' };
    case 'RISIKO': return { label: 'Risiko', tone: 'risk' };
    default: return { label: 'Kritis', tone: 'critical' };
  }
}

function computeBestFitLine(data: OwnerDashboardTrendMonth[]): { points: { x: number; y: number }[] } {
  const n = data.length;
  if (n < 2) return { points: data.map((d, i) => ({ x: i, y: d.revenue })) };

  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.revenue);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, _, i) => a + xs[i] * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { points: xs.map((x) => ({ x, y: Math.round(slope * x + intercept) })) };
}

type TrendChartMode = 'line' | 'bar';

function TrendChart({
  data,
  mode,
  showBestFit,
}: {
  data: OwnerDashboardTrendMonth[];
  mode: TrendChartMode;
  showBestFit: boolean;
}) {
  const bestFit = useMemo(() => computeBestFitLine(data), [data]);
  const chartData = useMemo(
    () => data.map((d, i) => ({
      name: `${MONTH_NAMES[d.month - 1]} ${String(d.year).slice(2)}`,
      revenue: d.revenue,
      expense: d.expense,
      netProfit: d.netProfit,
      bestFit: bestFit.points[i]?.y ?? d.revenue,
    })),
    [bestFit, data],
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="owner-chart-tooltip">
        <strong>{label}</strong>
        {payload.map((entry: any, idx: number) => (
          <span key={`${entry.name}-${idx}`} style={{ color: entry.color }}>
            {entry.name}: {formatCompactRupiah(Number(entry.value) || 0)}
          </span>
        ))}
      </div>
    );
  };

  // Chart kosong tanpa pesan terlihat seperti halaman rusak.
  const hasAnyValue = chartData.some(
    (d) => (d.revenue || 0) !== 0 || (d.expense || 0) !== 0 || (d.netProfit || 0) !== 0,
  );
  if (chartData.length === 0 || !hasAnyValue) {
    return (
      <div
        className="text-center text-muted"
        style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        Belum ada data pendapatan/biaya untuk rentang ini.
      </div>
    );
  }

  if (mode === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc('grid')} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis width={76} tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCompactRupiah(value)} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill={cc('revenue')} radius={[3, 3, 0, 0]} name="Pendapatan" />
          <Bar dataKey="expense" fill={cc('expense')} radius={[3, 3, 0, 0]} name="Pengeluaran" />
          <Bar dataKey="netProfit" fill={cc('profit')} radius={[3, 3, 0, 0]} name="Laba Bersih" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={cc('grid')} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis width={76} tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCompactRupiah(value)} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenue" stroke={cc('revenue')} strokeWidth={2} dot={{ r: 3 }} name="Pendapatan" />
        <Line type="monotone" dataKey="expense" stroke={cc('expense')} strokeWidth={2} dot={{ r: 3 }} name="Pengeluaran" />
        <Line type="monotone" dataKey="netProfit" stroke={cc('profit')} strokeWidth={2} dot={{ r: 3 }} name="Laba Bersih" />
        {showBestFit ? (
          <Line type="monotone" dataKey="bestFit" stroke={cc('trend')} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Tren Pendapatan" />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

function OwnerKpiCard({
  label,
  value,
  change,
  detail,
  tone,
}: {
  label: string;
  value: string;
  change: ChangeMeta | null;
  detail?: ReactNode;
  tone: string;
}) {
  return (
    <Card className={`owner-kpi-card owner-kpi-${tone} h-100`}>
      <Card.Body>
        <div className="owner-kpi-label">{label}</div>
        <div className="owner-kpi-value">{value}</div>
        <div className="owner-kpi-footer">
          {change ? <span style={{ color: change.color }}>{change.label} dari bulan lalu</span> : <span>Belum ada pembanding</span>}
          {detail ? <small>{detail}</small> : null}
        </div>
      </Card.Body>
    </Card>
  );
}

// Penanda baku saat sumber data kartu gagal dimuat.
const CARD_ERROR_VALUE = 'Gagal';

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { mode: viewMode, toggle: toggleViewMode } = useOwnerViewMode();
  useDocumentTitle('Dashboard Owner');
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());
  const [trendMonths, setTrendMonths] = useState<number>(6);
  const [chartMode, setChartMode] = useState<TrendChartMode>('line');
  const [showBestFit, setShowBestFit] = useState<boolean>(true);

  // N-05: 3 query individual (dashboard, readiness, meterDue) → 1 aggregate
  const aggregateQuery = useQuery({
    queryKey: ['owner-dashboard-aggregate', ym, trendMonths],
    queryFn: () => fetchOwnerDashboardAggregate(ym.year, ym.month, trendMonths),
    staleTime: 60_000,
    retry: 2,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const ownerAiStatusQuery = useQuery({
    queryKey: ['owner-ai', 'status', 'owner-dashboard'],
    queryFn: getOwnerAiStatus,
    staleTime: 300_000,
    retry: 1,
  });

  const data = aggregateQuery.data?.dashboard;
  const trendData = data?.trendMonths ?? data?.trend6Months ?? [];
  const grade = data ? gradeBadge(data.grade) : null;
  const selectedPeriodLabel = monthLabel(ym);
  const canUseOwnerAi = ownerAiStatusQuery.data?.configured === true;
  const lastUpdatedLabel = aggregateQuery.dataUpdatedAt
    ? new Date(aggregateQuery.dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;
  const isRefreshing = aggregateQuery.isFetching || ownerAiStatusQuery.isFetching;

  // IoT device health
  const iotQuery = useQuery({
    queryKey: iotQueryKeys.overview,
    queryFn: getIotOverview,
    staleTime: 120_000,
  });

  const refreshDashboard = () => {
    void Promise.all([aggregateQuery.refetch(), ownerAiStatusQuery.refetch(), iotQuery.refetch()]);
  };

  const extraSignals = useMemo(() => {
    const items: { key: string; label: string; helper: string; route: string; type: string }[] = [];
    const meter = aggregateQuery.data?.meterDue;
    const readiness = aggregateQuery.data?.readiness;
    if (!aggregateQuery.isLoading && !aggregateQuery.isError && (meter?.due ?? 0) > 0) {
      items.push({ key: 'meter-due', label: 'Meter belum dicatat', helper: `${meter!.recorded}/${meter!.occupied} kamar tercatat bulan ini`, route: '/meter-readings', type: 'outstanding' });
    }
    if (!aggregateQuery.isLoading && !aggregateQuery.isError && readiness && !readiness.ready) {
      items.push({ key: 'readiness', label: 'Akuntansi belum siap', helper: `${readiness.missing.length} gate tersisa — skor ${readiness.score ?? 0}%`, route: '/finance/accounting-setup', type: 'outstanding' });
    }
    // A device that intentionally reports an offline cloud state is not an
    // operational incident. Surface only data that has actually gone stale.
    const iotData = iotQuery.data;
    if (!iotQuery.isLoading && !iotQuery.isError && (iotData?.summary?.enabled ?? 0) > 0) {
      const staleCount = iotData?.summary?.stale ?? 0;
      if (staleCount > 0) {
        items.push({ key: 'iot-stale', label: `${staleCount} perangkat IoT belum mengirim data`, helper: 'Cek waktu pembaruan dan sinkronisasi perangkat.', route: '/iot', type: 'overdue' });
      }
    }
    return items;
  }, [aggregateQuery.data, aggregateQuery.isLoading, aggregateQuery.isError, iotQuery.data, iotQuery.isLoading, iotQuery.isError]);

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) setYm((prev) => ({ ...prev, [field]: num }));
  };

  return (
    <FeatureErrorBoundary>
      <Container fluid className={`owner-dashboard owner-view-${viewMode} px-2 py-3`}>
      <section className="owner-workspace-head mb-3">
        <div>
          <span className="owner-section-kicker">Kokpit bisnis</span>
          <h1>Dashboard Owner</h1>
          <p>Ringkasan kesehatan bisnis untuk {selectedPeriodLabel}.</p>
        </div>
        <div className="owner-toolbar">
          <div className="owner-period-field">
            <Form.Label htmlFor="owner-year">Tahun</Form.Label>
            <Form.Control id="owner-year" type="number" value={ym.year} min={2020} max={2100} onChange={(e) => handleChange('year', e.target.value)} />
          </div>
          <div className="owner-period-field">
            <Form.Label htmlFor="owner-month">Bulan</Form.Label>
            <Form.Select id="owner-month" value={ym.month} onChange={(e) => handleChange('month', e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </Form.Select>
          </div>
          <div className="owner-view-toggle" role="radiogroup" aria-label="Tampilan dashboard">
            <button type="button" role="radio" aria-checked={viewMode === 'compact'} className={viewMode === 'compact' ? 'active' : ''} onClick={() => toggleViewMode()}>
              📋 Ringkas
            </button>
            <button type="button" role="radio" aria-checked={viewMode === 'full'} className={viewMode === 'full' ? 'active' : ''} onClick={() => toggleViewMode()}>
              📊 Lengkap
            </button>
          </div>
          <div className="owner-refresh-control">
            <Button type="button" variant="outline-secondary" size="sm" onClick={refreshDashboard} disabled={isRefreshing}>
              {isRefreshing ? <><Spinner animation="border" size="sm" className="me-1" />Memuat</> : '↻ Refresh'}
            </Button>
            <small aria-live="polite">{lastUpdatedLabel ? `Terakhir diperbarui ${lastUpdatedLabel}` : 'Belum diperbarui'}</small>
          </div>
        </div>
      </section>

      {aggregateQuery.isLoading ? (
        <div role="status" aria-label="Memuat dashboard" aria-busy="true">
          <Row className="g-3 mb-3">
            {Array.from({ length: 4 }).map((_, i) => <Col xl={3} md={6} key={i}><StatCardSkeleton /></Col>)}
          </Row>
          <Card className="owner-feedback-card mb-3"><Card.Body><TableSkeleton rows={5} cols={3} /></Card.Body></Card>
          <span className="visually-hidden">Memuat dashboard…</span>
        </div>
      ) : null}

      {aggregateQuery.isError ? (
        <Alert variant="warning" className="mb-3">
          Dashboard gagal dimuat. Pastikan backend API berjalan dan data transaksi tersedia.
          {aggregateQuery.error ? <div className="small mt-1">{(aggregateQuery.error as any)?.message ?? ''}</div> : null}
          <Button type="button" size="sm" variant="outline-warning" className="mt-2" onClick={refreshDashboard} disabled={isRefreshing}>
            {isRefreshing ? 'Memuat ulang…' : 'Coba lagi'}
          </Button>
        </Alert>
      ) : null}

      {data ? (
        <>
          {grade ? (
            <section className={`owner-status-strip owner-status-${grade.tone} mb-3`}>
              <span
                className="owner-grade-badge"
                title="Sehat ≥ 70 · Perhatian 40–69 · Risiko 20–39 · Kritis < 20"
              >
                {grade.label}
              </span>
              <div className="owner-status-copy">
                <span>Kondisi bulan ini</span>
                <strong>{data.headline}</strong>
              </div>
              <div className="owner-status-meta">
                <span>Periode</span>
                <strong>{selectedPeriodLabel}</strong>
              </div>
            </section>
          ) : null}

          <Row className="g-3 mb-3">
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Pendapatan" value={formatCompactRupiah(data.kpi.totalRevenueRupiah)} change={changeLabel(data.kpi.totalRevenueChangePercent)} tone="revenue" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Laba Bersih" value={formatCompactRupiah(data.kpi.netProfitRupiah)} change={changeLabel(data.kpi.netProfitChangePercent)} detail={`Margin ${data.kpi.netProfitMarginPercent}%`} tone="profit" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Okupansi kamar siap-sewa" value={`${data.kpi.occupancyRatePercent}%`} change={changeLabel(data.kpi.occupancyRateChangePercent)} detail="Kamar maintenance tidak dihitung" tone="occupancy" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Kas Bersih" value={formatCompactRupiah(data.kpi.netCashFlowRupiah)} change={changeLabel(data.kpi.netCashFlowChangePercent)} tone="cash" />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <section className="owner-panel h-100">
                <div className="owner-panel-heading">
                  <div>
                    <span className="owner-section-kicker">Prioritas</span>
                    <h2>Butuh perhatian</h2>
                  </div>
                  <StatusBadge status={data.signals.length === 0 && extraSignals.length === 0 ? 'SUCCESS' : 'WARNING'} customLabel={data.signals.length === 0 && extraSignals.length === 0 ? 'Aman' : `${data.signals.length + extraSignals.length} sinyal`} />
                </div>
                <div className="owner-panel-body">
                  {data.signals.length === 0 && extraSignals.length === 0 ? (
                    <div className="p-4"><EmptyState icon="✅" title="Semua aman" description="Tidak ada tindak lanjut mendesak pada periode ini." /></div>
                  ) : (
                    <div className="owner-signal-list">
                      {data.signals.map((signal, index) => (
                        <button key={`${signal.type}-${index}`} type="button" className="owner-signal-item" onClick={() => navigate(signal.route)}>
                          <span className={`owner-signal-dot owner-signal-${signal.type}`} aria-hidden="true" />
                          <span className="owner-signal-content">
                            <strong>{signal.type === 'overdue' ? 'Tagihan overdue' : signal.type === 'pending_payment' ? 'Pembayaran pending' : 'Tagihan outstanding'}</strong>
                            <small>{signal.count} item{signal.totalRupiah ? ` - Rp ${formatRupiahWithoutSymbol(signal.totalRupiah)}` : ''}</small>
                          </span>
                          <span className="owner-signal-arrow" aria-hidden="true">&rsaquo;</span>
                        </button>
                      ))}
                      {extraSignals.map((signal) => (
                        <button key={signal.key} type="button" className="owner-signal-item" onClick={() => navigate(signal.route)}>
                          <span className={`owner-signal-dot owner-signal-${signal.type}`} aria-hidden="true" />
                          <span className="owner-signal-content">
                            <strong>{signal.label}</strong>
                            <small>{signal.helper}</small>
                          </span>
                          <span className="owner-signal-arrow" aria-hidden="true">&rsaquo;</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </Col>

            <Col lg={5}>
              <section className="owner-panel owner-ai-panel h-100">
                <div className="owner-panel-heading">
                  <div>
                    <span className="owner-section-kicker">Analisis AI</span>
                    <h2>Ringkasan Bisnis</h2>
                  </div>
                </div>
                <div className="owner-panel-body owner-ai-body">
                  <div className="owner-ai-context">
                    <span>Skor bisnis <small className="text-muted">(0–100)</small><strong>{data.score}</strong></span>
                    <span>Periode<strong>{selectedPeriodLabel}</strong></span>
                  </div>
                  {canUseOwnerAi ? (
                    <AiAssistButton<BriefResult>
                      label="Buat Ringkasan AI"
                      loadingLabel="Menganalisa dengan DeepSeek..."
                      variant="primary"
                      run={generateBrief}
                      renderResult={(result) => (
                        <AiResultPanel
                          title="Ringkasan Bisnis"
                          mode={result.mode}
                          fallback={result.fallback}
                          warnings={result.warnings}
                          missingData={result.missingData}
                          usage={result.usage}
                          model={result.model}
                        >
                          <p className="fw-medium mb-2">{result.result?.summary}</p>

                          {result.result?.priorityActions?.length > 0 ? (
                            <div className="mb-2">
                              <div className="small fw-semibold text-muted mb-1">Aksi Prioritas</div>
                              {result.result.priorityActions.map((a, i) => (
                                <div key={i} className="d-flex align-items-center gap-2 mb-1 small">
                                  <span className={`badge bg-${a.severity === 'CRITICAL' ? 'danger' : a.severity === 'HIGH' ? 'warning' : a.severity === 'MEDIUM' ? 'info' : 'secondary'}`}>
                                    {a.severity}
                                  </span>
                                  <span>{a.title}</span>
                                  <span className="text-muted">— {a.reason}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {result.result?.risks?.length > 0 ? (
                            <div className="mb-2">
                              <div className="small fw-semibold text-muted mb-1">Risiko</div>
                              {result.result.risks.map((r, i) => (
                                <div key={i} className="small mb-1">⚠️ <strong>{r.title}</strong> — {r.impact}. <em>Mitigasi: {r.mitigation}</em></div>
                              ))}
                            </div>
                          ) : null}

                          {result.result?.numbersToWatch?.length > 0 ? (
                            <div className="mb-2">
                              <div className="small fw-semibold text-muted mb-1">Angka Penting</div>
                              {result.result.numbersToWatch.map((n, i) => (
                                <div key={i} className="small mb-1">📊 <strong>{n.label}:</strong> {n.value} — {n.why}</div>
                              ))}
                            </div>
                          ) : null}
                        </AiResultPanel>
                      )}
                    />
                  ) : (
                    <Alert variant="secondary" className="mb-0 small">AI belum dikonfigurasi. Aktifkan di <strong>Pengaturan → Konfigurasi AI</strong>.</Alert>
                  )}
                </div>
              </section>
            </Col>
          </Row>

          {/* Tren chart hanya tampil di mode Lengkap */}
          {viewMode === 'full' ? (
          <section className="owner-panel owner-trend-panel mb-3">
            <div className="owner-panel-heading owner-trend-heading">
              <div>
                <span className="owner-section-kicker">Analisis periode</span>
                <h2>Tren pendapatan dan biaya</h2>
              </div>
              <div className="owner-chart-controls">
                <div className="owner-segmented" aria-label="Rentang tren">
                  {[1, 3, 6, 12].map((months) => (
                    <button key={months} type="button" className={trendMonths === months ? 'active' : ''} aria-pressed={trendMonths === months} onClick={() => setTrendMonths(months)}>
                      {months === 12 ? '1 thn' : `${months} bln`}
                    </button>
                  ))}
                </div>
                <div className="owner-segmented" aria-label="Tampilan grafik">
                  <button type="button" className={chartMode === 'line' ? 'active' : ''} aria-pressed={chartMode === 'line'} onClick={() => setChartMode('line')}>Garis</button>
                  <button type="button" className={chartMode === 'bar' ? 'active' : ''} aria-pressed={chartMode === 'bar'} onClick={() => setChartMode('bar')}>Batang</button>
                </div>
                <Form.Check type="switch" id="owner-best-fit" label="Garis tren" checked={showBestFit} onChange={() => setShowBestFit((current) => !current)} />
              </div>
            </div>
            <div className="owner-panel-body">
              {trendData.length === 0 ? (
                <div className="p-4"><EmptyState icon="📈" title="Belum ada data tren" description="Data tren tidak tersedia untuk periode ini." /></div>
              ) : (
                <div className="owner-chart-stage">
                  <TrendChart data={trendData} mode={chartMode} showBestFit={showBestFit} />
                </div>
              )}
              <div className="owner-chart-legend">
                <span><i className="owner-swatch owner-swatch-revenue" />Pendapatan</span>
                <span><i className="owner-swatch owner-swatch-expense" />Pengeluaran</span>
                <span><i className="owner-swatch owner-swatch-profit" />Laba Bersih</span>
                {showBestFit ? <span><i className="owner-swatch owner-swatch-trend" />Tren Pendapatan</span> : null}
              </div>
            </div>
          </section>
          ) : null}
        </>
      ) : null}
    </Container>
    </FeatureErrorBoundary>
  );
}
