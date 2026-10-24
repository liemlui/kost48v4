// S7 (P36 a) — "akun wajib saat membayar DP" di sisi API.
//
// Yang dibuktikan berkas ini:
//  1. Pengajuan tamu TIDAK menambah baris `User` dan TIDAK mengembalikan kata sandi;
//     yang dikembalikan adalah kode pengajuan (diturunkan dari Stay.id, tanpa kolom baru).
//  2. Akun TENANT bisa MENGKLAIM pengajuan yang kontaknya sama persis; semua jalur gagal
//     memakai pesan seragam (tidak jadi oracle keberadaan pengajuan).
//  3. Jalur cadangan OWNER/ADMIN bisa mengaitkan pengajuan ke akun yang sudah ada.
//  4. Gerbang DP: tanpa stay milik akun, pembayaran ditolak — dengan pesan yang punya jalan
//     keluar bila kontak akun cocok dengan pengajuan belum berakun.
//
// Batas: seluruhnya memakai Prisma tiruan (bukan DB sungguhan).
const assert = require('node:assert/strict');
const test = require('node:test');
const { ConflictException, NotFoundException } = require('@nestjs/common');

const { PublicBookingsService } = require('../../dist/modules/tenant-bookings/public-bookings.service.js');
const { TenantBookingsService } = require('../../dist/modules/tenant-bookings/tenant-bookings.service.js');
const { PaymentSubmissionsService } = require('../../dist/modules/payment-submissions/payment-submissions.service.js');
const {
  buildBookingReferenceCode,
  GUEST_CLAIM_UNIFORM_MESSAGE,
} = require('../../dist/modules/tenant-bookings/tenant-bookings.helpers.js');

const FUTURE_CHECK_IN = '2099-01-05';

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

function compact(text) {
  return String(text).replace(/\s+/g, ' ');
}

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

/** Prisma tiruan untuk jalur pengajuan tamu (createPublicBooking). */
function makePublicBookingHarness(options = {}) {
  const state = { userCreateCalls: 0, insertCalls: [], queries: [] };

  const tx = {
    $queryRawUnsafe: async () => [{ id: 1 }],
    $queryRaw: async (sql) => {
      const text = compact(sqlWithPlaceholders(sql));
      state.queries.push(text);
      if (text.includes('/* S7-overlap */')) return options.overlapRows ?? [];
      if (text.includes('INSERT INTO "Stay"')) {
        state.insertCalls.push({ text, values: sql.values });
        return [{ id: 4321 }];
      }
      if (text.includes('FROM "Room"')) return [ROOM_ROW];
      if (text.includes('FROM "Stay" s')) return [BOOKING_ROW];
      return [];
    },
    stay: { findFirst: async () => null },
    tenant: {
      findFirst: async () => null,
      create: async () => ({ id: 77, user: null }),
    },
    operationalSetting: { findUnique: async () => ({ petDepositRupiah: 0 }) },
    user: {
      create: async () => {
        state.userCreateCalls += 1;
        return { id: 999, isActive: true };
      },
    },
    auditLog: { create: async () => ({}) },
  };

  const prisma = {
    $queryRaw: async () => [{ hasReservedRoomStatus: true, hasStayExpiresAt: true }],
    $transaction: async (fn) => fn(tx),
    user: tx.user,
  };

  return { prisma, state };
}

function publicBookingDto(overrides = {}) {
  return {
    roomId: 1,
    checkInDate: FUTURE_CHECK_IN,
    pricingTerm: 'MONTHLY',
    fullName: 'Tamu Uji',
    phone: '081234567890',
    email: 'tamu@example.test',
    paymentChoice: 'DP',
    occupantCount: 1,
    ...overrides,
  };
}

function tenantUser(overrides = {}) {
  return {
    id: 11,
    email: 'tamu@example.test',
    fullName: 'Tamu Uji',
    role: 'TENANT',
    tenantId: null,
    isActive: true,
    ...overrides,
  };
}

test('S7-GUEST-1 — pengajuan tamu TIDAK membuat akun dan TIDAK mengembalikan kata sandi', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makePublicBookingHarness();
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  const result = await service.createPublicBooking(publicBookingDto());

  assert.equal(state.userCreateCalls, 0, 'tidak boleh ada user.create pada pengajuan tamu');
  assert.equal(state.insertCalls.length, 1, 'pengajuan tetap membuat satu baris Stay');

  // Tidak ada kredensial di respons, dan permukaan lama `portalAccess` tidak berisi password.
  assert.equal('temporaryPassword' in result.portalAccess, false, 'respons tidak boleh memuat temporaryPassword');
  assert.equal(result.portalAccess.requiresAccount, true);
  assert.equal(result.portalAccess.claimRequired, true);
  assert.equal(/temporaryPassword/i.test(JSON.stringify(result)), false, 'tidak ada kata sandi di seluruh respons');

  // Yang dikembalikan = kode pengajuan deterministik dari Stay.id.
  const expectedCode = buildBookingReferenceCode(4321);
  assert.equal(result.booking.referenceCode, expectedCode);
  assert.match(result.booking.referenceCode, /^K48-[0-9A-Z]{4}-[A-Z2-9]$/);

  // Nominal tidak berubah oleh S7: DP tetap 30% × tarif periode.
  assert.equal(result.payment.downPaymentAmountRupiah, 450000);
});

