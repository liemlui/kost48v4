'use strict';
/**
 * Unit test: RenewRequestsService — state machine, guard, deadline enforcement
 * Cakupan: createRequest, decideByTenant, confirmDownPayment, approveRequest, rejectRequest.
 * Prasyarat: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { RenewRequestsService } = require('../../dist/modules/renew-requests/renew-requests.service.js');

const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_B = { id: 11, role: 'TENANT', tenantId: 8 };

const NOOP_AUDIT = { log: async () => undefined };
const NOOP_NOTIF = { create: async () => undefined, createOnce: async () => undefined };
const NOOP_LOYALTY = { earnSafe: async () => undefined };

function makeActiveStay(overrides = {}) {
  return {
    id: 10,
    tenantId: 7,
    roomId: 5,
    status: 'ACTIVE',
    agreedRentAmountRupiah: 1400000,
    plannedCheckOutDate: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  };
}

function makeRenewRequest(overrides = {}) {
  return {
    id: 5,
    stayId: 10,
    tenantId: 7,
    status: 'PENDING_DECISION',
    requestedTerm: 'MONTHLY',
    downPaymentAmountRupiah: 420000, // 30% × 1.4jt
    downPaymentDueDate: new Date('2026-07-01T00:00:00Z'),
    downPaymentInvoiceId: null,
    settlementInvoiceId: null,
    settlementDueDate: null,
    requestNotes: null,
    ...overrides,
  };
}

/**
 * Buat RenewRequestsService dengan mock cepat.
 */
function makeService({
  stay = null,
  renewRequest = null,
  pendingCheckout = null,
  openInvoices = [],
  existingActiveRenew = null,
  dpInvoice = null,
  settlementInvoice = null,
  staysRenewalOverride = null,
  prismaOverride = null,
} = {}) {
  const defaultStaysRenewal = {
    issueRenewalDownPaymentInvoiceTx: async (_tx, _stayId, amount) => ({
      id: 20,
      invoiceNumber: 'INV-DP-001',
      totalAmountRupiah: amount,
      status: 'ISSUED',
    }),
    cancelUnpaidRenewalInvoiceInTransaction: async () => undefined,
    prepareRenewalSettlementInTransaction: async () => ({
      invoice: { id: 21, invoiceNumber: 'INV-SET-001', totalAmountRupiah: 980000 },
      plannedStayUpdate: { plannedCheckOutDate: new Date('2026-08-01T00:00:00Z') },
      meterSummary: null,
    }),
    finalizePreparedRenewalInTransaction: async () => ({
      stay: { id: 10, plannedCheckOutDate: new Date('2026-08-01T00:00:00Z') },
      oldStay: stay ?? makeActiveStay(),
      invoice: { id: 21 },
    }),
  };

  const prisma = prismaOverride ?? {
    stay: { findUnique: async () => stay },
    checkoutRequest: { findFirst: async () => pendingCheckout },
    invoice: { findMany: async () => openInvoices },
    renewRequest: {
      findFirst: async () => existingActiveRenew,
      findUnique: async () => renewRequest,
      create: async (args) => ({ id: 5, ...args.data }),
      update: async ({ data }) => ({ ...renewRequest, ...data }),
      findMany: async () => [],
    },
    user: { findMany: async () => [] },
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: renewRequest?.id ?? 5 }],
        renewRequest: {
          findUnique: async () => renewRequest,
          update: async ({ data }) => ({ ...renewRequest, ...data }),
        },
        stay: { findUnique: async () => stay },
        invoice: { findUnique: async () => dpInvoice ?? settlementInvoice },
      };
      return cb(tx);
    },
  };

  return new RenewRequestsService(
    prisma,
    staysRenewalOverride ?? defaultStaysRenewal,
    NOOP_AUDIT,
    NOOP_NOTIF,
    NOOP_LOYALTY,
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. createRequest() — validasi & guard
// ════════════════════════════════════════════════════════════════════════════

test('TC-RN01: Hanya TENANT yang dapat mengajukan perpanjangan — OWNER ditolak', async () => {
  const svc = makeService({ stay: makeActiveStay() });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, OWNER),
    /Hanya tenant yang dapat mengajukan permintaan perpanjangan/,
  );
});

