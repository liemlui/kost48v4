import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { generateCsv, downloadCsv } from '../../utils/csv';
import {
  fetchMonthlyIncome,
  fetchOverdueAging,
  fetchDepositLiability,
  fetchExpenseSummary,
  fetchCashFlow,
  fetchProfitLoss,
  fetchFinancialRatios,
  fetchOccupancy,
  MonthlyIncome,
  OverdueAging,
  DepositLiability,
  ExpenseSummary,
  CashFlow,
  ProfitLoss,
  FinancialRatios,
  Occupancy,
} from '../../api/reports';
import { fetchBalanceSheetDraft, fetchFormalRatiosReadiness, type BalanceSheetDraft, type FinanceReadiness } from '../../api/finance';
import { createBusinessNarrative } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';

type HealthLevel = 'Baik' | 'Perlu Dipantau' | 'Buruk';
type CashFlowStatus = 'Positif' | 'Netral' | 'Negatif';
type OverallStatus = 'Sehat' | 'Perlu Dipantau' | 'Bermasalah';
type ReportTab = 'command' | 'finance' | 'aging' | 'operations' | 'formal';
const reportTabs: ReportTab[] = ['command', 'finance', 'aging', 'operations', 'formal'];
function normalizeReportTab(value: string | null): ReportTab {
  return reportTabs.includes(value as ReportTab) ? (value as ReportTab) : 'command';
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  RENT_BUILDING: 'Sewa Gedung',
  SALARY: 'Gaji',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  INTERNET: 'Internet',
  MAINTENANCE: 'Perawatan',
  CLEANING: 'Kebersihan',
  SUPPLIES: 'Perlengkapan',
  TAX: 'Pajak',
  MARKETING: 'Marketing',
  OTHER: 'Lainnya',
};

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

function currentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(ym: { year: number; month: number }) {
  return new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function collectionRateLabel(value: number): { label: HealthLevel; color: string; tone: string } {
  if (value >= 90) return { label: 'Baik', color: 'success', tone: 'good' };
  if (value >= 70) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch' };
  return { label: 'Buruk', color: 'danger', tone: 'bad' };
}
function netProfitMarginLabel(value: number): { label: HealthLevel; color: string; tone: string } {
  if (value >= 40) return { label: 'Baik', color: 'success', tone: 'good' };
  if (value >= 20) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch' };
  return { label: 'Buruk', color: 'danger', tone: 'bad' };
}
function expenseRatioLabel(value: number): { label: HealthLevel; color: string; tone: string } {
  if (value <= 40) return { label: 'Baik', color: 'success', tone: 'good' };
  if (value <= 60) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch' };
  return { label: 'Buruk', color: 'danger', tone: 'bad' };
}
function occupancyRateLabel(value: number): { label: HealthLevel; color: string; tone: string } {
  if (value >= 85) return { label: 'Baik', color: 'success', tone: 'good' };
  if (value >= 60) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch' };
  return { label: 'Buruk', color: 'danger', tone: 'bad' };
}
function overdueRateLabel(value: number): { label: HealthLevel; color: string; tone: string } {
  if (value <= 10) return { label: 'Baik', color: 'success', tone: 'good' };
  if (value <= 25) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch' };
  return { label: 'Buruk', color: 'danger', tone: 'bad' };
}
function cashFlowLabel(value: number): { label: CashFlowStatus; color: string; tone: string } {
  if (value > 0) return { label: 'Positif', color: 'success', tone: 'good' };
  if (value === 0) return { label: 'Netral', color: 'secondary', tone: 'watch' };
  return { label: 'Negatif', color: 'danger', tone: 'bad' };
}

function getOverallStatus(financialRatios: FinancialRatios, profitLoss: ProfitLoss, occupancy: Occupancy, cashFlow: CashFlow): { label: OverallStatus; color: string; tone: string; headline: string } {
  const colRate = collectionRateLabel(financialRatios.collectionRatePercent);
  const npmLabel = netProfitMarginLabel(profitLoss.netProfitMarginPercent);
  const expLabel = expenseRatioLabel(financialRatios.expenseRatioPercent);
  const occLabel = occupancyRateLabel(occupancy.occupancyRatePercent);
  const ovdLabel = overdueRateLabel(financialRatios.overdueRateSnapshotPercent);
  const isBad = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Buruk') || cashFlow.netCashFlowRupiah < 0;
  const isWatch = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Perlu Dipantau');
  if (isBad) return { label: 'Bermasalah', color: 'danger', tone: 'bad', headline: 'Butuh tindakan cepat' };
  if (isWatch) return { label: 'Perlu Dipantau', color: 'warning', tone: 'watch', headline: 'Ada indikator yang perlu dijaga' };
  return { label: 'Sehat', color: 'success', tone: 'good', headline: 'Operasional terlihat stabil' };
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());
  const [activeTab, setActiveTab] = useState<ReportTab>(() => normalizeReportTab(searchParams.get('tab')));
  const changeTab = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', tab);
      return next;
    });
  };

  const monthlyIncome = useQuery({ queryKey: ['reports', 'monthly-income', ym], queryFn: () => fetchMonthlyIncome(ym.year, ym.month) });
  const overdueAging = useQuery({ queryKey: ['reports', 'overdue-aging'], queryFn: () => fetchOverdueAging() });
  const depositLiability = useQuery({ queryKey: ['reports', 'deposit-liability'], queryFn: () => fetchDepositLiability() });
  const expenseSummary = useQuery({ queryKey: ['reports', 'expense-summary', ym], queryFn: () => fetchExpenseSummary(ym.year, ym.month) });
  const cashFlow = useQuery({ queryKey: ['reports', 'cash-flow', ym], queryFn: () => fetchCashFlow(ym.year, ym.month) });
  const profitLoss = useQuery({ queryKey: ['reports', 'profit-loss', ym], queryFn: () => fetchProfitLoss(ym.year, ym.month) });
  const financialRatios = useQuery({ queryKey: ['reports', 'financial-ratios', ym], queryFn: () => fetchFinancialRatios(ym.year, ym.month) });
  const occupancy = useQuery({ queryKey: ['reports', 'occupancy', ym], queryFn: () => fetchOccupancy(ym.year, ym.month) });
  const financeReadiness = useQuery({ queryKey: ['finance', 'formal-readiness'], queryFn: () => fetchFormalRatiosReadiness(), staleTime: 120_000, retry: 1 });
  const balanceSheetDraft = useQuery({ queryKey: ['finance', 'balance-sheet-draft', ym], queryFn: () => fetchBalanceSheetDraft(ym.year, ym.month), staleTime: 120_000, retry: 1 });

  const reportQueries = [monthlyIncome, overdueAging, depositLiability, expenseSummary, cashFlow, profitLoss, financialRatios, occupancy];
  const isLoading = reportQueries.some((q) => q.isLoading);
  const hasError = reportQueries.some((q) => q.isError);
  const allDataReady = reportQueries.every((q) => q.data !== undefined && !q.isError);

  const overall = useMemo(() => {
    if (!financialRatios.data || !profitLoss.data || !occupancy.data || !cashFlow.data) return null;
    return getOverallStatus(financialRatios.data, profitLoss.data, occupancy.data, cashFlow.data);
  }, [financialRatios.data, profitLoss.data, occupancy.data, cashFlow.data]);

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) setYm((prev) => ({ ...prev, [field]: num }));
  };

  return (
    <Container fluid className="reports-command-page px-2 py-3">
      <section className="report-hero mb-3">
        <div>
          <div className="report-eyebrow">OWNER INTELLIGENCE CENTER</div>
          <h1>Laporan Operasional & Keuangan</h1>
          <p>Drill-down dari dashboard: revenue, cashflow, aging tunggakan, deposit, okupansi, margin, dan kesiapan balance sheet.</p>
        </div>
        <div className="report-hero-controls">
          <div className="report-period-card">
            <Form.Label>Tahun</Form.Label>
            <Form.Control type="number" value={ym.year} min={2020} max={2100} onChange={(e) => handleChange('year', e.target.value)} />
          </div>
          <div className="report-period-card">
            <Form.Label>Bulan</Form.Label>
            <Form.Select value={ym.month} onChange={(e) => handleChange('month', e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </Form.Select>
          </div>
          <ExportAllCsvButton
            ym={ym}
            monthlyIncome={monthlyIncome}
            cashFlow={cashFlow}
            overdueAging={overdueAging}
            depositLiability={depositLiability}
            expenseSummary={expenseSummary}
            profitLoss={profitLoss}
            financialRatios={financialRatios}
            occupancy={occupancy}
          />
        </div>
      </section>

      {isLoading && (
        <Card className="report-glass-card mb-3">
          <Card.Body className="text-center py-4"><Spinner animation="border" size="sm" /> <span className="ms-2">Memuat data analytics...</span></Card.Body>
        </Card>
      )}

      {hasError && (
        <Card className="report-warning-card mb-3">
          <Card.Body>⚠️ Sebagian data laporan gagal dimuat. Cek backend report endpoint sebelum mengambil keputusan bisnis.</Card.Body>
        </Card>
      )}

      {allDataReady && (
        <>
          <section className="report-command-grid mb-3">
            <div className={`report-command-status report-tone-${overall?.tone ?? 'watch'}`}>
              <span className="report-status-label">STATUS BULAN INI</span>
              <strong>{overall?.label ?? 'Memuat'}</strong>
              <small>{overall?.headline ?? 'Menunggu data'}</small>
            </div>
            <ReportKpiCard label="Total Revenue" value={formatCompactRupiah(profitLoss.data!.totalRevenueRupiah)} detail={`Invoice ${formatCompactRupiah(profitLoss.data!.invoiceRevenueRupiah)} + WiFi ${formatCompactRupiah(profitLoss.data!.wifiRevenueRupiah)}`} tone="blue" />
            <ReportKpiCard label="Net Cashflow" value={formatCompactRupiah(cashFlow.data!.netCashFlowRupiah)} detail={`In ${formatCompactRupiah(cashFlow.data!.cashIn.totalRupiah)} / Out ${formatCompactRupiah(cashFlow.data!.cashOut.totalRupiah)}`} tone={cashFlow.data!.netCashFlowRupiah >= 0 ? 'green' : 'red'} />
            <ReportKpiCard label="Outstanding" value={formatCompactRupiah(monthlyIncome.data!.outstandingRupiah)} detail={`${monthlyIncome.data!.unpaidInvoiceCount} belum bayar · ${monthlyIncome.data!.partialInvoiceCount} partial`} tone={monthlyIncome.data!.outstandingRupiah > 0 ? 'orange' : 'green'} />
            <ReportKpiCard label="Okupansi" value={`${occupancy.data!.occupancyRatePercent}%`} detail={`${occupancy.data!.occupiedRooms}/${occupancy.data!.totalOperableRooms} kamar terisi`} tone="cyan" />
          </section>

          <Row className="g-3 mb-3">
            <Col xl={5} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header>
                  <span>Revenue Radar</span>
                  <Badge bg="primary">{monthLabel(ym)}</Badge>
                </Card.Header>
                <Card.Body>
                  <RevenueRadar monthlyIncome={monthlyIncome.data!} cashFlow={cashFlow.data!} profitLoss={profitLoss.data!} />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={3} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header><span>Occupancy Core</span></Card.Header>
                <Card.Body>
                  <RingGauge percent={occupancy.data!.occupancyRatePercent} label="Okupansi" sublabel={`${occupancy.data!.occupiedRooms} dari ${occupancy.data!.totalOperableRooms} kamar`} />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4}>
              <Card className="report-panel h-100">
                <Card.Header><span>Aging Heatmap</span><Badge bg="danger">Risk</Badge></Card.Header>
                <Card.Body>
                  <OverdueHeatmap data={overdueAging.data!} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <ReportTabs activeTab={activeTab} onChange={changeTab} counts={{ overdue: overdueAging.data!.totalOverdueCount, invoices: monthlyIncome.data!.invoiceCount, rooms: occupancy.data!.totalOperableRooms }} />

          {activeTab === 'command' && (
            <Row className="g-3">
              <Col xl={7}>
                <Card className="report-panel h-100">
                  <Card.Header><span>Financial Health Matrix</span><Badge bg={overall?.color ?? 'secondary'}>{overall?.label}</Badge></Card.Header>
                  <Card.Body className="p-0"><OwnerHealthMatrix financialRatios={financialRatios.data!} profitLoss={profitLoss.data!} occupancy={occupancy.data!} cashFlow={cashFlow.data!} /></Card.Body>
                </Card>
              </Col>
              <Col xl={5}>
                <Card className="report-panel h-100">
                  <Card.Header><span>Executive Signal</span><Badge bg="info">AI-ready</Badge></Card.Header>
                  <Card.Body>
                    <InsightStack monthlyIncome={monthlyIncome.data!} cashFlow={cashFlow.data!} overdueAging={overdueAging.data!} occupancy={occupancy.data!} financialRatios={financialRatios.data!} />
                    <div className="mt-3">
                      <AiAssistButton
                        label="Buat Narasi Bisnis"
                        loadingLabel="Membuat narasi..."
                        run={() => createBusinessNarrative({
                          period: monthLabel(ym),
                          metrics: {
                            score: overall?.label === 'Sehat' ? 90 : overall?.label === 'Perlu Dipantau' ? 72 : 55,
                            overdueRupiah: overdueAging.data!.totalOverdueRupiah,
                            pendingPaymentCount: monthlyIncome.data!.unpaidInvoiceCount + monthlyIncome.data!.partialInvoiceCount,
                            occupancyRatePercent: occupancy.data!.occupancyRatePercent,
                          },
                        })}
                        renderResult={(result) => (
                          <Alert variant="light" className="mb-0 small">
                            <div className="fw-semibold">{result.title}</div>
                            <div>{result.summary}</div>
                            {result.recommendations?.length ? <ul className="mb-0 mt-2 ps-3">{result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                          </Alert>
                        )}
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {activeTab === 'finance' && (
            <Row className="g-3">
              <Col xl={6}><ReportSection title="Pendapatan Bulanan" badge={monthLabel(ym)}><MonthlyIncomeTable data={monthlyIncome.data!} /></ReportSection></Col>
              <Col xl={6}><ReportSection title="Arus Kas" badge={cashFlow.data!.netCashFlowRupiah >= 0 ? 'Positive' : 'Negative'}><CashFlowTable data={cashFlow.data!} /></ReportSection></Col>
              <Col xl={6}><ReportSection title="Profit & Loss" badge={`${profitLoss.data!.netProfitMarginPercent}% margin`}><ProfitLossTable data={profitLoss.data!} /></ReportSection></Col>
              <Col xl={6}><ReportSection title="Expense Split" badge={`${expenseSummary.data!.categories.length} kategori`}><ExpenseSummaryVisual data={expenseSummary.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'aging' && (
            <Row className="g-3">
              <Col xl={7}><ReportSection title="Aging Tunggakan" badge={`Per ${overdueAging.data!.asOf}`}><OverdueAgingTable data={overdueAging.data!} /></ReportSection></Col>
              <Col xl={5}><ReportSection title="Liabilitas Deposit" badge={`${depositLiability.data!.activeStayCount} stay`}><DepositLiabilityVisual data={depositLiability.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'operations' && (
            <Row className="g-3">
              <Col xl={5}><ReportSection title="Okupansi & Revenue per Room" badge={`${occupancy.data!.occupancyRatePercent}%`}><OccupancyTable data={occupancy.data!} /></ReportSection></Col>
              <Col xl={7}><ReportSection title="Operational Command Bars" badge="Snapshot"><OperationsBars occupancy={occupancy.data!} monthlyIncome={monthlyIncome.data!} depositLiability={depositLiability.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'formal' && <LockedFormalRatios readiness={financeReadiness.data} balanceSheetDraft={balanceSheetDraft.data} isBackendUnavailable={financeReadiness.isError || balanceSheetDraft.isError} />}
        </>
      )}
    </Container>
  );
}

function ReportKpiCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'blue' | 'cyan' | 'green' | 'orange' | 'red' }) {
  return (
    <div className={`report-kpi-card report-kpi-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ReportTabs({ activeTab, onChange, counts }: { activeTab: ReportTab; onChange: (tab: ReportTab) => void; counts: { invoices: number; overdue: number; rooms: number } }) {
  const tabs: { key: ReportTab; label: string; badge?: number | string }[] = [
    { key: 'command', label: 'Command Center', badge: 'Live' },
    { key: 'finance', label: 'Finance', badge: counts.invoices },
    { key: 'aging', label: 'Aging & Deposit', badge: counts.overdue },
    { key: 'operations', label: 'Operations', badge: counts.rooms },
    { key: 'formal', label: 'Formal Ratios', badge: 'Locked' },
  ];
  return (
    <div className="report-tabbar mb-3">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => onChange(tab.key)}>
          <span>{tab.label}</span>
          {tab.badge !== undefined && <em>{tab.badge}</em>}
        </button>
      ))}
    </div>
  );
}

function ReportSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card className="report-panel h-100">
      <Card.Header>
        <span>{title}</span>
        {badge && <Badge bg="primary">{badge}</Badge>}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}

function RingGauge({ percent, label, sublabel }: { percent: number; label: string; sublabel: string }) {
  const p = clampPercent(percent);
  return (
    <div className="report-ring-wrap">
      <div className="report-ring" style={{ background: `conic-gradient(#38bdf8 ${p}%, rgba(148, 163, 184, 0.18) 0)` }}>
        <div className="report-ring-inner"><strong>{p}%</strong><span>{label}</span></div>
      </div>
      <p className="mb-0 text-center text-muted small">{sublabel}</p>
    </div>
  );
}

function RevenueRadar({ monthlyIncome, cashFlow, profitLoss }: { monthlyIncome: MonthlyIncome; cashFlow: CashFlow; profitLoss: ProfitLoss }) {
  const rows = [
    { label: 'Tagihan', value: monthlyIncome.totalBilledRupiah, tone: 'blue' },
    { label: 'Dibayar', value: monthlyIncome.totalPaidRupiah, tone: 'green' },
    { label: 'WiFi', value: monthlyIncome.totalWifiRevenueRupiah, tone: 'cyan' },
    { label: 'Expense', value: profitLoss.totalExpenseRupiah, tone: 'orange' },
    { label: 'Net CF', value: Math.max(0, cashFlow.netCashFlowRupiah), tone: 'purple' },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="report-radar-bars">
      {rows.map((row) => (
        <div className="report-radar-row" key={row.label}>
          <div><strong>{row.label}</strong><span>{formatCompactRupiah(row.value)}</span></div>
          <div className="report-radar-track"><i className={`tone-${row.tone}`} style={{ width: `${Math.max(5, (row.value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function OverdueHeatmap({ data }: { data: OverdueAging }) {
  const buckets = [
    { label: 'Current', count: data.buckets.current.count, value: data.buckets.current.totalRupiah, tone: 'good' },
    { label: '1–30', count: data.buckets.days1to30.count, value: data.buckets.days1to30.totalRupiah, tone: 'watch' },
    { label: '31–60', count: data.buckets.days31to60.count, value: data.buckets.days31to60.totalRupiah, tone: 'watch' },
    { label: '61–90', count: data.buckets.days61to90.count, value: data.buckets.days61to90.totalRupiah, tone: 'bad' },
    { label: '91+', count: data.buckets.days91plus.count, value: data.buckets.days91plus.totalRupiah, tone: 'critical' },
  ];
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <div className="report-heatmap">
      {buckets.map((bucket) => (
        <div key={bucket.label} className={`report-heat-cell heat-${bucket.tone}`} style={{ minHeight: `${70 + (bucket.value / max) * 80}px` }}>
          <span>{bucket.label}</span>
          <strong>{bucket.count}</strong>
          <small>{formatCompactRupiah(bucket.value)}</small>
        </div>
      ))}
    </div>
  );
}

function OwnerHealthMatrix({ financialRatios, profitLoss, occupancy, cashFlow }: { financialRatios: FinancialRatios; profitLoss: ProfitLoss; occupancy: Occupancy; cashFlow: CashFlow }) {
  const rows = [
    { label: 'Collection Rate', value: financialRatios.collectionRatePercent, suffix: '%', note: 'Pembayaran / tagihan', meta: collectionRateLabel(financialRatios.collectionRatePercent) },
    { label: 'Net Profit Margin', value: profitLoss.netProfitMarginPercent, suffix: '%', note: 'Laba bersih / revenue', meta: netProfitMarginLabel(profitLoss.netProfitMarginPercent) },
    { label: 'Expense Ratio', value: financialRatios.expenseRatioPercent, suffix: '%', note: 'Expense / revenue', meta: expenseRatioLabel(financialRatios.expenseRatioPercent) },
    { label: 'Occupancy Rate', value: occupancy.occupancyRatePercent, suffix: '%', note: 'Kamar terisi', meta: occupancyRateLabel(occupancy.occupancyRatePercent) },
    { label: 'Overdue Rate', value: financialRatios.overdueRateSnapshotPercent, suffix: '%', note: 'Tunggakan snapshot', meta: overdueRateLabel(financialRatios.overdueRateSnapshotPercent) },
  ];
  const cf = cashFlowLabel(cashFlow.netCashFlowRupiah);
  return (
    <div className="report-matrix">
      {rows.map((row) => (
        <div className="report-matrix-row" key={row.label}>
          <div><strong>{row.label}</strong><span>{row.note}</span></div>
          <div className="report-matrix-meter"><i className={`meter-${row.meta.tone}`} style={{ width: `${clampPercent(row.value)}%` }} /></div>
          <div className="report-matrix-value"><strong>{row.value}{row.suffix}</strong><Badge bg={row.meta.color}>{row.meta.label}</Badge></div>
        </div>
      ))}
      <div className="report-matrix-row">
        <div><strong>Net Cashflow</strong><span>Kas masuk - kas keluar</span></div>
        <div className="report-matrix-meter"><i className={`meter-${cf.tone}`} style={{ width: `${cashFlow.netCashFlowRupiah > 0 ? 100 : 35}%` }} /></div>
        <div className="report-matrix-value"><strong>{formatCompactRupiah(cashFlow.netCashFlowRupiah)}</strong><Badge bg={cf.color}>{cf.label}</Badge></div>
      </div>
    </div>
  );
}

function InsightStack({ monthlyIncome, cashFlow, overdueAging, occupancy, financialRatios }: { monthlyIncome: MonthlyIncome; cashFlow: CashFlow; overdueAging: OverdueAging; occupancy: Occupancy; financialRatios: FinancialRatios }) {
  const insights = [
    {
      title: monthlyIncome.outstandingRupiah > 0 ? 'Outstanding perlu dikejar' : 'Outstanding bersih',
      body: monthlyIncome.outstandingRupiah > 0 ? `${formatCompactRupiah(monthlyIncome.outstandingRupiah)} belum masuk kas.` : 'Tidak ada outstanding pada laporan bulan ini.',
      tone: monthlyIncome.outstandingRupiah > 0 ? 'watch' : 'good',
    },
    {
      title: cashFlow.netCashFlowRupiah >= 0 ? 'Cashflow positif' : 'Cashflow negatif',
      body: `Net cashflow ${formatCompactRupiah(cashFlow.netCashFlowRupiah)} dari operasional bulan ini.`,
      tone: cashFlow.netCashFlowRupiah >= 0 ? 'good' : 'bad',
    },
    {
      title: overdueAging.totalOverdueCount > 0 ? 'Ada aging tunggakan' : 'Aging aman',
      body: `${overdueAging.totalOverdueCount} invoice overdue senilai ${formatCompactRupiah(overdueAging.totalOverdueRupiah)}.`,
      tone: overdueAging.totalOverdueCount > 0 ? 'bad' : 'good',
    },
    {
      title: occupancy.occupancyRatePercent >= 85 ? 'Okupansi kuat' : 'Okupansi bisa ditingkatkan',
      body: `${occupancy.occupancyRatePercent}% okupansi. ${financialRatios.occupancyRateNote}`,
      tone: occupancy.occupancyRatePercent >= 85 ? 'good' : 'watch',
    },
  ];
  return <div className="report-insight-stack">{insights.map((item) => <div key={item.title} className={`report-insight insight-${item.tone}`}><strong>{item.title}</strong><span>{item.body}</span></div>)}</div>;
}

function ExpenseSummaryVisual({ data }: { data: ExpenseSummary }) {
  const max = Math.max(...data.categories.map((c) => c.totalRupiah), 1);
  return (
    <>
      <div className="report-total-chip mb-3"><span>Total Pengeluaran</span><strong>{formatCompactRupiah(data.totalExpenseRupiah)}</strong></div>
      <div className="report-split-list">
        {data.categories.map((c) => (
          <div key={c.category} className="report-split-row">
            <div><strong>{EXPENSE_CATEGORY_LABELS[c.category] ?? c.category}</strong><span>{c.count} transaksi</span></div>
            <div className="report-split-track"><i style={{ width: `${Math.max(4, (c.totalRupiah / max) * 100)}%` }} /></div>
            <strong>{formatCompactRupiah(c.totalRupiah)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

function DepositLiabilityVisual({ data }: { data: DepositLiability }) {
  const paidPct = data.totalDepositAmountRupiah > 0 ? (data.totalDepositPaidRupiah / data.totalDepositAmountRupiah) * 100 : 0;
  return (
    <div>
      <RingGauge percent={Math.round(paidPct)} label="Deposit Paid" sublabel={`${data.fullyPaidCount} lunas · ${data.unpaidCount} belum bayar`} />
      <DepositLiabilityTable data={data} />
    </div>
  );
}

function OperationsBars({ occupancy, monthlyIncome, depositLiability }: { occupancy: Occupancy; monthlyIncome: MonthlyIncome; depositLiability: DepositLiability }) {
  const rows = [
    { label: 'Occupancy', value: occupancy.occupancyRatePercent, suffix: '%' },
    { label: 'Invoice Paid', value: monthlyIncome.invoiceCount > 0 ? (monthlyIncome.paidInvoiceCount / monthlyIncome.invoiceCount) * 100 : 0, suffix: '%' },
    { label: 'Deposit Fully Paid', value: depositLiability.activeStayCount > 0 ? (depositLiability.fullyPaidCount / depositLiability.activeStayCount) * 100 : 0, suffix: '%' },
  ];
  return (
    <div className="report-operation-bars">
      {rows.map((row) => <div key={row.label}><div className="d-flex justify-content-between"><strong>{row.label}</strong><span>{Math.round(row.value)}{row.suffix}</span></div><div className="report-radar-track"><i className="tone-blue" style={{ width: `${clampPercent(row.value)}%` }} /></div></div>)}
    </div>
  );
}

interface ReportQueryState { isLoading: boolean; isError: boolean; data?: unknown; }
function allReady(queries: ReportQueryState[]): boolean { return queries.every((q) => !q.isLoading && !q.isError && q.data !== undefined); }

function buildOwnerReportsCsv(params: { ym: { year: number; month: number }; monthlyIncome: MonthlyIncome; cashFlow: CashFlow; overdueAging: OverdueAging; depositLiability: DepositLiability; expenseSummary: ExpenseSummary; profitLoss: ProfitLoss; financialRatios: FinancialRatios; occupancy: Occupancy; }): string {
  const { ym, monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy } = params;
  const label = monthLabel(ym);
  const lines: string[] = [];
  lines.push(generateCsv([
    ['KOST48 Owner Report', label],
    ['Total Revenue', `Rp ${formatRupiah(profitLoss.totalRevenueRupiah)}`],
    ['Net Profit', `Rp ${formatRupiah(profitLoss.netProfitRupiah)}`],
    ['Net Cashflow', `Rp ${formatRupiah(cashFlow.netCashFlowRupiah)}`],
    ['Collection Rate', `${financialRatios.collectionRatePercent}%`],
    ['Occupancy Rate', `${occupancy.occupancyRatePercent}%`],
    ['Overdue Total', `Rp ${formatRupiah(overdueAging.totalOverdueRupiah)}`],
    ['Deposit Outstanding', `Rp ${formatRupiah(depositLiability.totalDepositOutstandingRupiah)}`],
    [''],
  ]));
  lines.push(generateCsv([
    ['Pendapatan Bulanan'], ['Total Tagihan', `Rp ${formatRupiah(monthlyIncome.totalBilledRupiah)}`], ['Total Dibayar', `Rp ${formatRupiah(monthlyIncome.totalPaidRupiah)}`], ['WiFi', `Rp ${formatRupiah(monthlyIncome.totalWifiRevenueRupiah)}`], ['Outstanding', `Rp ${formatRupiah(monthlyIncome.outstandingRupiah)}`], ['']
  ]));
  lines.push(generateCsv([
    ['Expense Summary'], ['Kategori', 'Jumlah', 'Rupiah'], ...expenseSummary.categories.map((c) => [EXPENSE_CATEGORY_LABELS[c.category] ?? c.category, String(c.count), `Rp ${formatRupiah(c.totalRupiah)}`]), ['Total', '', `Rp ${formatRupiah(expenseSummary.totalExpenseRupiah)}`], ['']
  ]));
  lines.push(generateCsv([
    ['Aging Tunggakan'], ['Bucket', 'Count', 'Rupiah'], ['Current', String(overdueAging.buckets.current.count), `Rp ${formatRupiah(overdueAging.buckets.current.totalRupiah)}`], ['1-30', String(overdueAging.buckets.days1to30.count), `Rp ${formatRupiah(overdueAging.buckets.days1to30.totalRupiah)}`], ['31-60', String(overdueAging.buckets.days31to60.count), `Rp ${formatRupiah(overdueAging.buckets.days31to60.totalRupiah)}`], ['61-90', String(overdueAging.buckets.days61to90.count), `Rp ${formatRupiah(overdueAging.buckets.days61to90.totalRupiah)}`], ['91+', String(overdueAging.buckets.days91plus.count), `Rp ${formatRupiah(overdueAging.buckets.days91plus.totalRupiah)}`]
  ]));
  return lines.join('\r\n');
}

function ExportAllCsvButton({ ym, monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy }: { ym: { year: number; month: number }; monthlyIncome: ReportQueryState & { data?: MonthlyIncome }; cashFlow: ReportQueryState & { data?: CashFlow }; overdueAging: ReportQueryState & { data?: OverdueAging }; depositLiability: ReportQueryState & { data?: DepositLiability }; expenseSummary: ReportQueryState & { data?: ExpenseSummary }; profitLoss: ReportQueryState & { data?: ProfitLoss }; financialRatios: ReportQueryState & { data?: FinancialRatios }; occupancy: ReportQueryState & { data?: Occupancy }; }) {
  const queries = [monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy];
  const ready = allReady(queries);
  const handleExport = useCallback(() => {
    if (!ready) return;
    const csv = buildOwnerReportsCsv({ ym, monthlyIncome: monthlyIncome.data!, cashFlow: cashFlow.data!, overdueAging: overdueAging.data!, depositLiability: depositLiability.data!, expenseSummary: expenseSummary.data!, profitLoss: profitLoss.data!, financialRatios: financialRatios.data!, occupancy: occupancy.data! });
    const mm = String(ym.month).padStart(2, '0');
    downloadCsv(csv, `kost48-owner-reports-${ym.year}-${mm}.csv`);
  }, [ready, ym, monthlyIncome.data, cashFlow.data, overdueAging.data, depositLiability.data, expenseSummary.data, profitLoss.data, financialRatios.data, occupancy.data]);
  return <Button variant="light" className="report-export-btn" size="sm" disabled={!ready} onClick={handleExport}>⬇ Export CSV</Button>;
}

function MonthlyIncomeTable({ data }: { data: MonthlyIncome }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Total Tagihan</td><td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td></tr><tr><td>Total Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalPaidRupiah)}</td></tr><tr><td>Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.totalWifiRevenueRupiah)}</td></tr><tr><td><strong>Outstanding</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.outstandingRupiah)}</strong></td></tr><tr><td>Jumlah Tagihan</td><td className="text-end">{data.invoiceCount}</td></tr><tr><td>Lunas</td><td className="text-end"><Badge bg="success">{data.paidInvoiceCount}</Badge></td></tr><tr><td>Partial</td><td className="text-end"><Badge bg="warning">{data.partialInvoiceCount}</Badge></td></tr><tr><td>Belum Bayar</td><td className="text-end"><Badge bg="danger">{data.unpaidInvoiceCount}</Badge></td></tr></tbody></Table>; }
function CashFlowTable({ data }: { data: CashFlow }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Kas Masuk</td><td className="text-end">Rp {formatRupiah(data.cashIn.totalRupiah)}</td></tr><tr><td>Pembayaran Invoice</td><td className="text-end">Rp {formatRupiah(data.cashIn.invoicePaymentsRupiah)}</td></tr><tr><td>Penjualan WiFi</td><td className="text-end">Rp {formatRupiah(data.cashIn.wifiSalesRupiah)}</td></tr><tr><td>Kas Keluar</td><td className="text-end">Rp {formatRupiah(data.cashOut.expensesRupiah)}</td></tr><tr><td><strong>Arus Kas Bersih</strong></td><td className={`text-end ${data.netCashFlowRupiah >= 0 ? 'text-success' : 'text-danger'}`}><strong>Rp {formatRupiah(data.netCashFlowRupiah)}</strong></td></tr></tbody></Table>; }
function OverdueAgingTable({ data }: { data: OverdueAging }) { const b = data.buckets; return <Table responsive bordered size="sm" className="mb-0 report-table"><thead><tr><th>Umur</th><th className="text-end">Jumlah</th><th className="text-end">Rupiah</th></tr></thead><tbody><tr><td>Current</td><td className="text-end">{b.current.count}</td><td className="text-end">Rp {formatRupiah(b.current.totalRupiah)}</td></tr><tr><td>1–30 hari</td><td className="text-end">{b.days1to30.count}</td><td className="text-end">Rp {formatRupiah(b.days1to30.totalRupiah)}</td></tr><tr><td>31–60 hari</td><td className="text-end">{b.days31to60.count}</td><td className="text-end">Rp {formatRupiah(b.days31to60.totalRupiah)}</td></tr><tr><td>61–90 hari</td><td className="text-end">{b.days61to90.count}</td><td className="text-end">Rp {formatRupiah(b.days61to90.totalRupiah)}</td></tr><tr><td>91+ hari</td><td className="text-end">{b.days91plus.count}</td><td className="text-end">Rp {formatRupiah(b.days91plus.totalRupiah)}</td></tr><tr><td><strong>Total Tunggakan</strong></td><td className="text-end"><strong>{data.totalOverdueCount}</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.totalOverdueRupiah)}</strong></td></tr></tbody></Table>; }
function DepositLiabilityTable({ data }: { data: DepositLiability }) { return <Table responsive bordered size="sm" className="mb-0 mt-3 report-table"><tbody><tr><td>Total Deposit Dinilai</td><td className="text-end">Rp {formatRupiah(data.totalDepositAmountRupiah)}</td></tr><tr><td>Sudah Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalDepositPaidRupiah)}</td></tr><tr><td><strong>Outstanding Deposit</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.totalDepositOutstandingRupiah)}</strong></td></tr><tr><td>Stay Aktif</td><td className="text-end">{data.activeStayCount}</td></tr><tr><td>Lunas / Partial / Belum</td><td className="text-end"><Badge bg="success">{data.fullyPaidCount}</Badge> <Badge bg="warning">{data.partiallyPaidCount}</Badge> <Badge bg="danger">{data.unpaidCount}</Badge></td></tr></tbody></Table>; }
function ProfitLossTable({ data }: { data: ProfitLoss }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Pendapatan Invoice</td><td className="text-end">Rp {formatRupiah(data.invoiceRevenueRupiah)}</td></tr><tr><td>Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.wifiRevenueRupiah)}</td></tr><tr><td>Total Pendapatan</td><td className="text-end">Rp {formatRupiah(data.totalRevenueRupiah)}</td></tr><tr><td>Total Pengeluaran</td><td className="text-end">Rp {formatRupiah(data.totalExpenseRupiah)}</td></tr><tr><td><strong>Laba/Rugi Bersih</strong></td><td className={`text-end ${data.netProfitRupiah >= 0 ? 'text-success' : 'text-danger'}`}><strong>Rp {formatRupiah(data.netProfitRupiah)}</strong></td></tr><tr><td>Net Profit Margin</td><td className="text-end"><strong>{data.netProfitMarginPercent}%</strong></td></tr></tbody></Table>; }
function OccupancyTable({ data }: { data: Occupancy }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Total Kamar Operasional</td><td className="text-end"><strong>{data.totalOperableRooms}</strong></td></tr><tr><td>Kamar Terisi</td><td className="text-end"><strong>{data.occupiedRooms}</strong></td></tr><tr><td>Tingkat Okupansi</td><td className="text-end"><strong>{data.occupancyRatePercent}%</strong></td></tr><tr><td>Total Tagihan Bulan Ini</td><td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td></tr><tr><td>Revenue per Kamar Terisi</td><td className="text-end"><strong>Rp {formatRupiah(data.revenuePerOccupiedRoomRupiah)}</strong></td></tr><tr><td colSpan={2} className="text-muted small">{data.occupancyNote}<br />{data.revenueNote}</td></tr></tbody></Table>; }

function LockedFormalRatios({ readiness: backendReadiness, balanceSheetDraft, isBackendUnavailable }: { readiness?: FinanceReadiness; balanceSheetDraft?: BalanceSheetDraft; isBackendUnavailable?: boolean }) {
  const ratios = [
    { name: 'Current Ratio', formula: 'Aset Lancar / Kewajiban Lancar', reason: 'Belum akurat karena kas/bank aktual dan current liabilities belum dimodelkan.' },
    { name: 'Acid-Test / Quick Ratio', formula: '(Aset Lancar - Inventory) / Kewajiban Lancar', reason: 'Belum akurat karena kas/bank, inventory, dan current liabilities belum dimodelkan.' },
    { name: 'ROCE', formula: 'EBIT / (Total Aset - Kewajiban Lancar)', reason: 'Belum akurat karena aset, depresiasi, dan capital employed belum dimodelkan.' },
    { name: 'Debt-to-Equity', formula: 'Total Kewajiban / Total Ekuitas', reason: 'Belum akurat karena utang jangka panjang, ekuitas, dan akumulasi laba belum dimodelkan.' },
  ];
  const readiness = [
    { label: 'Accounts receivable', state: 'Ready', note: 'Open invoice dapat menjadi kandidat piutang.' },
    { label: 'Deposit held liability', state: 'Ready', note: 'Deposit ditampilkan sebagai kewajiban, bukan pendapatan.' },
    { label: 'Cash / bank accounts', state: 'Locked', note: 'Belum ada sumber saldo kas/bank formal.' },
    { label: 'Equity / capital employed', state: 'Locked', note: 'Belum ada model ekuitas dan aset formal.' },
  ];
  const backendMissing = backendReadiness?.missing ?? [];
  const knownAssets = balanceSheetDraft?.totals?.knownAssetsRupiah ?? null;
  const knownLiabilities = balanceSheetDraft?.totals?.knownLiabilitiesRupiah ?? null;
  return (
    <Row className="g-3">
      <Col xl={5}>
        <Card className="report-panel h-100">
          <Card.Header><span>Balance Sheet Readiness</span><Badge bg="warning">Foundation</Badge></Card.Header>
          <Card.Body>
            <p className="text-muted small">Formal ratio tetap dikunci sampai Assets = Liabilities + Equity bisa dibangun dari data yang reliable.</p>
            {isBackendUnavailable ? <Alert variant="light" className="small">Backend finance readiness belum bisa diambil; memakai penjelasan frontend fallback.</Alert> : null}
            {balanceSheetDraft ? (
              <div className="report-readiness-snapshot mb-3">
                <div><span>Known assets</span><strong>{knownAssets === null ? '-' : formatCompactRupiah(knownAssets)}</strong></div>
                <div><span>Known liabilities</span><strong>{knownLiabilities === null ? '-' : formatCompactRupiah(knownLiabilities)}</strong></div>
                <small>{balanceSheetDraft.note}</small>
              </div>
            ) : null}
            <div className="readiness-mini-list">
              {readiness.map((item) => (
                <div key={item.label}>
                  <span>{item.state === 'Ready' ? '✅' : '🔒'}</span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
            {backendMissing.length ? (
              <div className="mt-3 small text-muted">
                <strong>Backend missing data:</strong> {backendMissing.join(', ')}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Col>
      <Col xl={7}>
        <Card className="report-panel h-100">
          <Card.Header><span>Formal Accounting Ratios</span><Badge bg="secondary">Data Locked</Badge></Card.Header>
          <Card.Body className="p-0"><Table responsive bordered size="sm" className="mb-0 report-table"><tbody>{ratios.map((r) => <tr key={r.name}><td style={{ width: 220 }}><strong>{r.name}</strong><br /><span className="text-muted small">{r.formula}</span></td><td><Badge bg="secondary" className="me-2">Belum Tersedia</Badge><span className="text-muted small">{r.reason}</span></td></tr>)}</tbody></Table></Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