test('S7-GUEST-2 — baris Stay pengajuan tamu disimpan dengan createdById NULL', async () => {
  process.env.PUBLIC_ONLINE_BOOKING_ENABLED = 'true';
  const { prisma, state } = makePublicBookingHarness();
  const service = new PublicBookingsService(prisma, { linkReferralTx: async () => {} });

  await service.createPublicBooking(publicBookingDto());

  const insert = state.insertCalls[0];
  const columnsPart = insert.text.slice(insert.text.indexOf('(') + 1, insert.text.indexOf(')'));
  const columns = columnsPart.split(',').map((part) => part.trim().replace(/"/g, ''));
  const valuesText = insert.text.slice(insert.text.indexOf('VALUES'));
  // Item VALUES bisa berupa placeholder «n» atau literal SQL (NULL / NOW()), jadi dipetakan
  // per posisi kolom — bukan sekadar mengambil semua placeholder berurutan.
  const valueItems = valuesText
    .slice(valuesText.indexOf('(') + 1, valuesText.lastIndexOf(')'))
    .split(',')
    .map((part) => part.trim());

  const valueFor = (index) => {
    const match = valueItems[index]?.match(/«(\d+)»/);
    if (match) return insert.values[Number(match[1])];
    return valueItems[index];
  };

  const createdByIdIndex = columns.indexOf('createdById');
  assert.ok(createdByIdIndex >= 0, 'INSERT wajib memuat kolom createdById');
  assert.equal(valueFor(createdByIdIndex), null, 'createdById wajib NULL karena tidak ada User yang sah untuk pengajuan tamu');
  assert.equal(valueFor(columns.indexOf('stayPurpose')), 'NULL', 'stayPurpose kosong tetap dikirim sebagai NULL');
});

function makeClaimPrisma(options = {}) {
  const state = { userUpdates: [], audits: [], findManyArgs: [] };
  const prisma = {
    tenant: {
      findUnique: async () => options.currentTenant ?? { id: 91, phone: '+6281234567890', email: 'tamu@example.test' },
      findMany: async (args) => {
        state.findManyArgs.push(args);
        return (options.candidateTenantIds ?? []).map((id) => ({ id }));
      },
    },
    stay: {
      findFirst: async () => (options.hasActiveStay ? { id: 555 } : null),
      count: async () => options.historyStayCount ?? 0,
      findMany: async () => options.claimedRows ?? [
        {
          id: 4321,
          status: 'ACTIVE',
          checkInDate: new Date('2099-01-05T00:00:00.000Z'),
          plannedCheckOutDate: null,
          expiresAt: null,
          room: { code: 'F1' },
        },
      ],
    },
    user: {
      update: async (args) => {
        state.userUpdates.push(args);
        return { id: args.where.id };
      },
    },
    $transaction: async (fn) => fn({
      user: {
        update: async (args) => {
          state.userUpdates.push(args);
          return { id: args.where.id };
        },
      },
      auditLog: {
        create: async (args) => {
          state.audits.push(args);
          return {};
        },
      },
    }),
  };
  return { prisma, state };
}

test('S7-CLAIM-1 — kontak sama persis: pengajuan terkait ke akun yang login', async () => {
  const { prisma, state } = makeClaimPrisma({ candidateTenantIds: [77] });
  const service = new TenantBookingsService(prisma, {}, {});

  const result = await service.claimGuestBookings(tenantUser({ tenantId: 91 }));

  assert.equal(result.alreadyClaimed, false);
  assert.equal(result.tenantId, 77);
  assert.equal(state.userUpdates.length, 1);
  assert.deepEqual(state.userUpdates[0], { where: { id: 11 }, data: { tenantId: 77 } });
  assert.equal(state.audits.length, 1);
  assert.equal(state.audits[0].data.action, 'CLAIM_GUEST_BOOKING');
  assert.equal(result.claimed[0].referenceCode, buildBookingReferenceCode(4321));

  // Pencocokan harus exact match pada phone/email hasil normalisasi, bukan pencarian bebas.
  const where = state.findManyArgs[0].where;
  assert.equal(where.user.is, null, 'hanya Tenant yang belum punya akun yang boleh diklaim');
  const orValues = JSON.stringify(where.OR);
  assert.ok(orValues.includes('+6281234567890'), 'nomor HP akun ikut dicocokkan');
  assert.ok(orValues.includes('tamu@example.test'), 'email akun ikut dicocokkan');
});

test('S7-CLAIM-2 — tidak ada pengajuan yang cocok: pesan seragam, tidak ada perubahan data', async () => {
  const { prisma, state } = makeClaimPrisma({ candidateTenantIds: [] });
  const service = new TenantBookingsService(prisma, {}, {});

  await assert.rejects(
    () => service.claimGuestBookings(tenantUser()),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.equal(error.message, GUEST_CLAIM_UNIFORM_MESSAGE);
      return true;
    },
  );
  assert.equal(state.userUpdates.length, 0, 'klaim gagal tidak boleh mengubah user');
});

test('S7-CLAIM-3 — pengajuan ambigu (kontak dipakai >1 pengajuan) memakai pesan yang sama', async () => {
  const { prisma, state } = makeClaimPrisma({ candidateTenantIds: [77, 78] });
  const service = new TenantBookingsService(prisma, {}, {});

  await assert.rejects(
    () => service.claimGuestBookings(tenantUser()),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.equal(error.message, GUEST_CLAIM_UNIFORM_MESSAGE, 'pesan identik dengan jalur "tidak ada"');
      return true;
    },
  );
  assert.equal(state.userUpdates.length, 0);
});

