import apiClient from './client';

export interface MonthlyIncome {
  year: number;
  month: number;
  totalBilledRupiah: number;
  totalPaidRupiah: number;
  totalWifiRevenueRupiah: number;
  outstandingRupiah: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  partialInvoiceCount: number;
  unpaidInvoiceCount: number;
}

export interface OverdueBucket {
  count: number;
  totalRupiah: number;
}

export interface OverdueAging {
  asOf: string;
  buckets: {
    current: OverdueBucket;
    days1to30: OverdueBucket;
    days31to60: OverdueBucket;
    days61to90: OverdueBucket;
    days91plus: OverdueBucket;
  };
  totalOverdueRupiah: number;
  totalOverdueCount: number;
}

export interface DepositLiability {
  totalDepositAmountRupiah: number;
  totalDepositPaidRupiah: number;
  totalDepositOutstandingRupiah: number;
  activeStayCount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
}

export interface ExpenseCategorySummary {
  category: string;
  totalRupiah: number;
  count: number;
}

export interface ExpenseSummary {
  year: number;
  month: number;
  totalExpenseRupiah: number;
  categories: ExpenseCategorySummary[];
}

export interface CashFlow {
  year: number;
  month: number;
  cashIn: {
    invoicePaymentsRupiah: number;
    wifiSalesRupiah: number;
    totalRupiah: number;
  };
  cashOut: {
    expensesRupiah: number;
    totalRupiah: number;
  };
  netCashFlowRupiah: number;
}

export async function fetchMonthlyIncome(year: number, month: number): Promise<MonthlyIncome> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/monthly-income?${params}`);
  return res.data.data;
}

export async function fetchOverdueAging(asOf?: string): Promise<OverdueAging> {
  const params = asOf ? `?asOf=${asOf}` : '';
  const res = await apiClient.get(`/reports/overdue-aging${params}`);
  return res.data.data;
}

export async function fetchDepositLiability(): Promise<DepositLiability> {
  const res = await apiClient.get('/reports/deposit-liability');
  return res.data.data;
}

export async function fetchExpenseSummary(year: number, month: number): Promise<ExpenseSummary> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/expense-summary?${params}`);
  return res.data.data;
}

export async function fetchCashFlow(year: number, month: number): Promise<CashFlow> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/cash-flow?${params}`);
  return res.data.data;
}

// --- M10-B: New report types ---

export interface ProfitLoss {
  year: number;
  month: number;
  invoiceRevenueRupiah: number;
  wifiRevenueRupiah: number;
  totalRevenueRupiah: number;
  totalExpenseRupiah: number;
  netProfitRupiah: number;
  netProfitMarginPercent: number;
  expenseCategories: {
    category: string;
    totalRupiah: number;
    count: number;
  }[];
}

export interface FinancialRatios {
  year: number;
  month: number;
  netProfitMarginPercent: number;
  collectionRatePercent: number;
  expenseRatioPercent: number;
  overdueRateSnapshotPercent: number;
  overdueRateSnapshotNote: string;
  occupancyRatePercent: number;
  occupancyRateNote: string;
}

export interface Occupancy {
  year: number;
  month: number;
  totalOperableRooms: number;
  occupiedRooms: number;
  occupancyRatePercent: number;
  occupancyNote: string;
  totalBilledRupiah: number;
  revenuePerOccupiedRoomRupiah: number;
  revenueNote: string;
}

export async function fetchProfitLoss(year: number, month: number): Promise<ProfitLoss> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/profit-loss?${params}`);
  return res.data.data;
}

export async function fetchFinancialRatios(year: number, month: number): Promise<FinancialRatios> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/financial-ratios?${params}`);
  return res.data.data;
}

export async function fetchOccupancy(year: number, month: number): Promise<Occupancy> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await apiClient.get(`/reports/occupancy?${params}`);
  return res.data.data;
}
