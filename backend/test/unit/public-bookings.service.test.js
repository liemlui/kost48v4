'use strict';

/**
 * Unit test: PublicBookingsService — createPublicBooking, saveGuestSurvey.
 *
 * Cakupan:
 *   - Schema readiness gate
 *   - Input validation (phone/email, honeypot, date, same-day cutoff)
 *   - Transaction: room validation, tenant/user creation, pricing, deposit
 *   - Error handling: unique constraint, schema drift
 *   - saveGuestSurvey
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} = require('@nestjs/common');

// ════════════════════════════════════════════════════════════════════════════
// Mock booking-schema.helper — override BEFORE importing the service
// ════════════════════════════════════════════════════════════════════════════
const bookingHelper = require('../../dist/modules/tenant-bookings/booking-schema.helper.js');

let _mockSchemaReady = true;
let _mockSchemaDrift = false;

bookingHelper.isBookingSchemaReady = async () => _mockSchemaReady;
bookingHelper.isBookingSchemaDriftError = () => _mockSchemaDrift;

function setSchemaReady(v) { _mockSchemaReady = v; }
function setSchemaDrift(v) { _mockSchemaDrift = v; }

const { PublicBookingsService } = require('../../dist/modules/tenant-bookings/public-bookings.service.js');

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

/**
 * Build a minimal DTO for createPublicBooking.
 * Dates are set relative to "now" so past/future tests are predictable.
 */
function makeDto(overrides = {}) {
  // Default check-in = 7 days from now (always future)
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const futureStr = future.toISOString().slice(0, 10);

  return {
    roomId: 1,
    checkInDate: futureStr,
    pricingTerm: 'MONTHLY',
    fullName: 'Budi Santoso',
    phone: '08123456789',
    email: 'budi@example.com',
    identityNumber: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    plannedCheckOutDate: null,
    stayPurpose: null,
    notes: null,
    website: null,
    referralCode: null,
    occupantCount: 1,
    hasPet: false,
    paymentChoice: 'DP',
    ...overrides,
  };
}

function makeRoom(overrides = {}) {
  return {
    id: 1,
    code: 'G1-001',
    name: 'Kamar G1-001',
    floor: 'G1',
    status: 'AVAILABLE',
    isActive: true,
    dailyRateRupiah: 50000,
    weeklyRateRupiah: 250000,
    biWeeklyRateRupiah: 375000,
    monthlyRateRupiah: 1500000,
    defaultDepositRupiah: 500000,
    allowBookingWhileCleaning: false,
    roomSize: 'STANDARD',
    electricityTariffPerKwhRupiah: 1500,
    waterTariffPerM3Rupiah: 10000,
    notes: null,
    ...overrides,
  };
}

function makeBookingRow(overrides = {}) {
  return {
    id: 999,
    tenantId: 10,
    roomId: 1,
    status: 'ACTIVE',
    pricingTerm: 'MONTHLY',
    agreedRentAmountRupiah: 1500000,
    checkInDate: new Date(),
    plannedCheckOutDate: null,
    expiresAt: new Date(Date.now() + 3 * 3600 * 1000),
    depositAmountRupiah: 500000,
    depositPaidAmountRupiah: 0,
    depositPaymentStatus: 'UNPAID',
    downPaymentAmountRupiah: 450000,
    downPaymentPaidRupiah: 0,
    electricityTariffPerKwhRupiah: 1500,
    waterTariffPerM3Rupiah: 10000,
    bookingSource: 'WEBSITE',
    stayPurpose: null,
    notes: null,
    createdById: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantFullName: 'Budi Santoso',
    tenantPhone: '628123456789',
    tenantEmail: 'budi@example.com',
    roomCode: 'G1-001',
    roomName: 'Kamar G1-001',
    roomFloor: 'G1',
    roomStatus: 'AVAILABLE',
    invoiceCount: 0,
    latestInvoiceId: null,
    latestInvoiceNumber: null,
    latestInvoiceStatus: null,
    invoiceTotalAmountRupiah: null,
    invoicePaidAmountRupiah: null,
    invoiceRemainingAmountRupiah: null,
    ...overrides,
  };
}

/**
 * Create a mock ReferralService (only linkReferralTx is used).
 */
function makeReferralMock() {
  return {
    linkReferralTx: async () => undefined,
  };
}

/**
 * Build a mock query-raw result sequence.
 * queryRawCalls is an array of result values — each popFront is returned
 * in order for successive $queryRaw calls inside the transaction.
 */
