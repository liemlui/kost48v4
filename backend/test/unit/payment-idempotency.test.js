// S7 — idempotensi pengajuan pembayaran TANPA kolom/tabel baru.
//
// Kunci idempoten = kombinasi kolom yang sudah ada: `stayId` + `invoiceId` + `amountRupiah` +
// `paidAt`, dibatasi jendela waktu. Berkas ini membuktikan:
//  1. Pengajuan identik yang masih menunggu review / sudah disetujui DITOLAK sebelum INSERT,
//     jadi pengajuan ganda dengan kunci yang sama tetap menghasilkan satu baris.
//  2. Penolakan memakai pesan berbeda untuk pending vs approved (keduanya milik pemanggil).
//  3. Stay yang bukan milik akun tidak bisa dibayar walau kueri kelayakan "salah" mengembalikan
//     baris (pertahanan lapis kedua gerbang kepemilikan).
//
// Catatan isolasi: validasi kebijakan nominal (`validateBookingPaymentSubmission`) diganti
// no-op di sini karena sudah diuji terpisah di `payment-policy.test.js`; yang diuji berkas ini
// hanya gerbang idempotensi + kepemilikan.
const assert = require('node:assert/strict');
const test = require('node:test');
const { ConflictException, NotFoundException } = require('@nestjs/common');

const { PaymentSubmissionsService } = require('../../dist/modules/payment-submissions/payment-submissions.service.js');
const { PAYMENT_IDEMPOTENCY_WINDOW_MS } = require('../../dist/modules/payment-submissions/payment-submissions.utils.js');

function tenantUser(tenantId = 55) {
  return { id: 11, email: 'tamu@example.test', fullName: 'Tamu Uji', role: 'TENANT', tenantId, isActive: true };
}

function dto(overrides = {}) {
  return {
    stayId: 4321,
    invoiceId: 900,
    amountRupiah: 450000,
    paidAt: '2026-10-01',
    // CASH dipakai supaya jalur bukti-bayar (yang menuntut fileKey untuk TRANSFER) tidak
    // ikut diuji di sini — berkas ini fokus pada gerbang idempotensi + kepemilikan.
    paymentMethod: 'CASH',
    ...overrides,
  };
}

function eligibility(overrides = {}) {
  return {
    stayId: 4321,
    invoiceId: 900,
    tenantId: 55,
    roomId: 1,
    roomCode: 'F1',
    roomName: 'Kamar F1',
    roomStatus: 'AVAILABLE',
    stayStatus: 'ACTIVE',
    stayExpiresAt: null,
    stayPromotedAt: null,
    invoiceNumber: 'INV-4321-A',
    invoiceStatus: 'ISSUED',
    invoiceTotalAmountRupiah: 1950000,
    invoicePaidAmountRupiah: 0,
    ...overrides,
  };
}

/**
 * Prisma tiruan. `duplicateSubmission` = baris yang dianggap sudah ada untuk kunci idempoten.
 */
function makeHarness(options = {}) {
  const state = { createCalls: [], duplicateWhere: null, existingPendingWhere: null };

  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 1,
    paymentSubmission: {
      findFirst: async (args) => {
        const status = args?.where?.status;
        if (status && typeof status === 'object' && Array.isArray(status.in)) {
          state.duplicateWhere = args.where;
          return options.duplicateSubmission ?? null;
        }
        state.existingPendingWhere = args.where;
        return null;
      },
      create: async (args) => {
        state.createCalls.push(args);
        return { id: 11 };
      },
    },
    auditLog: { create: async () => ({}) },
  };

  const prisma = {
    tenant: {
      findUnique: async () => options.myTenant ?? { phone: '+6281234567890', email: 'tamu@example.test' },
      findMany: async () => (options.claimableTenantIds ?? []).map((id) => ({ id })),
    },
    $queryRaw: async () => [],
    $transaction: async (fn) => fn(tx),
  };

  return { prisma, state };
}

