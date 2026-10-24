// S7 — tahan double-book: cek irisan rentang tanggal di aplikasi + ulang transaksi 40001.
//
// Konteks keputusan owner (`ROOMS-AKUN-V2 S2`): double-book ditegakkan DI APLIKASI, tanpa
// constraint exclusion PostgreSQL. Berkas ini membuktikan apa yang benar-benar dijamin kode:
//  1. Pengajuan kedua dengan rentang tanggal beririsan DITOLAK (dan tidak ada INSERT Stay).
//  2. Pemeriksaan irisan dijalankan SESUDAH baris Room dikunci `FOR UPDATE`, di transaksi yang sama.
//  3. Pengajuan kedaluwarsa yang belum membayar DP tidak dihitung (tidak mengunci kamar selamanya).
//  4. Rentang tidak beririsan tetap lolos (tidak ada regresi).
//  5. Transaksi diulang pada SQLSTATE 40001, dan TIDAK diulang untuk galat lain.
//
// Batas jujur: semua ini lewat Prisma tiruan. Tanpa exclusion constraint, dua pengajuan
// bersamaan pada koneksi/proses berbeda tetap bisa lolos — bukan diuji (dan tidak diklaim) di sini.
const assert = require('node:assert/strict');
const test = require('node:test');
const { ConflictException } = require('@nestjs/common');

const { PublicBookingsService } = require('../../dist/modules/tenant-bookings/public-bookings.service.js');
const {
  assertNoOverlappingStayTx,
  withSerializationRetry,
} = require('../../dist/modules/tenant-bookings/tenant-bookings.helpers.js');

function sqlWithPlaceholders(sql) {
  const strings = Array.isArray(sql?.strings) ? sql.strings : [String(sql)];
  const values = Array.isArray(sql?.values) ? sql.values : [];
  let out = '';
  for (let i = 0; i < strings.length; i += 1) {
    out += strings[i];
    if (i < values.length) out += `«${i}»`;
  }
  return out;
}

const compact = (text) => String(text).replace(/\s+/g, ' ');

const ROOM_ROW = {
  id: 1,
  code: 'F1',
  name: 'Kamar F1',
  floor: '1',
  status: 'AVAILABLE',
  isActive: true,
  dailyRateRupiah: 100000,
  weeklyRateRupiah: 400000,
  biWeeklyRateRupiah: 600000,
  monthlyRateRupiah: 1500000,
  defaultDepositRupiah: 500000,
  allowBookingWhileCleaning: false,
  roomSize: 'STANDARD',
  electricityTariffPerKwhRupiah: 2500,
  waterTariffPerM3Rupiah: 0,
  notes: null,
};

const BOOKING_ROW = {
  id: 4321,
  tenantId: 77,
  roomId: 1,
  status: 'ACTIVE',
  pricingTerm: 'MONTHLY',
  agreedRentAmountRupiah: 1500000,
  checkInDate: new Date('2099-01-05T00:00:00.000Z'),
  plannedCheckOutDate: null,
  expiresAt: new Date('2099-01-05T03:00:00.000Z'),
  depositAmountRupiah: 500000,
  depositPaidAmountRupiah: 0,
  depositPaymentStatus: 'UNPAID',
  downPaymentAmountRupiah: 450000,
  downPaymentPaidRupiah: 0,
  electricityTariffPerKwhRupiah: 2500,
  waterTariffPerM3Rupiah: 0,
  bookingSource: 'WEBSITE',
  stayPurpose: null,
  notes: null,
  cancelReason: null,
  createdById: null,
  createdAt: new Date('2098-12-01T00:00:00.000Z'),
  updatedAt: new Date('2098-12-01T00:00:00.000Z'),
  tenantFullName: 'Tamu Uji',
  tenantPhone: '+6281234567890',
  tenantEmail: 'tamu@example.test',
  roomCode: 'F1',
  roomName: 'Kamar F1',
  roomFloor: '1',
  roomStatus: 'AVAILABLE',
};

function makeHarness(options = {}) {
  const state = { order: [], overlapQuery: null, insertCalls: 0, transactionCalls: 0 };

  const tx = {
    $queryRawUnsafe: async () => {
      state.order.push('room-lock');
      return [{ id: 1 }];
    },
    $queryRaw: async (sql) => {
      const text = compact(sqlWithPlaceholders(sql));
      if (text.includes('/* S7-overlap */')) {
        state.order.push('overlap');
        state.overlapQuery = { text, values: sql.values };
        return options.overlapRows ?? [];
      }
      if (text.includes('INSERT INTO "Stay"')) {
        state.order.push('insert');
        state.insertCalls += 1;
        return [{ id: 4321 }];
      }
      if (text.includes('FROM "Room"')) return [ROOM_ROW];
      if (text.includes('FROM "Stay" s')) return [BOOKING_ROW];
      return [];
    },
    stay: { findFirst: async () => null },
    tenant: { findFirst: async () => null, create: async () => ({ id: 77, user: null }) },
    operationalSetting: { findUnique: async () => ({ petDepositRupiah: 0 }) },
    user: { create: async () => ({ id: 999 }) },
    auditLog: { create: async () => ({}) },
  };

  const prisma = {
    $queryRaw: async () => [{ hasReservedRoomStatus: true, hasStayExpiresAt: true }],
    $transaction: async (fn) => {
      state.transactionCalls += 1;
      if (options.failTransactionsWithSerialization && state.transactionCalls === 1) {
        const error = new Error('could not serialize access due to concurrent update');
        error.code = '40001';
        throw error;
      }
      return fn(tx);
    },
  };

  return { prisma, state };
}

