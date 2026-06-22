'use strict';
/**
 * Unit test: TicketsService — state machine & role guards
 * Cakupan: start, markDone, close (CLOSE+CANCEL), assign, markVendor, tip flow.
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { TicketsService } = require('../../dist/modules/tickets/tickets.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_B = { id: 11, role: 'TENANT', tenantId: 8 };

// ─── Tiket dasar ──────────────────────────────────────────────────────────
function mkTicket(overrides = {}) {
  return {
    id: 1,
    ticketNumber: 'TIC-2026-0001',
    title: 'Keran bocor',
    description: 'Keran di kamar mandi bocor',
    status: 'OPEN',
    category: 'MAINTENANCE',
    tenantId: 7,
    roomId: 5,
    stayId: 10,
    assignedToId: null,
    assignedAt: null,
    dueAt: null,
    handledByVendor: false,
    vendorNote: null,
    resolutionNote: null,
    linkedRoomItemId: null,
    linkedInventoryItemId: null,
    staffFieldReports: [],
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-06-01T08:00:00Z'),
    ...overrides,
  };
}

// ─── Mock dependency dasar ────────────────────────────────────────────────
const AUDIT = { log: async () => undefined };
const NOTIF = { create: async () => undefined, createOnce: async () => undefined };
const LOYALTY = {};

/**
 * Buat TicketsService dengan Prisma mock menggunakan queue findUnique.
 * `findUniqueResults` = array nilai yang dikembalikan tiap panggilan berurutan.
 * Panggilan lewat dari panjang array mengembalikan nilai terakhir.
 */
function makeService({
  findUniqueResults = [],
  findFirstResult = null,
  findFirstRoutineResult = null,
  updateResult = null,
  txCallback = null,
  assigneeResult = null,
  perfEventFirst = null,
  staffFieldReports = [],
  auditOverride = null,
  notifOverride = null,
} = {}) {
  let fuIdx = 0;
  const prisma = {
    ticket: {
      findUnique: async () => {
        const r = findUniqueResults[fuIdx] ?? findUniqueResults[findUniqueResults.length - 1] ?? null;
        fuIdx++;
        return r;
      },
      findFirst: async () => findFirstResult,
      update: async ({ data }) => ({ ...findUniqueResults[0], ...data }),
    },
    staffRoutineCompletion: {
      findFirst: async () => findFirstRoutineResult,
    },
    user: {
      findUnique: async () => assigneeResult,
      findMany: async () => [],
    },
    staffPerformanceEvent: {
      findFirst: async () => perfEventFirst,
      create: async (args) => ({ id: 99, ...args.data }),
    },
    auditLog: {
      findFirst: async () => null,
    },
    $transaction: txCallback ?? (async (cb) => {
      const tx = {
        ticket: {
          update: async ({ data }) => ({ ...findUniqueResults[0], ...data, staffFieldReports: [] }),
        },
        staffFieldReport: { updateMany: async () => ({ count: 0 }) },
        stay: { count: async () => 0 },
        room: {
          update: async () => ({}),
          updateMany: async () => ({ count: 0 }),
        },
        roomItem: {
          findUnique: async () => ({ note: '' }),
          update: async () => ({}),
        },
        inventoryItem: {
          findUnique: async () => ({ notes: '' }),
          update: async () => ({}),
        },
      };
      return cb(tx);
    }),
  };
  return new TicketsService(prisma, auditOverride ?? AUDIT, notifOverride ?? NOTIF, LOYALTY);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. start() — OPEN → IN_PROGRESS
// ════════════════════════════════════════════════════════════════════════════

test('TC-T01: OWNER dapat memulai tiket OPEN → IN_PROGRESS', async () => {
  const ticket = mkTicket({ status: 'OPEN' });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.start(1, OWNER);
  assert.strictEqual(result.status, 'IN_PROGRESS');
});

test('TC-T02: start() gagal saat tiket bukan OPEN', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(() => svc.start(1, OWNER), /Transisi status tidak valid/);
});

test('TC-T03: STAFF dengan tiket aktif lain tidak dapat mulai tiket baru', async () => {
  const ticket = mkTicket({ status: 'OPEN', assignedToId: 3 });
  const svc = makeService({
    findUniqueResults: [ticket, null],
    findFirstResult: mkTicket({ id: 99, status: 'IN_PROGRESS', assignedToId: 3 }),
    findFirstRoutineResult: null,
  });
  await assert.rejects(() => svc.start(1, STAFF), /Selesaikan pekerjaan aktif dulu/);
});

