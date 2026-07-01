'use strict';

/**
 * Unit test: RenewRequestsService — createRequest, decideByTenant, rejectRequest, findMine
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  ConflictException, ForbiddenException, NotFoundException,
} = require('@nestjs/common');

const helpers = require('../../dist/common/business/lifecycle-guards.helper.js');
const enums = require('../../dist/common/enums/app.enums.js');

let mockCheckoutFirst = null;
let mockInvoiceMany = [];
let mockRenewActive = null;
let _staysRenewal = {
  issueRenewalDownPaymentInvoiceTx: async (tx, stayId, dpAmount, actor) => ({ id: 300, invoiceNumber: 'INV-DP-001', totalAmountRupiah: dpAmount }),
  cancelUnpaidRenewalInvoiceInTransaction: async () => ({}),
};

const { RenewRequestsService } = require('../../dist/modules/renew-requests/renew-requests.service.js');

const TENANT    = { id: 10, role: 'TENANT', tenantId: 100 };
const TENANT2   = { id: 11, role: 'TENANT', tenantId: 999 };
const ADMIN     = { id: 1, role: 'ADMIN', tenantId: null };
const NON_PORTAL_USER = { id: 12, role: 'TENANT', tenantId: null };

function makeStay(overrides = {}) {
  return { id: 1, tenantId: 100, roomId: 20, status: 'ACTIVE', agreedRentAmountRupiah: 1500000, plannedCheckOutDate: new Date('2026-07-15'), ...overrides };
}

function buildPrisma(overrides = {}) {
  const stayFindUnique = overrides.stayFindUnique !== undefined ? overrides.stayFindUnique : makeStay();
  return {
    user: { findMany: async () => [{ id: 1 }] },
    stay: { findUnique: async () => stayFindUnique },
    checkoutRequest: { findFirst: async () => mockCheckoutFirst },
    invoice: { findMany: async () => mockInvoiceMany, findUnique: async () => null },
    renewRequest: {
      findFirst: async () => mockRenewActive,
      findUnique: async () => null,
      findMany: async () => [],
      create: async (args) => ({ id: 50, ...args.data }),
      update: async (args) => ({ id: 50, ...args.data }),
    },
    ...overrides,
  };
}

function makeSvc(prismaOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  const mockAudit = { log: async () => undefined };
  const mockNotif = { create: async () => undefined };
  const mockLoyalty = { earnSafe: async () => undefined };
  return new RenewRequestsService(prisma, _staysRenewal, mockAudit, mockNotif, mockLoyalty);
}

// ── createRequest ────────────────────────────────────────────────────

test('CR-rg-01: non-TENANT → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.createRequest({ stayId: 1 }, ADMIN), (e) => e instanceof ForbiddenException);
});

test('CR-sg-01: stay not found → NotFoundException', async () => {
  const svc = makeSvc({ stayFindUnique: null });
  await assert.rejects(() => svc.createRequest({ stayId: 999 }, TENANT), (e) => e instanceof NotFoundException);
});

test('CR-sg-02: stay not ACTIVE → ConflictException', async () => {
  const svc = makeSvc({ stayFindUnique: makeStay({ status: 'COMPLETED' }) });
  await assert.rejects(() => svc.createRequest({ stayId: 1 }, TENANT), (e) => e instanceof ConflictException);
});

test('CR-sg-03: wrong tenant → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.createRequest({ stayId: 1 }, TENANT2), (e) => e instanceof ForbiddenException);
});

test('CR-cb-01: pending checkout exists → ConflictException', async () => {
  mockCheckoutFirst = { id: 10 };
  mockInvoiceMany = [];
  mockRenewActive = null;
  const svc = makeSvc();
  await assert.rejects(() => svc.createRequest({ stayId: 1, requestedTerm: 'MONTHLY' }, TENANT), (e) => e instanceof ConflictException && e.message.includes('checkout'));
  mockCheckoutFirst = null;
});

test('CR-cb-02: open invoices → ConflictException', async () => {
  mockCheckoutFirst = null;
  mockInvoiceMany = [{ id: 5, invoiceNumber: 'INV-005', status: 'ISSUED' }];
  mockRenewActive = null;
  const svc = makeSvc();
  await assert.rejects(() => svc.createRequest({ stayId: 1, requestedTerm: 'MONTHLY' }, TENANT), (e) => e instanceof ConflictException && e.message.includes('tagihan'));
  mockInvoiceMany = [];
});

test('CR-cb-03: existing active renew → ConflictException', async () => {
  mockCheckoutFirst = null;
  mockInvoiceMany = [];
  mockRenewActive = { id: 20 };
  const svc = makeSvc();
  await assert.rejects(() => svc.createRequest({ stayId: 1, requestedTerm: 'MONTHLY' }, TENANT), (e) => e instanceof ConflictException && e.message.includes('sedang berjalan'));
  mockRenewActive = null;
});

test('CR-sc-01: success create → returns request', async () => {
  mockCheckoutFirst = null;
  mockInvoiceMany = [];
  mockRenewActive = null;
  const svc = makeSvc();
  const result = await svc.createRequest({ stayId: 1, requestedTerm: 'MONTHLY', requestNotes: 'Mau perpanjang 1 tahun' }, TENANT);
  assert.ok(result);
  assert.strictEqual(result.status, 'PENDING_DECISION');
});

// ── decideByTenant ───────────────────────────────────────────────────

test('DB-rg-01: non-TENANT → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.decideByTenant(1, { decision: 'YA' }, ADMIN), (e) => e instanceof ForbiddenException);
});

test('DB-sg-01: not found → NotFoundException', async () => {
  const svc = makeSvc({ renewRequest: { findUnique: async () => null } });
  await assert.rejects(() => svc.decideByTenant(999, { decision: 'YA' }, TENANT), (e) => e instanceof NotFoundException);
});

test('DB-sg-02: wrong tenant → ForbiddenException', async () => {
  const svc = makeSvc({ renewRequest: { findUnique: async () => ({ id: 1, tenantId: 999, status: 'PENDING_DECISION' }) } });
  await assert.rejects(() => svc.decideByTenant(1, { decision: 'YA' }, TENANT), (e) => e instanceof ForbiddenException);
});

test('DB-sg-03: wrong status → ConflictException', async () => {
  const svc = makeSvc({ renewRequest: { findUnique: async () => ({ id: 1, tenantId: 100, status: 'COMPLETED' }) } });
  await assert.rejects(() => svc.decideByTenant(1, { decision: 'YA' }, TENANT), (e) => e instanceof ConflictException);
});

test('DB-de-01: decision NO → REJECTED_BY_TENANT', async () => {
  let updatedStatus = null;
  const svc = makeSvc({
    renewRequest: {
      findUnique: async () => ({ id: 1, tenantId: 100, status: 'PENDING_DECISION', downPaymentAmountRupiah: 450000 }),
      update: async (args) => { updatedStatus = args.data.status; return { ...args.data, id: 1 }; },
    },
  });
  const result = await svc.decideByTenant(1, { decision: 'TIDAK' }, TENANT);
  assert.strictEqual(result.status, 'REJECTED_BY_TENANT');
});

// ── rejectRequest ────────────────────────────────────────────────────

test('RJ-rg-01: TENANT cannot reject → not found (no explicit role guard in service)', async () => {
  // Role guard is at controller level; service rejects via $transaction -> NotFoundException
  const svc = makeSvc({
    $transaction: async (cb) => cb({
      $queryRaw: async () => [],
      renewRequest: { findUnique: async () => null },
    }),
  });
  await assert.rejects(() => svc.rejectRequest(999, { reviewNotes: 'Alasan' }, TENANT), (e) => e instanceof NotFoundException);
});

test('RJ-sg-01: not found → NotFoundException', async () => {
  const svc = makeSvc({ $transaction: async (cb) => cb({ $queryRaw: async () => [], renewRequest: { findUnique: async () => null } }) });
  await assert.rejects(() => svc.rejectRequest(999, { reviewNotes: 'Alasan' }, ADMIN), (e) => e instanceof NotFoundException);
});

test('RJ-sg-02: wrong status (DP_SECURED) → ConflictException', async () => {
  const svc = makeSvc({
    $transaction: async (cb) => cb({
      $queryRaw: async () => [{ id: 1 }],
      renewRequest: { findUnique: async () => ({ id: 1, status: 'DP_SECURED' }) },
    }),
  });
  await assert.rejects(() => svc.rejectRequest(1, { reviewNotes: 'Alasan' }, ADMIN), (e) => e instanceof ConflictException);
});

// ── findMine ─────────────────────────────────────────────────────────

test('FM-rg-01: non-tenant → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.findMine(ADMIN), (e) => e instanceof ForbiddenException);
});

test('FM-sc-01: tenant → returns array', async () => {
  const svc = makeSvc();
  const result = await svc.findMine(TENANT);
  assert.ok(Array.isArray(result));
});
