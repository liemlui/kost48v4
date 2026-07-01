'use strict';
/**
 * Unit test: CheckoutRequestsService — validasi & guard
 * Cakupan: createRequest, approveRequest, rejectRequest, findMine.
 */
const test = require('node:test');
const assert = require('node:assert');
const { CheckoutRequestsService } = require('../../dist/modules/checkout-requests/checkout-requests.service.js');

const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_B = { id: 11, role: 'TENANT', tenantId: 8 };

const NOOP_NOTIF = { create: async () => undefined, createOnce: async () => undefined };

// Besok (H+1): selalu valid
function tomorrow() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
// Hari ini: tidak valid (harus ≥ H+1)
function today() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
// Masa lalu: tidak valid
function yesterday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}

function makeActiveStay(overrides = {}) {
  return {
    id: 10,
    tenantId: 7,
    roomId: 5,
    status: 'ACTIVE',
    plannedCheckOutDate: new Date('2026-07-01T00:00:00Z'),
    agreedRentAmountRupiah: 1400000,
    ...overrides,
  };
}

/**
 * Buat service dengan mock prisma yang dapat dikonfigurasi.
 */
function makeService({
  stay = null,
  pendingRenew = null,
  openInvoices = [],
  existingPending = null,
  checkoutRequest = null,
  ownerAdminUsers = [],
  tenantUser = null,
} = {}) {
  const prisma = {
    stay: {
      findUnique: async () => stay,
    },
    renewRequest: {
      findFirst: async () => pendingRenew,
    },
    invoice: {
      findMany: async () => openInvoices,
    },
    checkoutRequest: {
      findFirst: async () => existingPending,
      findUnique: async () => checkoutRequest,
      create: async (args) => ({ id: 1, ...args.data }),
      updateMany: async ({ data }) => ({ count: 1 }),
      findUniqueOrThrow: async () => ({ ...checkoutRequest, ...{ status: 'APPROVED' } }),
    },
    user: {
      findMany: async () => ownerAdminUsers,
      findUnique: async () => tenantUser,
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => openInvoices },
        checkoutRequest: {
          findFirst: async () => existingPending,
          create: async (args) => ({ id: 1, ...args.data }),
          updateMany: async ({ data }) => ({ count: 1 }),
          findUniqueOrThrow: async () => ({
            id: 1,
            stayId: stay?.id ?? 10,
            status: 'APPROVED',
            requestedCheckOutDate: new Date(tomorrow()),
          }),
        },
        stay: {
          findUnique: async () => stay,
          updateMany: async () => ({ count: 1 }),
        },
      };
      return cb(tx);
    },
  };
  return new CheckoutRequestsService(prisma, NOOP_NOTIF);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. createRequest() — validasi role & data
// ════════════════════════════════════════════════════════════════════════════

test('TC-CO01: Hanya TENANT yang dapat mengajukan checkout — OWNER ditolak', async () => {
  const svc = makeService({ stay: makeActiveStay() });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah kota' }, OWNER),
    /Hanya tenant yang dapat mengajukan permintaan checkout/,
  );
});

test('TC-CO02: Stay tidak ditemukan → NotFoundException', async () => {
  const svc = makeService({ stay: null });
  await assert.rejects(
    () => svc.createRequest({ stayId: 999, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /Stay tidak ditemukan/,
  );
});

test('TC-CO03: Stay tidak ACTIVE → ConflictException', async () => {
  const svc = makeService({ stay: makeActiveStay({ status: 'COMPLETED' }) });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /Stay tidak aktif/,
  );
});

test('TC-CO04: Tenant bukan pemilik stay → ForbiddenException', async () => {
  const svc = makeService({ stay: makeActiveStay({ tenantId: 8 }) }); // milik TENANT_B
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /Anda bukan pemilik stay ini/,
  );
});

test('TC-CO05: Ada permintaan perpanjangan PENDING → blokir checkout', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    pendingRenew: { id: 5, stayId: 10, status: 'PENDING' },
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /ada permintaan perpanjangan yang sedang aktif/,
  );
});

test('TC-CO06: Masih ada tagihan terbuka (bukan PAID/CANCELLED) → ConflictException', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    pendingRenew: null,
    openInvoices: [{ id: 3, invoiceNumber: 'INV-2026-001', status: 'ISSUED' }],
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /Selesaikan tagihan aktif/,
  );
});

test('TC-CO07: Sudah ada pengajuan checkout PENDING → ConflictException', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    pendingRenew: null,
    openInvoices: [],
    existingPending: { id: 7, stayId: 10, status: 'PENDING' },
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah' }, TENANT_A),
    /Masih ada permintaan checkout yang menunggu/,
  );
});

test('TC-CO08: Tanggal checkout = hari ini (bukan H+1) → BadRequestException', async () => {
  const svc = makeService({ stay: makeActiveStay(), pendingRenew: null, openInvoices: [] });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: today(), checkoutReason: 'Pindah' }, TENANT_A),
    /minimal H\+1/,
  );
});

test('TC-CO09: Tanggal checkout masa lalu → BadRequestException', async () => {
  const svc = makeService({ stay: makeActiveStay(), pendingRenew: null, openInvoices: [] });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedCheckOutDate: yesterday(), checkoutReason: 'Pindah' }, TENANT_A),
    /minimal H\+1/,
  );
});