function dto(overrides = {}) {
  return {
    roomId: 1,
    checkInDate: '2099-01-05',
    pricingTerm: 'MONTHLY',
    fullName: 'Tamu Uji',
    phone: '081234567890',
    email: 'tamu@example.test',
    paymentChoice: 'DP',
    occupantCount: 1,
    ...overrides,
  };
}

test('S7-OVERLAP-1 — rentang beririsan ditolak dan tidak ada baris Stay yang dibuat', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makeHarness({ overlapRows: [{ id: 9 }] });
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  await assert.rejects(
    () => service.createPublicBooking(dto()),
    (error) => {
      assert.ok(error instanceof ConflictException, 'irisan harus 409, bukan diam-diam lolos');
      assert.match(error.message, /beririsan/);
      return true;
    },
  );

  assert.equal(state.insertCalls, 0, 'tidak boleh ada INSERT saat irisan terdeteksi');
});

test('S7-OVERLAP-2 — pemeriksaan irisan dijalankan sesudah kunci Room, di transaksi yang sama', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makeHarness();
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  await service.createPublicBooking(dto());

  assert.deepEqual(state.order, ['room-lock', 'overlap', 'insert'], 'urutan: kunci kamar → cek irisan → insert');
  assert.equal(state.transactionCalls, 1);
});

test('S7-OVERLAP-3 — kueri irisan memakai batas setengah-terbuka dan mengabaikan pengajuan kedaluwarsa', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makeHarness();
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  await service.createPublicBooking(dto({ plannedCheckOutDate: '2099-02-05' }));

  const { text, values } = state.overlapQuery;
  assert.ok(text.includes('s."roomId" ='), 'irisan dihitung per kamar');
  assert.ok(text.includes('s."status"'), 'hanya stay ACTIVE yang dihitung');
  assert.ok(text.includes('s."plannedCheckOutDate" IS NULL OR s."plannedCheckOutDate" >'), 'ujung terbuka = tak berhingga');
  assert.ok(text.includes('s."checkInDate" <'), 'batas atas memakai tanggal keluar pengajuan baru');
  assert.ok(text.includes('COALESCE(s."downPaymentPaidRupiah", 0) = 0'), 'pengajuan belum bayar dikecualikan bila kedaluwarsa');
  assert.ok(text.includes('s."expiresAt" < NOW()'), 'syarat kedaluwarsa memakai expiresAt');
  assert.ok(values.length >= 3, 'roomId + dua batas tanggal ikut sebagai parameter, bukan string SQL');
});

test('S7-OVERLAP-4 — rentang tidak beririsan tetap lolos (tidak ada regresi)', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makeHarness({ overlapRows: [] });
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  const result = await service.createPublicBooking(dto());

  assert.equal(state.insertCalls, 1, 'pengajuan sah tetap dibuat');
  assert.equal(result.booking.stayId, 4321);
});

test('S7-OVERLAP-5 — assertNoOverlappingStayTx melempar 409 saat ada baris beririsan', async () => {
  const tx = { $queryRaw: async () => [{ id: 9 }] };
  await assert.rejects(
    () =>
      assertNoOverlappingStayTx(tx, {
        roomId: 1,
        checkInDate: new Date('2099-01-05T00:00:00.000Z'),
        plannedCheckOutDate: null,
      }),
    (error) => error instanceof ConflictException,
  );
});

test('S7-OVERLAP-6 — assertNoOverlappingStayTx tenang saat tidak ada irisan', async () => {
  const tx = { $queryRaw: async () => [] };
  await assert.doesNotReject(() =>
    assertNoOverlappingStayTx(tx, {
      roomId: 1,
      checkInDate: new Date('2099-01-05T00:00:00.000Z'),
      plannedCheckOutDate: new Date('2099-02-05T00:00:00.000Z'),
    }),
  );
});

test('S7-RETRY-1 — transaksi diulang pada SQLSTATE 40001 lalu berhasil', async () => {
  let attempts = 0;
  const result = await withSerializationRetry(
    async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('could not serialize access');
        error.code = '40001';
        throw error;
      }
      return 'ok';
    },
    { attempts: 3, delayMs: 0 },
  );

  assert.equal(result, 'ok');
  assert.equal(attempts, 2, 'percobaan pertama gagal serialisasi, kedua berhasil');
});

test('S7-RETRY-2 — galat selain 40001 tidak diulang', async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withSerializationRetry(
        async () => {
          attempts += 1;
          const error = new Error('unique violation');
          error.code = '23505';
          throw error;
        },
        { attempts: 3, delayMs: 0 },
      ),
    (error) => error.code === '23505',
  );
  assert.equal(attempts, 1, 'galat non-serialisasi harus langsung dilempar');
});

test('S7-RETRY-3 — pengajuan booking memakai pembungkus retry (40001 sekali → tetap berhasil)', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makeHarness({ failTransactionsWithSerialization: true });
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  const result = await service.createPublicBooking(dto());

  assert.equal(state.transactionCalls, 2, 'transaksi dijalankan ulang setelah 40001');
  assert.equal(result.booking.stayId, 4321);
  assert.equal(state.insertCalls, 1, 'INSERT tetap sekali');
});