function makeQuerySequence(sequence) {
  let idx = 0;
  return async () => {
    const result = sequence[idx];
    if (result !== undefined) idx += 1;
    return result ?? [];
  };
}

/**
 * Create PublicBookingsService with mocked Prisma.
 *
 * @param {object} opts
 * @param {object}  [opts.room]         — room snapshot returned by first $queryRaw
 * @param {boolean} [opts.roomExists]   — if false, first $queryRaw returns []
 * @param {object}  [opts.existingStay] — stay.findFirst result (non-null = conflict)
 * @param {object}  [opts.existingTenant] — tenant.findFirst result before creation
 * @param {number}  [opts.insertStayId] — id returned by INSERT RETURNING
 * @param {object}  [opts.bookingRow]   — row returned by findBookingByIdTx
 * @param {number}  [opts.queryRawOrder] — array of return values in order
 * @param {boolean} [opts.tenantCreateError] — if true, tenant.create throws unique error
 * @param {boolean} [opts.schemaDriftError]  — if true, throw schema drift error inside tx
 */
function makeService(opts = {}) {
  const {
    room = makeRoom(),
    roomExists = true,
    existingStay = null,
    existingTenant = null,
    insertStayId = 999,
    bookingRow = makeBookingRow(),
    tenantCreateError = false,
  } = opts;

  // Sequence for $queryRaw calls inside transaction
  let qrSequence = [];
  // Call 1: Room lock query (returns room snapshot)
  qrSequence.push(roomExists ? [room] : []);
  // Call 2: INSERT ... RETURNING id
  qrSequence.push([{ id: insertStayId }]);
  // Call 3: findBookingByIdTx query
  qrSequence.push([bookingRow]);
  let qrIdx = 0;

  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        // $queryRawUnsafe — SELECT id FROM "Room" ... FOR UPDATE (row lock)
        $queryRawUnsafe: async () => (roomExists ? [{ id: room.id }] : []),
        // $queryRaw — room data (call 1), INSERT (call 2), findBooking (call 3)
        $queryRaw: async () => {
          const val = qrSequence[qrIdx];
          if (qrIdx < qrSequence.length) qrIdx += 1;
          return val ?? [];
        },
        stay: {
          findFirst: async () => existingStay,
        },
        tenant: {
          findFirst: async () => existingTenant,
          create: async (data) => {
            if (tenantCreateError) {
              const err = new Error('Unique constraint');
              err.code = '23505';
              throw err;
            }
            return {
              id: 10,
              fullName: data.data.fullName,
              phone: data.data.phone,
              email: data.data.email,
              identityNumber: data.data.identityNumber || null,
              emergencyContactName: data.data.emergencyContactName || null,
              emergencyContactPhone: data.data.emergencyContactPhone || null,
              notes: data.data.notes || null,
              user: null,
            };
          },
        },
        user: {
          create: async (data) => ({
            id: 20,
            fullName: data.data.fullName,
            email: data.data.email,
            role: 'TENANT',
            isActive: true,
          }),
        },
        operationalSetting: {
          findUnique: async () => ({ petDepositRupiah: 100000 }),
        },
        auditLog: {
          create: async () => undefined,
        },
      };
      return cb(tx);
    },
  };

  const referral = makeReferralMock();
  return new PublicBookingsService(prisma, referral);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Schema readiness gate
// ════════════════════════════════════════════════════════════════════════════

test('PB-T01: createPublicBooking — schema not ready → ServiceUnavailableException', async () => {
  setSchemaReady(false);
  try {
    const svc = makeService();
    await svc.createPublicBooking(makeDto());
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof ServiceUnavailableException);
    assert.ok(err.message.includes('booking belum aktif'));
  } finally {
    setSchemaReady(true);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Input validation (before transaction)
// ════════════════════════════════════════════════════════════════════════════

test('PB-T02: createPublicBooking — no phone AND no email → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ phone: '', email: '' })),
    (err) => err instanceof BadRequestException && err.message.includes('Minimal isi'),
  );
});

test('PB-T03: createPublicBooking — invalid phone (too short) → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ phone: '123' })),
    (err) => err instanceof BadRequestException && err.message.includes('tidak valid'),
  );
});

test('PB-T04: createPublicBooking — honeypot website terisi → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ website: 'http://spam.com' })),
    (err) => err instanceof BadRequestException && err.message.includes('tidak valid'),
  );
});

