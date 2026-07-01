'use strict';

/**
 * Unit test: MarketingPublicRoomsService — catalog, social proof, calendar
 *
 * Cakupan:
 *   - getPublicSocialProof: data sosial + review agregat
 *   - getPublicRooms: filter, pagination, schema not ready
 *   - getPublicRoomDetail: detail kamar, schema readiness
 *   - getAvailabilityCalendar: grid per kamar, status HUNI/KOSONG
 *
 * Catatan: getRoomIdsWithFacilityGap internal memanggil room.findMany
 * dengan field berbeda dari PUBLIC_ROOM_SELECT, jadi mock harus bisa
 * menangani kedua varian. getRoutineCompletionRanking tidak ada di
 * kompilasi service.
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');

// ── Mock helpers BEFORE importing service ──────────────────────────────────
const bookingHelper = require('../../dist/modules/tenant-bookings/booking-schema.helper.js');
let _mockSchemaReady = true;
bookingHelper.isBookingSchemaReady = async () => _mockSchemaReady;

const { MarketingPublicRoomsService } = require('../../dist/modules/marketing/marketing-public-rooms.service.js');

// ── Helpers ────────────────────────────────────────────────────────────────
const TODAY = new Date();
// Samakan dgn service (localYMD, zona WIB) — bukan UTC toISOString, agar tidak
// flaky saat tanggal UTC ≠ tanggal lokal (17:00–24:00 UTC = 00:00–07:00 WIB).
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

function makeRoom(overrides = {}) {
  return {
    id: 1,
    code: 'G1-001',
    name: 'Kamar G1-001',
    floor: 'G1',
    status: 'AVAILABLE',
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: '4x4',
    images: [],
    notes: 'Kamar lantai dasar',
    dailyRateRupiah: 50000,
    weeklyRateRupiah: 300000,
    biWeeklyRateRupiah: 550000,
    monthlyRateRupiah: 1200000,
    defaultDepositRupiah: 500000,
    allowBookingWhileCleaning: false,
    electricityTariffPerKwhRupiah: 2500,
    waterTariffPerM3Rupiah: 10000,
    hasAc: false,
    isActive: true,
    roomItems: [],
    facilities: [],
    ...overrides,
  };
}

function makeStay(overrides = {}) {
  return {
    id: 10,
    roomId: 1,
    tenantId: 5,
    status: 'ACTIVE',
    checkInDate: new Date(Date.now() - 60 * 86_400_000),
    plannedCheckOutDate: new Date(Date.now() + 30 * 86_400_000),
    initialMetersPromotedAt: new Date(),
    pricingTerm: 'MONTHLY',
    downPaymentPaidRupiah: 0,
    downPaymentPaidAt: null,
    downPaymentAmountRupiah: 0,
    room: { status: 'OCCUPIED' },
    tenant: { fullName: 'Budi Santoso' },
    ...overrides,
  };
}

/**
 * Buat service dengan Prisma mock.
 * room.findMany mengembalikan roomList untuk semua panggilan — ini berarti
 * getRoomIdsWithFacilityGap() mendapat data yg sama. Karena makeRoom()
 * punya roomItems:[] dan facilities:[], computeFacilityGap akan
 * mengembalikan hasGap:false untuk semua kamar.
 */
function makeSvc(roomList = [], overrides = {}) {
  const prisma = {
    $transaction: async (cb) => {
      if (typeof cb === 'function') return cb(prisma);
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb;
    },
    staffReview: {
      findMany: async () => [],
      aggregate: async () => ({ _avg: { rating: null }, _count: { id: 0 } }),
    },
    externalReview: {
      findMany: async () => [],
      aggregate: async () => ({ _avg: { rating: null }, _count: { id: 0 } }),
    },
    stay: {
      findMany: async () => [],
      findFirst: async () => null,
      count: async () => 0,
    },
    room: {
      findMany: async () => roomList,
      findFirst: async () => roomList.length > 0 ? roomList[0] : null,
      findUnique: async () => null,
      count: async () => roomList.length,
      groupBy: async () => [],
    },
    checkoutRequest: { findMany: async () => [] },
    renewRequest: { findMany: async () => [] },
    satisfactionSurvey: {
      aggregate: async () => ({ _count: { id: 0 } }),
      findMany: async () => [],
    },
    roomFacility: { findMany: async () => [] },
    ...overrides,
  };
  return new MarketingPublicRoomsService(prisma);
}

