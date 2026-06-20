import { lazy, Suspense, useMemo, useState } from 'react';
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
  fetchProfitLoss,
  fetchFinancialRatios,
  fetchOccupancy,
  fetchOccupancyDaily,
  MonthlyIncome,
  OverdueAging,
  DepositLiability,
  ExpenseSummary,
  ProfitLoss,
  FinancialRatios,
  Occupancy,
  OccupancyDaily,
} from '../../api/reports';
import { fetchCashflowStatement } from '../../api/accounting';
import { StatCardSkeleton, TableSkeleton } from '../../components/common/SkeletonLoader';
import { createBusinessNarrative } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import DonutGauge from '../../components/charts/DonutGauge';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';
import {
  type HealthLevel, type CashFlowStatus, type OverallStatus, type ReportTab, type ReportQueryState,
  reportTabs, normalizeReportTab, EXPENSE_CATEGORY_LABELS,
  formatRupiah, formatCompactRupiah, currentYearMonth, toLocalDateOnly, occupancyHeatmapRange, monthLabel, clampPercent,
  collectionRateLabel, netProfitMarginLabel, expenseRatioLabel, occupancyRateLabel, overdueRateLabel, cashFlowLabel, getOverallStatus,
  ReportKpiCard, ReportTabs, ReportSection, OccupancyDailyHeatmap, RingGauge, RevenueRadar, ExpenseMovement, OverdueHeatmap,
  InlinePercentBar, OwnerHealthMatrix, InsightStack, ExpenseSummaryVisual, DepositLiabilityVisual, OperationsBars, ExportAllCsvButton,
  MonthlyIncomeTable, CashFlowTable, OverdueAgingTable, DepositLiabilityTable, ProfitLossTable, OccupancyTable,
} from './reportShared';

const UnlockedFormalReports = lazy(() => import('./UnlockedFormalReports'));

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
  const cashFlowRaw = useQuery({ queryKey: ['accounting', 'cashflow', ym], queryFn: () => fetchCashflowStatement({ year: ym.year, month: ym.month }) });
  // Adapter: konversi CashflowStatement ke shape CashFlow kompatibel (R2)
  const cashFlow = useMemo(() => {
    if (!cashFlowRaw.data) return cashFlowRaw;
    const d = cashFlowRaw.data;
    return {
      ...cashFlowRaw,
      data: {
        year: d.period.year,
        month: d.period.month,
        cashIn: { invoicePaymentsRupiah: d.operating.totalInRupiah, wifiSalesRupiah: 0, totalRupiah: d.operating.totalInRupiah },
        cashOut: { expensesRupiah: d.operating.totalOutRupiah, totalRupiah: d.operating.totalOutRupiah },
        netCashFlowRupiah: d.totals.netCashflowRupiah,
      },
    };
  }, [cashFlowRaw.data]);
  const profitLoss = useQuery({ queryKey: ['reports', 'profit-loss', ym], queryFn: () => fetchProfitLoss(ym.year, ym.month) });
  const financialRatios = useQuery({ queryKey: ['reports', 'financial-ratios', ym], queryFn: () => fetchFinancialRatios(ym.year, ym.month) });
  const occupancy = useQuery({ queryKey: ['reports', 'occupancy', ym], queryFn: () => fetchOccupancy(ym.year, ym.month) });
  const occupancyDaily = useQuery({
    queryKey: ['reports', 'occupancy-daily', heatmapRange],
    queryFn: () => fetchOccupancyDaily(heatmapRange.from, heatmapRange.to),
    staleTime: 5 * 60_000,
  });
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
        <div role="status" aria-label="Memuat data laporan" aria-busy="true">
          <section className="report-command-grid mb-3">
            {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </section>
          <Row className="g-3 mb-3">
            <Col xl={6}><Card className="report-panel"><Card.Body><TableSkeleton rows={5} cols={2} /></Card.Body></Card></Col>
            <Col xl={6}><Card className="report-panel"><Card.Body><TableSkeleton rows={5} cols={2} /></Card.Body></Card></Col>
          </Row>
          <span className="visually-hidden">Memuat data laporan…</span>
        </div>
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
            <Col xl={6} lg={6}>
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
            <Col xl={6} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header>
                  <span>Pergerakan Pengeluaran</span>
                  <Badge bg="warning" text="dark">{monthLabel(ym)}</Badge>
                </Card.Header>
                <Card.Body>
                  <ExpenseMovement expenseSummary={expenseSummary.data!} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xl={4} lg={6}>
              <Card className="report-panel h-100">
                <Card.Header><span>Okupansi Kamar</span></Card.Header>
                <Card.Body>
                  <RingGauge percent={occupancy.data!.occupancyRatePercent} label="Okupansi" sublabel={`${occupancy.data!.occupiedRooms} dari ${occupancy.data!.totalOperableRooms} kamar`} />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={8} lg={6}>
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

          {activeTab === 'formal' && (
            <Suspense fallback={<Card className="report-panel"><Card.Body><TableSkeleton rows={8} /></Card.Body></Card>}>
              <UnlockedFormalReports />
            </Suspense>
          )}
        </>
      )}
    </Container>
  );
}
