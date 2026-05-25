import client from './client';
import type { ApiEnvelope } from '../types';

export type AccountingAccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type CashAccountType = 'CASH' | 'BANK' | 'QRIS' | 'EWALLET' | 'OTHER';
export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';
export type OpeningBalanceStatus = 'DRAFT' | 'POSTED' | 'VOID';

export type ChartOfAccount = {
  id: number;
  code: string;
  name: string;
  type: AccountingAccountType;
  normalBalance: NormalBalance;
  description?: string | null;
  parentId?: number | null;
  isSystemDefault?: boolean;
  isActive: boolean;
};

export type CashAccount = {
  id: number;
  name: string;
  accountType: CashAccountType;
  chartOfAccountId: number;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  holderName?: string | null;
  openingBalanceRupiah: number;
  currentBalanceRupiah: number;
  isDefault: boolean;
  isActive: boolean;
  notes?: string | null;
  chartOfAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type'>;
};

export type AccountingPeriod = {
  id: number;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  notes?: string | null;
};

export type OpeningBalanceLinePayload = {
  chartOfAccountId: number;
  description?: string;
  debitRupiah?: number;
  creditRupiah?: number;
  sortOrder?: number;
};

export type OpeningBalanceBatch = {
  id: number;
  batchNumber: string;
  accountingPeriodId?: number | null;
  cutoverDate: string;
  status: OpeningBalanceStatus;
  notes?: string | null;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  postedAt?: string | null;
  accountingPeriod?: AccountingPeriod | null;
  lines?: Array<OpeningBalanceLinePayload & { id: number; chartOfAccount?: ChartOfAccount }>;
};

export type AccountingReadiness = {
  ready: boolean;
  score: number;
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  gates: Array<{ key: string; label: string; ready: boolean; count?: number; note?: string }>;
  missing: string[];
  nextActions: string[];
  warnings: string[];
};

export type TrialBalanceLine = {
  accountId: number;
  code: string;
  name: string;
  type: AccountingAccountType;
  normalBalance: NormalBalance;
  debitRupiah: number;
  creditRupiah: number;
  balanceRupiah: number;
};

export type TrialBalance = {
  asOf: string;
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  isBalanced: boolean;
  lines: TrialBalanceLine[];
  note?: string;
};

export type BalanceSheetGuard = {
  ready: boolean;
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  readinessNote?: string;
  trialBalancePreview?: { asOf: string; totalDebitRupiah: number; totalCreditRupiah: number; isBalanced: boolean } | null;
  statement?: { assetsRupiah: number; liabilitiesRupiah: number; equityRupiah: number; liabilitiesAndEquityRupiah: number; balanced: boolean } | null;
};

export type PostingBoundary = {
  autoPostingEnabled: boolean;
  basis?: string;
  sourceTypes?: string[];
  behavior?: string;
  excluded?: string[];
  note?: string;
};

export type UnmappedTransactions = {
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  summary: {
    invoiceSampleCount: number;
    invoicePaymentSampleCount: number;
    expenseSampleCount: number;
    wifiSaleSampleCount: number;
    depositSnapshotSampleCount: number;
  };
  samples?: Record<string, unknown[]>;
  note?: string;
};

export type AutoJournalBackfillPayload = {
  sourceTypes?: Array<'INVOICE' | 'INVOICE_PAYMENT' | 'EXPENSE' | 'WIFI_SALE'>;
  limit?: number;
};

export type AutoJournalBackfillResult = {
  basis: string;
  limit: number;
  sourceTypes: string[];
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: string[];
  items: Array<{ sourceType: string; sourceId: number; result: unknown }>;
  note?: string;
};


export type AutoJournalLine = {
  id: number;
  chartOfAccountId: number;
  cashAccountId?: number | null;
  description?: string | null;
  debitRupiah: number;
  creditRupiah: number;
  sortOrder: number;
  chartOfAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type' | 'normalBalance'> | null;
  cashAccount?: Pick<CashAccount, 'id' | 'name' | 'accountType' | 'isDefault'> | null;
};

export type AutoJournalEntry = {
  id: number;
  entryNumber: string;
  entryDate: string;
  accountingPeriod?: Pick<AccountingPeriod, 'id' | 'year' | 'month' | 'status'> | null;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  sourceType: string;
  sourceId?: string | null;
  memo?: string | null;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  isBalanced: boolean;
  postedAt?: string | null;
  createdAt: string;
  lines: AutoJournalLine[];
};

export type RecentAutoJournals = {
  basis: string;
  ledgerBacked: boolean;
  sourceTypes: string[];
  limit: number;
  items: AutoJournalEntry[];
  note?: string;
};

export type JournalBySourceResult = {
  basis: string;
  ledgerBacked: boolean;
  sourceType: string;
  sourceId: string;
  found: boolean;
  item: AutoJournalEntry | null;
  note?: string;
};

export type CreateCashAccountPayload = {
  name: string;
  accountType: CashAccountType;
  chartOfAccountId: number;
  bankName?: string;
  accountNumberMasked?: string;
  holderName?: string;
  openingBalanceRupiah?: number;
  currentBalanceRupiah?: number;
  isDefault?: boolean;
  isActive?: boolean;
  notes?: string;
};

export type CreatePeriodPayload = {
  year: number;
  month: number;
  startDate?: string;
  endDate?: string;
  status?: AccountingPeriodStatus;
  notes?: string;
};

export type CreateOpeningBalanceDraftPayload = {
  batchNumber?: string;
  accountingPeriodId?: number;
  cutoverDate: string;
  notes?: string;
  lines: OpeningBalanceLinePayload[];
};

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

export async function fetchCashAccounts(params?: { accountType?: CashAccountType; isActive?: boolean; search?: string }) {
  return unwrap<CashAccount[]>(client.get('/accounting/cash-accounts', { params }));
}

export async function createCashAccount(payload: CreateCashAccountPayload) {
  return unwrap<CashAccount>(client.post('/accounting/cash-accounts', payload));
}

export async function fetchAccountingPeriods(params?: { year?: number; month?: number; status?: AccountingPeriodStatus }) {
  return unwrap<AccountingPeriod[]>(client.get('/accounting/periods', { params }));
}

export async function createAccountingPeriod(payload: CreatePeriodPayload) {
  return unwrap<AccountingPeriod>(client.post('/accounting/periods', payload));
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

export async function fetchJournalBySource(params: { sourceType: string; sourceId: string | number }) {
  return unwrap<JournalBySourceResult>(client.get('/accounting/journal-by-source', { params }));
}
