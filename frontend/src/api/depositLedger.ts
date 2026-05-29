import client from './client';
import type { ApiEnvelope } from '../types';

export type TenantDepositLedgerEntryType =
  | 'PAYMENT_RECEIVED'
  | 'REFUND'
  | 'DEDUCTION'
  | 'FORFEIT'
  | 'MIGRATION_SNAPSHOT'
  | string;

export type TenantDepositLedgerDirection =
  | 'INCREASE_LIABILITY'
  | 'DECREASE_LIABILITY'
  | 'INFO'
  | string;

export type TenantDepositLedgerEntry = {
  id: number;
  stayId: number;
  tenantId: number;
  tenantName?: string | null;
  roomId: number;
  roomCode?: string | null;
  roomName?: string | null;
  type: TenantDepositLedgerEntryType;
  direction: TenantDepositLedgerDirection;
  amountRupiah: number;
  balanceAfterRupiah: number;
  depositStatusAfter?: string | null;
  depositPaymentStatusAfter?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  paymentSubmissionId?: number | null;
  invoicePaymentId?: number | null;
  journalEntryId?: number | null;
  actorUserId?: number | null;
  actorName?: string | null;
  occurredAt: string;
  note?: string | null;
  metadataJson?: unknown;
  createdAt?: string;
};

export type DepositLedgerStaySnapshot = {
  id: number;
  status?: string | null;
  tenantId: number;
  tenantName?: string | null;
  roomId: number;
  roomCode?: string | null;
  depositAmountRupiah?: number | null;
  depositPaidAmountRupiah?: number | null;
  depositDeductionRupiah?: number | null;
  depositRefundedRupiah?: number | null;
  depositHeldBalanceRupiah?: number | null;
  depositStatus?: string | null;
  depositPaymentStatus?: string | null;
};

export type DepositLedgerByStay = {
  basis: 'M4_DEPOSIT_LEDGER_BY_STAY' | string;
  stay: DepositLedgerStaySnapshot;
  entries: TenantDepositLedgerEntry[];
  meta?: { total?: number };
};

export type DepositLedgerByTenant = {
  basis: 'M4_DEPOSIT_LEDGER_BY_TENANT' | string;
  tenant: { id: number; fullName: string };
  entries: TenantDepositLedgerEntry[];
  meta?: { total?: number };
};

export type DepositLedgerSummary = {
  basis: 'M4_DEPOSIT_LEDGER_SUMMARY' | string;
  totals: {
    increaseRupiah: number;
    decreaseRupiah: number;
    byType: Record<string, number>;
    ledgerHeldBalanceRupiah: number;
  };
  recentEntries: TenantDepositLedgerEntry[];
};

export type DepositLedgerReconciliationItem = {
  stayId: number;
  tenantId: number;
  tenantName?: string | null;
  roomId: number;
  roomCode?: string | null;
  depositAmountRupiah: number;
  snapshotHeldBalanceRupiah: number;
  ledgerHeldBalanceRupiah: number;
  gapRupiah: number;
  status: 'MATCH' | 'NEEDS_BACKFILL_OR_REVIEW' | string;
  ledgerEntryCount: number;
};

export type DepositLedgerReconciliationLite = {
  basis: 'M4_DEPOSIT_LEDGER_RECONCILIATION_LITE' | string;
  ready: boolean;
  totalItems: number;
  mismatchCount: number;
  items: DepositLedgerReconciliationItem[];
  note?: string;
};

export type DepositLedgerBackfillDryRun = {
  basis: 'M4_DEPOSIT_LEDGER_BACKFILL_DRY_RUN' | string;
  dryRun: boolean;
  limit: number;
  wouldCreateEntriesForStays: number;
  candidates: Array<{
    stayId: number;
    tenantId: number;
    tenantName?: string | null;
    roomId: number;
    roomCode?: string | null;
    depositAmountRupiah: number;
    depositPaidAmountRupiah: number;
    depositDeductionRupiah: number;
    depositRefundedRupiah: number;
    suggestedEntries: string[];
  }>;
  note?: string;
};

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await promise;
  return response.data.data;
}

export async function fetchDepositLedgerByStay(stayId: number | string, params?: { limit?: number; type?: string }) {
  return unwrap<DepositLedgerByStay>(client.get(`/deposit-ledger/stays/${stayId}`, { params }));
}

export async function fetchDepositLedgerByTenant(tenantId: number | string, params?: { limit?: number; type?: string }) {
  return unwrap<DepositLedgerByTenant>(client.get(`/deposit-ledger/tenants/${tenantId}`, { params }));
}

export async function fetchDepositLedgerSummary(params?: { limit?: number }) {
  return unwrap<DepositLedgerSummary>(client.get('/deposit-ledger/summary', { params }));
}

export async function fetchDepositLedgerReconciliationLite(params?: { limit?: number }) {
  return unwrap<DepositLedgerReconciliationLite>(client.get('/deposit-ledger/reconciliation-lite', { params }));
}

export async function runDepositLedgerBackfillDryRun(payload: { limit?: number } = {}) {
  return unwrap<DepositLedgerBackfillDryRun>(client.post('/deposit-ledger/backfill/dry-run', payload));
}
