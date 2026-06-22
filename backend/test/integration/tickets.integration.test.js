'use strict';
/**
 * Integration test: TicketsService — siklus hidup penuh via DB UAT
 *
 * Prasyarat:
 *   1. DB UAT (port 5433 `kost48_v3_pro`) running + seeded.
 *   2. `npm run build` sudah dijalankan → dist/ terisi.
 * Jalankan: `npm run test:integration`
 *
 * Setiap test membersihkan data yang dibuatnya (best-effort).
 */
const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { TicketsService } = require('../../dist/modules/tickets/tickets.service.js');
const { AnnouncementsService } = require('../../dist/modules/announcements/announcements.service.js');

// ─── Bootstrap NestJS App ──────────────────────────────────────────────────
async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}

// ─── Helper: ambil seed data ───────────────────────────────────────────────
async function getOwnerActor(prisma) {
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, select: { id: true, email: true } });
  assert.ok(owner, 'Harus ada user OWNER di DB UAT (seed)');
  return { id: owner.id, role: 'OWNER', tenantId: null };
}

async function getAdminActor(prisma) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  if (!admin) return null;
  return { id: admin.id, role: 'ADMIN', tenantId: null };
}

async function getStaffUser(prisma) {
  return prisma.user.findFirst({
    where: { role: 'STAFF', isActive: true },
    select: { id: true, fullName: true },
  });
}

async function getActiveTenant(prisma) {
  return prisma.tenant.findFirst({ where: { isActive: true }, select: { id: true } });
}

