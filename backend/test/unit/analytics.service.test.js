'use strict';

/**
 * Unit test: AnalyticsService — marketingSummary, financeSummary, operationsSummary
 *
 * Cakupan:
 *   - marketingSummary: tenant count, active stays, repeat tenant, checkout reasons
 *   - financeSummary: total billed, paid, wifi revenue, expenses, overdue
 *   - operationsSummary: room count, occupancy, tickets, low stock
 *   - strategySummary: gabungan ketiga summary
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { AnalyticsService } = require('../../dist/modules/analytics/analytics.service.js');

function makeSvc(overrides = {}) {
  const prisma = {
    tenant: { count: async () => 0 },
    stay: {
      count: async () => 0,
      groupBy: async () => [],
    },
    invoice: {
      aggregate: async () => ({ _sum: { totalAmountRupiah: 0 } }),
      count: async () => 0,
    },
    invoicePayment: {
      aggregate: async () => ({ _sum: { amountRupiah: 0 } }),
    },
    wifiSale: {
      aggregate: async () => ({ _sum: { soldPriceRupiah: 0 } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amountRupiah: 0 } }),
    },
    room: {
      count: async () => 0,
    },
    ticket: {
      count: async () => 0,
    },
    inventoryItem: {
      findMany: async () => [],
    },
    ...overrides,
  };
  return new AnalyticsService(prisma);
}

// ════════════════════════════════════════════════════════════════════════════
// marketingSummary
// ════════════════════════════════════════════════════════════════════════════

test('TC-ANL01: marketingSummary — data default', async () => {
  const svc = makeSvc();
  const result = await svc.marketingSummary();
  assert.strictEqual(result.tenantCount, 0);
  assert.strictEqual(result.activeStayCount, 0);
  assert.strictEqual(result.repeatTenantRateApprox, 0);
  assert.deepStrictEqual(result.checkoutReasons, []);
});

test('TC-ANL02: marketingSummary — dengan data', async () => {
  const svc = makeSvc({
    tenant: { count: async () => 10 },
    stay: {
      count: async () => 6,
      groupBy: async ({ by, _count, having }) => {
        // repeatTenantCount: tenantId dengan _count > 1
        if (by.includes('checkoutReason')) {
          return [
            { checkoutReason: 'PINDAH_KOST', _count: { checkoutReason: 2 } },
            { checkoutReason: 'TAMAT_KULIAH', _count: { checkoutReason: 1 } },
          ];
        }
        // repeatTenantCount: tenantId → mirip groupBy tenantId
        return []; // no repeat tenants for this test
      },
    },
  });
  const result = await svc.marketingSummary();
  assert.strictEqual(result.tenantCount, 10);
  assert.strictEqual(result.activeStayCount, 6);
});

// ════════════════════════════════════════════════════════════════════════════
// financeSummary
// ════════════════════════════════════════════════════════════════════════════

test('TC-ANL03: financeSummary — data default (semua 0)', async () => {
  const svc = makeSvc();
  const result = await svc.financeSummary();
  assert.strictEqual(result.totalBilledRupiah, 0);
  assert.strictEqual(result.totalPaidRupiah, 0);
  assert.strictEqual(result.totalWifiRevenueRupiah, 0);
  assert.strictEqual(result.totalExpenseRupiah, 0);
  assert.strictEqual(result.overdueCount, 0);
});

test('TC-ANL04: financeSummary — dengan nominal', async () => {
  const svc = makeSvc({
    invoice: {
      aggregate: async () => ({ _sum: { totalAmountRupiah: 25_000_000 } }),
      count: async () => 3,
    },
    invoicePayment: {
      aggregate: async () => ({ _sum: { amountRupiah: 20_000_000 } }),
    },
    wifiSale: {
      aggregate: async () => ({ _sum: { soldPriceRupiah: 500_000 } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amountRupiah: 8_000_000 } }),
    },
  });
  const result = await svc.financeSummary();
  assert.strictEqual(result.totalBilledRupiah, 25_000_000);
  assert.strictEqual(result.totalPaidRupiah, 20_000_000);
  assert.strictEqual(result.totalWifiRevenueRupiah, 500_000);
  assert.strictEqual(result.totalExpenseRupiah, 8_000_000);
  assert.strictEqual(result.overdueCount, 3);
});

// ════════════════════════════════════════════════════════════════════════════
// operationsSummary
// ════════════════════════════════════════════════════════════════════════════

test('TC-ANL05: operationsSummary — data default', async () => {
  const svc = makeSvc();
  const result = await svc.operationsSummary();
  assert.strictEqual(result.roomCount, 0);
  assert.strictEqual(result.activeStayCount, 0);
  assert.strictEqual(result.occupancyRateApprox, 0);
  assert.strictEqual(result.ticketOpenCount, 0);
  assert.strictEqual(result.ticketInProgressCount, 0);
  assert.strictEqual(result.lowStockCount, 0);
});

test('TC-ANL06: operationsSummary — dengan data', async () => {
  const svc = makeSvc({
    room: { count: async () => 48 },
    stay: { count: async () => 35 },
    ticket: {
      count: async (args) => {
        if (args.where.status === 'OPEN') return 4;
        if (args.where.status === 'IN_PROGRESS') return 2;
        return 0;
      },
    },
    inventoryItem: {
      findMany: async () => [
        { qtyOnHand: 5, minQty: 10 },  // low stock (5 < 10)
        { qtyOnHand: 20, minQty: 5 },
        { qtyOnHand: 0, minQty: 5 },   // low stock (0 < 5)
        { qtyOnHand: 15, minQty: 20 }, // low stock (15 < 20)
      ],
    },
  });
  const result = await svc.operationsSummary();
  assert.strictEqual(result.roomCount, 48);
  assert.strictEqual(result.activeStayCount, 35);
  assert.strictEqual(result.occupancyRateApprox, 35 / 48);
  assert.strictEqual(result.ticketOpenCount, 4);
  assert.strictEqual(result.ticketInProgressCount, 2);
  assert.strictEqual(result.lowStockCount, 3);
});

// ════════════════════════════════════════════════════════════════════════════
// strategySummary
// ════════════════════════════════════════════════════════════════════════════

test('TC-ANL07: strategySummary menggabungkan ketiga summary', async () => {
  const svc = makeSvc({
    tenant: { count: async () => 20 },
    stay: {
      count: async () => 15,
      groupBy: async () => [],
    },
    room: { count: async () => 48 },
    ticket: { count: async () => 0 },
    inventoryItem: { findMany: async () => [] },
    invoice: {
      aggregate: async () => ({ _sum: { totalAmountRupiah: 10_000_000 } }),
      count: async () => 1,
    },
    invoicePayment: {
      aggregate: async () => ({ _sum: { amountRupiah: 8_000_000 } }),
    },
    wifiSale: {
      aggregate: async () => ({ _sum: { soldPriceRupiah: 200_000 } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amountRupiah: 3_000_000 } }),
    },
  });
  const result = await svc.strategySummary();
  assert.ok(result.marketing);
  assert.ok(result.finance);
  assert.ok(result.operations);
  assert.strictEqual(result.marketing.tenantCount, 20);
  assert.strictEqual(result.finance.totalBilledRupiah, 10_000_000);
  assert.strictEqual(result.operations.roomCount, 48);
});
