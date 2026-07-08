import client from './client';
import type { ApiEnvelope } from '../types';
export * from './accounting-types';
import type {
  AccountingReadiness, AccountingAccountType, CashAccountType, AccountingPeriodStatus,
  AccountingPeriod, ChartOfAccount, CashAccount, OpeningBalanceBatch, OpeningBalanceStatus,
  PeriodReopenPostResult, ReopenAccountingPeriodPayload,
  CreateOpeningBalanceDraftPayload, CreateCashAccountPayload, CreatePeriodPayload,
  UpdatePeriodPayload,
  TrialBalance, BalanceSheetGuard, AssetReadiness, ProfitLossLite,
  PeriodAutoClosePolicy, PeriodAutoCloseRunPayload, PeriodCloseReadiness,
  PeriodClosePreview, PeriodClosePayload, PeriodClosePostResult,
  PeriodReopenPreview, PeriodReopenPayload, PostingBoundary, UnmappedTransactions,
  AutoJournalBackfillPayload, AutoJournalBackfillResult, RecentAutoJournals,
  DepositPosition, DepositReconciliation, DepositBackfillDryRunResult,
  ReversalWatch, JournalBySourceResult,
  CashflowStatement, FinancialRatiosStatement, ProfitLossDetail, BalanceSheetDetail,
  CreateChartOfAccountPayload, UpdateChartOfAccountPayload, UpdateCashAccountPayload,
} from './accounting-types';

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await promise;
  return response.data.data;
}

export async function fetchAccountingReadiness() {
  return unwrap<AccountingReadiness>(client.get('/accounting/readiness'));
}

export async function seedDefaultCoa() {
  return unwrap<{ seededCount: number; accounts: Array<{ id: number; code: string; name: string }> }>(client.post('/accounting/default-coa/seed'));
}

export async function fetchAccounts(params?: { type?: AccountingAccountType; isActive?: boolean; search?: string }) {
  return unwrap<ChartOfAccount[]>(client.get('/accounting/accounts', { params }));
}

export async function createAccount(payload: CreateChartOfAccountPayload) {
  return unwrap<ChartOfAccount>(client.post('/accounting/accounts', payload));
}

export async function updateAccount(id: number, payload: UpdateChartOfAccountPayload) {
  return unwrap<ChartOfAccount>(client.patch(`/accounting/accounts/${id}`, payload));
}

export async function fetchCashAccounts(params?: { accountType?: CashAccountType; isActive?: boolean; search?: string }) {
  return unwrap<CashAccount[]>(client.get('/accounting/cash-accounts', { params }));
}

export async function createCashAccount(payload: CreateCashAccountPayload) {
  return unwrap<CashAccount>(client.post('/accounting/cash-accounts', payload));
}

export async function updateCashAccount(id: number, payload: UpdateCashAccountPayload) {
  return unwrap<CashAccount>(client.patch(`/accounting/cash-accounts/${id}`, payload));
}

export async function fetchAccountingPeriods(params?: { year?: number; month?: number; status?: AccountingPeriodStatus }) {
  return unwrap<AccountingPeriod[]>(client.get('/accounting/periods', { params }));
}

export async function createAccountingPeriod(payload: CreatePeriodPayload) {
  return unwrap<AccountingPeriod>(client.post('/accounting/periods', payload));
}

export async function updateAccountingPeriod(id: number, payload: UpdatePeriodPayload) {
  return unwrap<AccountingPeriod>(client.patch(`/accounting/periods/${id}`, payload));
}

export async function reopenAccountingPeriod(id: number, payload: ReopenAccountingPeriodPayload) {
  return unwrap<PeriodReopenPostResult>(client.patch(`/accounting/periods/${id}/reopen`, payload));
}

export async function fetchOpeningBalances(params?: { status?: OpeningBalanceStatus }) {
  return unwrap<OpeningBalanceBatch[]>(client.get('/accounting/opening-balances', { params }));
}

export async function createOpeningBalanceDraft(payload: CreateOpeningBalanceDraftPayload) {
  return unwrap<OpeningBalanceBatch>(client.post('/accounting/opening-balances/draft', payload));
}

export async function postOpeningBalance(id: number) {
  return unwrap<{ openingBalance: OpeningBalanceBatch; journalEntry: unknown; note: string }>(client.post(`/accounting/opening-balances/${id}/post`));
}

export async function voidOpeningBalance(id: number) {
  return unwrap<OpeningBalanceBatch>(client.patch(`/accounting/opening-balances/${id}/void`));
}