function makeService(prisma, eligibilityRow = eligibility()) {
  const service = new PaymentSubmissionsService(prisma, {}, {}, {}, {});
  service.findEligibleSubmissionTarget = async () => eligibilityRow;
  service.validateBookingPaymentSubmission = () => ({ isDownPaymentAmount: true, isSettlementAmount: false, settlementAmount: 0 });
  service.validateInvoicePaymentSubmission = () => {};
  service.assertRenewalPaymentWithinDeadline = async () => {};
  service.findSubmissionByIdTx = async () => ({ id: 11, amountRupiah: 450000 });
  service.notifyOwnerAdminPaymentSubmitted = async () => {};
  return service;
}

test('S7-IDEM-1 — pengajuan identik yang masih PENDING_REVIEW ditolak sebelum INSERT', async () => {
  const { prisma, state } = makeHarness({ duplicateSubmission: { id: 7, status: 'PENDING_REVIEW' } });
  const service = makeService(prisma);

  await assert.rejects(
    () => service.createSubmission(tenantUser(), dto()),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /menunggu review/);
      return true;
    },
  );

  assert.equal(state.createCalls.length, 0, 'tidak boleh ada INSERT saat duplikat terdeteksi');
});

test('S7-IDEM-2 — pengajuan identik yang sudah APPROVED ditolak (pesan berbeda, bukan jalan buntu)', async () => {
  const { prisma, state } = makeHarness({ duplicateSubmission: { id: 7, status: 'APPROVED' } });
  const service = makeService(prisma);

  await assert.rejects(
    () => service.createSubmission(tenantUser(), dto()),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /sudah disetujui/);
      assert.match(error.message, /riwayat pembayaran/);
      return true;
    },
  );
  assert.equal(state.createCalls.length, 0);
});

test('S7-IDEM-3 — kunci idempoten memakai kolom yang sudah ada + jendela waktu, tanpa kolom baru', async () => {
  const { prisma, state } = makeHarness();
  const service = makeService(prisma);

  await service.createSubmission(tenantUser(), dto());

  const where = state.duplicateWhere;
  assert.ok(where, 'kueri duplikat wajib dijalankan');
  assert.equal(where.stayId, 4321);
  assert.equal(where.invoiceId, 900);
  assert.equal(where.amountRupiah, 450000);
  assert.ok(where.paidAt instanceof Date, 'paidAt ikut jadi bagian kunci');
  assert.deepEqual(where.status.in, ['PENDING_REVIEW', 'APPROVED'], 'REJECTED tidak ikut dikunci (boleh ajukan ulang)');

  const windowStart = where.createdAt.gte;
  assert.ok(windowStart instanceof Date);
  const windowMs = Date.now() - windowStart.getTime();
  assert.ok(
    Math.abs(windowMs - PAYMENT_IDEMPOTENCY_WINDOW_MS) < 60_000,
    'jendela idempotensi harus mengikuti konstanta 24 jam',
  );

  assert.equal(state.createCalls.length, 1, 'tanpa duplikat, pengajuan tetap dibuat satu kali');
  assert.equal(state.createCalls[0].data.amountRupiah, 450000, 'nominal tidak diubah oleh S7');
});

test('S7-IDEM-4 — stay bukan milik akun: ditolak sebelum INSERT (pertahanan lapis kedua)', async () => {
  const { prisma, state } = makeHarness({ claimableTenantIds: [] });
  const service = makeService(prisma);
  service.findEligibleSubmissionTarget = async () => eligibility({ tenantId: 99 });

  await assert.rejects(
    () => service.createSubmission(tenantUser(55), dto()),
    (error) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
  assert.equal(state.createCalls.length, 0, 'stay tenant lain tidak boleh bisa dibayar');
});

test('S7-IDEM-5 — stay milik akun: pembayaran jalan (tidak ada regresi jalur DP)', async () => {
  const { prisma, state } = makeHarness();
  const service = makeService(prisma);
  service.findEligibleSubmissionTarget = async () => eligibility();

  const result = await service.createSubmission(tenantUser(55), dto());

  assert.equal(result.id, 11);
  assert.equal(state.createCalls.length, 1);
  assert.equal(state.createCalls[0].data.tenantId, 55, 'submission menempel ke tenant pemilik stay');
});