test('TC-T04: STAFF dengan rutinitas aktif tidak dapat mulai tiket', async () => {
  const ticket = mkTicket({ status: 'OPEN', assignedToId: 3 });
  const svc = makeService({
    findUniqueResults: [ticket, null],
    findFirstResult: null,
    findFirstRoutineResult: { id: 50, status: 'IN_PROGRESS', template: { title: 'Bersih kamar mandi' } },
  });
  await assert.rejects(() => svc.start(1, STAFF), /Selesaikan pekerjaan aktif dulu/);
});

test('TC-T05: STAFF yang bukan assignee tidak dapat mulai tiket milik staf lain', async () => {
  const ticket = mkTicket({ status: 'OPEN', assignedToId: 99 }); // staff lain
  const svc = makeService({ findUniqueResults: [ticket, null] });
  await assert.rejects(() => svc.start(1, STAFF), /Tiket ini bukan tugas akun ini/);
});

test('TC-T06: SLA (assignedAt + dueAt) disetel saat start() pertama kali', async () => {
  const ticket = mkTicket({ status: 'OPEN', assignedToId: null, assignedAt: null });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.start(1, OWNER);
  assert.ok(result.assignedAt, 'assignedAt harus terisi');
  assert.ok(result.dueAt, 'dueAt harus terisi');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. markDone() — IN_PROGRESS → DONE
// ════════════════════════════════════════════════════════════════════════════

test('TC-T07: OWNER dapat menandai tiket selesai dari IN_PROGRESS', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', assignedToId: 3 });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.markDone(1, { resolutionNote: 'Keran diperbaiki' }, OWNER);
  assert.strictEqual(result.status, 'DONE');
});

test('TC-T08: markDone() gagal saat status bukan IN_PROGRESS (tiket non-vendor)', async () => {
  const ticket = mkTicket({ status: 'OPEN' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(() => svc.markDone(1, {}, OWNER), /Transisi status tidak valid/);
});

test('TC-T09: STAFF yang bukan assignee tidak dapat menandai selesai', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', assignedToId: 99 });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(() => svc.markDone(1, {}, STAFF), /Tiket ini bukan tugas akun ini/);
});

test('TC-T10: Tiket vendor dapat ditandai selesai dari OPEN (lewati IN_PROGRESS)', async () => {
  const ticket = mkTicket({ status: 'OPEN', handledByVendor: true, assignedToId: null });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.markDone(1, { resolutionNote: 'Vendor cuci AC selesai' }, ADMIN);
  assert.strictEqual(result.status, 'DONE');
});

test('TC-T11: Tiket vendor gagal markDone dari status invalid (CLOSED)', async () => {
  const ticket = mkTicket({ status: 'CLOSED', handledByVendor: true });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(() => svc.markDone(1, {}, ADMIN), /Transisi status tidak valid/);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. close() — CLOSE action (DONE → CLOSED)
// ════════════════════════════════════════════════════════════════════════════

test('TC-T12: OWNER dapat menutup tiket DONE dengan catatan final ≥ 8 karakter', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.close(1, { action: 'CLOSE', finalAdminNote: 'Keran sudah diperbaiki oleh staf.' }, OWNER);
  assert.strictEqual(result.status, 'CLOSED');
});

test('TC-T13: close(CLOSE) gagal tanpa catatan final yang cukup (< 8 karakter)', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE', finalAdminNote: 'Ok' }, OWNER),
    /Catatan final admin wajib diisi minimal 8 karakter/,
  );
});

test('TC-T14: close(CLOSE) gagal catatan final kosong/undefined', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE' }, OWNER),
    /Catatan final admin wajib diisi minimal 8 karakter/,
  );
});

test('TC-T15: close(CLOSE) gagal jika tiket belum DONE', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE', finalAdminNote: 'Tiket selesai diverifikasi' }, OWNER),
    /Transisi status tidak valid/,
  );
});

