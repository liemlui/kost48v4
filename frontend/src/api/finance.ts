import client from './client';
import type { ApiEnvelope } from '../types';

export type FinanceReadiness = {
  ready: boolean;
  missing: string[];
  assumptions: string[];
  nextDataNeeded: string[];
};

export type FinanceSignal = {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';
  ruleId: string;
  title: string;
  message: string;
  count?: number;
  actionRoute?: string;
};

export type BusinessHealthSummary = {
  year: number;
  month: number;
  score: number;
  grade: 'AMAN' | 'PERHATIAN' | 'RISIKO' | 'KRITIS';
  headline: string;
  metrics: Record<string, number>;
  signals: FinanceSignal[];
  financeReadiness: FinanceReadiness;
  assumptions: string[];
  generatedAt: string;
};

export type OccupancyFinanceSummary = {
  year: number;
  month: number;
  totalRooms: number;
  operableRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
  occupancyRatePercent: number;
  totalBilledRupiah: number;
  revenuePerOccupiedRoomRupiah: number;
  openTicketCount: number;
  points: { label: string; value: number; route: string }[];
  note: string;
};

export type BalanceSheetDraft = {
  year: number;
  month: number;
  status: string;
  ready: boolean;
  assets: { key: string; label: string; amountRupiah: number | null; source: string; confidence: string }[];
  liabilities: { key: string; label: string; amountRupiah: number | null; source: string; confidence: string }[];
  equity: { key: string; label: string; amountRupiah: number | null; source: string; confidence: string }[];
  totals: { knownAssetsRupiah: number; knownLiabilitiesRupiah: number; knownEquityRupiah: number | null; equationBalanced: boolean };
  readiness: FinanceReadiness;
  note: string;
};

export type OwnerDashboardKpi = {
  totalRevenueRupiah: number;
  totalRevenuePrevMonthRupiah: number;
  totalRevenueChangePercent: number;
  netProfitRupiah: number;
  netProfitPrevMonthRupiah: number;
  netProfitChangePercent: number;
  netProfitMarginPercent: number;
  occupancyRatePercent: number;
  occupancyRatePrevMonthPercent: number | null;
  occupancyRateChangePercent: number | null;
  netCashFlowRupiah: number;
  netCashFlowPrevMonthRupiah: number;
  netCashFlowChangePercent: number;
};

export type OwnerDashboardSignal = {
  type: string;
  count: number;
  totalRupiah?: number;
  route: string;
};

export type OwnerDashboardTrendMonth = {
  year: number;
  month: number;
  revenue: number;
  expense: number;
  netProfit: number;
};

export type OwnerDashboard = {
  year: number;
  month: number;
  grade: string;
  score: number;
  headline: string;
  kpi: OwnerDashboardKpi;
  signals: OwnerDashboardSignal[];
  trendMonths: OwnerDashboardTrendMonth[];
  trend6Months: OwnerDashboardTrendMonth[];
  generatedAt: string;
};

function params(year?: number, month?: number, trendMonths?: number) {
  return {
    ...(year ? { year } : {}),
    ...(month ? { month } : {}),
    ...(trendMonths ? { trendMonths } : {}),
  };
}

export async function fetchBusinessHealth(year?: number, month?: number) {
  const response = await client.get<ApiEnvelope<BusinessHealthSummary>>('/finance/business-health', { params: params(year, month) });
  return response.data.data;
}

export async function fetchFinanceOccupancySummary(year?: number, month?: number) {
  const response = await client.get<ApiEnvelope<OccupancyFinanceSummary>>('/finance/occupancy/summary', { params: params(year, month) });
  return response.data.data;
}

export async function fetchFormalRatiosReadiness() {
  const response = await client.get<ApiEnvelope<FinanceReadiness>>('/finance/formal-ratios/readiness');
  return response.data.data;
}

export async function fetchBalanceSheetDraft(year?: number, month?: number) {
  const response = await client.get<ApiEnvelope<BalanceSheetDraft>>('/finance/balance-sheet/draft', { params: params(year, month) });
  return response.data.data;
}

export async function fetchOwnerDashboard(year?: number, month?: number, trendMonths?: number) {
  const response = await client.get<ApiEnvelope<OwnerDashboard>>('/finance/owner-dashboard', { params: params(year, month, trendMonths) });
  return response.data.data;
}
