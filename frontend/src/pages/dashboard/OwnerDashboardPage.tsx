import React, { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchOwnerDashboard, type OwnerDashboard, type OwnerDashboardTrendMonth } from '../../api/finance';
import { createBusinessNarrative } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';

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
    case 'SEHAT': return { label: 'SEHAT', color: '#166534', bg: '#dcfce7' };
    case 'PERHATIAN': return { label: 'PERHATIAN', color: '#854d0e', bg: '#fef9c3' };
    case 'RISIKO': return { label: 'RISIKO', color: '#9a3412', bg: '#ffedd5' };
    default: return { label: 'KRITIS', color: '#991b1b', bg: '#fee2e2' };
  }
}

function TrendMiniChart({ data }: { data: OwnerDashboardTrendMonth[] }) {
  if (!data || data.length === 0) return null;
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const maxExpense = Math.max(...data.map((d) => d.expense), 1);
  const maxVal = Math.max(maxRevenue, maxExpense, 1);

  return (
    <div className="trend-chart">
      <div className="trend-header">
        {data.map((d) => (
          <div key={`${d.year}-${d.month}`} className="trend-col">
            <div className="trend-label">{new Date(d.year, d.month - 1).toLocaleString('id-ID', { month: 'short' })}</div>
            <div className="trend-bars">
              <div className="trend-bar revenue" style={{ height: `${(d.revenue / maxVal) * 100}%` }} title={`Revenue: Rp ${formatRupiah(d.revenue)}`} />
              <div className="trend-bar expense" style={{ height: `${(d.expense / maxVal) * 100}%` }} title={`Expense: Rp ${formatRupiah(d.expense)}`} />
            </div>
            <div className="trend-value">{formatCompactRupiah(d.netProfit)}</div>
          </div>
        ))}
      </div>
      <div className="trend-legend">
        <span><i className="legend-dot revenue" /> Revenue</span>
        <span><i className="legend-dot expense" /> Expense</span>
        <span className="text-muted" style={{ fontSize: 11 }}>Nilai = laba bersih</span>
      </div>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());

  const dashboard = useQuery({
    queryKey: ['owner-dashboard', ym],
    queryFn: () => fetchOwnerDashboard(ym.year, ym.month),
    staleTime: 60_000,
    retry: 1,
  });

  const data = dashboard.data;
  const isLoading = dashboard.isLoading;
  const isError = dashboard.isError;

  const grade = data ? gradeBadge(data.grade) : null;
  const revenueChange = data ? changeLabel(data.kpi.totalRevenueChangePercent) : null;
  const profitChange = data ? changeLabel(data.kpi.netProfitChangePercent) : null;
  const occupancyChange = data ? changeLabel(data.kpi.occupancyRateChangePercent) : null;
  const cashChange = data ? changeLabel(data.kpi.netCashFlowChangePercent) : null;

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) setYm((prev) => ({ ...prev, [field]: num }));
  };

  return (
    <Container fluid className="owner-dashboard px-2 py-3">
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
                  background: grade.color, color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2, textAlign: 'center',
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

          {/* Trend 6 Months */}
          <Card className="mb-3">
            <Card.Header style={{ fontWeight: 600, fontSize: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              📈 Tren 6 Bulan Terakhir
            </Card.Header>
            <Card.Body>
              <TrendMiniChart data={data.trend6Months} />
            </Card.Body>
          </Card>
        </>
      )}

      {/* CSS Styles inline via inner style tag */}
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
        .owner-dashboard .trend-chart {
          padding: 8px 0;
        }
        .owner-dashboard .trend-header {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          gap: 8px;
          min-height: 140px;
        }
        .owner-dashboard .trend-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .owner-dashboard .trend-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }
        .owner-dashboard .trend-bars {
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 80px;
          width: 100%;
          justify-content: center;
        }
        .owner-dashboard .trend-bar {
          width: 14px;
          border-radius: 3px 3px 0 0;
          min-height: 4px;
          transition: height 0.3s;
        }
        .owner-dashboard .trend-bar.revenue {
          background: #3b82f6;
        }
        .owner-dashboard .trend-bar.expense {
          background: #f97316;
        }
        .owner-dashboard .trend-value {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
        }
        .owner-dashboard .trend-legend {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 12px;
          font-size: 12px;
          color: #64748b;
        }
        .owner-dashboard .legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          margin-right: 4px;
        }
        .owner-dashboard .legend-dot.revenue { background: #3b82f6; }
        .owner-dashboard .legend-dot.expense { background: #f97316; }
      `}</style>
    </Container>
  );
}