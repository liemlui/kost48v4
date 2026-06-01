import React, { useMemo, useState, useCallback } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchOwnerDashboard, type OwnerDashboard, type OwnerDashboardTrendMonth } from '../../api/finance';
import { createBusinessNarrative } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';

// ─── Helpers ────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(ym: { year: number; month: number }) {
  return new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function formatCompactRupiah(value: number): string {
  const safe = Math.abs(value || 0);
  const sign = value < 0 ? '-' : '';
  if (safe >= 1_000_000_000) return `${sign}Rp ${(safe / 1_000_000_000).toFixed(1)} M`;
  if (safe >= 1_000_000) return `${sign}Rp ${(safe / 1_000_000).toFixed(1)} jt`;
  if (safe >= 1_000) return `${sign}Rp ${(safe / 1_000).toFixed(0)} rb`;
  return `${sign}Rp ${formatRupiah(safe)}`;
}

function changeLabel(value: number | null): { label: string; color: string; icon: string } | null {
  if (value === null || value === undefined) return null;
  if (value > 0) return { label: `▲ ${value}%`, color: '#22c55e', icon: '📈' };
  if (value < 0) return { label: `▼ ${Math.abs(value)}%`, color: '#ef4444', icon: '📉' };
  return { label: '— 0%', color: '#6b7280', icon: '➡️' };
}

function gradeBadge(grade: string): { label: string; color: string; bg: string } {
  switch (grade) {
    case 'SEHAT': return { label: 'SEHAT', color: '#fff', bg: '#166534' };
    case 'PERHATIAN': return { label: 'PERHATIAN', color: '#fff', bg: '#b45309' };
    case 'RISIKO': return { label: 'RISIKO', color: '#fff', bg: '#c2410c' };
    default: return { label: 'KRITIS', color: '#fff', bg: '#b91c1c' };
  }
}

// ─── Simple Linear Regression (best-fit line) ───

function computeBestFitLine(data: OwnerDashboardTrendMonth[]): { slope: number; intercept: number; points: { x: number; y: number }[] } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, points: data.map((d, i) => ({ x: i, y: d.revenue })) };

  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.revenue);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, _, i) => a + xs[i] * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const points = xs.map((x) => ({ x, y: Math.round(slope * x + intercept) }));
  return { slope, intercept, points };
}

// ─── Occupancy Pie Colors ──────────────────────

const OCCUPANCY_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ef4444'];

// ─── Trend Chart Component ─────────────────────

type TrendChartMode = 'line' | 'bar';