export async function fetchTrialBalance(params?: { asOf?: string }) {
  return unwrap<TrialBalance>(client.get('/accounting/trial-balance', { params }));
}

export async function fetchBalanceSheetGuard(params?: { asOf?: string }) {
  return unwrap<BalanceSheetGuard>(client.get('/accounting/balance-sheet', { params }));
}

export async function fetchAssetReadiness() {
  return unwrap<AssetReadiness>(client.get('/accounting/asset-readiness'));
}

export async function fetchProfitLossLite(params?: { asOf?: string; year?: number; month?: number }) {
  return unwrap<ProfitLossLite>(client.get('/accounting/profit-loss', { params }));
}

export async function fetchPeriodAutoClosePolicy() {
  return unwrap<PeriodAutoClosePolicy>(client.get('/accounting/period-close/auto-policy'));
}

export async function runPeriodAutoClose(payload: PeriodAutoCloseRunPayload = {}) {
  return unwrap<PeriodAutoClosePolicy>(client.post('/accounting/period-close/auto-run', payload));
}

export async function fetchPeriodCloseReadiness(params: { year: number; month: number }) {
  return unwrap<PeriodCloseReadiness>(client.get('/accounting/period-close/readiness', { params }));
}

export async function previewPeriodClose(payload: PeriodClosePayload) {
  return unwrap<PeriodClosePreview>(client.post('/accounting/period-close/preview', payload));
}

export async function postPeriodClose(payload: PeriodClosePayload) {
  return unwrap<PeriodClosePostResult>(client.post('/accounting/period-close/post', payload));
}

export async function previewPeriodReopen(payload: PeriodReopenPayload) {
  return unwrap<PeriodReopenPreview>(client.post('/accounting/period-close/reopen-preview', payload));
}

export async function postPeriodReopen(payload: PeriodReopenPayload) {
  return unwrap<PeriodReopenPostResult>(client.post('/accounting/period-close/reopen', payload));
}

export async function fetchPostingBoundary() {
  return unwrap<PostingBoundary>(client.get('/accounting/posting-boundary'));
}

export async function fetchUnmappedTransactions() {
  return unwrap<UnmappedTransactions>(client.get('/accounting/unmapped-transactions'));
}

export async function runAutoJournalBackfill(payload: AutoJournalBackfillPayload = {}) {
  return unwrap<AutoJournalBackfillResult>(client.post('/accounting/auto-journal/backfill', payload));
}

export async function fetchRecentAutoJournals(params?: { sourceTypes?: string[]; limit?: number }) {
  const query = {
    limit: params?.limit,
    sourceTypes: params?.sourceTypes?.join(','),
  };
  return unwrap<RecentAutoJournals>(client.get('/accounting/recent-journals', { params: query }));
}

export async function fetchDepositPosition() {
  return unwrap<DepositPosition>(client.get('/accounting/deposit-position'));
}

export async function fetchDepositReconciliation() {
  return unwrap<DepositReconciliation>(client.get('/accounting/deposit-reconciliation'));
}

export async function runDepositBackfillDryRun(payload: { limit?: number } = {}) {
  return unwrap<DepositBackfillDryRunResult>(client.post('/accounting/auto-journal/deposit-backfill/dry-run', payload));
}

export async function fetchReversalWatch() {
  return unwrap<ReversalWatch>(client.get('/accounting/reversal-watch'));
}

export async function fetchJournalBySource(params: { sourceType: string; sourceId: string | number }) {
  return unwrap<JournalBySourceResult>(client.get('/accounting/journal-by-source', { params }));
}

export async function fetchCashflowStatement(params?: { asOf?: string; year?: number; month?: number }) {
  return unwrap<CashflowStatement>(client.get('/accounting/cashflow', { params }));
}

export async function fetchFinancialRatios(params?: { asOf?: string; year?: number; month?: number }) {
  return unwrap<FinancialRatiosStatement>(client.get('/accounting/financial-ratios', { params }));
}

export async function fetchProfitLossDetail(params?: { asOf?: string; year?: number; month?: number }) {
  return unwrap<ProfitLossDetail>(client.get('/accounting/profit-loss/detail', { params }));
}

export async function fetchBalanceSheetDetail(params?: { asOf?: string; year?: number; month?: number }) {
  return unwrap<BalanceSheetDetail>(client.get('/accounting/balance-sheet/detail', { params }));
}
