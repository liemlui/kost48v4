/**
 * Integration test: Room Transfer (Y-J9)
 * =======================================
 * Menguji siklus pindah kamar penuh:
 *   Stay ACTIVE → transfer ke kamar baru → settlement + room release
 *   Verifikasi: roomId berubah, kamar lama MAINTENANCE + tiket inspeksi,
 *   kamar baru OCCUPIED, RoomTransfer audit record.
 *
 * PRASYARAT: DB dev (port 5433 / kost48_v3_pro) running + sudah di-seed.
 * JALANKAN: cd backend && npm run build && npm run test:integration
 */

'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { RoomTransferService } = require('../../dist/modules/stays/room-transfer.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-TRF-${label}-${Date.now()}-${++_tcIdx}`;
}
const ymd = (d) => d.toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}

async function getAdminActor(prisma) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  assert.ok(admin, 'Harus ada user ADMIN (seed)');
  return { id: admin.id, role: 'ADMIN', email: admin.email, tenantId: null };
}

async function getOwnerActor(prisma) {
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, select: { id: true, email: true } });
  assert.ok(owner, 'Harus ada user OWNER (seed)');
  return { id: owner.id, role: 'OWNER', email: owner.email, tenantId: null };
}

async function createTestRoom(prisma, label, opts = {}) {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Transfer Test ${label}`,
      floor: opts.floor ?? '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: opts.monthlyRateRupiah ?? 1_500_000,
      defaultDepositRupiah: opts.defaultDepositRupiah ?? 500_000,
      electricityTariffPerKwhRupiah: opts.electricityTariff ?? 0, // default: utilitas flat
      waterTariffPerM3Rupiah: opts.waterTariff ?? 0,
      isActive: true,
    },
    select: { id: true, code: true, name: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
}

/**
 * Buat stay ACTIVE + promoted (sudah check-in) di kamar tertentu.
 * @param {string} label - untuk membuat identityNumber unik antar tenant
 */
async function createActiveStay(prisma, room, adminActor, label = 'TRF') {
  const bcrypt = require('bcryptjs');
  const { randomInt } = require('crypto');
  const tempPassword = await bcrypt.hash(`UAT-TRF-${Date.now()}`, 10);
  const identitySuffix = String(Date.now()).slice(-6) + String(randomInt(10, 99));

  const checkIn = addDays(new Date(), -30);
  checkIn.setUTCHours(0, 0, 0, 0);
  const periodEnd = addMonths(checkIn, 6);
  const deposit = room.defaultDepositRupiah;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        fullName: `Tenant Transfer Test ${label}`,
        phone: `0812${String(randomInt(10000000, 99999999))}`,
        email: `trf-${label.toLowerCase()}-${Date.now()}@test.kost48.com`,
        isActive: true,
        identityNumber: `TRF${identitySuffix}${label}`,
        emergencyContactPhone: '081234567890',
        emergencyContactName: 'Emergency Contact',
      },
    });

    await tx.user.create({
      data: {
        fullName: tenant.fullName,
        email: tenant.email,
        passwordHash: tempPassword,
        role: 'TENANT',
        tenantId: tenant.id,
        isActive: true,
      },
    });

    const stay = await tx.stay.create({
      data: {
        tenantId: tenant.id,
        roomId: room.id,
        status: 'ACTIVE',
        pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: room.monthlyRateRupiah,
        occupantCount: 1,
        hasPet: false,
        checkInDate: checkIn,
        plannedCheckOutDate: periodEnd,
        depositAmountRupiah: deposit,
        depositPaidAmountRupiah: deposit,
        depositStatus: 'HELD',
        downPaymentAmountRupiah: 0,
        electricityTariffPerKwhRupiah: 0,
        waterTariffPerM3Rupiah: 0,
        bookingSource: 'WEBSITE',
        createdById: adminActor.id,
        initialMetersPromotedAt: checkIn,
      },
    });

    // Set kamar ke OCCUPIED (simulasi check-in)
    await tx.room.update({
      where: { id: room.id },
      data: { status: 'OCCUPIED' },
    });

    return { stay, tenant };
  });

  return result;
}

/**
 * Bersihkan data test — urutan sesuai FK constraints.
 */