function TrendChart({
  data,
  mode,
  showBestFit,
  onToggleMode,
  onToggleBestFit,
}: {
  data: OwnerDashboardTrendMonth[];
  mode: TrendChartMode;
  showBestFit: boolean;
  onToggleMode: () => void;
  onToggleBestFit: () => void;
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
    [data, bestFit],
  );

  const revenueColor = '#3b82f6';
  const expenseColor = '#f97316';
  const netProfitColor = '#22c55e';
  const bestFitColor = '#8b5cf6';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ color: entry.color }}>
            {entry.name}: Rp {formatCompactRupiah(entry.value)}
          </div>
        ))}
      </div>
    );
  };

  if (mode === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompactRupiah(v)} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill={revenueColor} radius={[3, 3, 0, 0]} name="Revenue" />
          <Bar dataKey="expense" fill={expenseColor} radius={[3, 3, 0, 0]} name="Expense" />
          <Bar dataKey="netProfit" fill={netProfitColor} radius={[3, 3, 0, 0]} name="Net Profit" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompactRupiah(v)} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenue" stroke={revenueColor} strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
        <Line type="monotone" dataKey="expense" stroke={expenseColor} strokeWidth={2} dot={{ r: 3 }} name="Expense" />
        <Line type="monotone" dataKey="netProfit" stroke={netProfitColor} strokeWidth={2} dot={{ r: 3 }} name="Net Profit" />
        {showBestFit && (
          <Line type="monotone" dataKey="bestFit" stroke={bestFitColor} strokeWidth={2} strokeDasharray="6 3" dot={false} name="Trend (Revenue)" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Occupancy Donut ───────────────────────────

function OccupancyDonutChart({ occupied, available, reserved, maintenance }: { occupied: number; available: number; reserved: number; maintenance: number }) {
  const data = [
    { name: 'Terisi', value: occupied },
    { name: 'Kosong', value: available },
    { name: 'Dipesan', value: reserved },
    { name: 'Perbaikan', value: maintenance },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return <div className="text-muted text-center py-4">Tidak ada data kamar</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={64} dataKey="value" paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={OCCUPANCY_COLORS[index % OCCUPANCY_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 12, lineHeight: 1.8 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: OCCUPANCY_COLORS[i % OCCUPANCY_COLORS.length], display: 'inline-block' }} />
            <span style={{ color: '#64748b' }}>{d.name}:</span>
            <strong>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());
  const [trendMonths, setTrendMonths] = useState<number>(6);
  const [chartMode, setChartMode] = useState<TrendChartMode>('line');
  const [showBestFit, setShowBestFit] = useState<boolean>(true);

  const dashboard = useQuery({
    queryKey: ['owner-dashboard', ym, trendMonths],
    queryFn: () => fetchOwnerDashboard(ym.year, ym.month, trendMonths),
    staleTime: 60_000,
    retry: 1,
  });

  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const isError = dashboard.isError;

  const trendData = data?.trendMonths ?? data?.trend6Months ?? [];
  const grade = data ? gradeBadge(data.grade) : null;
  const revenueChange = data ? changeLabel(data.kpi.totalRevenueChangePercent) : null;
  const profitChange = data ? changeLabel(data.kpi.netProfitChangePercent) : null;
  const occupancyChange = data ? changeLabel(data.kpi.occupancyRateChangePercent) : null;
  const cashChange = data ? changeLabel(data.kpi.netCashFlowChangePercent) : null;

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) setYm((prev) => ({ ...prev, [field]: num }));
  };

  // Compute total rooms for occupancy donut
  // We don't have totalRooms in ownerDashboard response, so estimate from occupancy rate
  // Actually we can't compute donut without room counts. We'll show occupancy % as KPI card.
  // For a real donut we'd need backend to return roomStatus counts. Let's use the occupancy summary endpoint instead.
  // For now, show occupancy % in KPI card and donut just shows occupancy vs available approximation.

  return (
    <Container fluid className="owner-dashboard px-2 py-3">
      <style>{`
        .owner-dashboard .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: box-shadow 0.2s;
        }
        .owner-dashboard .kpi-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .owner-dashboard .kpi-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .owner-dashboard .kpi-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }
        .owner-dashboard .kpi-change {
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }
        .owner-dashboard .kpi-sub {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .owner-dashboard .signal-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .owner-dashboard .signal-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .owner-dashboard .signal-item:hover {
          background: #f8fafc;
        }
        .owner-dashboard .signal-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        .owner-dashboard .signal-content {
          flex-grow: 1;
        }
        .owner-dashboard .signal-content strong {
          display: block;
          font-size: 13px;
        }
        .owner-dashboard .signal-content span {
          font-size: 12px;
          color: #64748b;
        }
        .owner-dashboard .signal-arrow {
          font-size: 16px;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .owner-dashboard .range-pills {
          display: flex;
          gap: 4px;
        }
        .owner-dashboard .range-pill {
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          color: #64748b;
        }
        .owner-dashboard .range-pill.active {
          background: #3b82f6;
          color: #fff;
          border-color: #3b82f6;
        }
        .owner-dashboard .range-pill:hover:not(.active) {
          background: #f1f5f9;
        }
        .owner-dashboard .chart-toggle-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          color: #64748b;
        }
        .owner-dashboard .chart-toggle-btn.active {
          background: #3b82f6;
          color: #fff;
          border-color: #3b82f6;
        }
        .owner-dashboard .chart-toggle-btn:hover:not(.active) {
          background: #f1f5f9;
        }
        .owner-dashboard .chart-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .owner-dashboard .ai-narrative-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
      `}</style>

      {/* Header */}
      <section className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 className="mb-0" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard Owner</h1>
          <small className="text-muted">Ringkasan bisnis kost Anda</small>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-1">
            <Form.Label className="mb-0 small">Tahun</Form.Label>
            <Form.Control type="number" value={ym.year} min={2020} max={2100} onChange={(e) => handleChange('year', e.target.value)} style={{ width: 80, height: 32, fontSize: 13 }} />
          </div>
          <div className="d-flex align-items-center gap-1">
            <Form.Label className="mb-0 small">Bulan</Form.Label>
            <Form.Select value={ym.month} onChange={(e) => handleChange('month', e.target.value)} style={{ width: 120, height: 32, fontSize: 13 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </Form.Select>
          </div>
          <Button variant="light" size="sm" onClick={() => navigate('/reports')}>📊 Laporan Lengkap</Button>
        </div>
      </section>

      {/* Loading */}
      {isLoading && (
        <Card className="mb-3">
          <Card.Body className="text-center py-4"><Spinner animation="border" size="sm" /> <span className="ms-2">Memuat dashboard...</span></Card.Body>
        </Card>
      )}

      {/* Error */}
      {isError && (
        <Alert variant="warning" className="mb-3">
          ⚠️ Dashboard gagal dimuat. Pastikan backend API berjalan dan data transaksi tersedia.
          {dashboard.error && <div className="small mt-1">{(dashboard.error as any)?.message ?? ''}</div>}
        </Alert>
      )}

      {data && (
        <>
          {/* Grade & Headline */}
          {grade && (
            <Card className="mb-3" style={{ border: 'none', background: grade.bg }}>
              <Card.Body className="d-flex align-items-center gap-3 py-3">
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: grade.color, color: grade.bg, fontWeight: 700, fontSize: 13, lineHeight: 1.2, textAlign: 'center',
                }}>
                  {grade.label}
                </div>
                <div className="flex-grow-1">
                  <div style={{ fontWeight: 600, fontSize: 15, color: grade.color }}>{data.headline}</div>
                </div>
                <small className="text-muted flex-shrink-0">{monthLabel(ym)}</small>
              </Card.Body>
            </Card>
          )}

          {/* KPI Cards */}
          <Row className="g-3 mb-3">
            <Col xs={6} xl={3}>
              <Card className="kpi-card h-100">
                <Card.Body>
                  <div className="kpi-label">Pendapatan</div>
                  <div className="kpi-value">{formatCompactRupiah(data.kpi.totalRevenueRupiah)}</div>
                  {revenueChange && <div className="kpi-change" style={{ color: revenueChange.color }}>{revenueChange.icon} {revenueChange.label}</div>}
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} xl={3}>
              <Card className="kpi-card h-100">
                <Card.Body>
                  <div className="kpi-label">Laba Bersih</div>
                  <div className="kpi-value">{formatCompactRupiah(data.kpi.netProfitRupiah)}</div>
                  {profitChange && <div className="kpi-change" style={{ color: profitChange.color }}>{profitChange.icon} {profitChange.label}</div>}
                  <div className="kpi-sub">Margin {data.kpi.netProfitMarginPercent}%</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} xl={3}>
              <Card className="kpi-card h-100">
                <Card.Body>
                  <div className="kpi-label">Okupansi</div>
                  <div className="kpi-value">{data.kpi.occupancyRatePercent}%</div>
                  {occupancyChange && <div className="kpi-change" style={{ color: occupancyChange.color }}>{occupancyChange.icon} {occupancyChange.label}</div>}
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} xl={3}>
              <Card className="kpi-card h-100">
                <Card.Body>
                  <div className="kpi-label">Kas Bersih</div>
                  <div className="kpi-value">{formatCompactRupiah(data.kpi.netCashFlowRupiah)}</div>
                  {cashChange && <div className="kpi-change" style={{ color: cashChange.color }}>{cashChange.icon} {cashChange.label}</div>}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Signals + AI Widget */}
          <Row className="g-3 mb-3">
            {/* Signals */}
            <Col md={7}>
              <Card className="h-100">
                <Card.Header style={{ fontWeight: 600, fontSize: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  ⚠️ Butuh Perhatian
                  {data.signals.length === 0 && <Badge bg="success" className="ms-2">Aman</Badge>}
                </Card.Header>
                <Card.Body>
                  {data.signals.length === 0 ? (
                    <div className="text-muted small py-2">Tidak ada yang perlu ditindaklanjuti. Bisnis Anda dalam kondisi baik.</div>
                  ) : (
                    <div className="signal-list">
                      {data.signals.map((s, i) => (
                        <div key={i} className="signal-item" onClick={() => navigate(s.route)}>
                          <div className="signal-icon">
                            {s.type === 'overdue' ? '🔴' : s.type === 'pending_payment' ? '🟡' : '🟠'}
                          </div>
                          <div className="signal-content">
                            <strong>
                              {s.type === 'overdue' ? 'Tagihan Overdue' : s.type === 'pending_payment' ? 'Pembayaran Pending' : 'Tagihan Outstanding'}
                            </strong>
                            <span>
                              {s.count} item{s.totalRupiah ? ` — Rp ${formatRupiah(s.totalRupiah)}` : ''}
                            </span>
                          </div>
                          <div className="signal-arrow">→</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* AI Widget */}
            <Col md={5}>
              <Card className="h-100">
                <Card.Header style={{ fontWeight: 600, fontSize: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  🧠 Analisis AI
                </Card.Header>
                <Card.Body className="d-flex flex-column">
                  <p className="text-muted small mb-2">Dapatkan narasi bisnis otomatis berdasarkan data bulan ini.</p>
                  <div className="mt-auto">
                    <AiAssistButton
                      label="Buat Analisis"
                      loadingLabel="Menganalisis..."
                      run={() => createBusinessNarrative({
                        period: monthLabel(ym),
                        metrics: {
                          score: data.score,
                          overdueRupiah: data.signals.find((s) => s.type === 'overdue')?.totalRupiah ?? 0,
                          pendingPaymentCount: data.signals.find((s) => s.type === 'pending_payment')?.count ?? 0,
                          occupancyRatePercent: data.kpi.occupancyRatePercent,
                        },
                      })}
                      renderResult={(result) => (
                        <Alert variant="light" className="mb-0 small" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="fw-semibold">{result.title}</div>
                          <div>{result.summary}</div>
                          {result.recommendations?.length > 0 && (
                            <ul className="mb-0 mt-2 ps-3">
                              {result.recommendations.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          )}
                        </Alert>
                      )}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Trend Chart with Controls */}
          <Card className="mb-3">
            <Card.Header style={{ fontWeight: 600, fontSize: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>📈 Tren Revenue & Biaya</span>
                <div className="chart-controls">
                  <div className="range-pills">
                    {[1, 3, 6, 12].map((n) => (
                      <button
                        key={n}
                        className={`range-pill ${trendMonths === n ? 'active' : ''}`}
                        onClick={() => setTrendMonths(n)}
                      >
                        {n === 1 ? '1B' : n === 3 ? '3B' : n === 6 ? '6B' : '1Y'}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`chart-toggle-btn ${chartMode === 'line' ? 'active' : ''}`}
                    onClick={() => setChartMode('line')}
                  >
                    Line
                  </button>
                  <button
                    className={`chart-toggle-btn ${chartMode === 'bar' ? 'active' : ''}`}
                    onClick={() => setChartMode('bar')}
                  >
                    Bar
                  </button>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showBestFit} onChange={() => setShowBestFit(!showBestFit)} />
                    Trend
                  </label>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {trendData.length === 0 ? (
                <div className="text-muted text-center py-4">Data tren tidak tersedia</div>
              ) : (
                <TrendChart
                  data={trendData}
                  mode={chartMode}
                  showBestFit={showBestFit}
                  onToggleMode={() => setChartMode(chartMode === 'line' ? 'bar' : 'line')}
                  onToggleBestFit={() => setShowBestFit(!showBestFit)}
                />
              )}
              <div className="d-flex gap-3 justify-content-center mt-2" style={{ fontSize: 12, color: '#64748b' }}>
                <span><span style={{ color: '#3b82f6' }}>━</span> Revenue</span>
                <span><span style={{ color: '#f97316' }}>━</span> Expense</span>
                <span><span style={{ color: '#22c55e' }}>━</span> Laba Bersih</span>
                {showBestFit && <span><span style={{ color: '#8b5cf6', borderTop: '2px dashed #8b5cf6', padding: '0 8px' }}>Trend</span></span>}
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}