test('TC-T16: STAFF hanya dapat menutup tiket CHECKOUT_INSPECTION — lainnya ditolak', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'MAINTENANCE' }); // bukan CHECKOUT_INSPECTION
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE', finalAdminNote: 'Inspeksi selesai valid' }, STAFF),
    /Staf hanya dapat menutup tiket inspeksi checkout/,
  );
});

test('TC-T17: STAFF dapat menutup tiket CHECKOUT_INSPECTION', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'CHECKOUT_INSPECTION', roomId: 5 });
  // Buat tx mock yang menangani count + updateMany untuk CHECKOUT_INSPECTION
  let roomMarked = false;
  const txCallback = async (cb) => {
    const tx = {
      ticket: { update: async ({ data }) => ({ ...ticket, ...data, staffFieldReports: [] }) },
      staffFieldReport: { updateMany: async () => ({ count: 0 }) },
      stay: { count: async () => 0 }, // tidak ada stay aktif
      room: {
        update: async () => ({}),
        updateMany: async ({ data }) => {
          if (data.status === 'AVAILABLE') roomMarked = true;
          return { count: 1 };
        },
      },
    };
    return cb(tx);
  };
  const svc = makeService({
    findUniqueResults: [ticket, null],
    txCallback,
  });
  const result = await svc.close(1, { action: 'CLOSE', finalAdminNote: 'Kamar bersih, siap dihuni.' }, STAFF);
  assert.strictEqual(result.status, 'CLOSED');
});

test('TC-T18: close() — linkedRoomItem tanpa finalRoomItemStatus → ConflictException', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'MAINTENANCE', linkedRoomItemId: 10 });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE', finalAdminNote: 'Barang dicek sudah oke.' }, OWNER),
    /Status akhir barang kamar wajib dipilih/,
  );
});

test('TC-T19: close(CHECKOUT_INSPECTION) — kamar tetap MAINTENANCE jika masih ada promoted stay', async () => {
  const ticket = mkTicket({ status: 'DONE', category: 'CHECKOUT_INSPECTION', roomId: 5, stayId: 10 });
  let roomUpdated = false;
  const txCallback = async (cb) => {
    const tx = {
      ticket: { update: async ({ data }) => ({ ...ticket, ...data, staffFieldReports: [] }) },
      staffFieldReport: { updateMany: async () => ({ count: 0 }) },
      stay: {
        count: async ({ where }) => {
          // Ada promoted stay aktif lain → blokir
          if (where.initialMetersPromotedAt) return 1;
          return 0;
        },
      },
      room: {
        update: async () => ({}),
        updateMany: async () => {
          roomUpdated = true;
          return { count: 0 };
        },
      },
    };
    return cb(tx);
  };
  const svc = makeService({ findUniqueResults: [ticket, null], txCallback });
  const result = await svc.close(1, { action: 'CLOSE', finalAdminNote: 'Inspeksi selesai check.' }, OWNER);
  assert.strictEqual(result.status, 'CLOSED');
  assert.strictEqual(roomUpdated, false, 'Kamar TIDAK boleh diubah saat masih ada stay promoted aktif');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. close() — path TENANT
// ════════════════════════════════════════════════════════════════════════════

test('TC-T20: Tenant dapat menutup tiket DONE milik sendiri', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7 });
  const svc = makeService({ findUniqueResults: [ticket, null] });
  const result = await svc.close(1, { action: 'CLOSE' }, TENANT_A);
  assert.strictEqual(result.status, 'CLOSED');
});

test('TC-T21: Tenant tidak dapat menutup tiket tenant lain', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7 }); // milik TENANT_A
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE' }, TENANT_B),
    /Tidak berhak menutup tiket ini/,
  );
});

test('TC-T22: Tenant tidak dapat membatalkan (CANCEL) tiket — hanya CLOSE', async () => {
  const ticket = mkTicket({ status: 'OPEN', tenantId: 7 });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CANCEL' }, TENANT_A),
    /Tenant hanya dapat menutup tiket, tidak membatalkan/,
  );
});

test('TC-T23: Tenant tidak dapat menutup tiket yang belum DONE', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', tenantId: 7 });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE' }, TENANT_A),
    /Tiket harus berstatus DONE/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. close() — CANCEL action (OPEN → CANCELLED)
// ════════════════════════════════════════════════════════════════════════════