test('TC-RN02: Stay tidak ditemukan → NotFoundException', async () => {
  const svc = makeService({ stay: null });
  await assert.rejects(
    () => svc.createRequest({ stayId: 999, requestedTerm: 'MONTHLY' }, TENANT_A),
    /Stay tidak ditemukan/,
  );
});

test('TC-RN03: Stay tidak ACTIVE → ConflictException', async () => {
  const svc = makeService({ stay: makeActiveStay({ status: 'COMPLETED' }) });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A),
    /Stay tidak aktif/,
  );
});

test('TC-RN04: Tenant bukan pemilik stay → ForbiddenException', async () => {
  const svc = makeService({ stay: makeActiveStay({ tenantId: 8 }) }); // milik TENANT_B
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A),
    /Anda bukan pemilik stay ini/,
  );
});

test('TC-RN05: Ada checkout PENDING → blokir perpanjangan baru', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    pendingCheckout: { id: 3, stayId: 10, status: 'PENDING' },
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A),
    /ada permintaan checkout yang menunggu persetujuan/,
  );
});

test('TC-RN06: Ada tagihan terbuka → blokir perpanjangan', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    openInvoices: [{ id: 1, invoiceNumber: 'INV-2026-001', status: 'ISSUED' }],
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A),
    /Selesaikan tagihan aktif/,
  );
});

test('TC-RN07: Sudah ada perpanjangan aktif → blokir duplikasi', async () => {
  const svc = makeService({
    stay: makeActiveStay(),
    existingActiveRenew: { id: 4, stayId: 10, status: 'AWAITING_DP' },
  });
  await assert.rejects(
    () => svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A),
    /Masih ada permintaan perpanjangan yang sedang berjalan/,
  );
});

test('TC-RN08: createRequest sukses — DP dihitung 30% sewa berjalan', async () => {
  let createdData = null;
  const stay = makeActiveStay({ agreedRentAmountRupiah: 1400000 });
  const prisma = {
    stay: { findUnique: async () => stay },
    checkoutRequest: { findFirst: async () => null },
    invoice: { findMany: async () => [] },
    renewRequest: {
      findFirst: async () => null,
      create: async (args) => { createdData = args.data; return { id: 5, ...args.data }; },
    },
    user: { findMany: async () => [] },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  const result = await svc.createRequest({ stayId: 10, requestedTerm: 'MONTHLY' }, TENANT_A);
  assert.ok(result.id, 'Perpanjangan berhasil dibuat');
  // 30% × 1.400.000 = 420.000 (dibulatkan ke ratusan terdekat)
  assert.strictEqual(createdData?.downPaymentAmountRupiah, 420000);
  assert.strictEqual(result.status, 'PENDING_DECISION');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. decideByTenant() — YA / TIDAK
// ════════════════════════════════════════════════════════════════════════════

test('TC-RN09: Hanya TENANT yang dapat menjawab keputusan perpanjangan — ADMIN ditolak', async () => {
  const svc = makeService({ renewRequest: makeRenewRequest() });
  await assert.rejects(
    () => svc.decideByTenant(5, { decision: 'YA' }, ADMIN),
    /Hanya tenant yang dapat menjawab/,
  );
});

test('TC-RN10: Tenant bukan pemilik request → ForbiddenException', async () => {
  const req = makeRenewRequest({ tenantId: 8 }); // milik TENANT_B
  const svc = makeService({ renewRequest: req });
  await assert.rejects(
    () => svc.decideByTenant(5, { decision: 'YA' }, TENANT_A),
    /Anda bukan pemilik permintaan ini/,
  );
});

test('TC-RN11: decideByTenant() saat status bukan PENDING_DECISION → ConflictException', async () => {
  const req = makeRenewRequest({ status: 'AWAITING_DP' });
  const svc = makeService({ renewRequest: req });
  await assert.rejects(
    () => svc.decideByTenant(5, { decision: 'YA' }, TENANT_A),
    /sudah melewati tahap keputusan/,
  );
});

test('TC-RN12: decideByTenant(TIDAK) → REJECTED_BY_TENANT', async () => {
  const req = makeRenewRequest();
  let updateData = null;
  const prisma = {
    renewRequest: {
      findUnique: async () => req,
      update: async ({ data }) => { updateData = data; return { ...req, ...data }; },
    },
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Budi', user: { id: 10 } },
        room: { code: 'A1', name: null },
      }),
    },
    user: { findMany: async () => [] },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  const result = await svc.decideByTenant(5, { decision: 'TIDAK' }, TENANT_A);
  assert.strictEqual(result.status, 'REJECTED_BY_TENANT');
});

test('TC-RN13: decideByTenant(YA) — menerbitkan invoice DP → AWAITING_DP', async () => {
  const req = makeRenewRequest();
  let issuedInvoice = null;
  const staysRenewal = {
    issueRenewalDownPaymentInvoiceTx: async (_tx, _stayId, amount) => {
      issuedInvoice = { id: 20, invoiceNumber: 'INV-DP-001', totalAmountRupiah: amount };
      return issuedInvoice;
    },
  };
  const prisma = {
    renewRequest: {
      findUnique: async () => req,
      update: async ({ data }) => ({ ...req, ...data }),
    },
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Budi', user: { id: 10 } },
        room: { code: 'A1', name: null },
      }),
    },
    user: { findMany: async () => [] },
    $transaction: async (cb) => {
      const tx = {
        renewRequest: { update: async ({ data }) => ({ ...req, ...data }) },
      };
      return cb(tx);
    },
  };
  const svc = new RenewRequestsService(prisma, staysRenewal, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  const result = await svc.decideByTenant(5, { decision: 'YA' }, TENANT_A);
  assert.strictEqual(result.status, 'AWAITING_DP');
  assert.ok(issuedInvoice, 'Invoice DP harus diterbitkan');
  assert.strictEqual(issuedInvoice.totalAmountRupiah, 420000);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. confirmDownPayment() — gate deadline & cek invoice DP
// ════════════════════════════════════════════════════════════════════════════

test('TC-RN14: confirmDownPayment() saat status bukan AWAITING_DP → ConflictException', async () => {
  const req = makeRenewRequest({ status: 'PENDING_DECISION', downPaymentInvoiceId: 20 });
  const prisma = { renewRequest: { findUnique: async () => req } };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.confirmDownPayment(5, {}, OWNER),
    /DP hanya dapat dikonfirmasi saat status menunggu DP/,
  );
});