async function getActiveStay(prisma) {
  return prisma.stay.findFirst({
    where: { status: 'ACTIVE', initialMetersPromotedAt: { not: null } },
    select: { id: true, tenantId: true, roomId: true },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T01: Siklus penuh — buat tiket backoffice → start → markDone → close
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T01: Buat tiket backoffice → start → markDone → close (OWNER, MAINTENANCE)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const tickets = module.get(TicketsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const tenant = await getActiveTenant(prisma);
  assert.ok(tenant, 'Harus ada tenant aktif (seed)');

  // 1. Buat tiket backoffice
  const ticket = await tickets.createBackoffice({
    title: 'INT TEST: Keran bocor kamar mandi',
    description: 'Keran bocor — dibuat integration test, akan dihapus',
    category: 'MAINTENANCE',
    tenantId: tenant.id,
  }, owner);
  assert.ok(ticket.id, 'Tiket harus terbuat');
  assert.strictEqual(ticket.status, 'OPEN');
  assert.match(ticket.ticketNumber, /^TIC-\d{4}-\d{4}$/, 'Format nomor tiket harus valid');

  try {
    // 2. Start tiket (OPEN → IN_PROGRESS)
    const started = await tickets.start(ticket.id, owner);
    assert.strictEqual(started.status, 'IN_PROGRESS');
    assert.ok(started.assignedAt, 'assignedAt harus terisi saat pertama start');
    assert.ok(started.dueAt, 'dueAt (SLA) harus terisi');

    // 3. Mark done (IN_PROGRESS → DONE)
    const done = await tickets.markDone(ticket.id, {
      resolutionNote: 'Keran diganti, sudah tidak bocor.',
    }, owner);
    assert.strictEqual(done.status, 'DONE');
    assert.ok(done.resolvedAt, 'resolvedAt harus terisi');

    // 4. Close (DONE → CLOSED) — wajib finalAdminNote ≥ 8 karakter
    const closed = await tickets.close(ticket.id, {
      action: 'CLOSE',
      finalAdminNote: 'Diverifikasi owner: keran kamar mandi sudah tidak bocor.',
    }, owner);
    assert.strictEqual(closed.status, 'CLOSED');
    assert.ok(closed.closedAt, 'closedAt harus terisi');

    console.log(`  ✅ TC-INT-T01: Tiket #${ticket.ticketNumber} OPEN→IN_PROGRESS→DONE→CLOSED`);
  } finally {
    // Cleanup
    try { await prisma.ticket.delete({ where: { id: ticket.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T02: CANCEL tiket dari OPEN langsung
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T02: Buat tiket → cancel dari OPEN (OWNER)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const tickets = module.get(TicketsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const tenant = await getActiveTenant(prisma);
  assert.ok(tenant, 'Harus ada tenant aktif');

  const ticket = await tickets.createBackoffice({
    title: 'INT TEST: Tiket salah input — cancel',
    description: 'Dibuat untuk test CANCEL, akan dihapus',
    category: 'MAINTENANCE',
    tenantId: tenant.id,
  }, owner);

  try {
    const cancelled = await tickets.close(ticket.id, {
      action: 'CANCEL',
      resolutionNote: 'Dibatalkan — salah input integration test',
    }, owner);
    assert.strictEqual(cancelled.status, 'CANCELLED');
    console.log(`  ✅ TC-INT-T02: Tiket #${ticket.ticketNumber} CANCEL dari OPEN`);
  } finally {
    try { await prisma.ticket.delete({ where: { id: ticket.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T03: Tiket vendor — markDone dari OPEN (skip IN_PROGRESS)
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T03: Tiket vendor → markDone langsung dari OPEN tanpa IN_PROGRESS', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const tickets = module.get(TicketsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const admin = (await getAdminActor(prisma)) ?? owner;
  const tenant = await getActiveTenant(prisma);
  assert.ok(tenant, 'Harus ada tenant aktif');

  // Buat tiket lalu tandai sebagai vendor
  const ticket = await tickets.createBackoffice({
    title: 'INT TEST: AC Kotor — cuci vendor',
    description: 'Cuci AC oleh PT Sejuk AC — integration test vendor flow',
    category: 'AC_CLEANING',
    tenantId: tenant.id,
  }, owner);

  try {
    // Tandai sebagai vendor (assignee dikosongkan)
    const vendored = await tickets.markVendor(ticket.id, {
      handledByVendor: true,
      vendorNote: 'PT Sejuk AC — cuci + isi freon',
    }, admin);
    assert.strictEqual(vendored.handledByVendor, true);
    assert.strictEqual(vendored.assignedToId, null, 'Assignee harus dikosongkan saat vendor');

    // markDone dari OPEN (valid untuk vendor)
    const done = await tickets.markDone(ticket.id, {
      resolutionNote: 'AC sudah dicuci vendor PT Sejuk AC',
    }, admin);
    assert.strictEqual(done.status, 'DONE');

    // Close
    await tickets.close(ticket.id, {
      action: 'CLOSE',
      finalAdminNote: 'Admin verifikasi AC sudah dicuci vendor, bersih dan dingin.',
    }, admin);

    console.log(`  ✅ TC-INT-T03: Vendor ticket #${ticket.ticketNumber} OPEN→DONE (skip IN_PROGRESS)`);
  } finally {
    try { await prisma.ticket.delete({ where: { id: ticket.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T04: STAFF assign ke diri sendiri → start → markDone
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T04: Staf di-assign tiket → start → markDone oleh staf', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const tickets = module.get(TicketsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const staff = await getStaffUser(prisma);
  if (!staff) {
    console.log('  ⚠️  TC-INT-T04: Skip — tidak ada user STAFF di DB UAT');
    return;
  }
  const staffActor = { id: staff.id, role: 'STAFF', tenantId: null };
  const tenant = await getActiveTenant(prisma);
  assert.ok(tenant, 'Harus ada tenant aktif');

  const ticket = await tickets.createBackoffice({
    title: 'INT TEST: Lampu kamar mati',
    description: 'Lampu TL kamar mati — integration test staf flow',
    category: 'MAINTENANCE',
    tenantId: tenant.id,
  }, owner);

  try {
    // Assign ke staf
    const assigned = await tickets.assign(ticket.id, { assignedToId: staff.id }, owner);
    assert.strictEqual(assigned.assignedToId, staff.id);
    assert.ok(assigned.assignedAt, 'SLA clock harus mulai saat assign');

    // Staf mulai tiket
    const started = await tickets.start(ticket.id, staffActor);
    assert.strictEqual(started.status, 'IN_PROGRESS');

    // Staf tandai selesai
    const done = await tickets.markDone(ticket.id, {
      resolutionNote: 'Lampu diganti baru, sudah menyala.',
    }, staffActor);
    assert.strictEqual(done.status, 'DONE');

    // Owner close (staf hanya bisa close CHECKOUT_INSPECTION)
    await tickets.close(ticket.id, {
      action: 'CLOSE',
      finalAdminNote: 'Owner verifikasi: lampu kamar sudah diganti dan berfungsi.',
    }, owner);

    console.log(`  ✅ TC-INT-T04: Staf assign→start→done, owner close tiket #${ticket.ticketNumber}`);
  } finally {
    try { await prisma.ticket.delete({ where: { id: ticket.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T05: Guard — staf TIDAK bisa start tiket yang sudah di-assign staf lain
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T05: Guard — staf tidak dapat mulai tiket milik staf lain', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const tickets = module.get(TicketsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);

  // Cari 2 staf berbeda
  const allStaff = await prisma.user.findMany({
    where: { role: 'STAFF', isActive: true },
    select: { id: true },
    take: 2,
  });
  if (allStaff.length < 2) {
    console.log('  ⚠️  TC-INT-T05: Skip — butuh minimal 2 user STAFF di DB UAT');
    return;
  }
  const [staffA, staffB] = allStaff;
  const staffBActor = { id: staffB.id, role: 'STAFF', tenantId: null };
  const tenant = await getActiveTenant(prisma);
  assert.ok(tenant, 'Harus ada tenant aktif');

  const ticket = await tickets.createBackoffice({
    title: 'INT TEST: Guard staf → hanya assignee boleh start',
    description: 'Test guard staf cross-assign',
    category: 'MAINTENANCE',
    tenantId: tenant.id,
  }, owner);

  try {
    // Assign ke staffA
    await tickets.assign(ticket.id, { assignedToId: staffA.id }, owner);

    // staffB mencoba mulai → harus ditolak
    await assert.rejects(
      () => tickets.start(ticket.id, staffBActor),
      /Tiket ini bukan tugas akun ini/,
    );

    console.log(`  ✅ TC-INT-T05: Guard staf cross-assign berjalan benar pada tiket #${ticket.ticketNumber}`);
  } finally {
    try { await prisma.ticket.delete({ where: { id: ticket.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T06: Pengumuman — buat, publish, findActive untuk tenant
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T06: Buat pengumuman draft → publish → tampil di findActive', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const announcements = module.get(AnnouncementsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const ownerActor = { id: owner.id, role: 'OWNER', tenantId: null };

  // Buat draft (belum publish)
  const created = await announcements.create({
    title: 'INT TEST: Pengumuman tes — harap abaikan',
    content: 'Ini pengumuman dari integration test. Diabaikan.',
    audience: 'ALL',
    isPublished: false,
  }, ownerActor);
  assert.ok(created.id, 'Pengumuman harus terbuat');
  assert.strictEqual(created.isPublished, false);

  try {
    // Publish
    const published = await announcements.publish(created.id, ownerActor);
    assert.strictEqual(published.isPublished, true);
    assert.ok(published.publishedAt, 'publishedAt harus terisi');

    // Publish lagi → harus gagal (sudah dipublikasi)
    await assert.rejects(
      () => announcements.publish(created.id, ownerActor),
      /sudah dipublikasikan/,
    );

    // findActive untuk owner: harus muncul
    const activeForOwner = await announcements.findActive(ownerActor);
    const found = activeForOwner.items.some((a) => a.id === created.id);
    assert.ok(found, 'Pengumuman yang dipublikasi harus muncul di findActive');

    console.log(`  ✅ TC-INT-T06: Pengumuman #${created.id} draft→published, muncul di findActive`);
  } finally {
    // Cleanup
    try { await prisma.announcement.delete({ where: { id: created.id } }); } catch {}
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TC-INT-T07: Pengumuman audience TENANT tidak muncul untuk non-penghuni
// ════════════════════════════════════════════════════════════════════════════

test('TC-INT-T07: Pengumuman audience TENANT tidak muncul untuk tenant non-penghuni', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const announcements = module.get(AnnouncementsService);
  t.after(async () => { await app.close(); });

  const owner = await getOwnerActor(prisma);
  const ownerActor = { id: owner.id, role: 'OWNER', tenantId: null };

  const ann = await announcements.create({
    title: 'INT TEST: Pengumuman operasional tenant saja',
    content: 'Khusus penghuni — integration test.',
    audience: 'TENANT',
    isPublished: true,
  }, ownerActor);

  try {
    // Cari tenant tanpa stay OCCUPIED di DB
    const tenantNoStay = await prisma.user.findFirst({
      where: {
        role: 'TENANT',
        isActive: true,
        tenant: {
          stays: {
            none: { status: 'ACTIVE', room: { status: 'OCCUPIED' } },
          },
        },
      },
      select: { id: true, tenant: { select: { id: true } } },
    });

    if (!tenantNoStay) {
      console.log('  ⚠️  TC-INT-T07: Skip — tidak ada tenant non-penghuni di DB UAT');
      return;
    }

    const actor = { id: tenantNoStay.id, role: 'TENANT', tenantId: tenantNoStay.tenant?.id ?? null };
    const active = await announcements.findActive(actor);
    const found = active.items.some((a) => a.id === ann.id);
    assert.strictEqual(found, false, 'Pengumuman TENANT tidak boleh muncul untuk non-penghuni');

    console.log(`  ✅ TC-INT-T07: Pengumuman audience TENANT tersembunyi dari non-penghuni`);
  } finally {
    try { await prisma.announcement.delete({ where: { id: ann.id } }); } catch {}
  }
});