test('TC-T24: OWNER dapat membatalkan tiket OPEN', async () => {
  const ticket = mkTicket({ status: 'OPEN', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket] });
  const result = await svc.close(1, { action: 'CANCEL', resolutionNote: 'Batal karena salah input' }, OWNER);
  assert.strictEqual(result.status, 'CANCELLED');
});

test('TC-T25: CANCEL gagal jika tiket bukan OPEN (sudah IN_PROGRESS)', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', category: 'MAINTENANCE' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.close(1, { action: 'CANCEL' }, OWNER),
    /Transisi status tidak valid/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 6. assign()
// ════════════════════════════════════════════════════════════════════════════

test('TC-T26: assign() pada tiket CLOSED → ConflictException', async () => {
  const ticket = mkTicket({ status: 'CLOSED' });
  const svc = makeService({ findUniqueResults: [ticket] });
  await assert.rejects(
    () => svc.assign(1, { assignedToId: 3 }, OWNER),
    /Tiket yang sudah ditutup\/dibatalkan/,
  );
});

test('TC-T27: assign() assignee tidak ditemukan → NotFoundException', async () => {
  const ticket = mkTicket({ status: 'OPEN' });
  const svc = makeService({ findUniqueResults: [ticket], assigneeResult: null });
  await assert.rejects(
    () => svc.assign(1, { assignedToId: 999 }, OWNER),
    /User assignee tidak ditemukan/,
  );
});

test('TC-T28: assign() assignee dengan role TENANT tidak valid', async () => {
  const ticket = mkTicket({ status: 'OPEN' });
  const svc = makeService({
    findUniqueResults: [ticket],
    assigneeResult: { id: 10, role: 'TENANT', fullName: 'Budi' },
  });
  await assert.rejects(
    () => svc.assign(1, { assignedToId: 10 }, OWNER),
    /Assignee tidak valid/,
  );
});

test('TC-T29: SLA hanya disetel pada assign PERTAMA (re-assign tidak mereset jam)', async () => {
  const existingAt = new Date('2026-06-01T08:00:00Z');
  const ticket = mkTicket({
    status: 'OPEN',
    assignedToId: 3,
    assignedAt: existingAt, // sudah pernah di-assign
    dueAt: new Date('2026-06-04T08:00:00Z'),
  });
  let updateData = null;
  const prisma = {
    ticket: {
      findUnique: async () => ticket,
      update: async ({ data }) => { updateData = data; return { ...ticket, ...data }; },
    },
    user: {
      findUnique: async () => ({ id: 5, role: 'STAFF', fullName: 'Staf Baru', isActive: true }),
      findMany: async () => [],
    },
    $transaction: async (cb) => cb({ ticket: { update: async () => ({}) } }),
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await svc.assign(1, { assignedToId: 5 }, OWNER);
  assert.strictEqual(updateData?.assignedAt, undefined, 'assignedAt tidak boleh di-reset saat re-assign');
  assert.strictEqual(updateData?.dueAt, undefined, 'dueAt tidak boleh di-reset saat re-assign');
});

// ════════════════════════════════════════════════════════════════════════════
// 7. markVendor()
// ════════════════════════════════════════════════════════════════════════════

test('TC-T30: markVendor(true) mengosongkan assignee dan set handledByVendor', async () => {
  const ticket = mkTicket({ status: 'OPEN', assignedToId: 3 });
  let updatedData = null;
  const prisma = {
    ticket: {
      findUnique: async () => ticket,
      update: async ({ data }) => { updatedData = data; return { ...ticket, ...data }; },
    },
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await svc.markVendor(1, { handledByVendor: true, vendorNote: 'PT Sejuk AC' }, ADMIN);
  assert.strictEqual(updatedData?.handledByVendor, true);
  assert.strictEqual(updatedData?.assignedToId, null, 'Assignee harus dikosongkan saat vendor');
});

test('TC-T31: markVendor(false) menghapus status vendor', async () => {
  const ticket = mkTicket({ status: 'OPEN', handledByVendor: true, vendorNote: 'Vendor lama' });
  let updatedData = null;
  const prisma = {
    ticket: {
      findUnique: async () => ticket,
      update: async ({ data }) => { updatedData = data; return { ...ticket, ...data }; },
    },
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await svc.markVendor(1, { handledByVendor: false }, ADMIN);
  assert.strictEqual(updatedData?.handledByVendor, false);
  assert.strictEqual(updatedData?.vendorNote, null, 'vendorNote harus dihapus saat unset vendor');
});

test('TC-T32: markVendor() gagal pada tiket CLOSED', async () => {
  const ticket = mkTicket({ status: 'CLOSED' });
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.markVendor(1, { handledByVendor: true }, ADMIN),
    /Tiket yang sudah ditutup\/dibatalkan/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Tip flow — acknowledgeTip & confirmTip
// ════════════════════════════════════════════════════════════════════════════

test('TC-T33: acknowledgeTip gagal untuk tiket yang belum DONE/CLOSED', async () => {
  const ticket = mkTicket({ status: 'IN_PROGRESS', tenantId: 7, assignedToId: 3 });
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.acknowledgeTip(1, TENANT_A),
    /Tip hanya bisa ditandai setelah tiket selesai/,
  );
});

test('TC-T34: acknowledgeTip gagal jika tiket belum punya assignee', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7, assignedToId: null });
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.acknowledgeTip(1, TENANT_A),
    /belum punya staf penanggung jawab/,
  );
});

test('TC-T35: acknowledgeTip idempoten — panggilan kedua mengembalikan alreadyRecorded:true', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7, assignedToId: 3 });
  const prisma = {
    ticket: { findUnique: async () => ticket },
    staffPerformanceEvent: {
      findFirst: async () => ({ id: 1 }), // sudah ada → idempotent
      create: async () => assert.fail('create tidak boleh dipanggil lagi'),
    },
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  const res = await svc.acknowledgeTip(1, TENANT_A);
  assert.strictEqual(res.acknowledged, true);
  assert.strictEqual(res.alreadyRecorded, true);
});