test('S7-CLAIM-4 — akun yang sudah punya stay: klaim idempoten tanpa perubahan data', async () => {
  const { prisma, state } = makeClaimPrisma({ hasActiveStay: true, candidateTenantIds: [77] });
  const service = new TenantBookingsService(prisma, {}, {});
  const user = tenantUser({ tenantId: 55 });

  const result = await service.claimGuestBookings(user);

  assert.equal(result.alreadyClaimed, true);
  assert.equal(result.tenantId, 55);
  assert.equal(state.userUpdates.length, 0);
  assert.equal(state.findManyArgs.length, 0, 'tidak perlu mencari kandidat bila sudah terklaim');
});

test('S7-CLAIM-5 — akun dengan riwayat hunian tidak boleh dipindahkan diam-diam', async () => {
  const { prisma, state } = makeClaimPrisma({ historyStayCount: 2, candidateTenantIds: [77] });
  const service = new TenantBookingsService(prisma, {}, {});

  await assert.rejects(
    () => service.claimGuestBookings(tenantUser({ tenantId: 55 })),
    (error) => error instanceof ConflictException && error.message === GUEST_CLAIM_UNIFORM_MESSAGE,
  );
  assert.equal(state.userUpdates.length, 0);
});

test('S7-CLAIM-6 — jalur cadangan OWNER/ADMIN: booking dikaitkan lewat email akun', async () => {
  const state = { userUpdates: [], audits: [] };
  const prisma = {
    stay: {
      findUnique: async () => ({ id: 4321, tenantId: 77, status: 'ACTIVE' }),
      count: async () => 0,
    },
    user: {
      findFirst: async () => ({ id: 11, tenantId: 91 }),
      update: async (args) => {
        state.userUpdates.push(args);
        return {};
      },
    },
    $transaction: async (fn) => fn({
      user: {
        update: async (args) => {
          state.userUpdates.push(args);
          return {};
        },
      },
      auditLog: {
        create: async (args) => {
          state.audits.push(args);
          return {};
        },
      },
    }),
  };
  const service = new TenantBookingsService(prisma, {}, {});
  const admin = { id: 3, email: 'admin@kost48.test', fullName: 'Admin', role: 'ADMIN', tenantId: null, isActive: true };

  const result = await service.linkBookingAccount(4321, { email: 'tamu@example.test' }, admin);

  assert.equal(result.linked, true);
  assert.equal(result.alreadyLinked, false);
  assert.deepEqual(state.userUpdates[0], { where: { id: 11 }, data: { tenantId: 77 } });
  assert.equal(state.audits[0].data.action, 'LINK_BOOKING_ACCOUNT');
  assert.equal(state.audits[0].data.actorUserId, 3);
});

test('S7-DP-1 — stay bukan milik akun: DP ditolak dengan pesan seragam', async () => {
  const prisma = {
    tenant: {
      findUnique: async () => ({ phone: '+628111111111', email: 'lain@example.test' }),
      findMany: async () => [],
    },
  };
  const service = new PaymentSubmissionsService(prisma, {}, {}, {}, {});
  service.findEligibleSubmissionTarget = async () => null;

  await assert.rejects(
    () =>
      service.createSubmission(tenantUser({ tenantId: 55 }), {
        stayId: 4321,
        invoiceId: 900,
        amountRupiah: 450000,
        paidAt: '2026-10-01',
        paymentMethod: 'TRANSFER',
      }),
    (error) => {
      assert.ok(error instanceof NotFoundException, 'tanpa kecocokan kontak → 404 seragam');
      return true;
    },
  );
});

test('S7-DP-2 — pengajuan belum terklaim dengan kontak cocok: pesan mengarahkan ke klaim', async () => {
  const prisma = {
    tenant: {
      findUnique: async () => ({ phone: '+6281234567890', email: 'tamu@example.test' }),
      findMany: async () => [{ id: 77 }],
    },
  };
  const service = new PaymentSubmissionsService(prisma, {}, {}, {}, {});
  service.findEligibleSubmissionTarget = async () => null;

  await assert.rejects(
    () =>
      service.createSubmission(tenantUser({ tenantId: 55 }), {
        stayId: 4321,
        invoiceId: 900,
        amountRupiah: 450000,
        paidAt: '2026-10-01',
        paymentMethod: 'TRANSFER',
      }),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /Klaim pengajuan/);
      assert.match(error.message, /admin KOST48/);
      return true;
    },
  );
});