test('TC-CO10: TENANT dengan stay valid dan tanggal H+1 berhasil buat checkout request', async () => {
  const svc = makeService({ stay: makeActiveStay(), pendingRenew: null, openInvoices: [] });
  const result = await svc.createRequest(
    { stayId: 10, requestedCheckOutDate: tomorrow(), checkoutReason: 'Pindah kota lain' },
    TENANT_A,
  );
  assert.ok(result.id, 'Checkout request berhasil dibuat');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. approveRequest() — validasi role & status
// ════════════════════════════════════════════════════════════════════════════

test('TC-CO11: STAFF tidak dapat menyetujui checkout request', async () => {
  const svc = makeService({
    checkoutRequest: { id: 1, stayId: 10, status: 'PENDING', requestedCheckOutDate: new Date(tomorrow()) },
  });
  await assert.rejects(
    () => svc.approveRequest(1, { reviewNotes: 'OK' }, STAFF),
    /Hanya OWNER\/ADMIN yang dapat menyetujui/,
  );
});

test('TC-CO12: approveRequest() pada request yang bukan PENDING → ConflictException', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    openInvoices: [],
    checkoutRequest: { id: 1, stayId: 10, status: 'APPROVED', requestedCheckOutDate: new Date(tomorrow()) },
  });
  // Patch findUnique untuk approveRequest
  const prisma = {
    checkoutRequest: { findUnique: async () => ({ id: 1, stayId: 10, status: 'APPROVED', requestedCheckOutDate: new Date(tomorrow()) }) },
  };
  const svc2 = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc2.approveRequest(1, {}, OWNER),
    /sudah diproses sebelumnya/,
  );
});

test('TC-CO13: approveRequest() gagal jika masih ada tagihan terbuka', async () => {
  // Tx mock mengembalikan open invoices
  const prisma = {
    checkoutRequest: {
      findUnique: async () => ({ id: 1, stayId: 10, status: 'PENDING', requestedCheckOutDate: new Date(tomorrow()) }),
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => [{ id: 4, invoiceNumber: 'INV-2026-002', status: 'ISSUED' }] },
        checkoutRequest: { updateMany: async () => ({ count: 1 }), findUniqueOrThrow: async () => ({}) },
        stay: { findUnique: async () => makeActiveStay(), updateMany: async () => ({ count: 1 }) },
      };
      return cb(tx);
    },
  };
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc.approveRequest(1, {}, OWNER),
    /masih ada tagihan aktif/,
  );
});

test('TC-CO14: approveRequest() — tanggal checkout > plannedCheckOut → ConflictException', async () => {
  // requestedCheckOutDate setelah plannedCheckOutDate (harusnya pakai renewal)
  const plannedOut = new Date('2026-07-01T00:00:00Z');
  const afterPlanned = '2026-08-01T00:00:00Z';
  const prisma = {
    checkoutRequest: {
      findUnique: async () => ({ id: 1, stayId: 10, status: 'PENDING', requestedCheckOutDate: new Date(afterPlanned) }),
    },
    $transaction: async (cb) => {
      const tx = {
        invoice: { findMany: async () => [] },
        checkoutRequest: { updateMany: async () => ({ count: 1 }), findUniqueOrThrow: async () => ({}) },
        stay: {
          findUnique: async () => ({ ...makeActiveStay(), plannedCheckOutDate: plannedOut }),
          updateMany: async () => ({ count: 1 }),
        },
      };
      return cb(tx);
    },
  };
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc.approveRequest(1, {}, OWNER),
    /Tanggal checkout tidak boleh melebihi tanggal kontrak/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. rejectRequest() — validasi role & status
// ════════════════════════════════════════════════════════════════════════════

test('TC-CO15: STAFF tidak dapat menolak checkout request', async () => {
  const prisma = {
    checkoutRequest: { findUnique: async () => ({ id: 1, stayId: 10, status: 'PENDING' }) },
  };
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc.rejectRequest(1, { reviewNotes: 'Ditolak admin.' }, STAFF),
    /Hanya OWNER\/ADMIN yang dapat menolak/,
  );
});

test('TC-CO16: rejectRequest() pada request yang bukan PENDING → ConflictException', async () => {
  const prisma = {
    checkoutRequest: { findUnique: async () => ({ id: 1, stayId: 10, status: 'REJECTED' }) },
  };
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc.rejectRequest(1, { reviewNotes: 'Ditolak.' }, OWNER),
    /sudah diproses sebelumnya/,
  );
});

test('TC-CO17: rejectRequest() sukses oleh OWNER', async () => {
  const req = { id: 1, stayId: 10, status: 'PENDING', requestedCheckOutDate: new Date(tomorrow()) };
  const prisma = {
    checkoutRequest: {
      findUnique: async () => req,
      $transaction: async (cb) => cb({ checkoutRequest: { updateMany: async () => ({ count: 1 }), findUniqueOrThrow: async () => ({ ...req, status: 'REJECTED' }) } }),
    },
    stay: {
      findUnique: async () => ({
        tenant: { user: { id: 10, fullName: 'Budi' } },
      }),
    },
    $transaction: async (cb) => {
      const tx = {
        checkoutRequest: {
          updateMany: async () => ({ count: 1 }),
          findUniqueOrThrow: async () => ({ ...req, status: 'REJECTED' }),
        },
      };
      return cb(tx);
    },
  };
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  const result = await svc.rejectRequest(1, { reviewNotes: 'Ditolak karena sewa belum lunas.' }, OWNER);
  assert.strictEqual(result.status, 'REJECTED');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. findMine() — hanya untuk TENANT
// ════════════════════════════════════════════════════════════════════════════

test('TC-CO18: findMine() tanpa tenantId → ForbiddenException', async () => {
  const prisma = {};
  const svc = new CheckoutRequestsService(prisma, NOOP_NOTIF);
  await assert.rejects(
    () => svc.findMine({ id: 1, role: 'OWNER', tenantId: null }),
    /Hanya tenant yang dapat melihat permintaan/,
  );
});