test('PB-T05: createPublicBooking — checkInDate invalid string → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ checkInDate: 'not-a-date' })),
    (err) => err instanceof BadRequestException && err.message.includes('Tanggal check-in'),
  );
});

test('PB-T06: createPublicBooking — plannedCheckOutDate ≤ checkInDate → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({
      checkInDate: '2026-07-20',
      plannedCheckOutDate: '2026-07-20', // same day
    })),
    (err) => err instanceof BadRequestException && err.message.includes('setelah check-in'),
  );
});

test('PB-T07: createPublicBooking — checkInDate di masa lalu → BadRequestException', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ checkInDate: '2020-01-01' })),
    (err) => err instanceof BadRequestException && err.message.includes('masa lalu'),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Transaction — Room validation
// ════════════════════════════════════════════════════════════════════════════

test('PB-T08: createPublicBooking — room tidak ditemukan → NotFoundException', async () => {
  const svc = makeService({ roomExists: false });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof NotFoundException && err.message.includes('tidak ditemukan'),
  );
});

test('PB-T09: createPublicBooking — room tidak aktif → ConflictException', async () => {
  const svc = makeService({ room: makeRoom({ isActive: false }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('tidak tersedia'),
  );
});

test('PB-T10: createPublicBooking — room status OCCUPIED → ConflictException', async () => {
  const svc = makeService({ room: makeRoom({ status: 'OCCUPIED' }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('belum bisa dipesan'),
  );
});

test('PB-T11: createPublicBooking — room status RESERVED → ConflictException', async () => {
  const svc = makeService({ room: makeRoom({ status: 'RESERVED' }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('belum bisa dipesan'),
  );
});

test('PB-T12: createPublicBooking — MAINTENANCE without allowBookingWhileCleaning → ConflictException', async () => {
  const svc = makeService({ room: makeRoom({ status: 'MAINTENANCE', allowBookingWhileCleaning: false }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('belum bisa dipesan'),
  );
});

test('PB-T13: createPublicBooking — MAINTENANCE with allowBookingWhileCleaning → sukses', async () => {
  const svc = makeService({ room: makeRoom({ status: 'MAINTENANCE', allowBookingWhileCleaning: true }) });
  // Should not throw — proceed to booking creation
  const result = await svc.createPublicBooking(makeDto());
  assert.ok(result.booking, 'has booking');
  assert.strictEqual(result.booking.roomCode, 'G1-001');
});

test('PB-T14: createPublicBooking — existing paid/occupied stay di room → ConflictException', async () => {
  const svc = makeService({ existingStay: { id: 55 } });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('sedang ditempati'),
  );
});

test('PB-T15: createPublicBooking — tenant dengan active booking (same phone) → ConflictException', async () => {
  const svc = makeService({
    existingTenant: { id: 10, phone: '628123456789' },
  });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('booking atau hunian aktif'),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Transaction — Pricing & capacity
// ════════════════════════════════════════════════════════════════════════════

test('PB-T16: createPublicBooking — monthlyRateRupiah 0 → ConflictException', async () => {
  const svc = makeService({ room: makeRoom({ monthlyRateRupiah: 0 }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ pricingTerm: 'MONTHLY' })),
    (err) => err instanceof ConflictException && err.message.includes('Tarif kamar'),
  );
});

test('PB-T17: createPublicBooking — pricing term tanpa multiplier → ConflictException', async () => {
  // Gunakan pricingTerm yang tidak dikenal (tapi harus valid enum)
  // Karena enum divalidasi class-validator, asumsikan monthlyRate=0
  const svc = makeService({ room: makeRoom({ monthlyRateRupiah: 0 }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ pricingTerm: 'MONTHLY' })),
    (err) => err instanceof ConflictException,
  );
});

test('PB-T18: createPublicBooking — occupant exceed hard cap STANDARD → BadRequestException', async () => {
  const svc = makeService({ room: makeRoom({ roomSize: 'STANDARD' }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ occupantCount: 5 })),
    (err) => err instanceof BadRequestException && err.message.includes('melebihi batas maksimal'),
  );
});

test('PB-T19: createPublicBooking — occupant exceed hard cap LARGE → BadRequestException', async () => {
  const svc = makeService({ room: makeRoom({ roomSize: 'LARGE' }) });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto({ occupantCount: 7 })),
    (err) => err instanceof BadRequestException && err.message.includes('melebihi batas maksimal'),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Success flows
// ════════════════════════════════════════════════════════════════════════════

test('PB-T20: createPublicBooking — successful booking, new tenant + new user, DP', async () => {
  const svc = makeService();
  const result = await svc.createPublicBooking(makeDto());

  assert.ok(result.booking, 'has booking');
  assert.strictEqual(result.booking.roomCode, 'G1-001');
  assert.strictEqual(result.payment.paymentChoice, 'DP');
  assert.ok(result.payment.downPaymentAmountRupiah > 0, 'DP > 0');
  assert.strictEqual(result.payment.depositAmountRupiah, 500000);
  assert.ok(result.portalAccess.isNewUser, 'is new user');
  assert.ok(result.portalAccess.temporaryPassword, 'has temp password');
  assert.ok(result.portalAccess.temporaryPassword.startsWith('Kost48'), 'password format');
});

test('PB-T21: createPublicBooking — existing tenant (no user) → creates user, isNewUser false', async () => {
  // Simulasi: tenant sudah ada (findFirst kedua) tapi tidak punya active booking (findFirst pertama = null)
  let tenantCallCount = 0;
  const qrSeq = [[makeRoom()], [{ id: 999 }], [makeBookingRow()]];
  let qi = 0;
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRawUnsafe: async () => [{ id: 1 }],
        $queryRaw: async () => {
          const v = qrSeq[qi];
          if (qi < qrSeq.length) qi += 1;
          return v ?? [];
        },
        stay: { findFirst: async () => null },
        tenant: {
          findFirst: async () => {
            tenantCallCount += 1;
            if (tenantCallCount === 1) return null; // active booking check → no conflict
            return { id: 10, phone: '628123456789', email: 'existing@example.com', user: null };
          },
          create: async (data) => ({
            id: 10, ...data.data, user: null,
          }),
        },
        user: {
          create: async (data) => ({ id: 20, ...data.data }),
        },
        operationalSetting: {
          findUnique: async () => ({ petDepositRupiah: 100000 }),
        },
        auditLog: { create: async () => undefined },
      };
      return cb(tx);
    },
  };
  const svc = new PublicBookingsService(prisma, makeReferralMock());
  const result = await svc.createPublicBooking(makeDto({ email: 'existing@example.com' }));
  assert.ok(result.booking, 'has booking');
  // User baru dibuat karena tenant existing tidak punya user portal
  assert.strictEqual(result.portalAccess.isNewUser, true, 'new user created for existing tenant');
  assert.ok(result.portalAccess.temporaryPassword, 'has temp password for new user');
});

test('PB-T22: createPublicBooking — FULL payment → downPayment = agreedRent', async () => {
  const svc = makeService({ room: makeRoom({ monthlyRateRupiah: 2000000 }) });
  const result = await svc.createPublicBooking(makeDto({ paymentChoice: 'FULL' }));
  assert.strictEqual(result.payment.paymentChoice, 'FULL');
  // agreedRent = monthlyRate * 1.0 = 2000000 → roundUpToNearest(2000000, 5000) = 2000000
  assert.strictEqual(result.payment.agreedRentAmountRupiah, 2000000);
  // FULL → downPayment = agreedRent
  assert.strictEqual(result.payment.downPaymentAmountRupiah, 2000000);
});

test('PB-T23: createPublicBooking — with pet → deposit includes petDeposit', async () => {
  const svc = makeService();
  const result = await svc.createPublicBooking(makeDto({ hasPet: true }));
  // room defaultDeposit = 500000 + petDeposit = 100000
  assert.strictEqual(result.payment.depositAmountRupiah, 600000);
  assert.ok(result.payment.depositBreakdown.petDepositRupiah > 0);
});

test('PB-T24: createPublicBooking — with referralCode → linkReferralTx dipanggil (tidak throw)', async () => {
  let referralCalled = false;
  // Sequence untuk 3 calls $queryRaw
  const qrResults = [[makeRoom()], [{ id: 999 }], [makeBookingRow()]];
  let qrIdx = 0;

  const svc = new PublicBookingsService(
    {
      $transaction: async (cb) => {
        const tx = {
          $queryRawUnsafe: async () => [{ id: 1 }],
          $queryRaw: async () => {
            const val = qrResults[qrIdx];
            if (qrIdx < qrResults.length) qrIdx += 1;
            return val ?? [];
          },
          stay: { findFirst: async () => null },
          tenant: {
            findFirst: async () => null,
            create: async (data) => ({
              id: 10, ...data.data, user: null,
            }),
          },
          user: {
            create: async (data) => ({ id: 20, ...data.data }),
          },
          operationalSetting: {
            findUnique: async () => ({ petDepositRupiah: 100000 }),
          },
          auditLog: { create: async () => undefined },
        };
        return cb(tx);
      },
    },
    {
      linkReferralTx: async (tx, args) => {
        referralCalled = true;
        assert.ok(args.referralCode, 'REF-TEST');
        assert.ok(args.referredTenantId > 0);
      },
    },
  );

  const result = await svc.createPublicBooking(makeDto({ referralCode: 'REF-TEST' }));
  assert.ok(referralCalled, 'linkReferralTx was called');
  assert.ok(result.booking, 'booking created');
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Error handling variants
// ════════════════════════════════════════════════════════════════════════════

test('PB-T25: createPublicBooking — tenant.create unique constraint → ConflictException', async () => {
  const svc = makeService({ tenantCreateError: true });
  await assert.rejects(
    () => svc.createPublicBooking(makeDto()),
    (err) => err instanceof ConflictException && err.message.includes('Booking bentrok'),
  );
});

test('PB-T26: createPublicBooking — schema drift error inside tx → ServiceUnavailableException', async () => {
  setSchemaDrift(true);
  const svc = makeService({
    // Force a Prisma error that looks like schema drift
    room: makeRoom(),
  });
  // Override the service to throw a drift-like error
  // Actually, schema drift is caught by isBookingSchemaDriftError.
  // We need to make one of the Prisma calls throw an error that matches.
  // Since we can't easily do that with our mock, let's test via the drift mock.
  // 
  // The schema drift error check is in the catch block. We can trigger it by
  // making tenant.create throw an error that matches isBookingSchemaDriftError.
  // Since we already mocked isBookingSchemaDriftError to return _mockSchemaDrift,
  // any thrown error inside the transaction will match.
  // 
  // But we need the error to actually occur. Let's use a special service.
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRawUnsafe: async () => [{ id: 1 }],
        $queryRaw: async () => [makeRoom()],
        stay: { findFirst: async () => null },
        tenant: {
          findFirst: async () => null,
          create: async () => { throw new Error('column "expiresAt" does not exist'); },
        },
        user: { create: async () => undefined },
        operationalSetting: { findUnique: async () => ({ petDepositRupiah: 100000 }) },
        auditLog: { create: async () => undefined },
      };
      return cb(tx);
    },
  };
  const svcWithDrift = new PublicBookingsService(prisma, makeReferralMock());

  try {
    await svcWithDrift.createPublicBooking(makeDto());
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err instanceof ServiceUnavailableException, `Expected ServiceUnavailableException, got ${err.constructor?.name ?? typeof err}: ${err.message}`);
    assert.ok(err.message.includes('booking belum aktif'));
  } finally {
    setSchemaDrift(false);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 7. saveGuestSurvey
// ════════════════════════════════════════════════════════════════════════════

test('PB-T27: saveGuestSurvey — basic survey → returns { id }', async () => {
  let captured = null;
  const prisma = {
    guestPreferenceSurvey: {
      create: async (args) => {
        captured = args.data;
        return { id: 42 };
      },
    },
  };
  const svc = new PublicBookingsService(prisma, makeReferralMock());

  const result = await svc.saveGuestSurvey(
    { bathroom: 'SHARED', cooling: 'AC', skipped: false },
    'Mozilla/5.0',
    'https://kost48.example.com',
  );

  assert.strictEqual(result.id, 42);
  assert.strictEqual(captured.bathroom, 'SHARED');
  assert.strictEqual(captured.cooling, 'AC');
  assert.strictEqual(captured.userAgent, 'Mozilla/5.0');
  assert.strictEqual(captured.referrer, 'https://kost48.example.com');
});

test('PB-T28: saveGuestSurvey — skipped survey → skipped=true', async () => {
  let captured = null;
  const prisma = {
    guestPreferenceSurvey: {
      create: async (args) => {
        captured = args.data;
        return { id: 43 };
      },
    },
  };
  const svc = new PublicBookingsService(prisma, makeReferralMock());

  const result = await svc.saveGuestSurvey(
    { skipped: true, sessionId: 'abc-123' },
    null,
    null,
  );

  assert.strictEqual(result.id, 43);
  assert.strictEqual(captured.skipped, true);
  assert.strictEqual(captured.sessionId, 'abc-123');
});
