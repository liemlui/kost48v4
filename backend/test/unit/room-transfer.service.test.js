'use strict';

/**
 * Unit test: RoomTransferService — transferRoom
 *
 * Cakupan:
 *   - Rent override guard (OWNER-only)
 *   - Stay not found, not ACTIVE, not promoted
 *   - Same room guard
 *   - Target room: not found, inactive, invalid status, already occupied
 *   - Success: basic transfer, with meter readings + rent override
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  ConflictException, ForbiddenException, NotFoundException,
} = require('@nestjs/common');

// ── Override createRenewUtilityCheckpointLineTx BEFORE importing service ──
const helpers = require('../../dist/modules/stays/stays-service-helpers.js');
helpers.createRenewUtilityCheckpointLineTx = async (tx, params) => {
  const usage = params.newReadingValue._val || Number(params.newReadingValue);
  return { amountRupiah: usage * params.tariffRupiah, readingId: 999 };
};

const { RoomTransferService } = require('../../dist/modules/stays/room-transfer.service.js');

const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };
const OWNER = { id: 2, role: 'OWNER', tenantId: null };

function makeToRoom(overrides = {}) {
  return {
    id: 30, name: 'Kamar G2-001', code: 'G2-001', isActive: true,
    status: 'AVAILABLE', defaultDepositRupiah: 500000,
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    ...overrides,
  };
}

function makeStay(overrides = {}) {
  return {
    id: 1, tenantId: 10, roomId: 20, status: 'ACTIVE',
    pricingTerm: 'MONTHLY', agreedRentAmountRupiah: 1500000,
    depositAmountRupiah: 500000, depositPaidAmountRupiah: 500000,
    depositPaymentStatus: 'PAID',
    checkInDate: new Date('2026-01-15'),
    plannedCheckOutDate: new Date('2026-07-15'), expiresAt: null,
    initialMetersPromotedAt: new Date('2026-01-15'),
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    createdById: 1,
    room: { id: 20, code: 'G1-001', name: 'Kamar G1-001' },
    ...overrides,
  };
}

function makeBasicTx(overrides = {}) {
  return {
    $queryRaw: async () => [makeToRoom()],
    stay: {
      findUnique: async () => makeStay(),
      update: async (args) => ({ id: 1, ...args.data }),
      count: async () => 0,
    },
    room: { update: async () => ({}) },
    meterReading: {
      findFirst: async () => ({ id: 50, readingValue: { _val: 1000, toString: () => '1000', minus: (v) => ({ _val: 500 }) } }),
      create: async () => ({ id: 60 }),
    },
    ticket: { findFirst: async () => null, findUnique: async () => null, create: async () => ({}) },
    invoice: { create: async () => ({ id: 200 }), update: async () => ({}), findMany: async () => [] },
    user: { findMany: async () => [{ id: 5, role: 'STAFF' }] },
    roomTransfer: { create: async (args) => ({ id: 50, ...args.data }) },
    ...overrides,
  };
}

const BASE_MOCKS = [
  { log: async () => undefined },                  // audit
  { create: async () => undefined },               // notification
  { postInvoiceIssuedTx: async () => undefined },  // accounting
];

function makeSvc(customTx) {
  const tx = customTx || makeBasicTx();
  const prisma = { $transaction: async (cb) => cb(tx), user: { findFirst: async () => null } };
  return new RoomTransferService(prisma, ...BASE_MOCKS);
}

// ═══ Rent override ═══════════════════════════════════════════════════

test('RT-rr-01: OWNER can override rent', async () => {
  let capturedData = null;
  const tx = makeBasicTx({
    stay: {
      findUnique: async () => makeStay(),
      update: async (args) => { capturedData = args.data; return { id: 1, ...args.data }; },
      count: async () => 0,
    },
  });
  const svc = makeSvc(tx);
  await svc.transferRoom(1, { toRoomId: 30, newAgreedRentRupiah: 2000000, finalElectricityKwh: 1200, finalWaterM3: 60 }, OWNER);
  assert.strictEqual(capturedData.agreedRentAmountRupiah, 2000000);
});

test('RT-rr-02: ADMIN cannot override rent → ForbiddenException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 30, newAgreedRentRupiah: 2000000 }, ADMIN),
    (err) => err instanceof ForbiddenException,
  );
});

// ═══ Stay guards ═════════════════════════════════════════════════════

test('RT-sg-01: stay not found → NotFoundException', async () => {
  const tx = makeBasicTx({ stay: { findUnique: async () => null } });
  const svc = makeSvc(tx);
  await assert.rejects(
    () => svc.transferRoom(999, { toRoomId: 30 }, ADMIN),
    (err) => err instanceof NotFoundException,
  );
});

test('RT-sg-02: not ACTIVE → ConflictException', async () => {
  const tx = makeBasicTx({ stay: { findUnique: async () => makeStay({ status: 'COMPLETED' }) } });
  const svc = makeSvc(tx);
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 30 }, ADMIN),
    (err) => err instanceof ConflictException,
  );
});

test('RT-sg-03: same room → ConflictException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 20 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('sama'),
  );
});

// ═══ Target room guards ═════════════════════════════════════════════

test('RT-tg-01: target room not found / inactive → NotFoundException', async () => {
  const tx = makeBasicTx({ $queryRaw: async () => [{ id: 30, isActive: false }] });
  const svc = makeSvc(tx);
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 99 }, ADMIN),
    (err) => err instanceof NotFoundException,
  );
});

test('RT-tg-02: target room OCCUPIED → ConflictException', async () => {
  const tx = makeBasicTx({ $queryRaw: async () => [makeToRoom({ status: 'OCCUPIED' })] });
  const svc = makeSvc(tx);
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 30 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('tidak bisa dihuni'),
  );
});

test('RT-tg-03: target room has other active stay → ConflictException', async () => {
  const tx = makeBasicTx({ stay: { ...makeBasicTx().stay, count: async () => 1 } });
  const svc = makeSvc(tx);
  await assert.rejects(
    () => svc.transferRoom(1, { toRoomId: 30 }, ADMIN),
    (err) => err instanceof ConflictException && err.message.includes('masih dihuni'),
  );
});

// ═══ Success paths ═══════════════════════════════════════════════════

test('RT-sc-01: success basic transfer with final meter readings', async () => {
  const svc = makeSvc();
  const result = await svc.transferRoom(1, {
    toRoomId: 30, reason: 'Pindah ke lantai 2',
    finalElectricityKwh: 1200, finalWaterM3: 60,
  }, ADMIN);
  assert.ok(result);
  assert.ok(result.transfer);
  assert.strictEqual(result.transfer.fromRoomId, 20);
  assert.strictEqual(result.transfer.toRoomId, 30);
});

test('RT-sc-02: success with new meters + rent override (OWNER)', async () => {
  const tx = makeBasicTx();
  const svc = makeSvc(tx);
  const result = await svc.transferRoom(1, {
    toRoomId: 30, newAgreedRentRupiah: 2000000,
    initialElectricityKwh: 100, initialWaterM3: 50,
    finalElectricityKwh: 1200, finalWaterM3: 60,
    reason: 'Upgrade kamar', note: 'Pindah atas permintaan',
  }, OWNER);
  assert.ok(result);
  assert.strictEqual(result.transfer.rentAfterRupiah, 2000000);
  assert.strictEqual(result.transfer.fromRoomId, 20);
  assert.strictEqual(result.transfer.toRoomId, 30);
});
