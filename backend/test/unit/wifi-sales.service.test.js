'use strict';
/**
 * Unit test: WifiSalesService — penjualan WiFi
 * Cakupan: findAll, findOne, create, update, remove, assertWifiSaleJournalAllowsChange
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException } = require('@nestjs/common');
const { WifiSalesService } = require('../../dist/modules/wifi-sales/wifi-sales.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkSale(overrides = {}) {
  return {
    id: 1,
    customerName: 'Budi',
    packageName: 'Paket 30 Mbps',
    soldPriceRupiah: 150000,
    saleDate: new Date('2026-06-15'),
    createdById: 1,
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}, postingOverrides = {}) {
  const prisma = {
    $transaction: async (arr) => Promise.all(arr),
    wifiSale: {
      findUnique: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async (args) => ({ ...mkSale(), ...args.data }),
      update: async (args) => ({ ...mkSale(), ...args.data }),
      delete: async () => ({ id: 1 }),
    },
    journalEntry: {
      findFirst: async () => null,
    },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  const accountingPosting = {
    postWifiSale: async () => ({ posted: true }),
    ...postingOverrides,
  };
  return new WifiSalesService(prisma, audit, accountingPosting);
}

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('WS-fl-01: findAll returns paginated', async () => {
  const svc = makeSvc({
    wifiSale: { findMany: async () => [mkSale()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.meta.totalItems, 1);
});

test('WS-fl-02: findAll filters by customerName', async () => {
  const svc = makeSvc({
    wifiSale: { findMany: async () => [mkSale()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10', customerName: 'budi' });
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// findOne
// ════════════════════════════════════════════════════════════════════════════

test('WS-fo-01: findOne not found', async () => {
  const svc = makeSvc({ wifiSale: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('WS-fo-02: findOne returns sale', async () => {
  const svc = makeSvc({ wifiSale: { findUnique: async () => mkSale() } });
  const r = await svc.findOne(1);
  assert.strictEqual(r.customerName, 'Budi');
});

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('WS-cr-01: create succeeds with journal post', async () => {
  let journalPosted = false;
  const svc = makeSvc(
    { wifiSale: { create: async (args) => mkSale({ ...args.data, id: 10 }) } },
    { postWifiSale: async () => { journalPosted = true; } },
  );
  const r = await svc.create({ customerName: 'Budi', packageName: '30 Mbps', soldPriceRupiah: 150000, saleDate: '2026-06-15' }, ADMIN);
  assert.strictEqual(r.id, 10);
  assert.ok(journalPosted);
});

test('WS-cr-02: create journal failure is caught (non-critical)', async () => {
  const svc = makeSvc(
    { wifiSale: { create: async (args) => mkSale({ ...args.data, id: 10 }) } },
    { postWifiSale: async () => { throw new Error('Journal server down'); } },
  );
  const r = await svc.create({ customerName: 'Budi', packageName: '30 Mbps', soldPriceRupiah: 150000, saleDate: '2026-06-15' }, ADMIN);
  assert.strictEqual(r.id, 10); // tetap sukses walau jurnal gagal
});

// ════════════════════════════════════════════════════════════════════════════
// update
// ════════════════════════════════════════════════════════════════════════════

test('WS-up-01: update not found', async () => {
  const svc = makeSvc({ wifiSale: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.update(999, { customerName: 'Baru' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('WS-up-02: update succeeds', async () => {
  const sale = mkSale();
  const svc = makeSvc({
    wifiSale: { findUnique: async () => sale, update: async (args) => ({ ...sale, ...args.data }) },
    journalEntry: { findFirst: async () => null },
  });
  const r = await svc.update(1, { customerName: 'Budi Baru' }, ADMIN);
  assert.strictEqual(r.customerName, 'Budi Baru');
});

test('WS-up-03: update financials with existing journal → Conflict', async () => {
  const sale = mkSale();
  const svc = makeSvc({
    wifiSale: { findUnique: async () => sale, update: async (args) => ({ ...sale, ...args.data }) },
    journalEntry: { findFirst: async () => ({ id: 200, entryNumber: 'JNL-2026-0200' }) },
  });
  await assert.rejects(
    () => svc.update(1, { soldPriceRupiah: 200000 }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// remove
// ════════════════════════════════════════════════════════════════════════════

test('WS-re-01: remove not found', async () => {
  const svc = makeSvc({ wifiSale: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.remove(999, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('WS-re-02: remove with existing journal → Conflict', async () => {
  const svc = makeSvc({
    wifiSale: { findUnique: async () => mkSale() },
    journalEntry: { findFirst: async () => ({ id: 200, entryNumber: 'JNL-2026-0200' }) },
  });
  await assert.rejects(
    () => svc.remove(1, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('WS-re-03: remove succeeds (no journal)', async () => {
  const svc = makeSvc({
    wifiSale: { findUnique: async () => mkSale(), delete: async () => ({ id: 1 }) },
    journalEntry: { findFirst: async () => null },
  });
  const r = await svc.remove(1, ADMIN);
  assert.strictEqual(r.deletedId, 1);
});