async function cleanupTestData(prisma, { stayId, roomIds = [], tenantId, userId } = {}) {
  if (stayId) {
    try {
      try { await prisma.appNotification.deleteMany({ where: { entityType: 'STAY', entityId: String(stayId) } }); } catch {}
      try { await prisma.checkoutRequest.deleteMany({ where: { stayId } }); } catch {}
      const invs = await prisma.invoice.findMany({ where: { stayId }, select: { id: true } });
      for (const inv of invs) {
        try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: String(inv.id) } }); } catch {}
        try { await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.paymentSubmission.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoice.delete({ where: { id: inv.id } }); } catch {}
      }
      try { await prisma.tenantDepositLedgerEntry.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.rentRecognitionSchedule.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.renewRequest.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.roomTransfer.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.ticket.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.stay.delete({ where: { id: stayId } }); } catch {}
    } catch {}
  }
  for (const roomId of roomIds) {
    try { await prisma.meterReading.deleteMany({ where: { roomId } }); } catch {}
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
  if (tenantId) {
    try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {}
  }
  if (userId) {
    try { await prisma.user.delete({ where: { id: userId } }); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J9a: Room Transfer — pindah kamar sukses (utilitas flat)
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J9a: Room Transfer — pindah kamar sukses (utilitas flat)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const roomTransferService = module.get(RoomTransferService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let tenantId = null;
  const roomIds = [];

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomIds, tenantId });
    await app.close();
  });

  try {
    // ── STEP 1: Setup — 2 kamar + stay aktif ────────────────────────────
    console.log('\n  📋 STEP 1: Setup 2 kamar + stay aktif');
    const srcRoom = await createTestRoom(prisma, 'SRC', { floor: '1' });
    const dstRoom = await createTestRoom(prisma, 'DST', { floor: '2', monthlyRateRupiah: 1_800_000 });
    roomIds.push(srcRoom.id, dstRoom.id);

    const { stay, tenant } = await createActiveStay(prisma, srcRoom, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;
    console.log(`     ✅ Source=${srcRoom.code}, Dest=${dstRoom.code}, Stay=#${stay.id}`);

    // Verifikasi state awal
    let stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(stayCheck.roomId, srcRoom.id, 'Stay harus di kamar sumber');
    assert.strictEqual(stayCheck.status, 'ACTIVE', 'Stay harus ACTIVE');
    const srcRoomCheck = await prisma.room.findUnique({ where: { id: srcRoom.id } });
    assert.strictEqual(srcRoomCheck.status, 'OCCUPIED', 'Kamar sumber harus OCCUPIED');
    console.log('     ✅ State awal: Stay di source room, source OCCUPIED');

    // ── STEP 2: Transfer kamar ──────────────────────────────────────────
    console.log('\n  📋 STEP 2: Transfer ke kamar tujuan');
    const transferDate = addDays(new Date(), 0);
    transferDate.setUTCHours(0, 0, 0, 0);

    const result = await roomTransferService.transferRoom(stayId, {
      toRoomId: dstRoom.id,
      transferDate: ymd(transferDate),
      reason: 'Ingin kamar lantai 2 yang lebih sejuk',
      note: 'Transfer untuk integration test',
    }, adminActor);

    assert.ok(result.transfer, 'Harus ada objek transfer');
    assert.ok(result.transfer.id, 'RoomTransfer record harus terbuat');
    assert.strictEqual(result.transfer.fromRoomId, srcRoom.id, 'fromRoomId harus kamar sumber');
    assert.strictEqual(result.transfer.toRoomId, dstRoom.id, 'toRoomId harus kamar tujuan');
    console.log(`     ✅ RoomTransfer #${result.transfer.id} terbuat`);

    // ── STEP 3: Verifikasi stay pindah ──────────────────────────────────
    console.log('\n  📋 STEP 3: Verifikasi stay pindah ke kamar baru');
    stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(stayCheck.roomId, dstRoom.id, 'Stay harus di kamar tujuan');
    assert.strictEqual(stayCheck.status, 'ACTIVE', 'Stay tetap ACTIVE');
    console.log(`     ✅ Stay #${stayId} sekarang di room #${dstRoom.id}`);

    // ── STEP 4: Verifikasi status kamar ─────────────────────────────────
    console.log('\n  📋 STEP 4: Verifikasi status kamar');
    const srcAfter = await prisma.room.findUnique({ where: { id: srcRoom.id } });
    const dstAfter = await prisma.room.findUnique({ where: { id: dstRoom.id } });
    assert.strictEqual(srcAfter.status, 'MAINTENANCE', 'Kamar lama harus MAINTENANCE');
    assert.strictEqual(dstAfter.status, 'OCCUPIED', 'Kamar baru harus OCCUPIED');
    console.log(`     ✅ Source=${srcAfter.status}, Dest=${dstAfter.status}`);

    // ── STEP 5: Verifikasi tiket inspeksi ───────────────────────────────
    console.log('\n  📋 STEP 5: Verifikasi tiket inspeksi checkout');
    const ticket = await prisma.ticket.findFirst({
      where: { stayId, roomId: srcRoom.id, category: 'CHECKOUT_INSPECTION' },
    });
    assert.ok(ticket, 'Harus ada tiket inspeksi untuk kamar lama');
    console.log(`     ✅ Tiket #${ticket.ticketNumber} terbuat untuk ${srcRoom.code}`);

    // ── STEP 6: Verifikasi audit RoomTransfer ───────────────────────────
    console.log('\n  📋 STEP 6: Verifikasi record RoomTransfer');
    const roomTransfer = await prisma.roomTransfer.findUnique({
      where: { id: result.transfer.id },
    });
    assert.ok(roomTransfer, 'RoomTransfer record harus ada');
    assert.strictEqual(roomTransfer.stayId, stayId);
    assert.strictEqual(roomTransfer.fromRoomId, srcRoom.id);
    assert.strictEqual(roomTransfer.toRoomId, dstRoom.id);
    console.log(`     ✅ RoomTransfer record lengkap: stay=#${stayId}, ${srcRoom.code}→${dstRoom.code}`);

    console.log('\n  🎉 Y-J9a SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J9a GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J9b: Guard — pindah ke kamar yang sama
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J9b: Guard — pindah ke kamar yang sama harus ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const roomTransferService = module.get(RoomTransferService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let tenantId = null;
  const roomIds = [];

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomIds, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J9b: Guard — pindah ke kamar yang sama');

    const room = await createTestRoom(prisma, 'SAME');
    roomIds.push(room.id);
    const { stay, tenant } = await createActiveStay(prisma, room, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;

    try {
      await roomTransferService.transferRoom(stayId, {
        toRoomId: room.id, // kamar yang sama
        reason: 'Tes guard — harus gagal',
      }, adminActor);
      assert.fail('Seharusnya throw ConflictException');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('sama') || err.status === 409,
        `Harus tolak pindah ke kamar yang sama: ${msg}`,
      );
      console.log(`     ✅ Ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J9b SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J9b GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J9c: Guard — kamar tujuan sudah dihuni
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J9c: Guard — kamar tujuan sudah dihuni harus ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const roomTransferService = module.get(RoomTransferService);
  const adminActor = await getAdminActor(prisma);

  let stayId1 = null;
  let stayId2 = null;
  let tenantId1 = null;
  let tenantId2 = null;
  const roomIds = [];

  t.after(async () => {
    await cleanupTestData(prisma, { stayId: stayId1, roomIds, tenantId: tenantId1 });
    if (stayId2) {
      try {
        const invs = await prisma.invoice.findMany({ where: { stayId: stayId2 }, select: { id: true } });
        for (const inv of invs) {
          try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: String(inv.id) } }); } catch {}
          try { await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
          try { await prisma.paymentSubmission.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
          try { await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
          try { await prisma.invoice.delete({ where: { id: inv.id } }); } catch {}
        }
        try { await prisma.tenantDepositLedgerEntry.deleteMany({ where: { stayId: stayId2 } }); } catch {}
        try { await prisma.rentRecognitionSchedule.deleteMany({ where: { stayId: stayId2 } }); } catch {}
        try { await prisma.roomTransfer.deleteMany({ where: { stayId: stayId2 } }); } catch {}
        try { await prisma.ticket.deleteMany({ where: { stayId: stayId2 } }); } catch {}
        try { await prisma.stay.delete({ where: { id: stayId2 } }); } catch {}
      } catch {}
    }
    if (tenantId2) { try { await prisma.tenant.delete({ where: { id: tenantId2 } }); } catch {} }
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J9c: Guard — kamar tujuan sudah dihuni');

    const srcRoom = await createTestRoom(prisma, 'SRC2', { floor: '1' });
    const dstRoom = await createTestRoom(prisma, 'DST2', { floor: '2' });
    roomIds.push(srcRoom.id, dstRoom.id);

    // Dua stay aktif: satu di source, satu di destination
    const { stay: stay1, tenant: t1 } = await createActiveStay(prisma, srcRoom, adminActor, 'SRC');
    stayId1 = stay1.id;
    tenantId1 = t1.id;
    const { stay: stay2, tenant: t2 } = await createActiveStay(prisma, dstRoom, adminActor, 'DST');
    stayId2 = stay2.id;
    tenantId2 = t2.id;

    console.log(`     ✅ Stay1=#${stay1.id} di ${srcRoom.code}, Stay2=#${stay2.id} di ${dstRoom.code}`);

    // Coba pindah Stay1 ke dstRoom (sudah dihuni Stay2)
    try {
      await roomTransferService.transferRoom(stayId1, {
        toRoomId: dstRoom.id,
        reason: 'Tes guard — kamar sudah dihuni',
      }, adminActor);
      assert.fail('Seharusnya throw ConflictException');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('dihuni') || msg.includes('penghuni') || err.status === 409,
        `Harus tolak kamar tujuan dihuni: ${msg}`,
      );
      console.log(`     ✅ Ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J9c SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J9c GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J9d: Transfer dengan override harga (OWNER-only)
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J9d: Transfer dengan override harga — OWNER sukses, ADMIN ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const roomTransferService = module.get(RoomTransferService);
  const adminActor = await getAdminActor(prisma);
  const ownerActor = await getOwnerActor(prisma);

  let stayId = null;
  let tenantId = null;
  const roomIds = [];

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomIds, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J9d: Transfer dengan override harga');

    const srcRoom = await createTestRoom(prisma, 'OV1', { floor: '1', monthlyRateRupiah: 1_500_000 });
    const dstRoom = await createTestRoom(prisma, 'OV2', { floor: '2', monthlyRateRupiah: 1_800_000 });
    roomIds.push(srcRoom.id, dstRoom.id);

    const { stay, tenant } = await createActiveStay(prisma, srcRoom, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;
    console.log(`     ✅ Stay #${stay.id}, rent=Rp ${Number(stay.agreedRentAmountRupiah).toLocaleString('id-ID')}`);

    // ADMIN tidak boleh override harga
    try {
      await roomTransferService.transferRoom(stayId, {
        toRoomId: dstRoom.id,
        newAgreedRentRupiah: 2_000_000,
        reason: 'Tes guard — ADMIN override harga',
      }, adminActor);
      assert.fail('ADMIN tidak boleh override harga');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('OWNER') || msg.includes('Hanya') || err.status === 403,
        `ADMIN harus ditolak override harga: ${msg}`,
      );
      console.log(`     ✅ ADMIN ditolak: ${msg}`);
    }

    // Reset status kamar (karena ADMIN transfer gagal tidak mengubah status)
    // OWNER boleh override harga
    const transferDate = addDays(new Date(), 0);
    transferDate.setUTCHours(0, 0, 0, 0);

    const result = await roomTransferService.transferRoom(stayId, {
      toRoomId: dstRoom.id,
      transferDate: ymd(transferDate),
      newAgreedRentRupiah: 2_000_000,
      reason: 'OWNER override harga sewa saat pindah',
    }, ownerActor);

    assert.ok(result.transfer, 'Transfer OWNER harus sukses');
    assert.strictEqual(Number(result.transfer.rentAfterRupiah), 2_000_000, 'rentAfter harus sesuai override');
    assert.strictEqual(Number(result.transfer.rentBeforeRupiah), 1_500_000, 'rentBefore harus harga lama');

    // Verifikasi stay
    const stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(Number(stayCheck.agreedRentAmountRupiah), 2_000_000, 'Harga sewa stay harus terupdate');
    console.log(`     ✅ OWNER sukses override: rentBefore=Rp 1.500.000 → rentAfter=Rp 2.000.000`);

    console.log('  🎉 Y-J9d SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J9d GAGAL:', err.message);
    throw err;
  }
});
