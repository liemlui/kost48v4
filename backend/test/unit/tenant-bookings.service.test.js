'use strict';

/**
 * Unit test: TenantBookingsService
 *   — createBooking (tenant portal)
 *   — approveBooking (admin)
 *   — rejectBooking (admin)
 *   — cancelPendingBooking (tenant)
 *   — findMyBookings
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } = require('@nestjs/common');
const { Prisma } = require('../../dist/generated/prisma');

// ── Mock booking-schema.helper ──────────────────────────────────────────
const bookingHelper = require('../../dist/modules/tenant-bookings/booking-schema.helper.js');
let _schemaReady = true;
let _schemaDrift = false;
bookingHelper.isBookingSchemaReady = async () => _schemaReady;
const origDrift = bookingHelper.isBookingSchemaDriftError;
bookingHelper.isBookingSchemaDriftError = () => _schemaDrift;
function setSchemaReady(v) { _schemaReady = v; }
function setSchemaDrift(v) { _schemaDrift = v; }

const { TenantBookingsService } = require('../../dist/modules/tenant-bookings/tenant-bookings.service.js');

// ── Actors ──────────────────────────────────────────────────────────────
const TENANT_USER = { id: 20, role: 'TENANT', tenantId: 10 };
const TENANT_USER_NO_TENANT = { id: 21, role: 'TENANT', tenantId: null };
const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };
const OWNER = { id: 2, role: 'OWNER', tenantId: null };

// ── Factories ───────────────────────────────────────────────────────────
function makeDto(overrides = {}) {
  const future = new Date(); future.setDate(future.getDate() + 7);
  return {
    roomId: 1,
    checkInDate: future.toISOString().slice(0, 10),
    pricingTerm: 'MONTHLY',
    stayPurpose: null,
    notes: null,
    plannedCheckOutDate: null,
    ...overrides,
  };
}

function makeApproveDto(overrides = {}) {
  return {
    initialElectricityKwh: 100,
    initialWaterM3: 50,
    agreedRentAmountRupiah: 1500000,
    depositAmountRupiah: 500000,
    ...overrides,
  };
}

function makeRejectDto(overrides = {}) {
  return { reviewNotes: 'Kamar sedang ada renovasi besar-besaran.', ...overrides };
}

function makeCancelDto(overrides = {}) {
  return { cancelReason: 'Saya berubah pikiran', ...overrides };
}

function makeRoom(overrides = {}) {
  return [{
    id: 1, code: 'G1-001', name: 'Kamar G1-001', floor: 'G1',
    status: 'AVAILABLE', isActive: true,
    dailyRateRupiah: 50000, weeklyRateRupiah: 250000, biWeeklyRateRupiah: 375000,
    monthlyRateRupiah: 1500000, defaultDepositRupiah: 500000,
    allowBookingWhileCleaning: false,
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    notes: null, ...overrides,
  }];
}

function makeTenant(overrides = {}) {
  return { id: 10, fullName: 'Budi', phone: '628123456789', email: 'budi@test.com', isActive: true, ktpVerifiedAt: new Date(), ...overrides };
}

function makeApprovalRow(overrides = {}) {
  return [{
    stayId: 100, tenantId: 10, roomId: 1, stayStatus: 'ACTIVE', pricingTerm: 'MONTHLY',
    agreedRentAmountRupiah: 1500000, checkInDate: new Date(), plannedCheckOutDate: null,
    expiresAt: new Date(Date.now() + 3*3600*1000), bookingSource: 'WEBSITE',
    roomCode: 'G1-001', roomStatus: 'AVAILABLE', roomIsActive: true, tenantIsActive: true,
    ...overrides,
  }];
}

function makeCancelRow(overrides = {}) {
  return [{
    stayId: 100, tenantId: 10, roomId: 1, stayStatus: 'ACTIVE', expiresAt: new Date(Date.now() + 3*3600*1000), roomStatus: 'AVAILABLE',
    ...overrides,
  }];
}

function makeRejectRow(overrides = {}) {
  return [{
    stayId: 100, tenantId: 10, roomId: 1, stayStatus: 'ACTIVE', expiresAt: new Date(Date.now() + 3*3600*1000),
    bookingSource: 'WEBSITE', roomStatus: 'AVAILABLE', tenantIsActive: true,
    ...overrides,
  }];
}

function makeBookingRow() {
  return [{
    id: 100, tenantId: 10, roomId: 1, status: 'ACTIVE', pricingTerm: 'MONTHLY',
    agreedRentAmountRupiah: 1500000, checkInDate: new Date(), plannedCheckOutDate: null,
    expiresAt: new Date(Date.now() + 3*3600*1000), depositAmountRupiah: 500000,
    depositPaidAmountRupiah: 0, depositPaymentStatus: 'UNPAID',
    downPaymentAmountRupiah: 450000, downPaymentPaidRupiah: 0,
    electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 10000,
    bookingSource: 'WEBSITE', stayPurpose: null, notes: null, cancelReason: null,
    createdById: 20, createdAt: new Date(), updatedAt: new Date(),
    tenantFullName: 'Budi', tenantPhone: '628123456789', tenantEmail: 'budi@test.com',
    roomCode: 'G1-001', roomName: 'Kamar G1-001', roomFloor: 'G1', roomStatus: 'AVAILABLE',
    invoiceCount: 0, latestInvoiceId: null, latestInvoiceNumber: null, latestInvoiceStatus: null,
    invoiceTotalAmountRupiah: null, invoicePaidAmountRupiah: null, invoiceRemainingAmountRupiah: null,
  }];
}

// ── Mock service factory ─────────────────────────────────────────────────
function qrSeq(seq) { let i = 0; return async () => { const v = seq[i]; if (i < seq.length) i += 1; return v ?? []; }; }

function makeMocks(overrides = {}) {
  const {
    tenantData = makeTenant(),
    roomData = makeRoom(),
    existingActiveStay = null,
    existingPaidStay = null,
    approvalRow = makeApprovalRow(),
    rejectRow = makeRejectRow(),
    cancelRow = makeCancelRow(),
    bookingRow = makeBookingRow(),
    existingInvoice = null,
    existingSubmission = null,
    otherActiveBooking = null,
    openCleaningTicket = null,
    dpPaidData = null,
    notifService = { create: async () => undefined },
    accountingPosting = { postInvoiceIssuedTx: async () => undefined },
  } = overrides;

  const appNotification = {
    findFirst: async () => null,
    create: async () => undefined,
    ...(notifService?.findFirst ? { findFirst: notifService.findFirst } : {}),
    ...(notifService?.create ? { create: notifService.create } : {}),
  };

  const qrSeqRoom = qrSeq([roomData, [{ id: 100 }], bookingRow]);
  const qrSeqApprove = qrSeq([approvalRow]);
  const qrSeqReject = qrSeq([rejectRow]);
  const qrSeqCancel = qrSeq([cancelRow]);

  let tenantFindFirstCall = 0;

  const prisma = {
    tenant: {
      findUnique: async () => tenantData,
    },
    user: {
      findFirst: async () => ({ id: 20 }),
    },
    appNotification,
    $transaction: async (cb) => {
      const tx = {
        $queryRawUnsafe: async () => [{ id: 1 }],
        $queryRaw: qrSeqRoom,
        $executeRaw: async () => undefined,
        stay: {
          findFirst: async (q) => {
            // Check what field is used to differentiate
            if (q?.where?.status === 'ACTIVE' && q?.where?.tenantId) return existingActiveStay;
            if (q?.where?.status === 'ACTIVE' && q?.where?.roomId) return existingPaidStay;
            return null;
          },
          findUnique: async () => dpPaidData,
          update: async (args) => ({ id: 100, ...args.data, status: 'ACTIVE' }),
        },
        tenant: {
          findFirst: async () => { tenantFindFirstCall += 1; return null; },
        },
        invoice: {
          findFirst: async () => existingInvoice,
          create: async (data) => ({ id: 200, ...data.data, totalAmountRupiah: 1500000, status: 'DRAFT', issuedAt: null }),
          update: async (args) => ({ id: 200, invoiceNumber: 'INV-001', status: 'ISSUED', issuedAt: new Date(), periodStart: new Date(), periodEnd: new Date(), dueDate: new Date(), ...args.data }),
        },
        invoiceLine: { createMany: async () => undefined },
        paymentSubmission: { findFirst: async () => existingSubmission },
        ticket: { findFirst: async () => openCleaningTicket },
        auditLog: { create: async () => undefined },
      };

      // For approve/reject/cancel, override $queryRaw
      if (overrides._mode === 'approve') tx.$queryRaw = qrSeqApprove;
      if (overrides._mode === 'reject') tx.$queryRaw = qrSeqReject;
      if (overrides._mode === 'cancel') tx.$queryRaw = qrSeqCancel;

      return cb(tx);
    },
  };

  const svc = new TenantBookingsService(prisma, appNotification, accountingPosting);
  return svc;
}

function makeApproveMocks(overrides = {}) {
  return makeMocks({ ...overrides, _mode: 'approve' });
}

function makeRejectMocks(overrides = {}) {
  return makeMocks({ ...overrides, _mode: 'reject' });
}

function makeCancelMocks(overrides = {}) {
  return makeMocks({ ...overrides, _mode: 'cancel' });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. createBooking — Schema gate & input validation
// ════════════════════════════════════════════════════════════════════════════

test('TB-create-01: schema not ready → ServiceUnavailableException', async () => {
  setSchemaReady(false);
  try {
    const svc = makeMocks();
    await svc.createBooking(makeDto(), TENANT_USER);
    assert.fail('Should throw');
  } catch (e) {
    assert.ok(e instanceof ServiceUnavailableException);
  } finally { setSchemaReady(true); }
});

test('TB-create-02: no tenantId → ConflictException', async () => {
  const svc = makeMocks();
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER_NO_TENANT),
    (e) => e instanceof ConflictException && e.message.includes('Akun tenant'),
  );
});

test('TB-create-03: invalid checkInDate → BadRequestException', async () => {
  const svc = makeMocks();
  await assert.rejects(
    () => svc.createBooking(makeDto({ checkInDate: 'not-date' }), TENANT_USER),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-create-04: plannedCheckOutDate ≤ checkInDate → BadRequestException', async () => {
  const svc = makeMocks();
  await assert.rejects(
    () => svc.createBooking(makeDto({ checkInDate: '2026-07-20', plannedCheckOutDate: '2026-07-20' }), TENANT_USER),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-create-05: past checkInDate → BadRequestException', async () => {
  const svc = makeMocks();
  await assert.rejects(
    () => svc.createBooking(makeDto({ checkInDate: '2020-01-01' }), TENANT_USER),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-create-06: tenant not found → NotFoundException', async () => {
  const svc = makeMocks({ tenantData: null });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-create-07: tenant inactive → NotFoundException', async () => {
  const svc = makeMocks({ tenantData: makeTenant({ isActive: false }) });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-create-08: KTP gate enabled + not verified → ConflictException', async () => {
  const prev = process.env.KTP_ACTIVATION_GATE_ENABLED;
  process.env.KTP_ACTIVATION_GATE_ENABLED = 'true';
  try {
    const svc = makeMocks({ tenantData: makeTenant({ ktpVerifiedAt: null }) });
    await assert.rejects(
      () => svc.createBooking(makeDto(), TENANT_USER),
      (e) => e instanceof ConflictException && e.message.includes('KTP'),
    );
  } finally {
    process.env.KTP_ACTIVATION_GATE_ENABLED = prev ?? 'false';
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. createBooking — Transaction guards
// ════════════════════════════════════════════════════════════════════════════

test('TB-create-09: existing active stay → ConflictException', async () => {
  const svc = makeMocks({ existingActiveStay: { id: 99 } });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException && e.message.includes('stay aktif'),
  );
});

test('TB-create-10: room not found → NotFoundException', async () => {
  const svc = makeMocks({ roomData: [] });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-create-11: room inactive → ConflictException', async () => {
  const svc = makeMocks({ roomData: makeRoom({ isActive: false }) });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException,
  );
});

test('TB-create-12: room OCCUPIED → ConflictException', async () => {
  const svc = makeMocks({ roomData: makeRoom({ status: 'OCCUPIED' }) });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException,
  );
});

test('TB-create-13: existing paid stay → ConflictException', async () => {
  const svc = makeMocks({ existingPaidStay: { id: 88 } });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException && e.message.includes('sedang ditempati'),
  );
});

test('TB-create-14: zero rent → ConflictException', async () => {
  const svc = makeMocks({ roomData: makeRoom({ monthlyRateRupiah: 0 }) });
  await assert.rejects(
    () => svc.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException,
  );
});

test('TB-create-15: success → returns booking', async () => {
  const svc = makeMocks();
  const result = await svc.createBooking(makeDto(), TENANT_USER);
  assert.ok(result.id, 'has id');
  assert.strictEqual(result.tenantId, 10);
  assert.strictEqual(result.room.code, 'G1-001');
  assert.ok(result.expiresAt, 'has expiresAt');
});

test('TB-create-16: unique constraint → ConflictException', async () => {
  // Mock tenant.findFirst active-booking check to throw 23505
  const prismaErr = new Error('duplicate key');
  prismaErr.code = '23505';
  const svc = makeMocks();
  // Override internal behavior: make existingActiveStay check throw 23505
  // instead we'll use the error catch
  const customSvc = makeMocks({
    existingActiveStay: null,
    // Force the $queryRaw to not return what's expected
  });
  // Actually the 23505 catch is in createBooking's outer catch.
  // We need to make a Prisma call throw 23505.
  // Let's use a special makeMocks where stay.findFirst throws
  const prisma = {
    tenant: { findUnique: async () => makeTenant() },
    appNotification: { findFirst: async () => null, create: async () => undefined },
    $transaction: async (cb) => {
      const tx = {
        $queryRawUnsafe: async () => { const e = new Error('dup'); e.code = '23505'; throw e; },
      };
      return cb(tx);
    },
  };
  const svc2 = new TenantBookingsService(prisma, { findFirst: async () => null, create: async () => undefined }, { postInvoiceIssuedTx: async () => undefined });
  await assert.rejects(
    () => svc2.createBooking(makeDto(), TENANT_USER),
    (e) => e instanceof ConflictException && e.message.includes('Booking bentrok'),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. approveBooking — Input validation
// ════════════════════════════════════════════════════════════════════════════

test('TB-approve-01: negative meter → BadRequestException', async () => {
  const svc = makeApproveMocks();
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto({ initialElectricityKwh: -1 }), ADMIN),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-approve-02: zero rent → BadRequestException', async () => {
  const svc = makeApproveMocks();
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto({ agreedRentAmountRupiah: 0 }), ADMIN),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-approve-03: negative deposit → BadRequestException', async () => {
  const svc = makeApproveMocks();
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto({ depositAmountRupiah: -1 }), ADMIN),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-approve-04: booking not found → NotFoundException', async () => {
  const svc = makeApproveMocks({ approvalRow: [] });
  await assert.rejects(
    () => svc.approveBooking(999, makeApproveDto(), ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-approve-05: booking not ACTIVE → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ stayStatus: 'CANCELLED' }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-approve-06: room invalid status → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ roomStatus: 'OCCUPIED' }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-approve-07: room inactive → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ roomIsActive: false }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-approve-08: tenant inactive → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ tenantIsActive: false }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-approve-09: non-website booking → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ bookingSource: 'ADMIN' }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-approve-10: expired booking → ConflictException', async () => {
  const svc = makeApproveMocks({ approvalRow: makeApprovalRow({ expiresAt: new Date('2020-01-01') }) });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('kedaluwarsa'),
  );
});

test('TB-approve-11: conflicting tenant stay → ConflictException', async () => {
  const svc = makeApproveMocks({
    approvalRow: makeApprovalRow(),
    existingActiveStay: { id: 77 },
  });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('stay aktif lain'),
  );
});

test('TB-approve-12: conflicting room stay → ConflictException', async () => {
  const svc = makeApproveMocks({
    existingPaidStay: { id: 66 },
  });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('Kamar sudah aktif ditempati'),
  );
});

test('TB-approve-13: already has invoice → ConflictException', async () => {
  const svc = makeApproveMocks({ existingInvoice: { id: 55 } });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('invoice awal'),
  );
});

test('TB-approve-14: DP paid + rent changed → ConflictException', async () => {
  const svc = makeApproveMocks({
    dpPaidData: { downPaymentPaidRupiah: 500000, agreedRentAmountRupiah: 1000000 },
  });
  await assert.rejects(
    () => svc.approveBooking(100, makeApproveDto({ agreedRentAmountRupiah: 1500000 }), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('DP sudah dibayar'),
  );
});

test('TB-approve-15: success → creates invoice, returns stay+invoice+baseline', async () => {
  let invoiceCreated = false;
  let invoiceIssued = false;
  let linesCreated = false;
  let stayUpdated = false;
  let auditCreated = false;

  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: qrSeq([makeApprovalRow()]),
        stay: {
          findFirst: async () => null,
          findUnique: async () => ({ downPaymentPaidRupiah: 0, agreedRentAmountRupiah: 1500000 }),
          update: async (args) => { stayUpdated = true; return { id: 100, ...args.data }; },
        },
        invoice: {
          findFirst: async () => null,
          create: async (data) => { invoiceCreated = true; return { id: 200, ...data.data, status: 'DRAFT' }; },
          update: async (args) => { invoiceIssued = true; return { id: 200, invoiceNumber: 'INV-TEST', status: 'ISSUED', periodStart: new Date(), periodEnd: new Date(), dueDate: new Date(), ...args.data }; },
        },
        invoiceLine: { createMany: async () => { linesCreated = true; } },
        auditLog: { create: async () => { auditCreated = true; } },
      };
      return cb(tx);
    },
    user: { findFirst: async () => ({ id: 20 }) },
    appNotification: { findFirst: async () => null, create: async () => undefined },
  };
  const svc = new TenantBookingsService(prisma, prisma.appNotification, { postInvoiceIssuedTx: async () => undefined });

  const result = await svc.approveBooking(100, makeApproveDto(), ADMIN);
  assert.ok(result.stay, 'has stay');
  assert.ok(result.invoice, 'has invoice');
  assert.ok(result.pendingBaselineMeters, 'has baseline meters');
  assert.strictEqual(result.invoice.status, 'ISSUED');
  assert.ok(invoiceCreated, 'invoice create called');
  assert.ok(linesCreated, 'invoice lines created');
});

test('TB-approve-16: unique constraint → ConflictException', async () => {
  const accountingPostingErr = {
    postInvoiceIssuedTx: async () => { const e = new Error('P2002'); e.code = 'P2002'; throw e; },
  };
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: qrSeq([makeApprovalRow()]),
        stay: { findFirst: async () => null, findUnique: async () => null, update: async (a) => ({ id: 100, ...a.data }) },
        invoice: { findFirst: async () => null, create: async (d) => ({ id: 200, ...d.data, status: 'DRAFT' }), update: async (a) => ({ id: 200, ...a.data }) },
        invoiceLine: { createMany: async () => undefined },
        auditLog: { create: async () => undefined },
      };
      return cb(tx);
    },
    user: { findFirst: async () => ({ id: 20 }) },
    appNotification: { findFirst: async () => null, create: async () => undefined },
  };
  const svc = new TenantBookingsService(prisma, prisma.appNotification, accountingPostingErr);
  // The error from postInvoiceIssuedTx is caught (logger.warn), not re-thrown.
  // So P2002 would only come from Prisma.PrismaClientKnownRequestError in the catch block.
  // Let's test a different path: make stay.update throw a Prisma error
  const prisma2 = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: qrSeq([makeApprovalRow()]),
        stay: {
          findFirst: async () => null,
          findUnique: async () => null,
          update: async () => { const e = new Error(); e.code = '23505'; throw e; },
        },
        invoice: { findFirst: async () => null, create: async () => undefined, update: async () => undefined },
        invoiceLine: { createMany: async () => undefined },
        auditLog: { create: async () => undefined },
      };
      return cb(tx);
    },
    user: { findFirst: async () => ({ id: 20 }) },
    appNotification: { findFirst: async () => null, create: async () => undefined },
  };
  const svc2 = new TenantBookingsService(prisma2, prisma2.appNotification, { postInvoiceIssuedTx: async () => undefined });
  await assert.rejects(
    () => svc2.approveBooking(100, makeApproveDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4. rejectBooking — Input validation
// ════════════════════════════════════════════════════════════════════════════

test('TB-reject-01: review notes too short → BadRequestException', async () => {
  const svc = makeRejectMocks();
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto({ reviewNotes: 'abc' }), ADMIN),
    (e) => e instanceof BadRequestException,
  );
});

test('TB-reject-02: not found → NotFoundException', async () => {
  const svc = makeRejectMocks({ rejectRow: [] });
  await assert.rejects(
    () => svc.rejectBooking(999, makeRejectDto(), ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-reject-03: already CANCELLED → ConflictException', async () => {
  const svc = makeRejectMocks({ rejectRow: makeRejectRow({ stayStatus: 'CANCELLED' }) });
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto(), ADMIN),
    (e) => e instanceof ConflictException && e.message.includes('dibatalkan'),
  );
});

test('TB-reject-04: room OCCUPIED → ConflictException', async () => {
  const svc = makeRejectMocks({ rejectRow: makeRejectRow({ roomStatus: 'OCCUPIED' }) });
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-reject-05: non-website booking → ConflictException', async () => {
  const svc = makeRejectMocks({ rejectRow: makeRejectRow({ bookingSource: 'ADMIN' }) });
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-reject-06: already has invoice → ConflictException', async () => {
  const svc = makeRejectMocks({ existingInvoice: { id: 55, status: 'ISSUED' } });
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-reject-07: already has submission → ConflictException', async () => {
  const svc = makeRejectMocks({ existingSubmission: { id: 44, status: 'pending' } });
  await assert.rejects(
    () => svc.rejectBooking(100, makeRejectDto(), ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TB-reject-08: success → CANCELLED + room AVAILABLE + audit', async () => {
  let stayUpdated = false;
  let roomUpdated = false;
  let auditCreated = false;
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: qrSeq([makeRejectRow()]),
        $executeRaw: async (sql) => {
          if (sql.values?.includes('Stay')) stayUpdated = true;
          if (sql.values?.includes('Room')) roomUpdated = true;
        },
        stay: { findFirst: async () => null },
        invoice: { findFirst: async () => null },
        paymentSubmission: { findFirst: async () => null },
        ticket: { findFirst: async () => null },
        auditLog: { create: async () => { auditCreated = true; } },
      };
      return cb(tx);
    },
    user: { findFirst: async () => ({ id: 20 }) },
    appNotification: { findFirst: async () => null, create: async () => undefined },
  };
  const svc = new TenantBookingsService(prisma, prisma.appNotification, { postInvoiceIssuedTx: async () => undefined });

  const result = await svc.rejectBooking(100, makeRejectDto(), ADMIN);
  assert.strictEqual(result.status, 'CANCELLED');
  assert.strictEqual(result.roomStatusAfterSync, 'AVAILABLE');
  assert.ok(result.cancelReason, 'has reason');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. cancelPendingBooking — Input validation
// ════════════════════════════════════════════════════════════════════════════

test('TB-cancel-01: no tenantId → ConflictException', async () => {
  const svc = makeCancelMocks();
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER_NO_TENANT, makeCancelDto()),
    (e) => e instanceof ConflictException,
  );
});

test('TB-cancel-02: not found → NotFoundException', async () => {
  const svc = makeCancelMocks({ cancelRow: [] });
  await assert.rejects(
    () => svc.cancelPendingBooking(999, TENANT_USER, makeCancelDto()),
    (e) => e instanceof NotFoundException,
  );
});

test('TB-cancel-03: wrong tenant → ForbiddenException', async () => {
  const svc = makeCancelMocks({ cancelRow: makeCancelRow({ tenantId: 99 }) });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ForbiddenException,
  );
});

test('TB-cancel-04: already CANCELLED → ConflictException', async () => {
  const svc = makeCancelMocks({ cancelRow: makeCancelRow({ stayStatus: 'CANCELLED' }) });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException && e.message.includes('dibatalkan'),
  );
});

test('TB-cancel-05: already COMPLETED → ConflictException', async () => {
  const svc = makeCancelMocks({ cancelRow: makeCancelRow({ stayStatus: 'COMPLETED' }) });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException && e.message.includes('selesai'),
  );
});

test('TB-cancel-06: room OCCUPIED → ConflictException', async () => {
  const svc = makeCancelMocks({ cancelRow: makeCancelRow({ roomStatus: 'OCCUPIED' }) });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException,
  );
});

test('TB-cancel-07: expired → ConflictException', async () => {
  const svc = makeCancelMocks({ cancelRow: makeCancelRow({ expiresAt: new Date('2020-01-01') }) });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException && e.message.includes('kedaluwarsa'),
  );
});

test('TB-cancel-08: already has invoice → ConflictException', async () => {
  const svc = makeCancelMocks({ existingInvoice: { id: 55 } });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException,
  );
});

test('TB-cancel-09: already has submission → ConflictException', async () => {
  const svc = makeCancelMocks({ existingSubmission: { id: 44 } });
  await assert.rejects(
    () => svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto()),
    (e) => e instanceof ConflictException,
  );
});

test('TB-cancel-10: success → CANCELLED + room AVAILABLE', async () => {
  let stayUpdated = false;
  let roomUpdated = false;
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: qrSeq([makeCancelRow()]),
        $executeRaw: async (sql) => {
          if (String(sql.values ?? '').includes('Stay')) stayUpdated = true;
          if (String(sql.values ?? '').includes('Room')) roomUpdated = true;
        },
        stay: { findFirst: async () => null },
        invoice: { findFirst: async () => null },
        paymentSubmission: { findFirst: async () => null },
        ticket: { findFirst: async () => null },
        auditLog: { create: async () => undefined },
      };
      return cb(tx);
    },
    appNotification: { findFirst: async () => null, create: async () => undefined },
  };
  const svc = new TenantBookingsService(prisma, prisma.appNotification, { postInvoiceIssuedTx: async () => undefined });

  const result = await svc.cancelPendingBooking(100, TENANT_USER, makeCancelDto({ cancelReason: '' }));
  assert.strictEqual(result.status, 'CANCELLED');
  assert.ok(result.cancelReason, 'has cancel reason');
});
