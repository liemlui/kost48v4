'use strict';

/**
 * Unit test: StaysQueryService
 *   — findAll (filter, pagination, open invoice count)
 *   — findCurrentForTenant (active stay, tenant guard)
 *   — findOne (by id, role isolation)
 *   — getInvoiceSuggestion (rent + utility suggestions)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');

const { StaysQueryService } = require('../../dist/modules/stays/stays-query.service.js');

// ─── Actors ──────────────────────────────────────────────────────────────
const ADMIN   = { id: 1, role: 'ADMIN', tenantId: null };
const OWNER   = { id: 2, role: 'OWNER', tenantId: null };
const TENANT  = { id: 10, role: 'TENANT', tenantId: 100 };
const TENANT_OTHER = { id: 11, role: 'TENANT', tenantId: 999 };

// ─── Factories ───────────────────────────────────────────────────────────
function makeStay(overrides = {}) {
  return {
    id: 1, tenantId: 100, roomId: 20, status: 'ACTIVE',
    pricingTerm: 'MONTHLY', agreedRentAmountRupiah: 1500000,
    depositAmountRupiah: 500000, depositPaidAmountRupiah: 500000,
    depositPaymentStatus: 'PAID', downPaymentAmountRupiah: 0,
    downPaymentPaidRupiah: 0,
    checkInDate: new Date('2026-01-15'),
    plannedCheckOutDate: null, expiresAt: null,
    initialMetersPromotedAt: new Date('2026-01-15'),
    initialElectricityKwhPending: null, initialWaterM3Pending: null,
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    bookingSource: 'WEBSITE', stayPurpose: null, notes: null,
    cancelReason: null,
    createdById: 1, createdAt: new Date(), updatedAt: new Date(),
    tenant: { id: 100, fullName: 'Budi Santoso', phone: '628123456789' },
    room: { id: 20, code: 'G1-001', name: 'Kamar G1-001', floor: 'G1' },
    _count: { invoices: 3 },
    invoices: [
      { id: 50, invoiceNumber: 'INV-2026-00050', status: 'ISSUED' },
    ],
    ...overrides,
  };
}

function makeInvoiceGroupBy(overrides = {}) {
  return { stayId: 1, _count: { _all: 2 }, ...overrides };
}

// ─── Mock Prisma.Decimal (supports .minus().lte().toNumber().toFixed()) ────
class MockDecimal {
  constructor(val) { this._val = val; }
  minus(other) { return new MockDecimal(this._val - (other instanceof MockDecimal ? other._val : other)); }
  lte(n) { return this._val <= n; }
  toNumber() { return this._val; }
  toFixed(d) { return this._val.toFixed(d); }
}

function makeMeterReading(overrides = {}) {
  return {
    id: 10, roomId: 20, utilityType: 'ELECTRICITY',
    readingValue: new MockDecimal(1500), readingAt: new Date('2026-06-01'),
    ...overrides,
  };
}

// ─── Helper: buat service instance ───────────────────────────────────────
function makeService(prismaOverrides = {}) {
  const defaultPrisma = {
    $transaction: async (arg) => {
      // If arg is array (findMany + count), return array
      if (Array.isArray(arg)) {
        // Production code passes Promise[] directly
        return Promise.all(arg);
      }
      // If arg is a callback, execute it with tx
      return arg({
        stay: {
          findFirst: async () => null,
          ...(prismaOverrides.tx || {}),
        },
        invoice: {
          groupBy: async () => [],
          ...(prismaOverrides.tx || {}),
        },
        meterReading: {
          findMany: async () => [],
          ...(prismaOverrides.tx || {}),
        },
      });
    },
    stay: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      count: async () => 0,
      ...prismaOverrides,
    },
    invoice: {
      groupBy: async () => [],
      count: async () => 0,
      ...prismaOverrides,
    },
    meterReading: {
      findMany: async () => [],
      ...prismaOverrides,
    },
  };

  const merged = { ...defaultPrisma, ...prismaOverrides };
  // Ensure $transaction exists
  if (!merged.$transaction) {
    merged.$transaction = async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg.map((fn) => fn()));
      return arg(merged);
    };
  }

  // Override the nested properties
  if (prismaOverrides.$transaction) {
    merged.$transaction = prismaOverrides.$transaction;
  }

  return new StaysQueryService(merged);
}

// ════════════════════════════════════════════════════════════════════════
// findAll()
// ════════════════════════════════════════════════════════════════════════

test('SQ-fa-01: empty result → items [] + meta page=1', async () => {
  const svc = makeService();
  const result = await svc.findAll({});
  assert.ok(result.items);
  assert.ok(result.meta);
  assert.strictEqual(result.items.length, 0);
  assert.strictEqual(result.meta.page, 1);
});

test('SQ-fa-02: single stay returned with normalized fields', async () => {
  const stay = makeStay({ id: 1 });
  const groupBy = [makeInvoiceGroupBy({ stayId: 1, _count: { _all: 2 } })];

  const svc = makeService({
    stay: {
      findMany: async () => [stay],
      count: async () => 1,
    },
    invoice: {
      groupBy: async () => groupBy,
    },
  });

  const result = await svc.findAll({});
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.meta.totalItems, 1);
  assert.strictEqual(result.items[0].openInvoiceCount, 2);
  assert.strictEqual(result.items[0].invoiceCount, 3);
  assert.strictEqual(result.items[0].latestInvoiceId, 50);
  assert.strictEqual(result.items[0].latestInvoiceStatus, 'ISSUED');
  assert.strictEqual(result.items[0].cancelReason, null);
});

test('SQ-fa-03: multiple stays with pagination meta', async () => {
  const stays = [makeStay({ id: 1 }), makeStay({ id: 2 })];
  const svc = makeService({
    stay: {
      findMany: async () => stays,
      count: async () => 20,
    },
    invoice: {
      groupBy: async () => [],
    },
  });

  const result = await svc.findAll({ page: 2, limit: 10 });
  assert.strictEqual(result.items.length, 2);
  assert.strictEqual(result.meta.page, 2);
  assert.strictEqual(result.meta.totalPages, 2);
  assert.strictEqual(result.meta.totalItems, 20);
});

test('SQ-fa-04: filter by tenantId', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ tenantId: '100' });
  assert.ok(capturedWhere);
  assert.strictEqual(capturedWhere.AND[0].tenantId, 100);
});

test('SQ-fa-05: filter by roomId', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ roomId: '20' });
  assert.ok(capturedWhere);
  assert.strictEqual(capturedWhere.AND[0].roomId, 20);
});

test('SQ-fa-06: filter by status', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ status: 'ACTIVE' });
  assert.strictEqual(capturedWhere.AND[0].status, 'ACTIVE');
});

test('SQ-fa-07: filter by bookingSource', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ bookingSource: 'MANUAL' });
  assert.strictEqual(capturedWhere.AND[0].bookingSource, 'MANUAL');
});

test('SQ-fa-08: filter by checkInDate range', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ checkInDateFrom: '2026-01-01', checkInDateTo: '2026-12-31' });
  const dateFilter = capturedWhere.AND.find((c) => c?.checkInDate);
  assert.ok(dateFilter, 'checkInDate filter should exist');
  assert.ok(dateFilter.checkInDate.gte instanceof Date);
  assert.ok(dateFilter.checkInDate.lte instanceof Date);
});

test('SQ-fa-09: filter by depositStatus', async () => {
  let capturedWhere = null;
  const svc = makeService({
    stay: {
      findMany: async (args) => {
        capturedWhere = args.where;
        return [makeStay()];
      },
      count: async () => 1,
    },
  });
  await svc.findAll({ depositStatus: 'PAID' });
  assert.strictEqual(capturedWhere.AND[0].depositStatus, 'PAID');
});

test('SQ-fa-10: CANCELLED stay → cancelReason from cancelReason field', async () => {
  const stay = makeStay({ id: 1, status: 'CANCELLED', cancelReason: 'Membatalkan pesanan' });
  const svc = makeService({
    stay: {
      findMany: async () => [stay],
      count: async () => 1,
    },
    invoice: { groupBy: async () => [] },
  });
  const result = await svc.findAll({});
  assert.strictEqual(result.items[0].cancelReason, 'Membatalkan pesanan');
});

test('SQ-fa-11: no open invoices → openInvoiceCount = 0', async () => {
  const stay = makeStay({ id: 42 });
  const svc = makeService({
    stay: {
      findMany: async () => [stay],
      count: async () => 1,
    },
    invoice: { groupBy: async () => [] },
  });
  const result = await svc.findAll({});
  assert.strictEqual(result.items[0].openInvoiceCount, 0);
});

test('SQ-fa-12: no stays found → groupBy not called', async () => {
  let groupByCalled = false;
  const svc = makeService({
    stay: {
      findMany: async () => [],
      count: async () => 0,
    },
    invoice: {
      groupBy: async () => {
        groupByCalled = true;
        return [];
      },
    },
  });
  const result = await svc.findAll({});
  assert.strictEqual(result.items.length, 0);
  assert.strictEqual(groupByCalled, false, 'groupBy should not be called for empty results');
});

// ════════════════════════════════════════════════════════════════════════
// findCurrentForTenant()
// ════════════════════════════════════════════════════════════════════════

test('SQ-ct-01: user without tenantId → ConflictException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.findCurrentForTenant({ id: 1, role: 'TENANT', tenantId: null }),
    (err) => err instanceof ConflictException,
  );
});

test('SQ-ct-02: no active stay → NotFoundException', async () => {
  const svc = makeService({ stay: { findFirst: async () => null } });
  await assert.rejects(
    () => svc.findCurrentForTenant(TENANT),
    (err) => err instanceof NotFoundException,
  );
});

test('SQ-ct-03: active stay found with room facilities', async () => {
  const stay = makeStay({
    room: {
      id: 20, code: 'G1-001', name: 'Kamar G1-001', floor: 'G1',
      facilities: [
        { id: 1, name: 'AC', category: 'ELECTRONIC', publicVisible: true },
      ],
    },
  });

  const svc = makeService({
    stay: {
      findFirst: async (args) => {
        assert.strictEqual(args.where.tenantId, 100);
        assert.strictEqual(args.where.status, 'ACTIVE');
        return stay;
      },
    },
    invoice: { count: async () => 1 },
  });

  const result = await svc.findCurrentForTenant(TENANT);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.tenantId, 100);
  assert.strictEqual(result.openInvoiceCount, 1);
  assert.strictEqual(result.latestInvoiceId, 50);
  assert.strictEqual(result.room.facilities.length, 1);
});

test('SQ-ct-04: active stay with no invoices', async () => {
  const stay = makeStay({ invoices: [] });
  const svc = makeService({
    stay: { findFirst: async () => stay },
    invoice: { count: async () => 0 },
  });
  const result = await svc.findCurrentForTenant(TENANT);
  assert.strictEqual(result.openInvoiceCount, 0);
  assert.strictEqual(result.latestInvoiceId, null);
  assert.strictEqual(result.latestInvoiceStatus, null);
});

// ════════════════════════════════════════════════════════════════════════
// findOne()
// ════════════════════════════════════════════════════════════════════════

test('SQ-fo-01: not found → NotFoundException', async () => {
  const svc = makeService({ stay: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.findOne(999, ADMIN),
    (err) => err instanceof NotFoundException,
  );
});

test('SQ-fo-02: found by admin → return stay', async () => {
  const stay = makeStay();
  const svc = makeService({
    stay: { findUnique: async () => stay },
    invoice: { count: async () => 0 },
  });
  const result = await svc.findOne(1, ADMIN);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.openInvoiceCount, 0);
});

test('SQ-fo-03: found by owner → return stay', async () => {
  const stay = makeStay();
  const svc = makeService({
    stay: { findUnique: async () => stay },
    invoice: { count: async () => 2 },
  });
  const result = await svc.findOne(1, OWNER);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.openInvoiceCount, 2);
});

test('SQ-fo-04: tenant accessing own stay → return stay', async () => {
  const stay = makeStay({ tenantId: 100 });
  const svc = makeService({
    stay: { findUnique: async () => stay },
    invoice: { count: async () => 0 },
  });
  const result = await svc.findOne(1, TENANT);
  assert.strictEqual(result.id, 1);
});

test('SQ-fo-05: tenant accessing other stay → NotFoundException', async () => {
  const stay = makeStay({ tenantId: 100 }); // TENANT has tenantId 100
  const svc = makeService({
    stay: { findUnique: async () => stay },
  });
  // TENANT_OTHER has tenantId 999
  await assert.rejects(
    () => svc.findOne(1, TENANT_OTHER),
    (err) => err instanceof NotFoundException,
  );
});

// ════════════════════════════════════════════════════════════════════════
// getInvoiceSuggestion()
// ════════════════════════════════════════════════════════════════════════

test('SQ-gs-01: stay not found → NotFoundException', async () => {
  const svc = makeService({ stay: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.getInvoiceSuggestion(999, ADMIN),
    (err) => err instanceof NotFoundException,
  );
});

test('SQ-gs-02: tenant accessing other stay → NotFoundException', async () => {
  const stay = makeStay({ tenantId: 100 });
  const svc = makeService({ stay: { findUnique: async () => stay } });
  await assert.rejects(
    () => svc.getInvoiceSuggestion(1, TENANT_OTHER),
    (err) => err instanceof NotFoundException,
  );
});

test('SQ-gs-03: rent suggestion always present', async () => {
  const stay = makeStay({
    room: { id: 20, code: 'G1-001', name: 'Kamar G1-001' },
  });
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: { findMany: async () => [] },
  });
  const result = await svc.getInvoiceSuggestion(1, ADMIN);
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].lineType, 'RENT');
  assert.strictEqual(result[0].lineAmountRupiah, 1500000);
});

test('SQ-gs-04: electricity + water suggestions when readings available', async () => {
  const stay = makeStay({});
  const D = (v) => new MockDecimal(v);
  const electricityReadings = [
    { readingValue: D(1500), readingAt: new Date('2026-06-15') },
    { readingValue: D(1400), readingAt: new Date('2026-06-01') },
  ];
  const waterReadings = [
    { readingValue: D(50), readingAt: new Date('2026-06-15') },
    { readingValue: D(40), readingAt: new Date('2026-06-01') },
  ];

  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: {
      findMany: async (args) => {
        if (args.where.utilityType === 'ELECTRICITY') return electricityReadings;
        if (args.where.utilityType === 'WATER') return waterReadings;
        return [];
      },
    },
  });

  const result = await svc.getInvoiceSuggestion(1, ADMIN);
  assert.strictEqual(result.length, 3, 'rent + electricity + water');
  assert.strictEqual(result[1].lineType, 'ELECTRICITY');
  assert.strictEqual(result[1].qty, '100.000');
  assert.strictEqual(result[1].lineAmountRupiah, 150000); // 100 kWh * 1500
  assert.strictEqual(result[2].lineType, 'WATER');
  assert.strictEqual(result[2].qty, '10.000');
  assert.strictEqual(result[2].lineAmountRupiah, 100000); // 10 m3 * 10000
});

test('SQ-gs-05: no utility suggestion when tariff is 0', async () => {
  const stay = makeStay({
    electricityTariffPerKwhRupiah: 0,
    waterTariffPerM3Rupiah: 0,
  });
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: { findMany: async () => [] },
  });
  const result = await svc.getInvoiceSuggestion(1, ADMIN);
  assert.strictEqual(result.length, 1, 'only rent when utility tariff is 0');
});

test('SQ-gs-06: no utility suggestion when insufficient readings (< 2)', async () => {
  const stay = makeStay({});
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: {
      findMany: async (args) => {
        // Only return 1 reading
        if (args.where.utilityType === 'ELECTRICITY') return [{ readingValue: new MockDecimal(1500), readingAt: new Date() }];
        return [];
      },
    },
  });
  const result = await svc.getInvoiceSuggestion(1, ADMIN);
  assert.strictEqual(result.length, 1, 'only rent when insufficient meter readings');
});

test('SQ-gs-07: no utility suggestion when usage <= 0', async () => {
  const stay = makeStay({});
  const readings = [
    { readingValue: new MockDecimal(1000), readingAt: new Date('2026-06-15') },
    { readingValue: new MockDecimal(1000), readingAt: new Date('2026-06-01') },
  ];
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: {
      findMany: async () => readings,
    },
  });
  const result = await svc.getInvoiceSuggestion(1, ADMIN);
  assert.strictEqual(result.length, 1, 'only rent when usage is 0');
});

test('SQ-gs-08: owner gets same suggestions as admin', async () => {
  const stay = makeStay({});
  const readings = [
    { readingValue: new MockDecimal(1500), readingAt: new Date('2026-06-15') },
    { readingValue: new MockDecimal(1400), readingAt: new Date('2026-06-01') },
  ];
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: {
      findMany: async () => readings,
    },
  });
  const result = await svc.getInvoiceSuggestion(1, OWNER);
  assert.strictEqual(result.length, 3);
});

test('SQ-gs-09: tenant accessing own stay → get suggestions', async () => {
  const stay = makeStay({ tenantId: 100 });
  const readings = [
    { readingValue: new MockDecimal(1500), readingAt: new Date('2026-06-15') },
    { readingValue: new MockDecimal(1400), readingAt: new Date('2026-06-01') },
  ];
  const svc = makeService({
    stay: { findUnique: async () => stay },
    meterReading: {
      findMany: async () => readings,
    },
  });
  const result = await svc.getInvoiceSuggestion(1, TENANT);
  assert.strictEqual(result.length, 3);
});
