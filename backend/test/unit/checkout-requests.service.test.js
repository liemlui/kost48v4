'use strict';

/**
 * Unit test: CheckoutRequestsService
 *   — createRequest, approveRequest, rejectRequest, findAll, findMine
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  BadRequestException, ConflictException, ForbiddenException, NotFoundException,
} = require('@nestjs/common');
const enums = require('../../dist/common/enums/app.enums.js');
const helpers = require('../../dist/common/business/lifecycle-guards.helper.js');

let _mockActiveRenew = null;
let _mockOpenInvoices = [];

const { CheckoutRequestsService } = require('../../dist/modules/checkout-requests/checkout-requests.service.js');

const TENANT    = { id: 10, role: 'TENANT', tenantId: 100 };
const TENANT2   = { id: 11, role: 'TENANT', tenantId: 999 };
const ADMIN     = { id: 1, role: 'ADMIN', tenantId: null };
const OWNER     = { id: 2, role: 'OWNER', tenantId: null };

function futureDateStr(daysFromNow = 7) {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function makeStay(overrides = {}) {
  return { id: 1, tenantId: 100, roomId: 20, status: 'ACTIVE', plannedCheckOutDate: new Date(Date.now() + 30*86400000), ...overrides };
}

function makeSvc(overrides = {}) {
  const prisma = {
    user: { findMany: async () => [{ id: 1 }] },
    stay: { findUnique: async () => makeStay(), findMany: async () => [] },
    renewRequest: { findFirst: async () => _mockActiveRenew },
    invoice: {
      findMany: async () => _mockOpenInvoices,
      findUnique: async () => null,
    },
    checkoutRequest: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async (args) => ({ id: 50, ...args.data, requestedCheckOutDate: args.data.requestedCheckOutDate || new Date() }),
      findUniqueOrThrow: async (args) => args.where,
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => _mockOpenInvoices },
        checkoutRequest: {
          findFirst: async () => null,
          create: async (args) => ({ id: 50, ...args.data, requestedCheckOutDate: new Date(args.data.requestedCheckOutDate || Date.now()) }),
          updateMany: async (args) => ({ count: 1 }),
          findUniqueOrThrow: async (args) => args.where,
        },
        stay: { findUnique: async () => makeStay(), updateMany: async () => ({}) },
        ...(overrides.tx || {}),
      };
      return cb(tx);
    },
    ...overrides,
  };
  const mockNotif = { create: async () => undefined };
  return new CheckoutRequestsService(prisma, mockNotif);
}

// ── createRequest ────────────────────────────────────────────────────

test('CO-cr-01: non-TENANT → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14) }, ADMIN),
    (e) => e instanceof ForbiddenException,
  );
});

test('CO-cr-02: stay not found → NotFoundException', async () => {
  const svc = makeSvc({ stay: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.createRequest({ stayId: 999, requestedCheckOutDate: futureDateStr(14) }, TENANT),
    (e) => e instanceof NotFoundException,
  );
});

test('CO-cr-03: stay not ACTIVE → ConflictException', async () => {
  const svc = makeSvc({ stay: { findUnique: async () => makeStay({ status: 'COMPLETED' }) } });
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14) }, TENANT),
    (e) => e instanceof ConflictException,
  );
});

test('CO-cr-04: wrong tenant → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14) }, TENANT2),
    (e) => e instanceof ForbiddenException,
  );
});

test('CO-cr-05: active renew request → ConflictException', async () => {
  _mockActiveRenew = { id: 9 };
  _mockOpenInvoices = [];
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14) }, TENANT),
    (e) => e instanceof ConflictException && e.message.includes('perpanjangan'),
  );
  _mockActiveRenew = null;
});

test('CO-cr-06: invalid date → BadRequestException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: 'bukan-tanggal' }, TENANT),
    (e) => e instanceof BadRequestException,
  );
});

test('CO-cr-07: date too early (today) → BadRequestException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(0) }, TENANT),
    (e) => e instanceof BadRequestException && e.message.includes('H+1'),
  );
});

test('CO-cr-08: open invoices → ConflictException', async () => {
  _mockActiveRenew = null;
  _mockOpenInvoices = [{ id: 5, invoiceNumber: 'INV-005', status: 'ISSUED' }];
  const svc = makeSvc();
  await assert.rejects(
    () => svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14), checkoutReason: 'Pindah kost' }, TENANT),
    (e) => e instanceof ConflictException && e.message.includes('tagihan'),
  );
  _mockOpenInvoices = [];
});

test('CO-cr-09: success → returns request', async () => {
  _mockActiveRenew = null;
  _mockOpenInvoices = [];
  const svc = makeSvc();
  const result = await svc.createRequest({ stayId: 1, requestedCheckOutDate: futureDateStr(14), checkoutReason: 'Pindah kost', requestNotes: 'Terima kasih' }, TENANT);
  assert.ok(result);
  assert.ok(result.id);
});

// ── approveRequest ───────────────────────────────────────────────────

test('CO-ap-01: non-admin/owner → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.approveRequest(1, {}, TENANT),
    (e) => e instanceof ForbiddenException,
  );
});

test('CO-ap-02: not found → NotFoundException', async () => {
  const svc = makeSvc({ checkoutRequest: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.approveRequest(999, { reviewNotes: 'OK' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('CO-ap-03: not PENDING → ConflictException', async () => {
  const svc = makeSvc({ checkoutRequest: { findUnique: async () => ({ id: 1, status: 'APPROVED' }) } });
  await assert.rejects(
    () => svc.approveRequest(1, { reviewNotes: 'OK' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('CO-ap-04: success admin approve', async () => {
  _mockOpenInvoices = [];
  const svc = makeSvc({
    checkoutRequest: {
      findUnique: async () => ({ id: 1, stayId: 1, status: 'PENDING', requestedCheckOutDate: new Date(Date.now() + 14*86400000), reviewedById: null }),
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => [] },
        checkoutRequest: {
          updateMany: async () => ({ count: 1 }),
          findUniqueOrThrow: async () => ({ id: 1, stayId: 1, status: 'APPROVED', requestedCheckOutDate: new Date(), reviewedById: 1 }),
        },
        stay: { findUnique: async () => makeStay(), updateMany: async () => ({ count: 1 }) },
      };
      return cb(tx);
    },
  });
  const result = await svc.approveRequest(1, { reviewNotes: 'Disetujui' }, ADMIN);
  assert.ok(result);
});

test('CO-ap-05: success owner approve', async () => {
  _mockOpenInvoices = [];
  const svc = makeSvc({
    checkoutRequest: {
      findUnique: async () => ({ id: 1, stayId: 1, status: 'PENDING', requestedCheckOutDate: new Date(Date.now() + 14*86400000) }),
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => [] },
        checkoutRequest: {
          updateMany: async () => ({ count: 1 }),
          findUniqueOrThrow: async () => ({ id: 1, stayId: 1, status: 'APPROVED', requestedCheckOutDate: new Date(), reviewedById: 2 }),
        },
        stay: { findUnique: async () => makeStay(), updateMany: async () => ({}) },
      };
      return cb(tx);
    },
  });
  const result = await svc.approveRequest(1, { reviewNotes: 'Setuju' }, OWNER);
  assert.ok(result);
});

// ── rejectRequest ────────────────────────────────────────────────────

test('CO-rj-01: non-admin → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.rejectRequest(1, { reviewNotes: 'Tidak' }, TENANT),
    (e) => e instanceof ForbiddenException,
  );
});

test('CO-rj-02: not found → NotFoundException', async () => {
  const svc = makeSvc({ checkoutRequest: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.rejectRequest(999, { reviewNotes: 'Tidak' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('CO-rj-03: not PENDING → ConflictException', async () => {
  const svc = makeSvc({ checkoutRequest: { findUnique: async () => ({ id: 1, status: 'APPROVED' }) } });
  await assert.rejects(
    () => svc.rejectRequest(1, { reviewNotes: 'Tidak' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('CO-rj-04: success reject', async () => {
  const svc = makeSvc({
    checkoutRequest: { findUnique: async () => ({ id: 1, status: 'PENDING' }) },
    $transaction: async (cb) => cb({
      invoice: { findMany: async () => [] },
      checkoutRequest: {
        updateMany: async () => ({ count: 1 }),
        findUniqueOrThrow: async () => ({ id: 1, status: 'REJECTED', reviewNotes: 'Tidak disetujui' }),
      },
    }),
  });
  const result = await svc.rejectRequest(1, { reviewNotes: 'Tidak disetujui' }, ADMIN);
  assert.strictEqual(result.status, 'REJECTED');
});

// ── findAll / findMine ───────────────────────────────────────────────

test('CO-fa-01: findAll returns items', async () => {
  const svc = makeSvc({ checkoutRequest: { findMany: async () => [{ id: 1, status: 'PENDING' }] } });
  const result = await svc.findAll();
  assert.ok(result.items);
  assert.strictEqual(result.items.length, 1);
});

test('CO-fa-02: findAll with status filter', async () => {
  let capturedWhere = null;
  const svc = makeSvc({
    checkoutRequest: { findMany: async (args) => { capturedWhere = args.where; return [{ id: 1 }]; } },
  });
  await svc.findAll('APPROVED');
  assert.strictEqual(capturedWhere.status, 'APPROVED');
});

test('CO-fm-01: findMine non-tenant → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.findMine(ADMIN), (e) => e instanceof ForbiddenException);
});

test('CO-fm-02: findMine returns array', async () => {
  const svc = makeSvc();
  const result = await svc.findMine(TENANT);
  assert.ok(Array.isArray(result));
});
