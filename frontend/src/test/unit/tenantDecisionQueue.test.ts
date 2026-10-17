import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDecisionRuleKnown } from '../../utils/decisionRoutes';
import {
  buildTenantDecisionQueue,
  TENANT_DECISION_RULE,
  tenantInvoicePath,
} from '../../utils/tenantDecisionQueue';
import type { Invoice, RenewRequest } from '../../types';

// Waktu dipaku supaya "terlambat N hari" tidak berubah seiring berjalannya hari.
const SEKARANG = new Date('2026-10-17T05:00:00.000Z');

const tagihanTerlambat = {
  id: 42,
  stayId: 7,
  invoiceNumber: 'INV-2026-0042',
  status: 'PENDING',
  dueDate: '2026-10-01',
  totalAmountRupiah: 500000,
} as unknown as Invoice;

const perpanjanganMenunggu = {
  id: 9,
  stayId: 7,
  tenantId: 3,
  requestedTerm: 'MONTHLY',
  status: 'PENDING_DECISION',
} as unknown as RenewRequest;

describe('AIDL-01b — kartu keputusan role TENANT', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SEKARANG);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tanpa data: tidak ada kartu yang dikarang', () => {
    expect(buildTenantDecisionQueue({})).toEqual([]);
    expect(buildTenantDecisionQueue({ overdueInvoice: null, pendingDecisionRequest: null })).toEqual([]);
  });

  it('tagihan lewat tenggat menjadi kartu HIGH dengan aksi ke detail tagihan', () => {
    const items = buildTenantDecisionQueue({ overdueInvoice: tagihanTerlambat });

    expect(items).toHaveLength(1);
    const [kartu] = items;
    expect(kartu.ruleId).toBe(TENANT_DECISION_RULE.invoiceOverdue);
    expect(kartu.priority).toBe('HIGH');
    expect(kartu.actionTo).toBe('/portal/invoices/42');
    expect(kartu.actionTo).toBe(tenantInvoicePath(42));
    expect(kartu.dedupKey).toBe('invoice:42');
    expect(kartu.entityType).toBe('invoice');
    expect(kartu.entityId).toBe(42);
  });

  it('nominal dan tenggat di kartu berasal dari data tagihan (bukan angka karangan)', () => {
    const [kartu] = buildTenantDecisionQueue({ overdueInvoice: tagihanTerlambat });

    expect(kartu.issue).toContain('500.000');
    expect(kartu.issue).toContain('terlambat 16 hari');
    expect(kartu.timeStatusLabel).toBe('Terlambat 16 hari');
    expect(kartu.timeStatusTone).toBe('danger');
    expect(kartu.deadlineLabel).not.toBe('-');
    expect(kartu.sourceRefs).toEqual([{ label: 'Tagihan', ref: '/portal/invoices/42' }]);
  });

  it('perpanjangan menunggu keputusan menjadi kartu informasi tanpa navigasi', () => {
    const items = buildTenantDecisionQueue({ pendingDecisionRequest: perpanjanganMenunggu });

    expect(items).toHaveLength(1);
    const [kartu] = items;
    expect(kartu.ruleId).toBe(TENANT_DECISION_RULE.renewPendingDecision);
    expect(kartu.priority).toBe('MEDIUM');
    // Keputusan diambil di halaman yang sama: kartu tidak boleh pura-pura punya rute.
    expect(kartu.actionTo).toBeUndefined();
    expect(kartu.onAction).toBeUndefined();
    expect(kartu.entityType).toBe('renew_request');
    expect(kartu.entityId).toBe(9);
  });

  it('dua masalah sekaligus menghasilkan dua kartu dengan kunci dedupe berbeda', () => {
    const items = buildTenantDecisionQueue({
      overdueInvoice: tagihanTerlambat,
      pendingDecisionRequest: perpanjanganMenunggu,
    });

    expect(items).toHaveLength(2);
    expect(new Set(items.map((item) => item.dedupKey)).size).toBe(2);
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });

  it('ruleId-nya terdaftar di registri aturan kartu (tidak ada aturan liar)', () => {
    expect(isDecisionRuleKnown(TENANT_DECISION_RULE.invoiceOverdue)).toBe(true);
    expect(isDecisionRuleKnown(TENANT_DECISION_RULE.renewPendingDecision)).toBe(true);
  });
});
