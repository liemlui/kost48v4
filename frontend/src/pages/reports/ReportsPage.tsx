import React, { useCallback, useState } from 'react';
import { Card, Table, Badge, Spinner, Container, Row, Col, Form, Button } from 'react-bootstrap';
import { generateCsv, downloadCsv } from '../../utils/csv';
import { useQuery } from '@tanstack/react-query';
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

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function currentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
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

// --- M10-C: Owner Financial Health Thresholds ---

type HealthLevel = 'Baik' | 'Perlu Dipantau' | 'Buruk';
type CashFlowStatus = 'Positif' | 'Netral' | 'Negatif';
type OverallStatus = 'Sehat' | 'Perlu Dipantau' | 'Bermasalah';

function collectionRateLabel(value: number): { label: HealthLevel; color: string } {
  if (value >= 90) return { label: 'Baik', color: 'success' };
  if (value >= 70) return { label: 'Perlu Dipantau', color: 'warning' };
  return { label: 'Buruk', color: 'danger' };
}
function netProfitMarginLabel(value: number): { label: HealthLevel; color: string } {
  if (value >= 40) return { label: 'Baik', color: 'success' };
  if (value >= 20) return { label: 'Perlu Dipantau', color: 'warning' };
  return { label: 'Buruk', color: 'danger' };
}
function expenseRatioLabel(value: number): { label: HealthLevel; color: string } {
  if (value <= 40) return { label: 'Baik', color: 'success' };
  if (value <= 60) return { label: 'Perlu Dipantau', color: 'warning' };
  return { label: 'Buruk', color: 'danger' };
}
function occupancyRateLabel(value: number): { label: HealthLevel; color: string } {
  if (value >= 85) return { label: 'Baik', color: 'success' };
  if (value >= 60) return { label: 'Perlu Dipantau', color: 'warning' };
  return { label: 'Buruk', color: 'danger' };
}
function overdueRateLabel(value: number): { label: HealthLevel; color: string } {
  if (value <= 10) return { label: 'Baik', color: 'success' };
  if (value <= 25) return { label: 'Perlu Dipantau', color: 'warning' };
  return { label: 'Buruk', color: 'danger' };
}
function cashFlowLabel(value: number): { label: CashFlowStatus; color: string } {
  if (value > 0) return { label: 'Positif', color: 'success' };
  if (value === 0) return { label: 'Netral', color: 'secondary' };
  return { label: 'Negatif', color: 'danger' };
}