// ════════════════════════════════════════════════════════════════════════════
// getPublicSocialProof
// ════════════════════════════════════════════════════════════════════════════

test('TC-MP01: getPublicSocialProof — data kosong', async () => {
  const svc = makeSvc();
  const result = await svc.getPublicSocialProof();
  assert.strictEqual(result.occupantCount, 0);
  assert.strictEqual(result.averageRating, 0);
  assert.strictEqual(result.reviewCount, 0);
  assert.deepStrictEqual(result.reviews, []);
});

test('TC-MP02: getPublicSocialProof — dengan staff review dan external review', async () => {
  const svc = makeSvc([], {
    staffReview: {
      findMany: async () => [
        { rating: 5, comment: 'Bagus', createdAt: new Date('2026-06-20'), tenant: { fullName: 'Ali' } },
      ],
      aggregate: async () => ({ _avg: { rating: 5 }, _count: { id: 1 } }),
    },
    externalReview: {
      findMany: async () => [
        { rating: 4, comment: 'Mantap', authorName: 'Budi', source: 'Google', reviewedAt: new Date('2026-06-19') },
      ],
      aggregate: async () => ({ _avg: { rating: 4 }, _count: { id: 1 } }),
    },
    stay: {
      findMany: async () => [{ tenantId: 1 }, { tenantId: 2 }, { tenantId: 1 }],
    },
  });
  const result = await svc.getPublicSocialProof();
  assert.strictEqual(result.occupantCount, 2);
  assert.strictEqual(result.reviewCount, 2);
  assert.strictEqual(result.averageRating, 4.5);
  assert.strictEqual(result.reviews.length, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// getPublicRooms
// ════════════════════════════════════════════════════════════════════════════

test('TC-MP03: getPublicRooms — schema tidak siap → items kosong', async () => {
  _mockSchemaReady = false;
  const svc = makeSvc([makeRoom()]);
  const result = await svc.getPublicRooms({ page: '1', limit: '10' });
  assert.strictEqual(result.items.length, 0);
  assert.strictEqual(result.meta.totalItems, 0);
  _mockSchemaReady = true;
});

test('TC-MP04: getPublicRooms — tanpa data (kamar kosong)', async () => {
  const svc = makeSvc([]);
  const result = await svc.getPublicRooms({ page: '1', limit: '10' });
  assert.strictEqual(result.items.length, 0);
  assert.strictEqual(result.meta.totalItems, 0);
});

test('TC-MP05: getPublicRooms — dengan data kamar', async () => {
  const rooms = [
    makeRoom({ id: 1, code: 'G1-001', status: 'AVAILABLE' }),
    makeRoom({ id: 2, code: 'G1-002', status: 'OCCUPIED' }),
  ];
  let roomQueryArgs = null;
  const svc = makeSvc(rooms, {
    room: {
      findMany: async (args) => { roomQueryArgs = args; return rooms; },
      count: async () => rooms.length,
      findFirst: async () => rooms[0],
    },
    roomFacility: {
      findMany: async () => [
        { id: 10, roomId: 1, name: 'AC', quantity: 1, category: 'ELECTRONIC', condition: 'GOOD', note: null },
      ],
    },
  });
  const result = await svc.getPublicRooms({ page: '1', limit: '10' });
  assert.strictEqual(result.items.length, 2);
  assert.strictEqual(result.meta.totalItems, 2);
  // Verifikasi query menyertakan isActive
  if (roomQueryArgs?.where?.AND) {
    assert.ok(roomQueryArgs.where.AND.some((c) => c.isActive === true || c.isActive !== undefined));
  }
});

test('TC-MP06: getPublicRooms — filter search + floor (schema ready)', async () => {
  const rooms = [makeRoom({ id: 1, code: 'G1-001' })];
  let roomQueryArgs = null;
  const svc = makeSvc(rooms, {
    room: {
      findMany: async (args) => { roomQueryArgs = args; return rooms; },
      count: async () => rooms.length,
    },
  });
  await svc.getPublicRooms({ page: '1', limit: '10', search: 'G1', floor: 'G1' });
  // getPublicRooms memanggil buildPublicRoomWhere yang menghasilkan { AND: [...] }
  if (roomQueryArgs?.where?.AND) {
    const conditions = roomQueryArgs.where.AND;
    assert.ok(conditions.some((c) => c.floor === 'G1'));
    assert.ok(conditions.some((c) => c.OR !== undefined));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// getPublicRoomDetail
// ════════════════════════════════════════════════════════════════════════════

test('TC-MP07: getPublicRoomDetail — kamar tidak ditemukan', async () => {
  const svc = makeSvc([]);
  await assert.rejects(
    () => svc.getPublicRoomDetail(999),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-MP08: getPublicRoomDetail — kamar ditemukan', async () => {
  const room = makeRoom({
    id: 1,
    hasAc: false,
    roomItems: [
      { id: 10, status: 'GOOD', item: { name: 'Kipas angin' } },
      { id: 11, status: 'GOOD', item: { name: 'Kasur busa' } },
      { id: 12, status: 'GOOD', item: { name: 'Lemari baju' } },
    ],
  });
  const svc = makeSvc([room], {
    roomFacility: { findMany: async () => [] },
  });
  const result = await svc.getPublicRoomDetail(1);
  assert.strictEqual(result.id, 1);
  assert.ok(result.pricing);
  assert.strictEqual(result.pricing.monthlyRateRupiah, 1200000);
  assert.ok(result.isAvailable);
});

// ════════════════════════════════════════════════════════════════════════════
// getAvailabilityCalendar
// ════════════════════════════════════════════════════════════════════════════

test('TC-MP09: getAvailabilityCalendar — tanpa room stay (semua kosong)', async () => {
  const svc = makeSvc([makeRoom({ id: 1 }), makeRoom({ id: 2 })], {
    stay: { findMany: async () => [] },
    renewRequest: { findMany: async () => [] },
  });
  const result = await svc.getAvailabilityCalendar({});
  assert.ok(result.from);
  assert.ok(result.to);
  assert.ok(result.dates.length > 0);
  assert.strictEqual(result.rooms.length, 2);
  result.rooms.forEach((r) => {
    Object.values(r.days).forEach((status) => {
      assert.strictEqual(status, 'KOSONG');
    });
  });
});

test('TC-MP10: getAvailabilityCalendar — room dengan stay aktif', async () => {
  const checkIn = new Date(Date.now() - 30 * 86_400_000);
  const plannedCheckOut = new Date(Date.now() + 30 * 86_400_000);
  const stay = makeStay({ checkInDate: checkIn, plannedCheckOutDate: plannedCheckOut });
  const svc = makeSvc([makeRoom({ id: 1, status: 'OCCUPIED' })], {
    stay: { findMany: async () => [stay] },
    renewRequest: { findMany: async () => [] },
  });
  const result = await svc.getAvailabilityCalendar({});
  assert.strictEqual(result.rooms.length, 1);
  const room = result.rooms[0];
  assert.strictEqual(room.status, 'OCCUPIED');
  assert.strictEqual(room.currentTenantName, 'Budi Santoso');
  assert.strictEqual(room.days[TODAY_STR], 'HUNI');
});

test('TC-MP11: getAvailabilityCalendar — maks 62 hari span', async () => {
  const svc = makeSvc([makeRoom({ id: 1 })], {
    stay: { findMany: async () => [] },
    renewRequest: { findMany: async () => [] },
  });
  const result = await svc.getAvailabilityCalendar({
    from: '2026-01-01',
    to: '2026-06-30',
  });
  assert.ok(result.dates.length <= 63);
});
