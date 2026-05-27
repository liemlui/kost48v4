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
  key?: string;
  periodKey?: string;
  isCurrentPostingPeriod?: boolean;
  isPostingOpen?: boolean;
  postedJournalCount?: number;
  draftJournalCount?: number;
  closingJournalCount?: number;
  reversalJournalCount?: number;
  statusNarrative?: string;
  ownerAction?: 'OWNER_REOPEN_REQUIRED_FOR_NEW_POSTING' | 'REVIEW_BEFORE_CLOSE' | 'READ_ONLY_HISTORY' | string;
  closedAt?: string | null;
  closedById?: number | null;
  closingJournalEntryId?: number | null;
  closingNote?: string | null;
  closeBasis?: string | null;
  closeVersion?: number;
  reopenedAt?: string | null;
  reopenedById?: number | null;
  reopenJournalEntryId?: number | null;
  reopenReason?: string | null;
  reopenVersion?: number;
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

export type AccountingPostingPeriodReadiness = {
  ready: boolean;
  postingDate: string;
  key: string | null;
  id: number | null;
  year: number | null;
  month: number | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  warning: string | null;
  nextAction: string | null;
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
  postingPeriod?: AccountingPostingPeriodReadiness;
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

export type StatementLine = {
  accountId: number;
  code: string;
  name: string;
  type: AccountingAccountType;
  normalBalance?: NormalBalance;
  debitRupiah: number;
  creditRupiah: number;
  balanceRupiah?: number;
  amountRupiah?: number;
  isContraAsset?: boolean;
  presentationLabel?: string;
};

export type BalanceSheetGuard = {
  ready: boolean;
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  asOf?: string;
  readinessNote?: string;
  trialBalancePreview?: { asOf: string; totalDebitRupiah: number; totalCreditRupiah: number; isBalanced: boolean } | null;
  closing?: {
    latestClosedPeriod?: Pick<AccountingPeriod, 'id' | 'year' | 'month' | 'closedAt' | 'closingJournalEntryId' | 'closingNote' | 'closeBasis' | 'reopenedAt' | 'reopenJournalEntryId' | 'reopenReason'> | null;
    retainedEarningsActive?: boolean;
    note?: string;
  } | null;
  statement?: {
    assetsRupiah: number;
    currentAssetsRupiah?: number;
    grossFixedAssetsRupiah?: number;
    accumulatedDepreciationRupiah?: number;
    netFixedAssetsRupiah?: number;
    liabilitiesRupiah: number;
    equityRupiah: number;
    currentProfitRupiah?: number;
    equityIncludingCurrentProfitRupiah?: number;
    liabilitiesAndEquityRupiah: number;
    differenceRupiah?: number;
    balanced: boolean;
  } | null;
  lines?: {
    assets: StatementLine[];
    currentAssets?: StatementLine[];
    fixedAssets?: StatementLine[];
    contraAssets?: StatementLine[];
    liabilities: StatementLine[];
    equity: StatementLine[];
  } | null;
  assetRegisterDisclosure?: {
    basis: string;
    assetCount: number;
    registerAcquisitionCostRupiah: number;
    registerAccumulatedDepreciationRupiah: number;
    registerNetBookValueRupiah: number;
    ledgerGrossFixedAssetsRupiah: number;
    ledgerAccumulatedDepreciationRupiah: number;
    ledgerNetFixedAssetsRupiah: number;
    registerVsLedgerNetDifferenceRupiah: number;
    aligned: boolean;
    warning?: string;
  } | null;
};

export type ProfitLossLite = {
  asOf: string;
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  period?: {
    year: number;
    month: number;
    key: string;
    startDate: string;
    endDate: string;
    status: AccountingPeriodStatus | 'VIRTUAL';
  };
  closing?: {
    periodClosed: boolean;
    closingJournalEntryId?: number | null;
    closingEntryNumber?: string | null;
    closingPostedAt?: string | null;
    netIncomeClosedToRetainedEarnings?: number | null;
    reopenedAt?: string | null;
    reopenJournalEntryId?: number | null;
  };
  trialBalance: { totalDebitRupiah: number; totalCreditRupiah: number; isBalanced: boolean };
  totals: {
    revenueRupiah: number;
    cogsRupiah: number;
    expenseRupiah: number;
    netProfitRupiah: number;
    netProfitMarginPercent: number;
  };
  lines: {
    revenue: StatementLine[];
    cogs: StatementLine[];
    expenses: StatementLine[];
  };
  note?: string;
};


export type PeriodCloseCheck = {
  key: string;
  label: string;
  ready: boolean;
  count?: number;
  note?: string;
};

export type PeriodCloseReadiness = {
  basis: string;
  year: number;
  month: number;
  period: AccountingPeriod | null;
  ready: boolean;
  canPost: boolean;
  blockedReasons: string[];
  warnings: string[];
  checks: PeriodCloseCheck[];
  profitLoss: {
    revenueRupiah: number;
    cogsRupiah: number;
    expenseRupiah: number;
    netIncomeRupiah: number;
  } | null;
  supporting?: Record<string, unknown>;
  note?: string;
};

export type PeriodClosePreviewLine = {
  chartOfAccountId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  description: string;
  debitRupiah: number;
  creditRupiah: number;
  sortOrder: number;
};

export type PeriodClosePreview = {
  basis: string;
  year: number;
  month: number;
  period: Pick<AccountingPeriod, 'id' | 'year' | 'month' | 'status' | 'startDate' | 'endDate'>;
  sourceType: 'CLOSING_ENTRY';
  sourceId: string;
  entryNumber?: string;
  entryDate: string;
  totals: {
    revenueRupiah: number;
    cogsRupiah: number;
    expenseRupiah: number;
  };
  netIncomeRupiah: number;
  retainedEarningsAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name'> | null;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  isBalanced: boolean;
  lines: PeriodClosePreviewLine[];
  blockedReasons: string[];
  readiness?: PeriodCloseReadiness;
  canPost?: boolean;
  notes?: string | null;
  note?: string;
};

export type PeriodClosePostResult = {
  basis: string;
  posted: boolean;
  period: AccountingPeriod;
  journalEntry: AutoJournalEntry;
  preview: PeriodClosePreview;
  note?: string;
};

export type PeriodReopenPreview = {
  basis: string;
  year: number;
  month: number;
  period: AccountingPeriod;
  sourceType: 'CLOSING_REVERSAL';
  sourceId: string;
  entryNumber?: string;
  entryDate: string;
  closingJournalEntry?: {
    id: number;
    entryNumber: string;
    sourceId?: string | null;
    totalDebitRupiah: number;
    totalCreditRupiah: number;
    postedAt?: string | null;
  } | null;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  isBalanced: boolean;
  lines: PeriodClosePreviewLine[];
  blockedReasons: string[];
  warnings: string[];
  canReopen: boolean;
  reason?: string;
  note?: string;
};

export type PeriodReopenPostResult = {
  basis: string;
  reopened: boolean;
  period: AccountingPeriod;
  journalEntry: AutoJournalEntry;
  preview: PeriodReopenPreview;
  note?: string;
};

export type PeriodClosePayload = {
  year: number;
  month: number;
  notes?: string;
};

export type PeriodReopenPayload = {
  year: number;
  month: number;
  reason: string;
};

export type ReopenAccountingPeriodPayload = {
  reason: string;
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


export type DepositLedgerBreakdown = {
  sourceType: string;
  debitRupiah: number;
  creditRupiah: number;
  liabilityRupiah: number;
  sourceCount: number;
  sampleEntries?: Array<{
    id?: number;
    entryNumber?: string;
    sourceType?: string;
    sourceId?: string | null;
    memo?: string | null;
    entryDate?: string;
    debitRupiah: number;
    creditRupiah: number;
  }>;
};

export type DepositOperationalStay = {
  stayId: number;
  tenantId: number;
  tenantName?: string | null;
  roomId: number;
  roomCode?: string | null;
  status: string;
  depositAmountRupiah: number;
  depositPaidRupiah: number;
  depositRefundedRupiah: number;
  depositDeductedRupiah: number;
  depositHeldRupiah: number;
  depositPaymentStatus?: string | null;
  depositStatus?: string | null;
  hasDepositJournal: boolean;
  backfillCandidate: boolean;
};

export type DepositCandidateAction = {
  key: string;
  label: string;
  severity: 'success' | 'info' | 'warning' | 'danger' | string;
  action: string;
  note: string;
};

export type DepositReconciliationSummary = {
  operationalExpectedDepositRupiah: number;
  operationalPaidDepositRupiah: number;
  operationalNetLiabilityRupiah: number;
  ledgerDepositLiabilityRupiah: number;
  ledgerOpeningBalanceDepositRupiah: number;
  ledgerAutoJournalDepositRupiah: number;
  ledgerAdjustmentDepositRupiah: number;
  differenceRupiah: number;
  differenceDirection: string;
  reconciliationStatus: string;
};

export type DepositPosition = {
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  account?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type'> | null;
  operational: {
    stayCount: number;
    depositAmountRupiah: number;
    depositPaidRupiah: number;
    depositRefundedRupiah: number;
    depositDeductedRupiah: number;
    depositHeldRupiah: number;
  };
  ledger: {
    debitRupiah: number;
    creditRupiah: number;
    liabilityRupiah: number;
  };
  reconciliation?: {
    status: string;
    differenceDirection: string;
  };
  differenceRupiah: number;
  differenceDirection?: string;
  note?: string;
};

export type DepositReconciliation = {
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  account?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type'> | null;
  summary: DepositReconciliationSummary;
  ledgerBreakdown: DepositLedgerBreakdown[];
  operationalStays: DepositOperationalStay[];
  candidateActions: DepositCandidateAction[];
  warnings: string[];
  explanation: string;
  note?: string;
};

export type DepositBackfillDryRunResult = {
  basis: string;
  dryRun: boolean;
  limit: number;
  createdWouldBe: number;
  skipped: number;
  blocked: number;
  items: Array<{
    stayId: number;
    tenantName?: string | null;
    roomCode?: string | null;
    depositAmountRupiah: number;
    depositPaidRupiah: number;
    depositHeldRupiah: number;
    hasDepositJournal: boolean;
    action: 'WOULD_CREATE' | 'SKIP' | 'BLOCKED';
    reason: string;
    proposedJournal?: unknown;
  }>;
  warnings: string[];
  note?: string;
};

export type ReversalWatch = {
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  summary: {
    cancelledWithOriginalJournalCount: number;
    reversalMissingCount: number;
    reversalPostedCount: number;
  };
  items: Array<{
    invoiceId: number;
    invoiceNumber?: string | null;
    totalAmountRupiah: number;
    cancelReason?: string | null;
    originalJournal?: Pick<AutoJournalEntry, 'id' | 'entryNumber' | 'totalDebitRupiah' | 'totalCreditRupiah'> | null;
    reversalJournal?: Pick<AutoJournalEntry, 'id' | 'entryNumber' | 'totalDebitRupiah' | 'totalCreditRupiah'> | null;
    reversalRequired: boolean;
  }>;
  note?: string;
};


export type AssetReadiness = {
  basis: string;
  ledgerBacked: boolean;
  formalStatementReady: boolean;
  readyForAssetSchemaAct: boolean;
  schemaChangeRequired: boolean;
  schemaChangeApproved: boolean;
  noSchemaChangePatch: boolean;
  score: number;
  status: string;
  accountingAccounts: {
    fixedAssetAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type' | 'normalBalance'> | null;
    accumulatedDepreciationAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type' | 'normalBalance'> | null;
    depreciationExpenseAccount?: Pick<ChartOfAccount, 'id' | 'code' | 'name' | 'type' | 'normalBalance'> | null;
    missingAccountCodes: string[];
  };
  operationalScan: {
    inventoryItemCount: number;
    roomItemCount: number;
    assignedRoomItemCount: number;
    inboundOrAssignedMovementCount: number;
    capexReviewCandidateExpenseCount: number;
    capexReviewCandidateExpenses: Array<{
      id: number;
      expenseDate: string;
      category: string;
      description: string;
      amountRupiah: number;
      vendorName?: string | null;
      roomId?: number | null;
      reason: string;
    }>;
  };
  runtimeProof: {
    requiredSources: Array<{ sourceType: string; postedJournalCount: number; proven: boolean }>;
    ready: boolean;
    latestProofJournals: Array<{
      id: number;
      entryNumber: string;
      entryDate: string;
      sourceType: string;
      sourceId?: string | null;
      totalDebitRupiah: number;
      totalCreditRupiah: number;
      isBalanced: boolean;
      postedAt?: string | null;
    }>;
  };
  gates: Array<{ key: string; label: string; ready: boolean; note?: string }>;
  recommendedNextActions: string[];
  warnings: string[];
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