test('TC-T36: confirmTip oleh staf yang bukan assignee → ForbiddenException', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7, assignedToId: 3 });
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  // staffId = 99 (bukan assignee 3)
  await assert.rejects(
    () => svc.confirmTip(1, 99, true),
    /Anda bukan penanggung jawab tiket ini/,
  );
});

test('TC-T37: confirmTip idempoten — konfirmasi dobel → ConflictException', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: 7, assignedToId: 3 });
  const prisma = {
    ticket: { findUnique: async () => ticket },
    staffPerformanceEvent: {
      findFirst: async () => ({ id: 2 }), // sudah ada TIP_CONFIRMED
      create: async () => assert.fail('tidak boleh buat lagi'),
    },
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.confirmTip(1, 3, true),
    /Konfirmasi tip untuk tiket ini sudah ada/,
  );
});

test('TC-T38: confirmTip tiket tanpa tenant → BadRequestException', async () => {
  const ticket = mkTicket({ status: 'DONE', tenantId: null, assignedToId: 3 });
  const prisma = {
    ticket: { findUnique: async () => ticket },
    staffPerformanceEvent: { findFirst: async () => null },
  };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.confirmTip(1, 3, true),
    /tidak memiliki tenant/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 9. findOne() — kontrol akses
// ════════════════════════════════════════════════════════════════════════════

test('TC-T39: TENANT tidak dapat melihat tiket milik tenant lain', async () => {
  const ticket = mkTicket({ tenantId: 8, staffFieldReports: [] }); // milik tenant 8
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  // TENANT_A punya tenantId 7
  await assert.rejects(
    () => svc.findOne(1, TENANT_A),
    /Tidak berhak melihat tiket ini/,
  );
});

test('TC-T40: STAFF tidak dapat melihat tiket yang bukan tugasnya dan bukan field reportnya', async () => {
  const ticket = mkTicket({ assignedToId: 99, staffFieldReports: [] }); // bukan staf 3
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  await assert.rejects(
    () => svc.findOne(1, STAFF),
    /Tidak berhak melihat tiket ini/,
  );
});

test('TC-T41: OWNER dapat melihat semua tiket', async () => {
  const ticket = mkTicket({ staffFieldReports: [] });
  const prisma = { ticket: { findUnique: async () => ticket } };
  const svc = new TicketsService(prisma, AUDIT, NOTIF, LOYALTY);
  const result = await svc.findOne(1, OWNER);
  assert.strictEqual(result.id, 1);
});