export default function ReportsPage() {
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());

  const monthlyIncome = useQuery({
    queryKey: ['reports', 'monthly-income', ym],
    queryFn: () => fetchMonthlyIncome(ym.year, ym.month),
  });

  const overdueAging = useQuery({
    queryKey: ['reports', 'overdue-aging'],
    queryFn: () => fetchOverdueAging(),
  });

  const depositLiability = useQuery({
    queryKey: ['reports', 'deposit-liability'],
    queryFn: () => fetchDepositLiability(),
  });

  const expenseSummary = useQuery({
    queryKey: ['reports', 'expense-summary', ym],
    queryFn: () => fetchExpenseSummary(ym.year, ym.month),
  });

  const cashFlow = useQuery({
    queryKey: ['reports', 'cash-flow', ym],
    queryFn: () => fetchCashFlow(ym.year, ym.month),
  });

  const profitLoss = useQuery({
    queryKey: ['reports', 'profit-loss', ym],
    queryFn: () => fetchProfitLoss(ym.year, ym.month),
  });

  const financialRatios = useQuery({
    queryKey: ['reports', 'financial-ratios', ym],
    queryFn: () => fetchFinancialRatios(ym.year, ym.month),
  });

  const occupancy = useQuery({
    queryKey: ['reports', 'occupancy', ym],
    queryFn: () => fetchOccupancy(ym.year, ym.month),
  });

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setYm((prev) => ({ ...prev, [field]: num }));
    }
  };

  return (
    <Container fluid className="px-2 py-3">
      <h4 className="mb-3">📊 Laporan Keuangan Owner</h4>

      <Row className="mb-3 align-items-end">
        <Col xs="auto">
          <Form.Label className="mb-0">Tahun</Form.Label>
          <Form.Control
            type="number"
            value={ym.year}
            min={2020}
            max={2100}
            onChange={(e) => handleChange('year', e.target.value)}
            style={{ width: 100 }}
          />
        </Col>
        <Col xs="auto">
          <Form.Label className="mb-0">Bulan</Form.Label>
          <Form.Select
            value={ym.month}
            onChange={(e) => handleChange('month', e.target.value)}
            style={{ width: 140 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
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
        </Col>
      </Row>

      {/* --- M10-C: Owner Financial Health Summary --- */}
      {(financialRatios.isLoading || profitLoss.isLoading || occupancy.isLoading || cashFlow.isLoading) ? (
        <Card className="mb-3">
          <Card.Body className="text-center py-4">
            <Spinner animation="border" size="sm" /> <span className="ms-2">Memuat ringkasan kesehatan keuangan...</span>
          </Card.Body>
        </Card>
      ) : (financialRatios.isError || profitLoss.isError || occupancy.isError || cashFlow.isError) ? (
        <Card className="mb-3 border-warning">
          <Card.Body className="text-warning">
            ⚠️ Sebagian data laporan gagal dimuat. Ringkasan kesehatan keuangan tidak dapat ditampilkan.
          </Card.Body>
        </Card>
      ) : (
        <OwnerHealthSummary
          financialRatios={financialRatios.data!}
          profitLoss={profitLoss.data!}
          occupancy={occupancy.data!}
          cashFlow={cashFlow.data!}
        />
      )}

      <LockedFormalRatios />

      {/* Monthly Income */}
      <Card className="mb-3">
        <Card.Header>💵 Pendapatan Bulanan — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {monthlyIncome.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : monthlyIncome.isError ? (
            <p className="text-danger">Gagal memuat data pendapatan.</p>
          ) : (
            <MonthlyIncomeTable data={monthlyIncome.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Cash Flow */}
      <Card className="mb-3">
        <Card.Header>💸 Arus Kas — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {cashFlow.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : cashFlow.isError ? (
            <p className="text-danger">Gagal memuat data arus kas.</p>
          ) : (
            <CashFlowTable data={cashFlow.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Overdue Aging */}
      <Card className="mb-3">
        <Card.Header>⏳ Aging Tunggakan</Card.Header>
        <Card.Body>
          {overdueAging.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : overdueAging.isError ? (
            <p className="text-danger">Gagal memuat data tunggakan.</p>
          ) : (
            <OverdueAgingTable data={overdueAging.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Deposit Liability */}
      <Card className="mb-3">
        <Card.Header>💰 Liabilitas Deposit</Card.Header>
        <Card.Body>
          {depositLiability.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : depositLiability.isError ? (
            <p className="text-danger">Gagal memuat data deposit.</p>
          ) : (
            <DepositLiabilityTable data={depositLiability.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Expense Summary */}
      <Card className="mb-3">
        <Card.Header>🧮 Pengeluaran per Kategori — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {expenseSummary.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : expenseSummary.isError ? (
            <p className="text-danger">Gagal memuat data pengeluaran.</p>
          ) : (
            <ExpenseSummaryTable data={expenseSummary.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Profit & Loss */}
      <Card className="mb-3">
        <Card.Header>📈 Profit & Loss (Laba Rugi) — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {profitLoss.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : profitLoss.isError ? (
            <p className="text-danger">Gagal memuat data laba rugi.</p>
          ) : (
            <ProfitLossTable data={profitLoss.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Financial Ratios */}
      <Card className="mb-3">
        <Card.Header>📊 Rasio Keuangan — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {financialRatios.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : financialRatios.isError ? (
            <p className="text-danger">Gagal memuat data rasio keuangan.</p>
          ) : (
            <FinancialRatiosTable data={financialRatios.data!} />
          )}
        </Card.Body>
      </Card>

      {/* Occupancy */}
      <Card className="mb-3">
        <Card.Header>🏠 Okupansi & Revenue per Room — {new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Card.Header>
        <Card.Body>
          {occupancy.isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : occupancy.isError ? (
            <p className="text-danger">Gagal memuat data okupansi.</p>
          ) : (
            <OccupancyTable data={occupancy.data!} />
          )}
        </Card.Body>
      </Card>
    </Container>
   );
}

// --- M10-C: Owner Financial Health Summary Components ---

function OwnerHealthSummary({
  financialRatios,
  profitLoss,
  occupancy,
  cashFlow,
}: {
  financialRatios: FinancialRatios;
  profitLoss: ProfitLoss;
  occupancy: Occupancy;
  cashFlow: CashFlow;
}) {
  const colRate = collectionRateLabel(financialRatios.collectionRatePercent);
  const npmLabel = netProfitMarginLabel(profitLoss.netProfitMarginPercent);
  const expLabel = expenseRatioLabel(financialRatios.expenseRatioPercent);
  const occLabel = occupancyRateLabel(occupancy.occupancyRatePercent);
  const ovdLabel = overdueRateLabel(financialRatios.overdueRateSnapshotPercent);
  const cfLabel = cashFlowLabel(cashFlow.netCashFlowRupiah);

  const isBuruk = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Buruk');
  const isCashFlowNeg = cashFlow.netCashFlowRupiah < 0;
  const isDipantau = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Perlu Dipantau');

  let overall: { label: OverallStatus; color: string; bg: string; emoji: string };
  if (isBuruk || isCashFlowNeg) {
    overall = { label: 'Bermasalah', color: 'danger', bg: 'danger-subtle', emoji: '🔴' };
  } else if (isDipantau) {
    overall = { label: 'Perlu Dipantau', color: 'warning', bg: 'warning-subtle', emoji: '🟡' };
  } else {
    overall = { label: 'Sehat', color: 'success', bg: 'success-subtle', emoji: '🟢' };
  }

  return (
    <Card className="mb-3 border-2" style={{ borderColor: `var(--bs-${overall.color})` }}>
      <Card.Header className={`bg-${overall.bg}`}>
        <h5 className="mb-1">📌 Ringkasan Kesehatan Keuangan Owner</h5>
        <span className={`text-${overall.color} fw-bold`}>
          {overall.emoji} Kondisi Bulan Ini: {overall.label}
        </span>
      </Card.Header>
      <Card.Body className="p-0">
        <Table bordered size="sm" className="mb-0">
          <tbody>
            <MetricRow
              emoji="💰"
              label="Tingkat Koleksi"
              value={`${financialRatios.collectionRatePercent}%`}
              status={colRate.label}
              color={colRate.color}
              note="Pembayaran diterima / Total tagihan bulan ini"
            />
            <MetricRow
              emoji="📈"
              label="Marjin Laba Bersih"
              value={`${profitLoss.netProfitMarginPercent}%`}
              status={npmLabel.label}
              color={npmLabel.color}
              note="Laba bersih / Total pendapatan"
            />
            <MetricRow
              emoji="🧾"
              label="Rasio Pengeluaran"
              value={`${financialRatios.expenseRatioPercent}%`}
              status={expLabel.label}
              color={expLabel.color}
              note="Total pengeluaran / Total pendapatan"
            />
            <MetricRow
              emoji="🏠"
              label="Tingkat Okupansi"
              value={`${occupancy.occupancyRatePercent}%`}
              status={occLabel.label}
              color={occLabel.color}
              note="Stay aktif / Kamar operasional (snapshot)"
            />
            <MetricRow
              emoji="⏳"
              label="Tingkat Tunggakan"
              value={`${financialRatios.overdueRateSnapshotPercent}%`}
              status={ovdLabel.label}
              color={ovdLabel.color}
              note="Total overdue / Tagihan bulan ini (snapshot)"
            />
            <MetricRow
              emoji="💸"
              label="Arus Kas Bersih"
              value={`Rp ${formatRupiah(cashFlow.netCashFlowRupiah)}`}
              status={cfLabel.label}
              color={cfLabel.color}
              note="Kas masuk - Kas keluar bulan ini"
            />
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

function MetricRow({
  emoji,
  label,
  value,
  status,
  color,
  note,
}: {
  emoji: string;
  label: string;
  value: string;
  status: string;
  color: string;
  note: string;
}) {
  return (
    <tr>
      <td style={{ width: 180 }}>
        {emoji} <strong>{label}</strong>
      </td>
      <td className="text-end" style={{ width: 100 }}>
        <strong>{value}</strong>
      </td>
      <td className="text-center" style={{ width: 130 }}>
        <Badge bg={color}>{status}</Badge>
      </td>
      <td className="text-muted small">{note}</td>
    </tr>
  );
}

function LockedFormalRatios() {
  const ratios = [
    {
      name: 'Current Ratio',
      formula: 'Aset Lancar / Kewajiban Lancar',
      reason:
        'Belum dapat dihitung akurat karena data kas/bank aktual dan current liabilities belum dimodelkan.',
    },
    {
      name: 'Acid-Test / Quick Ratio',
      formula: '(Aset Lancar - Inventory) / Kewajiban Lancar',
      reason:
        'Belum dapat dihitung akurat karena data kas/bank aktual, inventory, dan current liabilities belum dimodelkan.',
    },
    {
      name: 'ROCE (Return on Capital Employed)',
      formula: 'EBIT / (Total Aset - Kewajiban Lancar)',
      reason:
        'Belum dapat dihitung akurat karena nilai aset, depresiasi, dan capital employed belum dimodelkan.',
    },
    {
      name: 'Debt-to-Equity Ratio',
      formula: 'Total Kewajiban / Total Ekuitas',
      reason:
        'Belum dapat dihitung akurat karena data utang jangka panjang, ekuitas pemilik, dan akumulasi laba belum dimodelkan.',
    },
  ];

  return (
    <Card className="mb-3 border-secondary">
      <Card.Header className="bg-light">
        <h5 className="mb-0 text-muted">🔒 Rasio Akuntansi Formal — Belum Cukup Data</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table bordered size="sm" className="mb-0">
          <tbody>
            {ratios.map((r) => (
              <tr key={r.name}>
                <td style={{ width: 200 }}>
                  <strong>{r.name}</strong>
                  <br />
                  <span className="text-muted small">{r.formula}</span>
                </td>
                <td>
                  <Badge bg="secondary" className="me-2">
                    🔒 Tidak Tersedia
                  </Badge>
                  <span className="text-muted small">{r.reason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

// --- M10-D: CSV Export ---

interface ReportQueryState {
  isLoading: boolean;
  isError: boolean;
  data?: unknown;
}

function allReady(queries: ReportQueryState[]): boolean {
  return queries.every((q) => !q.isLoading && !q.isError && q.data !== undefined);
}

function buildOwnerReportsCsv(params: {
  ym: { year: number; month: number };
  monthlyIncome: MonthlyIncome;
  cashFlow: CashFlow;
  overdueAging: OverdueAging;
  depositLiability: DepositLiability;
  expenseSummary: ExpenseSummary;
  profitLoss: ProfitLoss;
  financialRatios: FinancialRatios;
  occupancy: Occupancy;
}): string {
  const { ym, monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy } = params;
  const monthLabel = new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const sections: string[] = [];

  // 1. Ringkasan Kesehatan Keuangan
  const colRate = collectionRateLabel(financialRatios.collectionRatePercent);
  const npmLabel = netProfitMarginLabel(profitLoss.netProfitMarginPercent);
  const expLabel = expenseRatioLabel(financialRatios.expenseRatioPercent);
  const occLabel = occupancyRateLabel(occupancy.occupancyRatePercent);
  const ovdLabel = overdueRateLabel(financialRatios.overdueRateSnapshotPercent);
  const cfLabel = cashFlowLabel(cashFlow.netCashFlowRupiah);
  const isBuruk = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Buruk');
  const isDipantau = [colRate, npmLabel, expLabel, occLabel, ovdLabel].some((m) => m.label === 'Perlu Dipantau');
  let overallLabel: string;
  if (isBuruk || cashFlow.netCashFlowRupiah < 0) overallLabel = 'Bermasalah';
  else if (isDipantau) overallLabel = 'Perlu Dipantau';
  else overallLabel = 'Sehat';
  sections.push(
    generateCsv([
      ['Ringkasan Kesehatan Keuangan Owner', monthLabel],
      ['Kondisi Bulan Ini', overallLabel],
      ['Tingkat Koleksi', `${financialRatios.collectionRatePercent}%`, colRate.label],
      ['Marjin Laba Bersih', `${profitLoss.netProfitMarginPercent}%`, npmLabel.label],
      ['Rasio Pengeluaran', `${financialRatios.expenseRatioPercent}%`, expLabel.label],
      ['Tingkat Okupansi', `${occupancy.occupancyRatePercent}%`, occLabel.label],
      ['Tingkat Tunggakan', `${financialRatios.overdueRateSnapshotPercent}%`, ovdLabel.label],
      ['Arus Kas Bersih', `Rp ${formatRupiah(cashFlow.netCashFlowRupiah)}`, cfLabel.label],
      [''],
    ]),
  );

  // 2. Pendapatan Bulanan
  sections.push(
    generateCsv([
      [`Pendapatan Bulanan — ${monthLabel}`],
      ['Total Tagihan', `Rp ${formatRupiah(monthlyIncome.totalBilledRupiah)}`],
      ['Total Dibayar', `Rp ${formatRupiah(monthlyIncome.totalPaidRupiah)}`],
      ['Pendapatan WiFi', `Rp ${formatRupiah(monthlyIncome.totalWifiRevenueRupiah)}`],
      ['Outstanding', `Rp ${formatRupiah(monthlyIncome.outstandingRupiah)}`],
      ['Jumlah Tagihan', String(monthlyIncome.invoiceCount)],
      ['— Lunas', String(monthlyIncome.paidInvoiceCount)],
      ['— Sebagian', String(monthlyIncome.partialInvoiceCount)],
      ['— Belum Bayar', String(monthlyIncome.unpaidInvoiceCount)],
      [''],
    ]),
  );

  // 3. Arus Kas
  sections.push(
    generateCsv([
      [`Arus Kas — ${monthLabel}`],
      ['Kas Masuk (Invoice + WiFi)', `Rp ${formatRupiah(cashFlow.cashIn.totalRupiah)}`],
      ['— Pembayaran Invoice', `Rp ${formatRupiah(cashFlow.cashIn.invoicePaymentsRupiah)}`],
      ['— Penjualan WiFi', `Rp ${formatRupiah(cashFlow.cashIn.wifiSalesRupiah)}`],
      ['Kas Keluar (Pengeluaran)', `Rp ${formatRupiah(cashFlow.cashOut.expensesRupiah)}`],
      ['Arus Kas Bersih', `Rp ${formatRupiah(cashFlow.netCashFlowRupiah)}`],
      [''],
    ]),
  );

  // 4. Aging Tunggakan
  const b = overdueAging.buckets;
  sections.push(
    generateCsv([
      ['Aging Tunggakan', `Per ${overdueAging.asOf}`],
      ['Umur', 'Jumlah Tagihan', 'Total Rupiah'],
      ['Current / Belum Jatuh Tempo', String(b.current.count), `Rp ${formatRupiah(b.current.totalRupiah)}`],
      ['1–30 hari', String(b.days1to30.count), `Rp ${formatRupiah(b.days1to30.totalRupiah)}`],
      ['31–60 hari', String(b.days31to60.count), `Rp ${formatRupiah(b.days31to60.totalRupiah)}`],
      ['61–90 hari', String(b.days61to90.count), `Rp ${formatRupiah(b.days61to90.totalRupiah)}`],
      ['91+ hari', String(b.days91plus.count), `Rp ${formatRupiah(b.days91plus.totalRupiah)}`],
      ['Total Tunggakan', String(overdueAging.totalOverdueCount), `Rp ${formatRupiah(overdueAging.totalOverdueRupiah)}`],
      [''],
    ]),
  );

  // 5. Liabilitas Deposit
  sections.push(
    generateCsv([
      ['Liabilitas Deposit'],
      ['Total Deposit Dinilai', `Rp ${formatRupiah(depositLiability.totalDepositAmountRupiah)}`],
      ['Sudah Dibayar', `Rp ${formatRupiah(depositLiability.totalDepositPaidRupiah)}`],
      ['Outstanding Deposit', `Rp ${formatRupiah(depositLiability.totalDepositOutstandingRupiah)}`],
      ['Stay Aktif (dengan deposit)', String(depositLiability.activeStayCount)],
      ['— Lunas', String(depositLiability.fullyPaidCount)],
      ['— Sebagian', String(depositLiability.partiallyPaidCount)],
      ['— Belum Bayar', String(depositLiability.unpaidCount)],
      [''],
    ]),
  );

  // 6. Pengeluaran per Kategori
  const expLines: string[][] = [[`Pengeluaran per Kategori — ${monthLabel}`], ['Kategori', 'Jumlah', 'Rupiah']];
  for (const c of expenseSummary.categories) {
    expLines.push([EXPENSE_CATEGORY_LABELS[c.category] ?? c.category, String(c.count), `Rp ${formatRupiah(c.totalRupiah)}`]);
  }
  expLines.push(['Total Pengeluaran', '', `Rp ${formatRupiah(expenseSummary.totalExpenseRupiah)}`], ['']);
  sections.push(generateCsv(expLines));

  // 7. Profit & Loss
  const plLines: string[][] = [
    [`Profit & Loss (Laba Rugi) — ${monthLabel}`],
    ['Pos', 'Rupiah'],
    ['Pendapatan Invoice', `Rp ${formatRupiah(profitLoss.invoiceRevenueRupiah)}`],
    ['Pendapatan WiFi', `Rp ${formatRupiah(profitLoss.wifiRevenueRupiah)}`],
    ['Total Pendapatan', `Rp ${formatRupiah(profitLoss.totalRevenueRupiah)}`],
    ['Total Pengeluaran', `Rp ${formatRupiah(profitLoss.totalExpenseRupiah)}`],
  ];
  for (const c of profitLoss.expenseCategories) {
    plLines.push([`— ${EXPENSE_CATEGORY_LABELS[c.category] ?? c.category}`, `Rp ${formatRupiah(c.totalRupiah)}`]);
  }
  plLines.push(
    ['Laba/Rugi Bersih', `Rp ${formatRupiah(profitLoss.netProfitRupiah)}`],
    ['Marjin Laba Bersih', `${profitLoss.netProfitMarginPercent}%`],
    [''],
  );
  sections.push(generateCsv(plLines));

  // 8. Rasio Keuangan
  sections.push(
    generateCsv([
      [`Rasio Keuangan — ${monthLabel}`],
      ['Rasio', 'Nilai'],
      ['Marjin Laba Bersih', `${financialRatios.netProfitMarginPercent}%`],
      ['Tingkat Koleksi', `${financialRatios.collectionRatePercent}%`],
      ['Rasio Pengeluaran', `${financialRatios.expenseRatioPercent}%`],
      ['Tingkat Tunggakan (Snapshot)', `${financialRatios.overdueRateSnapshotPercent}%`],
      ['Okupansi (Snapshot)', `${financialRatios.occupancyRatePercent}%`],
      ['Catatan Tunggakan', financialRatios.overdueRateSnapshotNote],
      ['Catatan Okupansi', financialRatios.occupancyRateNote],
      [''],
    ]),
  );

  // 9. Okupansi
  sections.push(
    generateCsv([
      [`Okupansi & Revenue per Room — ${monthLabel}`],
      ['Metrik', 'Nilai'],
      ['Total Kamar Operasional', String(occupancy.totalOperableRooms)],
      ['Kamar Terisi (Stay Aktif)', String(occupancy.occupiedRooms)],
      ['Tingkat Okupansi', `${occupancy.occupancyRatePercent}%`],
      ['Total Tagihan Bulan Ini', `Rp ${formatRupiah(occupancy.totalBilledRupiah)}`],
      ['Revenue per Kamar Terisi', `Rp ${formatRupiah(occupancy.revenuePerOccupiedRoomRupiah)}`],
      ['Catatan Okupansi', occupancy.occupancyNote],
      ['Catatan Revenue', occupancy.revenueNote],
      [''],
    ]),
  );

  return sections.join('\r\n');
}

function ExportAllCsvButton({
  ym,
  monthlyIncome,
  cashFlow,
  overdueAging,
  depositLiability,
  expenseSummary,
  profitLoss,
  financialRatios,
  occupancy,
}: {
  ym: { year: number; month: number };
  monthlyIncome: ReportQueryState & { data?: MonthlyIncome };
  cashFlow: ReportQueryState & { data?: CashFlow };
  overdueAging: ReportQueryState & { data?: OverdueAging };
  depositLiability: ReportQueryState & { data?: DepositLiability };
  expenseSummary: ReportQueryState & { data?: ExpenseSummary };
  profitLoss: ReportQueryState & { data?: ProfitLoss };
  financialRatios: ReportQueryState & { data?: FinancialRatios };
  occupancy: ReportQueryState & { data?: Occupancy };
}) {
  const queries = [monthlyIncome, cashFlow, overdueAging, depositLiability, expenseSummary, profitLoss, financialRatios, occupancy];
  const ready = allReady(queries);

  const handleExport = useCallback(() => {
    if (!ready) return;
    const csv = buildOwnerReportsCsv({
      ym,
      monthlyIncome: monthlyIncome.data!,
      cashFlow: cashFlow.data!,
      overdueAging: overdueAging.data!,
      depositLiability: depositLiability.data!,
      expenseSummary: expenseSummary.data!,
      profitLoss: profitLoss.data!,
      financialRatios: financialRatios.data!,
      occupancy: occupancy.data!,
    });
    const mm = String(ym.month).padStart(2, '0');
    downloadCsv(csv, `kost48-owner-reports-${ym.year}-${mm}.csv`);
  }, [ready, ym, monthlyIncome.data, cashFlow.data, overdueAging.data, depositLiability.data, expenseSummary.data, profitLoss.data, financialRatios.data, occupancy.data]);

  return (
    <Button
      variant="outline-primary"
      size="sm"
      disabled={!ready}
      onClick={handleExport}
      title={ready ? 'Unduh semua laporan sebagai CSV' : 'Menunggu data laporan selesai dimuat'}
    >
      ⬇ Ekspor Semua CSV
    </Button>
  );
}

function MonthlyIncomeTable({ data }: { data: MonthlyIncome }) {
  return (
    <Table bordered size="sm" className="mb-0">
      <tbody>
        <tr><td>Total Tagihan</td><td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td></tr>
        <tr><td>Total Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalPaidRupiah)}</td></tr>
        <tr><td>Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.totalWifiRevenueRupiah)}</td></tr>
        <tr className="table-warning"><td><strong>Outstanding</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.outstandingRupiah)}</strong></td></tr>
        <tr><td>Jumlah Tagihan</td><td className="text-end">{data.invoiceCount}</td></tr>
        <tr><td>— Lunas</td><td className="text-end"><Badge bg="success">{data.paidInvoiceCount}</Badge></td></tr>
        <tr><td>— Sebagian</td><td className="text-end"><Badge bg="warning">{data.partialInvoiceCount}</Badge></td></tr>
        <tr><td>— Belum Bayar</td><td className="text-end"><Badge bg="danger">{data.unpaidInvoiceCount}</Badge></td></tr>
      </tbody>
    </Table>
  );
}

function CashFlowTable({ data }: { data: CashFlow }) {
  const netColor = data.netCashFlowRupiah >= 0 ? 'text-success' : 'text-danger';
  return (
    <Table bordered size="sm" className="mb-0">
      <thead>
        <tr><th>Jenis</th><th className="text-end">Rupiah</th></tr>
      </thead>
      <tbody>
        <tr><td>🟢 Kas Masuk (Invoice + WiFi)</td><td className="text-end">Rp {formatRupiah(data.cashIn.totalRupiah)}</td></tr>
        <tr><td>— Pembayaran Invoice</td><td className="text-end">Rp {formatRupiah(data.cashIn.invoicePaymentsRupiah)}</td></tr>
        <tr><td>— Penjualan WiFi</td><td className="text-end">Rp {formatRupiah(data.cashIn.wifiSalesRupiah)}</td></tr>
        <tr><td>🔴 Kas Keluar (Pengeluaran)</td><td className="text-end">Rp {formatRupiah(data.cashOut.expensesRupiah)}</td></tr>
        <tr className={netColor}><td><strong>🔷 Arus Kas Bersih</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.netCashFlowRupiah)}</strong></td></tr>
      </tbody>
    </Table>
  );
}

function OverdueAgingTable({ data }: { data: OverdueAging }) {
  const b = data.buckets;
  return (
    <Table bordered size="sm" className="mb-0">
      <thead>
        <tr><th>Umur</th><th className="text-end">Jumlah Tagihan</th><th className="text-end">Total Rupiah</th></tr>
      </thead>
      <tbody>
        <tr className="table-success"><td>Current / Belum Jatuh Tempo</td><td className="text-end">{b.current.count}</td><td className="text-end">Rp {formatRupiah(b.current.totalRupiah)}</td></tr>
        <tr className="table-warning"><td>1–30 hari</td><td className="text-end">{b.days1to30.count}</td><td className="text-end">Rp {formatRupiah(b.days1to30.totalRupiah)}</td></tr>
        <tr className="table-warning"><td>31–60 hari</td><td className="text-end">{b.days31to60.count}</td><td className="text-end">Rp {formatRupiah(b.days31to60.totalRupiah)}</td></tr>
        <tr className="table-danger"><td>61–90 hari</td><td className="text-end">{b.days61to90.count}</td><td className="text-end">Rp {formatRupiah(b.days61to90.totalRupiah)}</td></tr>
        <tr className="table-danger"><td>91+ hari</td><td className="text-end">{b.days91plus.count}</td><td className="text-end">Rp {formatRupiah(b.days91plus.totalRupiah)}</td></tr>
        <tr className="fw-bold"><td>Total Tunggakan</td><td className="text-end">{data.totalOverdueCount}</td><td className="text-end">Rp {formatRupiah(data.totalOverdueRupiah)}</td></tr>
        <tr><td colSpan={3} className="text-muted small">Per {data.asOf}</td></tr>
      </tbody>
    </Table>
  );
}

function DepositLiabilityTable({ data }: { data: DepositLiability }) {
  return (
    <Table bordered size="sm" className="mb-0">
      <tbody>
        <tr><td>Total Deposit Dinilai</td><td className="text-end">Rp {formatRupiah(data.totalDepositAmountRupiah)}</td></tr>
        <tr><td>Sudah Dibayar</td><td className="text-end">Rp {formatRupiah(data.totalDepositPaidRupiah)}</td></tr>
        <tr className="table-warning"><td><strong>Outstanding Deposit</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.totalDepositOutstandingRupiah)}</strong></td></tr>
        <tr><td>Stay Aktif (dengan deposit)</td><td className="text-end">{data.activeStayCount}</td></tr>
        <tr><td>— Lunas</td><td className="text-end"><Badge bg="success">{data.fullyPaidCount}</Badge></td></tr>
        <tr><td>— Sebagian</td><td className="text-end"><Badge bg="warning">{data.partiallyPaidCount}</Badge></td></tr>
        <tr><td>— Belum Bayar</td><td className="text-end"><Badge bg="danger">{data.unpaidCount}</Badge></td></tr>
      </tbody>
    </Table>
  );
}

function ExpenseSummaryTable({ data }: { data: ExpenseSummary }) {
  return (
    <>
      <p className="mb-1"><strong>Total Pengeluaran:</strong> Rp {formatRupiah(data.totalExpenseRupiah)}</p>
      <Table bordered size="sm" className="mb-0">
        <thead>
          <tr><th>Kategori</th><th className="text-end">Jumlah</th><th className="text-end">Rupiah</th></tr>
        </thead>
        <tbody>
          {data.categories.map((c) => (
            <tr key={c.category}>
              <td>{EXPENSE_CATEGORY_LABELS[c.category] ?? c.category}</td>
              <td className="text-end">{c.count}</td>
              <td className="text-end">Rp {formatRupiah(c.totalRupiah)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function ProfitLossTable({ data }: { data: ProfitLoss }) {
  const netColor = data.netProfitRupiah >= 0 ? 'text-success' : 'text-danger';
  return (
    <Table bordered size="sm" className="mb-0">
      <thead>
        <tr><th>Pos</th><th className="text-end">Rupiah</th></tr>
      </thead>
      <tbody>
        <tr><td>🟢 Pendapatan Invoice</td><td className="text-end">Rp {formatRupiah(data.invoiceRevenueRupiah)}</td></tr>
        <tr><td>🟢 Pendapatan WiFi</td><td className="text-end">Rp {formatRupiah(data.wifiRevenueRupiah)}</td></tr>
        <tr className="fw-bold"><td>Total Pendapatan</td><td className="text-end">Rp {formatRupiah(data.totalRevenueRupiah)}</td></tr>
        <tr><td>🔴 Total Pengeluaran</td><td className="text-end">Rp {formatRupiah(data.totalExpenseRupiah)}</td></tr>
        {data.expenseCategories.length > 0 && data.expenseCategories.map((c) => (
          <tr key={c.category} className="text-muted small">
            <td className="ps-4">— {EXPENSE_CATEGORY_LABELS[c.category] ?? c.category}</td>
            <td className="text-end">Rp {formatRupiah(c.totalRupiah)}</td>
          </tr>
        ))}
        <tr className={netColor}><td><strong>🔷 Laba/Rugi Bersih</strong></td><td className="text-end"><strong>Rp {formatRupiah(data.netProfitRupiah)}</strong></td></tr>
        <tr><td><strong>📐 Marjin Laba Bersih</strong></td><td className="text-end"><strong>{data.netProfitMarginPercent}%</strong></td></tr>
      </tbody>
    </Table>
  );
}

function FinancialRatiosTable({ data }: { data: FinancialRatios }) {
  return (
    <Table bordered size="sm" className="mb-0">
      <thead>
        <tr><th>Rasio</th><th className="text-end">Nilai</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Marjin Laba Bersih</td>
          <td className="text-end"><strong>{data.netProfitMarginPercent}%</strong></td>
        </tr>
        <tr>
          <td>Tingkat Koleksi (Pembayaran / Tagihan)</td>
          <td className="text-end"><strong>{data.collectionRatePercent}%</strong></td>
        </tr>
        <tr>
          <td>Rasio Pengeluaran (Expense / Revenue)</td>
          <td className="text-end"><strong>{data.expenseRatioPercent}%</strong></td>
        </tr>
        <tr>
          <td>Tingkat Tunggakan (Snapshot) *</td>
          <td className="text-end"><strong>{data.overdueRateSnapshotPercent}%</strong></td>
        </tr>
        <tr>
          <td>Okupansi (Snapshot) **</td>
          <td className="text-end"><strong>{data.occupancyRatePercent}%</strong></td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td colSpan={2} className="text-muted small">
          * {data.overdueRateSnapshotNote}<br />
          ** {data.occupancyRateNote}
        </td></tr>
      </tfoot>
    </Table>
  );
}

function OccupancyTable({ data }: { data: Occupancy }) {
  return (
    <Table bordered size="sm" className="mb-0">
      <thead>
        <tr><th>Metrik</th><th className="text-end">Nilai</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Kamar Operasional</td>
          <td className="text-end"><strong>{data.totalOperableRooms}</strong></td>
        </tr>
        <tr>
          <td>Kamar Terisi (Stay Aktif)</td>
          <td className="text-end"><strong>{data.occupiedRooms}</strong></td>
        </tr>
        <tr>
          <td>Tingkat Okupansi</td>
          <td className="text-end"><strong>{data.occupancyRatePercent}%</strong></td>
        </tr>
        <tr>
          <td>Total Tagihan Bulan Ini</td>
          <td className="text-end">Rp {formatRupiah(data.totalBilledRupiah)}</td>
        </tr>
        <tr>
          <td>Revenue per Kamar Terisi (Estimasi)</td>
          <td className="text-end"><strong>Rp {formatRupiah(data.revenuePerOccupiedRoomRupiah)}</strong></td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td colSpan={2} className="text-muted small">
          * {data.occupancyNote}<br />
          ** {data.revenueNote}
        </td></tr>
      </tfoot>
    </Table>
  );
}
