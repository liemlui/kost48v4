import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  fetchOccupancyDaily,
  MonthlyIncome,
  OverdueAging,
  DepositLiability,
  ExpenseSummary,
  CashFlow,
  ProfitLoss,
  FinancialRatios,
  Occupancy,
  OccupancyDaily,
} from '../../api/reports';
import UnlockedFormalReports from './UnlockedFormalReports';
import { fetchBalanceSheetDraft, fetchFormalRatiosReadiness, type BalanceSheetDraft, type FinanceReadiness } from '../../api/finance';
import { createBusinessNarrative } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import DonutGauge from '../../components/charts/DonutGauge';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';

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

function toLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function occupancyHeatmapRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
  const to = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
  return { from: toLocalDateOnly(from), to: toLocalDateOnly(to) };
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
  const heatmapRange = useMemo(occupancyHeatmapRange, []);
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
  const occupancyDaily = useQuery({
    queryKey: ['reports', 'occupancy-daily', heatmapRange],
    queryFn: () => fetchOccupancyDaily(heatmapRange.from, heatmapRange.to),
    staleTime: 5 * 60_000,
  });
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
          <div className="report-eyebrow">Laporan bisnis</div>
          <h1>Keuangan dan Operasional</h1>
          <p>Ringkasan pendapatan, arus kas, piutang, deposit, okupansi, margin laba, dan posisi keuangan.</p>
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

      {/* F3-9: hierarki laporan — perjelas tier angka agar Estimasi tak disalahartikan sbg audit-grade. */}
      <Alert variant="warning" className="report-formality-note d-flex align-items-start gap-2 mb-3 py-2 small">
        <span aria-hidden="true">≈</span>
        <div>
          <strong>Tab operasional = Estimasi.</strong> Angka di tab ini dihitung langsung dari data transaksi
          (invoice, pembayaran, stay, beban) untuk pemantauan cepat dan bisa sedikit berbeda dari buku besar.
          Untuk angka <strong>Formal</strong> (berbasis jurnal/neraca saldo, audit-grade), buka tab <strong>“Laporan Formal”</strong>.
        </div>
      </Alert>

      {isLoading && (
        <Card className="report-glass-card mb-3">
          <Card.Body className="text-center py-4"><Spinner animation="border" size="sm" /> <span className="ms-2">Memuat data analytics...</span></Card.Body>
        </Card>
      )}

      {hasError && (
        <Card className="report-warning-card mb-3">
          <Card.Body>⚠️ Sebagian data laporan gagal dimuat. Coba muat ulang atau cek menu detail sebelum mengambil keputusan bisnis.</Card.Body>
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
            <ReportKpiCard label="Total Pendapatan" value={formatCompactRupiah(profitLoss.data!.totalRevenueRupiah)} detail={`Invoice ${formatCompactRupiah(profitLoss.data!.invoiceRevenueRupiah)} + WiFi ${formatCompactRupiah(profitLoss.data!.wifiRevenueRupiah)}`} tone="blue" />
            <ReportKpiCard label="Arus Kas Bersih" value={formatCompactRupiah(cashFlow.data!.netCashFlowRupiah)} detail={`In ${formatCompactRupiah(cashFlow.data!.cashIn.totalRupiah)} / Out ${formatCompactRupiah(cashFlow.data!.cashOut.totalRupiah)}`} tone={cashFlow.data!.netCashFlowRupiah >= 0 ? 'green' : 'red'} />
            <ReportKpiCard label="Belum Tertagih" value={formatCompactRupiah(monthlyIncome.data!.outstandingRupiah)} detail={`${monthlyIncome.data!.unpaidInvoiceCount} belum bayar · ${monthlyIncome.data!.partialInvoiceCount} sebagian`} tone={monthlyIncome.data!.outstandingRupiah > 0 ? 'orange' : 'green'} />
            <ReportKpiCard label="Okupansi" value={`${occupancy.data!.occupancyRatePercent}%`} detail={`${occupancy.data!.occupiedRooms}/${occupancy.data!.totalOperableRooms} kamar terisi`} tone="cyan" />
          </section>

          <Row className="g-3 mb-3">
            <Col xl={5} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header>
                  <span>Pergerakan Pendapatan</span>
                  <Badge bg="primary">{monthLabel(ym)}</Badge>
                </Card.Header>
                <Card.Body>
                  <RevenueRadar monthlyIncome={monthlyIncome.data!} cashFlow={cashFlow.data!} profitLoss={profitLoss.data!} />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={3} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header><span>Okupansi Kamar</span></Card.Header>
                <Card.Body>
                  <RingGauge percent={occupancy.data!.occupancyRatePercent} label="Okupansi" sublabel={`${occupancy.data!.occupiedRooms} dari ${occupancy.data!.totalOperableRooms} kamar`} />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4}>
              <Card className="report-panel h-100">
                <Card.Header><span>Umur Tunggakan</span><Badge bg="danger">Risiko</Badge></Card.Header>
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
                  <Card.Header><span>Matriks Kesehatan Keuangan</span><Badge bg={overall?.color ?? 'secondary'}>{overall?.label}</Badge></Card.Header>
                  <Card.Body className="p-0"><OwnerHealthMatrix financialRatios={financialRatios.data!} profitLoss={profitLoss.data!} occupancy={occupancy.data!} cashFlow={cashFlow.data!} /></Card.Body>
                </Card>
              </Col>
              <Col xl={5}>
                <Card className="report-panel h-100">
                  <Card.Header><span>Sinyal Utama</span><Badge bg="info">Siap AI</Badge></Card.Header>
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
              <Col xl={6}><ReportSection title="Arus Kas" badge={cashFlow.data!.netCashFlowRupiah >= 0 ? 'Positif' : 'Negatif'}><CashFlowTable data={cashFlow.data!} /></ReportSection></Col>
              <Col xl={6}><ReportSection title="Laba Rugi" badge={`${profitLoss.data!.netProfitMarginPercent}% margin`}><ProfitLossTable data={profitLoss.data!} /></ReportSection></Col>
              <Col xl={6}><ReportSection title="Rincian Pengeluaran" badge={`${expenseSummary.data!.categories.length} kategori`}><ExpenseSummaryVisual data={expenseSummary.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'aging' && (
            <Row className="g-3">
              <Col xl={7}><ReportSection title="Umur Tunggakan" badge={`Per ${overdueAging.data!.asOf}`}><OverdueAgingTable data={overdueAging.data!} /></ReportSection></Col>
              <Col xl={5}><ReportSection title="Liabilitas Deposit" badge={`${depositLiability.data!.activeStayCount} masa sewa`}><DepositLiabilityVisual data={depositLiability.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'operations' && (
            <Row className="g-3">
              <Col xs={12}>
                <ReportSection title="Heatmap Okupansi Harian" badge="12 bulan historis + 3 bulan proyeksi">
                  {occupancyDaily.isLoading ? (
                    <div className="occupancy-calendar-state"><Spinner animation="border" size="sm" /> Memuat heatmap...</div>
                  ) : occupancyDaily.isError || !occupancyDaily.data ? (
                    <Alert variant="warning" className="mb-0">Heatmap okupansi belum dapat dimuat.</Alert>
                  ) : (
                    <OccupancyDailyHeatmap data={occupancyDaily.data} />
                  )}
                </ReportSection>
              </Col>
              <Col xl={5}><ReportSection title="Okupansi & Pendapatan per Kamar" badge={`${occupancy.data!.occupancyRatePercent}%`}><OccupancyTable data={occupancy.data!} /></ReportSection></Col>
              <Col xl={7}><ReportSection title="Ringkasan Operasional" badge="Terkini"><OperationsBars occupancy={occupancy.data!} monthlyIncome={monthlyIncome.data!} depositLiability={depositLiability.data!} /></ReportSection></Col>
            </Row>
          )}

          {activeTab === 'formal' && <UnlockedFormalReports />}
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
    { key: 'command', label: 'Ringkasan', badge: 'Aktual' },
    { key: 'finance', label: 'Keuangan', badge: counts.invoices },
    { key: 'aging', label: 'Tunggakan & Deposit', badge: counts.overdue },
    { key: 'operations', label: 'Operasional', badge: counts.rooms },
    { key: 'formal', label: 'Laporan Formal', badge: 'Baru' },
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

function ReportSection({ title, badge, tier = 'Estimasi', children }: { title: string; badge?: string; tier?: 'Formal' | 'Estimasi'; children: React.ReactNode }) {
  // F3-9: tier menandai sumber angka — Formal (jurnal/audit-grade) vs Estimasi
  // (hitung mentah dari data transaksi). Seluruh laporan /reports = operasional/Estimasi.
  return (
    <Card className="report-panel h-100">
      <Card.Header>
        <span>{title}</span>
        <span className="d-inline-flex gap-1 align-items-center">
          <Badge
            bg={tier === 'Formal' ? 'success' : 'warning'}
            text={tier === 'Formal' ? undefined : 'dark'}
            title={tier === 'Formal'
              ? 'Angka berbasis jurnal akuntansi (audit-grade).'
              : 'Estimasi operasional dari data transaksi; angka formal ada di modul Akuntansi.'}
          >
            {tier === 'Formal' ? '✓ Formal' : '≈ Estimasi'}
          </Badge>
          {badge && <Badge bg="primary">{badge}</Badge>}
        </span>
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  );
}

function OccupancyDailyHeatmap({ data }: { data: OccupancyDaily }) {
  const months = useMemo(() => {
    const grouped = new Map<string, OccupancyDaily['days']>();
    data.days.forEach((day) => {
      const key = day.date.slice(0, 7);
      grouped.set(key, [...(grouped.get(key) ?? []), day]);
    });
    return Array.from(grouped.entries());
  }, [data.days]);

  const heatLevel = (rate: number) => {
    if (rate <= 0) return 0;
    if (rate < 35) return 1;
    if (rate < 65) return 2;
    if (rate < 90) return 3;
    return 4;
  };

  return (
    <div className="occupancy-calendar">
      <div className="occupancy-calendar-meta">
        <span>{data.from} sampai {data.to}</span>
        <span>{data.totalOperableRooms} kamar operasional saat ini</span>
      </div>
      <div className="occupancy-calendar-months">
        {months.map(([monthKey, days]) => {
          const firstWeekday = new Date(`${monthKey}-01T00:00:00.000Z`).getUTCDay();
          const monthName = new Date(`${monthKey}-01T00:00:00.000Z`).toLocaleDateString('id-ID', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          });
          return (
            <article className="occupancy-calendar-month" key={monthKey}>
              <h3>{monthName}</h3>
              <div className="occupancy-calendar-weekdays" aria-hidden="true">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="occupancy-calendar-grid">
                {Array.from({ length: firstWeekday }, (_, index) => <span className="occupancy-day-empty" key={`blank-${index}`} />)}
                {days.map((day) => (
                  <div
                    className={`occupancy-day occupancy-level-${heatLevel(day.occupancyRatePercent)}${day.isProjection ? ' is-projection' : ''}`}
                    key={day.date}
                    title={`${day.date}: ${day.occupiedRooms}/${day.totalOperableRooms} kamar (${day.occupancyRatePercent}%)${day.isProjection ? ' - proyeksi' : ''}`}
                  >
                    <span>{Number(day.date.slice(-2))}</span>
                    <small>{Math.round(day.occupancyRatePercent)}%</small>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <div className="occupancy-calendar-legend">
        <span>Rendah</span>
        {[0, 1, 2, 3, 4].map((level) => <i className={`occupancy-level-${level}`} key={level} />)}
        <span>Tinggi</span>
        <em>Garis putus-putus = proyeksi</em>
      </div>
      <p className="occupancy-calendar-note">{data.note}</p>
    </div>
  );
}

function RingGauge({ percent, label, sublabel }: { percent: number; label: string; sublabel: string }) {
  const p = clampPercent(percent);
  return (
    <div className="report-ring-wrap">
      <DonutGauge
        value={p}
        center={<><strong>{p}%</strong><span>{label}</span></>}
        ariaLabel={`${label}: ${p}%`}
        className="report-ring"
        centerClassName="report-ring-inner"
      />
      <p className="mb-0 text-center text-muted small">{sublabel}</p>
    </div>
  );
}

function RevenueRadar({ monthlyIncome, cashFlow, profitLoss }: { monthlyIncome: MonthlyIncome; cashFlow: CashFlow; profitLoss: ProfitLoss }) {
  const rows = [
    { label: 'Tagihan', value: monthlyIncome.totalBilledRupiah, color: '#2563eb' },
    { label: 'Dibayar', value: monthlyIncome.totalPaidRupiah, color: '#16a34a' },
    { label: 'WiFi', value: monthlyIncome.totalWifiRevenueRupiah, color: '#0891b2' },
    { label: 'Pengeluaran', value: profitLoss.totalExpenseRupiah, color: '#f97316' },
    { label: 'Net CF', value: Math.max(0, cashFlow.netCashFlowRupiah), color: '#7c3aed' },
  ];
  return <HorizontalBarChart points={rows} ariaLabel="Perbandingan revenue dan cashflow" valueFormatter={formatCompactRupiah} height={242} leftWidth={72} />;
}

function OverdueHeatmap({ data }: { data: OverdueAging }) {
  const buckets = [
    { label: 'Lancar', count: data.buckets.current.count, value: data.buckets.current.totalRupiah, color: '#22c55e' },
    { label: '1-30', count: data.buckets.days1to30.count, value: data.buckets.days1to30.totalRupiah, color: '#fbbf24' },
    { label: '31-60', count: data.buckets.days31to60.count, value: data.buckets.days31to60.totalRupiah, color: '#f59e0b' },
    { label: '61-90', count: data.buckets.days61to90.count, value: data.buckets.days61to90.totalRupiah, color: '#f97316' },
    { label: '91+', count: data.buckets.days91plus.count, value: data.buckets.days91plus.totalRupiah, color: '#ef4444' },
  ];
  return (
    <div className="report-aging-chart" role="img" aria-label="Nilai invoice berdasarkan umur tunggakan">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets} margin={{ top: 26, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.22)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
            content={({ active, payload }) => {
              const bucket = payload?.[0]?.payload as typeof buckets[number] | undefined;
              if (!active || !bucket) return null;
              return <div className="recharts-tooltip"><strong>{bucket.label} hari</strong><span>{formatCompactRupiah(bucket.value)}</span><small>{bucket.count} invoice</small></div>;
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {buckets.map((bucket) => <Cell key={bucket.label} fill={bucket.color} />)}
            <LabelList dataKey="count" position="top" fill="#475569" fontSize={12} fontWeight={800} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InlinePercentBar({ value, color, ariaLabel }: { value: number; color: string; ariaLabel: string }) {
  const safeValue = clampPercent(value);
  return (
    <div className="report-inline-percent-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={[{ label: ariaLabel, value: safeValue }]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="label" hide />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} background={{ fill: 'rgba(37, 99, 235, 0.10)' }} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OwnerHealthMatrix({ financialRatios, profitLoss, occupancy, cashFlow }: { financialRatios: FinancialRatios; profitLoss: ProfitLoss; occupancy: Occupancy; cashFlow: CashFlow }) {
  const rows = [
    { label: 'Rasio Tertagih', value: financialRatios.collectionRatePercent, suffix: '%', note: 'Pembayaran / tagihan', meta: collectionRateLabel(financialRatios.collectionRatePercent) },
    { label: 'Margin Laba Bersih', value: profitLoss.netProfitMarginPercent, suffix: '%', note: 'Laba bersih / revenue', meta: netProfitMarginLabel(profitLoss.netProfitMarginPercent) },
    { label: 'Rasio Pengeluaran', value: financialRatios.expenseRatioPercent, suffix: '%', note: 'Pengeluaran / pendapatan', meta: expenseRatioLabel(financialRatios.expenseRatioPercent) },
    { label: 'Tingkat Okupansi', value: occupancy.occupancyRatePercent, suffix: '%', note: 'Kamar terisi', meta: occupancyRateLabel(occupancy.occupancyRatePercent) },
    { label: 'Rasio Tunggakan', value: financialRatios.overdueRateSnapshotPercent, suffix: '%', note: 'Posisi tunggakan terkini', meta: overdueRateLabel(financialRatios.overdueRateSnapshotPercent) },
  ];
  const cf = cashFlowLabel(cashFlow.netCashFlowRupiah);
  return (
    <div className="report-matrix">
      {rows.map((row) => (
        <div className="report-matrix-row" key={row.label}>
          <div><strong>{row.label}</strong><span>{row.note}</span></div>
          <InlinePercentBar value={row.value} color={row.meta.tone === 'good' ? '#22c55e' : row.meta.tone === 'watch' ? '#f59e0b' : '#ef4444'} ariaLabel={`${row.label}: ${row.value}${row.suffix}`} />
          <div className="report-matrix-value"><strong>{row.value}{row.suffix}</strong><Badge bg={row.meta.color}>{row.meta.label}</Badge></div>
        </div>
      ))}
      <div className="report-matrix-row">
        <div><strong>Arus Kas Bersih</strong><span>Kas masuk - kas keluar</span></div>
        <InlinePercentBar value={cashFlow.netCashFlowRupiah > 0 ? 100 : 35} color={cf.tone === 'good' ? '#22c55e' : cf.tone === 'watch' ? '#f59e0b' : '#ef4444'} ariaLabel={`Arus kas bersih: ${formatCompactRupiah(cashFlow.netCashFlowRupiah)}`} />
        <div className="report-matrix-value"><strong>{formatCompactRupiah(cashFlow.netCashFlowRupiah)}</strong><Badge bg={cf.color}>{cf.label}</Badge></div>
      </div>
    </div>
  );
}

function InsightStack({ monthlyIncome, cashFlow, overdueAging, occupancy, financialRatios }: { monthlyIncome: MonthlyIncome; cashFlow: CashFlow; overdueAging: OverdueAging; occupancy: Occupancy; financialRatios: FinancialRatios }) {
  const insights = [
    {
      title: monthlyIncome.outstandingRupiah > 0 ? 'Belum Tertagih perlu dikejar' : 'Belum Tertagih bersih',
      body: monthlyIncome.outstandingRupiah > 0 ? `${formatCompactRupiah(monthlyIncome.outstandingRupiah)} belum masuk kas.` : 'Tidak ada outstanding pada laporan bulan ini.',
      tone: monthlyIncome.outstandingRupiah > 0 ? 'watch' : 'good',
    },
    {
      title: cashFlow.netCashFlowRupiah >= 0 ? 'Cashflow positif' : 'Cashflow negatif',
      body: `Net cashflow ${formatCompactRupiah(cashFlow.netCashFlowRupiah)} dari operasional bulan ini.`,
      tone: cashFlow.netCashFlowRupiah >= 0 ? 'good' : 'bad',
    },
    {
      title: overdueAging.totalOverdueCount > 0 ? 'Ada tunggakan berjalan' : 'Tunggakan aman',
      body: `${overdueAging.totalOverdueCount} tagihan terlambat senilai ${formatCompactRupiah(overdueAging.totalOverdueRupiah)}.`,
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
  const points = data.categories.map((category) => ({
    label: EXPENSE_CATEGORY_LABELS[category.category] ?? category.category,
    value: category.totalRupiah,
    detail: `${category.count} transaksi`,
    color: '#f97316',
  }));
  return (
    <>
      <div className="report-total-chip mb-3"><span>Total Pengeluaran</span><strong>{formatCompactRupiah(data.totalExpenseRupiah)}</strong></div>
      <HorizontalBarChart points={points} ariaLabel="Pengeluaran berdasarkan kategori" valueFormatter={formatCompactRupiah} leftWidth={112} />
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
    { label: 'Occupancy', value: occupancy.occupancyRatePercent, color: '#2563eb' },
    { label: 'Tagihan Lunas', value: monthlyIncome.invoiceCount > 0 ? (monthlyIncome.paidInvoiceCount / monthlyIncome.invoiceCount) * 100 : 0, color: '#0ea5e9' },
    { label: 'Dana Titipan', value: depositLiability.activeStayCount > 0 ? (depositLiability.fullyPaidCount / depositLiability.activeStayCount) * 100 : 0, color: '#16a34a' },
  ];
  return <HorizontalBarChart points={rows} ariaLabel="Ringkasan operasional dalam persen" valueFormatter={(value) => `${Math.round(value)}%`} maxValue={100} leftWidth={112} height={180} />;
}

interface ReportQueryState { isLoading: boolean; isError: boolean; data?: unknown; }
function allReady(queries: ReportQueryState[]): boolean { return queries.every((q) => !q.isLoading && !q.isError && q.data !== undefined); }

function buildOwnerReportsCsv(params: { ym: { year: number; month: number }; monthlyIncome: MonthlyIncome; cashFlow: CashFlow; overdueAging: OverdueAging; depositLiability: DepositLiability; expenseSummary: ExpenseSummary; profitLoss: ProfitLoss; financialRatios: FinancialRatios; occupancy: Occupancy; }): string {
  const { ym, monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy } = params;
  const label = monthLabel(ym);
  const lines: string[] = [];
  lines.push(generateCsv([
    ['KOST48 Owner Report', label],
    ['Total Pendapatan', `Rp ${formatRupiah(profitLoss.totalRevenueRupiah)}`],
    ['Laba Bersih', `Rp ${formatRupiah(profitLoss.netProfitRupiah)}`],
    ['Arus Kas Bersih', `Rp ${formatRupiah(cashFlow.netCashFlowRupiah)}`],
    ['Rasio Tertagih', `${financialRatios.collectionRatePercent}%`],
    ['Tingkat Okupansi', `${occupancy.occupancyRatePercent}%`],
    ['Total Tunggakan', `Rp ${formatRupiah(overdueAging.totalOverdueRupiah)}`],
    ['Dana Titipan Belum Dibayar', `Rp ${formatRupiah(depositLiability.totalDepositOutstandingRupiah)}`],
    [''],
  ]));
  lines.push(generateCsv([
    ['Pendapatan Bulanan'], ['Total Tagihan', `Rp ${formatRupiah(monthlyIncome.totalBilledRupiah)}`], ['Total Dibayar', `Rp ${formatRupiah(monthlyIncome.totalPaidRupiah)}`], ['WiFi', `Rp ${formatRupiah(monthlyIncome.totalWifiRevenueRupiah)}`], ['Belum Tertagih', `Rp ${formatRupiah(monthlyIncome.outstandingRupiah)}`], ['']
  ]));
  lines.push(generateCsv([
    ['Ringkasan Pengeluaran'], ['Kategori', 'Jumlah', 'Rupiah'], ...expenseSummary.categories.map((c) => [EXPENSE_CATEGORY_LABELS[c.category] ?? c.category, String(c.count), `Rp ${formatRupiah(c.totalRupiah)}`]), ['Total', '', `Rp ${formatRupiah(expenseSummary.totalExpenseRupiah)}`], ['']
  ]));
  lines.push(generateCsv([
    ['Umur Tunggakan'], ['Rentang', 'Jumlah', 'Rupiah'], ['Lancar', String(overdueAging.buckets.current.count), `Rp ${formatRupiah(overdueAging.buckets.current.totalRupiah)}`], ['1-30', String(overdueAging.buckets.days1to30.count), `Rp ${formatRupiah(overdueAging.buckets.days1to30.totalRupiah)}`], ['31-60', String(overdueAging.buckets.days31to60.count), `Rp ${formatRupiah(overdueAging.buckets.days31to60.totalRupiah)}`], ['61-90', String(overdueAging.buckets.days61to90.count), `Rp ${formatRupiah(overdueAging.buckets.days61to90.totalRupiah)}`], ['91+', String(overdueAging.buckets.days91plus.count), `Rp ${formatRupiah(overdueAging.buckets.days91plus.totalRupiah)}`]
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

function MonthlyIncomeTable({ data }: { data: MonthlyIncome }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Total Tagihan</td><td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td></tr><tr><td>Total Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalPaidRupiah)}</td></tr><tr><td>Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.totalWifiRevenueRupiah)}</td></tr><tr><td><strong>Belum Tertagih</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.outstandingRupiah)}</strong></td></tr><tr><td>Jumlah Tagihan</td><td className="text-end">{data.invoiceCount}</td></tr><tr><td>Lunas</td><td className="text-end"><Badge bg="success">{data.paidInvoiceCount}</Badge></td></tr><tr><td>Sebagian</td><td className="text-end"><Badge bg="warning">{data.partialInvoiceCount}</Badge></td></tr><tr><td>Belum Bayar</td><td className="text-end"><Badge bg="danger">{data.unpaidInvoiceCount}</Badge></td></tr></tbody></Table>; }
function CashFlowTable({ data }: { data: CashFlow }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Kas Masuk</td><td className="text-end">Rp {formatRupiah(data.cashIn.totalRupiah)}</td></tr><tr><td>Pembayaran Tagihan</td><td className="text-end">Rp {formatRupiah(data.cashIn.invoicePaymentsRupiah)}</td></tr><tr><td>Penjualan WiFi</td><td className="text-end">Rp {formatRupiah(data.cashIn.wifiSalesRupiah)}</td></tr><tr><td>Kas Keluar</td><td className="text-end">Rp {formatRupiah(data.cashOut.expensesRupiah)}</td></tr><tr><td><strong>Arus Kas Bersih</strong></td><td className={`text-end ${data.netCashFlowRupiah >= 0 ? 'text-success' : 'text-danger'}`}><strong>Rp {formatRupiah(data.netCashFlowRupiah)}</strong></td></tr></tbody></Table>; }
function OverdueAgingTable({ data }: { data: OverdueAging }) { const b = data.buckets; return <Table responsive bordered size="sm" className="mb-0 report-table"><thead><tr><th>Umur</th><th className="text-end">Jumlah</th><th className="text-end">Rupiah</th></tr></thead><tbody><tr><td>Belum jatuh tempo</td><td className="text-end">{b.current.count}</td><td className="text-end">Rp {formatRupiah(b.current.totalRupiah)}</td></tr><tr><td>1–30 hari</td><td className="text-end">{b.days1to30.count}</td><td className="text-end">Rp {formatRupiah(b.days1to30.totalRupiah)}</td></tr><tr><td>31–60 hari</td><td className="text-end">{b.days31to60.count}</td><td className="text-end">Rp {formatRupiah(b.days31to60.totalRupiah)}</td></tr><tr><td>61–90 hari</td><td className="text-end">{b.days61to90.count}</td><td className="text-end">Rp {formatRupiah(b.days61to90.totalRupiah)}</td></tr><tr><td>91+ hari</td><td className="text-end">{b.days91plus.count}</td><td className="text-end">Rp {formatRupiah(b.days91plus.totalRupiah)}</td></tr><tr><td><strong>Total Tunggakan</strong></td><td className="text-end"><strong>{data.totalOverdueCount}</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.totalOverdueRupiah)}</strong></td></tr></tbody></Table>; }
function DepositLiabilityTable({ data }: { data: DepositLiability }) { return <Table responsive bordered size="sm" className="mb-0 mt-3 report-table"><tbody><tr><td>Total Dana Titipan Dinilai</td><td className="text-end">Rp {formatRupiah(data.totalDepositAmountRupiah)}</td></tr><tr><td>Sudah Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalDepositPaidRupiah)}</td></tr><tr><td><strong>Sisa Dana Titipan Belum Dibayar</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.totalDepositOutstandingRupiah)}</strong></td></tr><tr><td>Masa sewa aktif</td><td className="text-end">{data.activeStayCount}</td></tr><tr><td>Lunas / Partial / Belum</td><td className="text-end"><Badge bg="success">{data.fullyPaidCount}</Badge> <Badge bg="warning">{data.partiallyPaidCount}</Badge> <Badge bg="danger">{data.unpaidCount}</Badge></td></tr></tbody></Table>; }
function ProfitLossTable({ data }: { data: ProfitLoss }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Pendapatan Tagihan</td><td className="text-end">Rp {formatRupiah(data.invoiceRevenueRupiah)}</td></tr><tr><td>Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.wifiRevenueRupiah)}</td></tr><tr><td>Total Pendapatan</td><td className="text-end">Rp {formatRupiah(data.totalRevenueRupiah)}</td></tr><tr><td>Total Pengeluaran</td><td className="text-end">Rp {formatRupiah(data.totalExpenseRupiah)}</td></tr><tr><td><strong>Laba/Rugi Bersih</strong></td><td className={`text-end ${data.netProfitRupiah >= 0 ? 'text-success' : 'text-danger'}`}><strong>Rp {formatRupiah(data.netProfitRupiah)}</strong></td></tr><tr><td>Margin Laba Bersih</td><td className="text-end"><strong>{data.netProfitMarginPercent}%</strong></td></tr></tbody></Table>; }
function OccupancyTable({ data }: { data: Occupancy }) { return <Table responsive bordered size="sm" className="mb-0 report-table"><tbody><tr><td>Total Kamar Operasional</td><td className="text-end"><strong>{data.totalOperableRooms}</strong></td></tr><tr><td>Kamar Terisi</td><td className="text-end"><strong>{data.occupiedRooms}</strong></td></tr><tr><td>Tingkat Okupansi</td><td className="text-end"><strong>{data.occupancyRatePercent}%</strong></td></tr><tr><td>Total Tagihan Bulan Ini</td><td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td></tr><tr><td>Pendapatan per Kamar Terisi</td><td className="text-end"><strong>Rp {formatRupiah(data.revenuePerOccupiedRoomRupiah)}</strong></td></tr><tr><td colSpan={2} className="text-muted small">{data.occupancyNote}<br />{data.revenueNote}</td></tr></tbody></Table>; }

function LockedFormalRatios({ readiness: financeReadiness, balanceSheetDraft, isDataUnavailable }: { readiness?: FinanceReadiness; balanceSheetDraft?: BalanceSheetDraft; isDataUnavailable?: boolean }) {
  const ratios = [
    { name: 'Rasio Lancar', formula: 'Aset Lancar / Kewajiban Lancar', reason: 'Belum akurat karena kas/bank aktual dan current liabilities belum dimodelkan.' },
    { name: 'Rasio Cepat', formula: '(Aset Lancar - Inventory) / Kewajiban Lancar', reason: 'Belum akurat karena kas/bank, inventory, dan current liabilities belum dimodelkan.' },
    { name: 'ROCE', formula: 'EBIT / (Total Aset - Kewajiban Lancar)', reason: 'Belum akurat karena aset, depresiasi, dan capital employed belum dimodelkan.' },
    { name: 'Debt-to-Equity', formula: 'Total Kewajiban / Total Ekuitas', reason: 'Belum akurat karena utang jangka panjang, ekuitas, dan akumulasi laba belum dimodelkan.' },
  ];
  const readiness = [
    { label: 'Piutang tagihan', state: 'Ready', note: 'Tagihan aktif dapat menjadi kandidat piutang.' },
    { label: 'Dana titipan', state: 'Ready', note: 'Dana titipan ditampilkan sebagai kewajiban, bukan pendapatan.' },
    { label: 'Kas / rekening bank', state: 'Locked', note: 'Belum ada sumber saldo kas/bank formal.' },
    { label: 'Ekuitas / modal kerja', state: 'Locked', note: 'Belum ada model ekuitas dan aset formal.' },
  ];
  const missingFinanceData = financeReadiness?.missing ?? [];
  const knownAssets = balanceSheetDraft?.totals?.knownAssetsRupiah ?? null;
  const knownLiabilities = balanceSheetDraft?.totals?.knownLiabilitiesRupiah ?? null;
  return (
    <Row className="g-3">
      <Col xl={5}>
        <Card className="report-panel h-100">
          <Card.Header><span>Kesiapan Neraca</span><Badge bg="warning">Fondasi</Badge></Card.Header>
          <Card.Body>
            <p className="text-muted small">Rasio formal tetap dikunci sampai Aset = Kewajiban + Ekuitas bisa dibangun dari data yang dapat dipercaya.</p>
            {isDataUnavailable ? <Alert variant="light" className="small">Data readiness keuangan belum bisa dimuat saat ini.</Alert> : null}
            {balanceSheetDraft ? (
              <div className="report-readiness-snapshot mb-3">
                <div><span>Aset tercatat</span><strong>{knownAssets === null ? '-' : formatCompactRupiah(knownAssets)}</strong></div>
                <div><span>Kewajiban tercatat</span><strong>{knownLiabilities === null ? '-' : formatCompactRupiah(knownLiabilities)}</strong></div>
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
            {missingFinanceData.length ? (
              <div className="mt-3 small text-muted">
                <strong>Data yang belum lengkap:</strong> {missingFinanceData.join(', ')}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Col>
      <Col xl={7}>
        <Card className="report-panel h-100">
          <Card.Header><span>Rasio Akuntansi Formal</span><Badge bg="secondary">Data Dikunci</Badge></Card.Header>
          <Card.Body className="p-0"><Table responsive bordered size="sm" className="mb-0 report-table"><tbody>{ratios.map((r) => <tr key={r.name}><td style={{ width: 220 }}><strong>{r.name}</strong><br /><span className="text-muted small">{r.formula}</span></td><td><Badge bg="secondary" className="me-2">Belum Tersedia</Badge><span className="text-muted small">{r.reason}</span></td></tr>)}</tbody></Table></Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
