'use strict';

/**
 * Unit test: PrepayExtensionService — prepayExtension
 *
 * Cakupan:
 *   - Input validation (months 1-24, non-finite)
 *   - Stay not found, not ACTIVE, not promoted
 *   - Arrears blocking
 *   - Monthly rent = 0
 *   - SMESTERLY/YEARLY minimum months guard
 *   - Success: MONTHLY, SMESTERLY, YEARLY
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require('@nestjs/common');

const { PrepayExtensionService } = require('../../dist/modules/stays/prepay-extension.service.js');

// ─── Actors ──────────────────────────────────────────────────────────────
const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };
const OWNER = { id: 2, role: 'OWNER', tenantId: null };

// ─── Constants ───────────────────────────────────────────────────────────
const FUTURE = new Date(Date.now() + 86400000 * 7);
const FUTURE_STR = FUTURE.toISOString().slice(0, 10);

// ─── Factories ───────────────────────────────────────────────────────────
function makeStay(overrides = {}) {
  return {
    id: 1, tenantId: 10, roomId: 20, status: 'ACTIVE',
    pricingTerm: 'MONTHLY', agreedRentAmountRupiah: 1500000,
    depositAmountRupiah: 500000, depositPaidAmountRupiah: 500000,
    depositPaymentStatus: 'PAID', downPaymentAmountRupiah: 0,
    downPaymentPaidRupiah: 0,
    checkInDate: new Date('2026-01-15'),
    plannedCheckOutDate: new Date('2026-07-15'),
    expiresAt: null,
    initialMetersPromotedAt: new Date('2026-01-15'),
    initialElectricityKwhPending: null, initialWaterM3Pending: null,
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    bookingSource: 'MANUAL', stayPurpose: null, notes: null,
    createdById: 1, createdAt: new Date(), updatedAt: new Date(),
    room: { id: 20, code: 'G1-001', monthlyRateRupiah: 1500000 },
    ...overrides,
  };
}

// ─── Helper: buat service instance ───────────────────────────────────────
function makeService(prismaOverrides = {}) {
  const defaultPrisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: {
          findUnique: async () => makeStay(),
          update: async (args) => ({ ...args.data, id: 1 }),
        },
        invoice: {
          count: async () => 0,
          create: async (args) => ({
            id: 100,
            invoiceNumber: args.data.invoiceNumber || 'INV-1-PRE-999999',
            status: 'ISSUED',
            totalAmountRupiah: args.data.totalAmountRupiah,
          }),
          update: async () => ({}),
        },
        invoicePayment: {
          create: async (args) => ({ id: 200, ...args.data }),
        },
        stay: {
          findUnique: async () => makeStay(),
          update: async (args) => ({ id: args.where?.id ?? 1, ...args.data }),
        },
        ...(prismaOverrides.tx || {}),
      };
      return cb(tx);
    },
    ...prismaOverrides,
  };

  // Override $transaction if provided
  if (prismaOverrides.$transaction) {
    defaultPrisma.$transaction = prismaOverrides.$transaction;
  }

  const mockPosting = {
    postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 10 } }),
    postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }),
  };

  const mockRentRecognition = {
    scheduleExtension: async () => ({ scheduled: true, entries: [] }),
  };

  const mockAudit = { log: async () => undefined };

  const mockLoyalty = { earnSafe: async () => undefined };

  return new PrepayExtensionService(defaultPrisma, mockPosting, mockRentRecognition, mockAudit, mockLoyalty);
}

// ════════════════════════════════════════════════════════════════════════
// Input validation
// ════════════════════════════════════════════════════════════════════════

test('PE-iv-01: months < 1 → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 0 }, ADMIN),
    (err) => err instanceof BadRequestException && err.message.includes('1-24'),
  );
});

test('PE-iv-02: months > 24 → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 25 }, ADMIN),
    (err) => err instanceof BadRequestException && err.message.includes('1-24'),
  );
});

test('PE-iv-03: months NaN → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.prepayExtension(1, { months: NaN }, ADMIN),
    (err) => err instanceof BadRequestException && err.message.includes('1-24'),
  );
});

test('PE-iv-04: months float floor 2.7 → 2, valid', async () => {
  // Should floor to 2, which is 1-24 range
  const svc = makeService();
  // Expect success (validated by proceeding through other guards)
  // This test checks the floor behavior — the value may reach tx or not.
  // The months floor means 2.7 → 2, which is >= 1 and <= 24.
  // We override stay to null so it stops at the next guard (stay not found).
  // Actually let's just test that the floor doesn't throw BadRequest.
  const prisma = { $transaction: async () => { throw new NotFoundException('Stay'); } };
  const svc2 = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc2.prepayExtension(1, { months: 2.7 }, ADMIN),
    (err) => err instanceof NotFoundException, // Not BadRequest → validation passed
  );
});

// ════════════════════════════════════════════════════════════════════════
// Stay guards
// ════════════════════════════════════════════════════════════════════════

test('PE-sg-01: stay not found → NotFoundException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => null },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  // The tx callback structure needs stay.findUnique to return null
  // But the FOR UPDATE query happens first. Let me simplify.
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(999, { months: 3 }, ADMIN),
    (err) => err instanceof NotFoundException,
  );
});

test('PE-sg-02: stay not ACTIVE → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay({ status: 'COMPLETED' }) },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException,
  );
});

test('PE-sg-03: stay not promoted → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay({ status: 'ACTIVE', initialMetersPromotedAt: null }) },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('promoted'),
  );
});

// ════════════════════════════════════════════════════════════════════════
// Arrears guard
// ════════════════════════════════════════════════════════════════════════

test('PE-ar-01: arrears > 0 → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay() },
        invoice: { count: async () => 5 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('tagihan'),
  );
});

// ════════════════════════════════════════════════════════════════════════
// Monthly rent guard
// ════════════════════════════════════════════════════════════════════════

test('PE-mr-01: monthlyRent <= 0 → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay({ agreedRentAmountRupiah: 0, room: { id: 20, code: 'G1-001', monthlyRateRupiah: 0 } }) },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('Tarif'),
  );
});

// ════════════════════════════════════════════════════════════════════════
// Rate term guards
// ════════════════════════════════════════════════════════════════════════

test('PE-rt-01: SMESTERLY with months < 6 → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay() },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3, rateTerm: 'SMESTERLY' }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('SMESTERLY'),
  );
});

test('PE-rt-02: YEARLY with months < 12 → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay() },
        invoice: { count: async () => 0 },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({}), postInvoicePaymentTx: async () => ({}) }, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 6, rateTerm: 'YEARLY' }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('YEARLY'),
  );
});

// ════════════════════════════════════════════════════════════════════════
// Journal posting failures
// ════════════════════════════════════════════════════════════════════════

test('PE-jp-01: postInvoiceIssuedTx fails → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay() },
        invoice: {
          count: async () => 0,
          create: async () => ({ id: 100, invoiceNumber: 'INV-1', status: 'ISSUED', totalAmountRupiah: 3e6 }),
          update: async () => ({}),
        },
        invoicePayment: { create: async () => ({ id: 200 }) },
      };
      return cb(tx);
    },
  };
  const mockPosting = {
    postInvoiceIssuedTx: async () => ({ posted: false }), // fails
    postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }),
  };
  const svc = new PrepayExtensionService(prisma, mockPosting, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('COA'),
  );
});

test('PE-jp-02: postInvoicePaymentTx fails → ConflictException', async () => {
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay() },
        invoice: {
          count: async () => 0,
          create: async () => ({ id: 100, invoiceNumber: 'INV-1', status: 'ISSUED', totalAmountRupiah: 3e6 }),
          update: async () => ({}),
        },
        invoicePayment: { create: async () => ({ id: 200 }) },
      };
      return cb(tx);
    },
  };
  const mockPosting = {
    postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 10 } }),
    postInvoicePaymentTx: async () => ({ posted: false }), // fails
  };
  const svc = new PrepayExtensionService(prisma, mockPosting, { scheduleExtension: async () => ({}) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  await assert.rejects(
    () => svc.prepayExtension(1, { months: 3 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('pembayaran prabayar'),
  );
});

// ════════════════════════════════════════════════════════════════════════
// Success paths
// ════════════════════════════════════════════════════════════════════════

test('PE-sc-01: MONTHLY success — returns invoice, months, total, periodEnd', async () => {
  const svc = makeService();
  const result = await svc.prepayExtension(1, { months: 2 }, ADMIN);
  assert.ok(result);
  assert.strictEqual(result.stayId, 1);
  assert.ok(result.invoiceNumber);
  assert.strictEqual(result.months, 2);
  assert.strictEqual(result.rateTerm, 'MONTHLY');
  assert.strictEqual(result.monthlyRentRupiah, 1500000);
  assert.strictEqual(result.totalRupiah, 3000000); // 2 * 1.500.000
  assert.ok(result.newPlannedCheckOutDate);
});

test('PE-sc-02: SMESTERLY 6 months with discount → correct total', async () => {
  // SMESTERLY multiplier = 5.7 → effective monthly = round(1500000 * 5.7 / 6) = round(1425000) = 1425000
  // total = 1425000 * 6 = 8550000
  const svc = makeService();
  const result = await svc.prepayExtension(1, { months: 6, rateTerm: 'SMESTERLY' }, ADMIN);
  assert.strictEqual(result.months, 6);
  assert.strictEqual(result.rateTerm, 'SMESTERLY');
  assert.strictEqual(result.monthlyRentRupiah, 1425000);
  assert.strictEqual(result.totalRupiah, 8550000);
});

test('PE-sc-03: YEARLY 12 months with discount → correct total', async () => {
  // YEARLY multiplier = 11.0 → effective monthly = round(1500000 * 11.0 / 12) = round(1375000) = 1375000
  // total = 1375000 * 12 = 16500000
  const svc = makeService();
  const result = await svc.prepayExtension(1, { months: 12, rateTerm: 'YEARLY' }, ADMIN);
  assert.strictEqual(result.months, 12);
  assert.strictEqual(result.rateTerm, 'YEARLY');
  assert.strictEqual(result.monthlyRentRupiah, 1375000);
  assert.strictEqual(result.totalRupiah, 16500000);
});

test('PE-sc-04: OWNER can prepay', async () => {
  const svc = makeService();
  const result = await svc.prepayExtension(1, { months: 3 }, OWNER);
  assert.ok(result);
  assert.strictEqual(result.months, 3);
});

test('PE-sc-05: audit log called on success', async () => {
  let auditCalled = false;
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay(), update: async (args) => ({ id: 1, ...args.data }) },
        invoice: {
          count: async () => 0,
          create: async () => ({ id: 100, invoiceNumber: 'INV-1-PRE-999999', status: 'ISSUED', totalAmountRupiah: 3e6 }),
          update: async () => ({}),
        },
        invoicePayment: { create: async () => ({ id: 200 }) },
      };
      return cb(tx);
    },
  };
  const mockAudit = { log: async (entry) => { auditCalled = true; assert.strictEqual(entry.action, 'PREPAY_EXTENSION'); } };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 10 } }), postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }) }, { scheduleExtension: async () => ({ scheduled: true, entries: [] }) }, mockAudit, { earnSafe: async () => undefined });
  await svc.prepayExtension(1, { months: 2 }, ADMIN);
  assert.ok(auditCalled, 'audit.log should be called');
});

test('PE-sc-06: loyalty earnSafe called on success', async () => {
  let loyaltyCalled = false;
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => makeStay(), update: async (args) => ({ id: 1, ...args.data }) },
        invoice: {
          count: async () => 0,
          create: async () => ({ id: 100, invoiceNumber: 'INV-1-PRE-999999', status: 'ISSUED', totalAmountRupiah: 3e6 }),
          update: async () => ({}),
        },
        invoicePayment: { create: async () => ({ id: 200 }) },
      };
      return cb(tx);
    },
  };
  const mockLoyalty = { earnSafe: async (tenantId, reason) => { loyaltyCalled = true; assert.strictEqual(reason, 'RENEWAL'); } };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 10 } }), postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }) }, { scheduleExtension: async () => ({ scheduled: true, entries: [] }) }, { log: async () => undefined }, mockLoyalty);
  await svc.prepayExtension(1, { months: 2 }, ADMIN);
  assert.ok(loyaltyCalled, 'loyalty.earnSafe should be called');
});

test('PE-sc-07: non-MONTHLY pricing uses room monthlyRateRupiah', async () => {
  // Stay with pricingTerm WEEKLY but room has monthlyRateRupiah
  const stay = makeStay({ pricingTerm: 'WEEKLY', agreedRentAmountRupiah: 1300000, room: { id: 20, code: 'G1-001', monthlyRateRupiah: 1500000 } });
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 1 }],
        stay: { findUnique: async () => stay, update: async (args) => ({ id: 1, ...args.data }) },
        invoice: {
          count: async () => 0,
          create: async (args) => ({ id: 100, invoiceNumber: 'INV-1-PRE-999999', status: 'ISSUED', totalAmountRupiah: args.data.totalAmountRupiah }),
          update: async () => ({}),
        },
        invoicePayment: { create: async () => ({ id: 200 }) },
      };
      return cb(tx);
    },
  };
  const svc = new PrepayExtensionService(prisma, { postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 10 } }), postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }) }, { scheduleExtension: async () => ({ scheduled: true, entries: [] }) }, { log: async () => undefined }, { earnSafe: async () => undefined });
  const result = await svc.prepayExtension(1, { months: 2 }, ADMIN);
  assert.strictEqual(result.monthlyRentRupiah, 1500000); // from room.monthlyRateRupiah
});