test('TC-RN15: confirmDownPayment() tanpa invoice DP → ConflictException', async () => {
  const req = makeRenewRequest({ status: 'AWAITING_DP', downPaymentInvoiceId: null });
  const prisma = { renewRequest: { findUnique: async () => req } };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.confirmDownPayment(5, {}, OWNER),
    /Invoice DP belum diterbitkan/,
  );
});

test('TC-RN16: confirmDownPayment() — invoice DP belum PAID → ConflictException', async () => {
  const req = makeRenewRequest({ status: 'AWAITING_DP', downPaymentInvoiceId: 20 });
  const prisma = {
    renewRequest: { findUnique: async () => req },
    invoice: { findUnique: async () => ({ id: 20, status: 'ISSUED', paidAt: null }) },
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Budi', user: { id: 10 } },
        room: { code: 'A1', name: null },
      }),
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.confirmDownPayment(5, {}, OWNER),
    /DP belum lunas/,
  );
});

test('TC-RN17: confirmDownPayment() — DP dibayar setelah hari-H → ConflictException', async () => {
  // hari-H = 1 Juli, DP paid = 2 Juli (telat)
  const req = makeRenewRequest({
    status: 'AWAITING_DP',
    downPaymentInvoiceId: 20,
    downPaymentDueDate: new Date('2026-07-01T00:00:00Z'),
  });
  const prisma = {
    renewRequest: { findUnique: async () => req },
    invoice: {
      findUnique: async () => ({
        id: 20,
        status: 'PAID',
        paidAt: new Date('2026-07-02T12:00:00Z'), // setelah hari-H
      }),
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.confirmDownPayment(5, {}, OWNER),
    /Hari-H.*sudah lewat/,
  );
});

test('TC-RN18: confirmDownPayment() sukses — settlementDueDate = paidAt + 7 hari', async () => {
  const dpPaidAt = new Date('2026-06-25T00:00:00Z');
  const req = makeRenewRequest({
    status: 'AWAITING_DP',
    downPaymentInvoiceId: 20,
    downPaymentDueDate: new Date('2026-07-01T00:00:00Z'),
  });
  let updatedData = null;
  const prisma = {
    renewRequest: {
      findUnique: async () => req,
      update: async ({ data }) => { updatedData = data; return { ...req, ...data }; },
    },
    invoice: {
      findUnique: async () => ({ id: 20, status: 'PAID', paidAt: dpPaidAt }),
    },
    user: { findMany: async () => [] },
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Budi', user: { id: 10 } },
        room: { code: 'A1', name: null },
      }),
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await svc.confirmDownPayment(5, {}, OWNER);
  assert.strictEqual(updatedData?.status, 'DP_SECURED');
  // settlementDueDate = 2026-06-25 + 7 hari = 2026-07-02
  const expectedSettlementDate = new Date('2026-07-02T00:00:00Z');
  assert.strictEqual(
    updatedData?.settlementDueDate?.toISOString().slice(0, 10),
    expectedSettlementDate.toISOString().slice(0, 10),
    'settlementDueDate harus tepat H+7 dari paidAt',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4. approveRequest() — deadline & invoice settlement
// ════════════════════════════════════════════════════════════════════════════

test('TC-RN19: approveRequest() — batas H+7 terlewat → ConflictException', async () => {
  // settlementDueDate = 2026-07-02, dipanggil setelah itu
  const req = makeRenewRequest({
    status: 'DP_SECURED',
    settlementInvoiceId: null,
    settlementDueDate: new Date('2026-06-10T00:00:00Z'), // sudah lewat
    requestedTerm: 'MONTHLY',
    downPaymentAmountRupiah: 420000,
  });
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 5 }],
        renewRequest: { findUnique: async () => req },
        stay: { findUnique: async () => makeActiveStay() },
        invoice: { findUnique: async () => null },
      };
      return cb(tx);
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.approveRequest(5, {}, OWNER),
    /Batas pelunasan.*sudah lewat/,
  );
});

test('TC-RN20: approveRequest() — invoice pelunasan belum PAID → ConflictException (sudah ada di renewal-safety tapi diperkuat)', async () => {
  const req = makeRenewRequest({
    status: 'DP_SECURED',
    settlementInvoiceId: 44,
    settlementDueDate: new Date('2099-12-31T00:00:00Z'), // jauh di masa depan
  });
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 5 }],
        renewRequest: { findUnique: async () => req },
        stay: { findUnique: async () => makeActiveStay() },
        invoice: { findUnique: async () => ({ id: 44, status: 'ISSUED', paidAt: null }) },
      };
      return cb(tx);
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.approveRequest(5, {}, OWNER),
    /Invoice pelunasan belum PAID/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. rejectRequest() — guard status
// ════════════════════════════════════════════════════════════════════════════

test('TC-RN21: rejectRequest() pada status DP_SECURED → ConflictException (DP sudah dijamin)', async () => {
  const req = makeRenewRequest({ status: 'DP_SECURED', downPaymentInvoiceId: 20 });
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 5 }],
        renewRequest: { findUnique: async () => req },
      };
      return cb(tx);
    },
  };
  const svc = new RenewRequestsService(prisma, {}, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  await assert.rejects(
    () => svc.rejectRequest(5, { reviewNotes: 'Tidak bisa lanjut.' }, OWNER),
    /DP-nya sudah diamankan tidak dapat ditolak/,
  );
});

test('TC-RN22: rejectRequest() AWAITING_DP — invoice DP yang belum lunas dibatalkan', async () => {
  const req = makeRenewRequest({ status: 'AWAITING_DP', downPaymentInvoiceId: 55 });
  let cancelledInvoiceId = null;
  const staysRenewal = {
    cancelUnpaidRenewalInvoiceInTransaction: async (_tx, invoiceId) => { cancelledInvoiceId = invoiceId; },
  };
  const prisma = {
    $transaction: async (cb) => {
      const tx = {
        $queryRaw: async () => [{ id: 5 }],
        renewRequest: {
          findUnique: async () => req,
          update: async ({ data }) => ({ ...req, ...data }),
        },
      };
      return cb(tx);
    },
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Budi', user: { id: 10 } },
        room: { code: 'A1', name: null },
      }),
    },
    user: { findMany: async () => [] },
  };
  const svc = new RenewRequestsService(prisma, staysRenewal, NOOP_AUDIT, NOOP_NOTIF, NOOP_LOYALTY);
  const result = await svc.rejectRequest(5, { reviewNotes: 'Kamar dipakai keperluan operasional.' }, OWNER);
  assert.strictEqual(cancelledInvoiceId, 55, 'Invoice DP harus dibatalkan');
  assert.strictEqual(result.status, 'REJECTED');
});
