/**
 * Integration test: Inventory Movement Full Cycle (Y-J12)
 * =======================================================
 * Menguji alur mutasi stok gudang — ASSIGN_TO_ROOM, RETURN_FROM_ROOM, IN, OUT
 * Verifikasi: qtyOnHand item sinkron, RoomItem qty sinkron, guard terpenuhi.
 *
 * PRASYARAT: DB dev (port 5433 / kost48_v3_pro) running + sudah di-seed.
 * JALANKAN: cd backend && npm run build && npm run test:integration
 *
 * Setiap test membuat data uji mandiri → TIDAK bergantung data seed.
 * Cleanup otomatis via t.after().
 */

'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { ConflictException, ForbiddenException } = require('@nestjs/common');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { InventoryMovementsService } = require('../../dist/modules/inventory-movements/inventory-movements.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-INV-${label}-${Date.now()}-${++_tcIdx}`;
}

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

async function getStaffActor(prisma) {
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' }, select: { id: true, email: true } });
  assert.ok(staff, 'Harus ada user STAFF (seed)');
  return { id: staff.id, role: 'STAFF', email: staff.email, tenantId: null };
}

/** Buat inventory item uji — jumlah awal 10 */
async function createTestItem(prisma, label = 'INV', qtyOnHand = 10) {
  return prisma.inventoryItem.create({
    data: {
      name: `Item UAT ${label} ${uniqueCode(label)}`,
      qtyOnHand: String(qtyOnHand),
      unit: 'pcs',
      category: 'KONSUMABEL',
      isActive: true,
    },
    select: { id: true, name: true, qtyOnHand: true, unit: true },
  });
}

/** Buat room uji */
async function createTestRoom(prisma, label = 'INV') {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Inv Test ${label}`,
      floor: '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: 1_000_000,
      defaultDepositRupiah: 500_000,
      electricityTariffPerKwhRupiah: 2_500,
      waterTariffPerM3Rupiah: 5_000,
      isActive: true,
    },
    select: { id: true, code: true },
  });
}

/** Hapus data test: inventoryMovement, roomItem, inventoryItem, room */
async function cleanup(prisma, ids) {
  const { itemId, roomId } = ids;
  if (itemId) {
    try { await prisma.inventoryMovement.deleteMany({ where: { itemId } }); } catch {}
    try { await prisma.roomItem.deleteMany({ where: { itemId } }); } catch {}
    try { await prisma.inventoryItem.delete({ where: { id: itemId } }); } catch {}
  }
  if (roomId) {
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════════

test('Y-J12: Inventory Movement — ASSIGN → RETURN → IN → OUT + guards', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const svc = module.get(InventoryMovementsService);
  const admin = await getAdminActor(prisma);
  const staff = await getStaffActor(prisma);

  let itemId, roomId;

  t.after(async () => { await cleanup(prisma, { itemId, roomId }); await app.close(); });

  try {
    console.log('\n  📋 Y-J12: Inventory Movement Full Cycle');

    // ── 0. Setup: item + room ──────────────────────────────────────────
    const item = await createTestItem(prisma, 'FULL');
    itemId = item.id;
    assert.strictEqual(Number(item.qtyOnHand), 10, 'Awal stok 10');

    const room = await createTestRoom(prisma, 'FULL');
    roomId = room.id;

    // ── 1. ASSIGN_TO_ROOM ──────────────────────────────────────────────
    console.log('  Step 1: ASSIGN_TO_ROOM (2 pcs)');
    const assignResult = await svc.create(
      { itemId, movementType: 'ASSIGN_TO_ROOM', qty: '2', roomId, note: 'Pasang 2 pcs di kamar uji' },
      admin,
    );
    assert.strictEqual(assignResult.movementType, 'ASSIGN_TO_ROOM');
    const itemAfterAssign = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    assert.strictEqual(Number(itemAfterAssign?.qtyOnHand), 8, 'Stok turun 10→8');
    const roomItemAfterAssign = await prisma.roomItem.findFirst({ where: { itemId, roomId } });
    assert.ok(roomItemAfterAssign, 'RoomItem terbuat');
    assert.strictEqual(Number(roomItemAfterAssign.qty), 2, 'RoomItem qty=2');

    // ── 2. RETURN_FROM_ROOM ────────────────────────────────────────────
    console.log('  Step 2: RETURN_FROM_ROOM (1 pcs)');
    const returnResult = await svc.create(
      { itemId, movementType: 'RETURN_FROM_ROOM', qty: '1', roomId, note: 'Kembalikan 1 pcs dari kamar uji' },
      admin,
    );
    assert.strictEqual(returnResult.movementType, 'RETURN_FROM_ROOM');
    const itemAfterReturn = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    assert.strictEqual(Number(itemAfterReturn?.qtyOnHand), 9, 'Stok naik 8→9');
    const roomItemAfterReturn = await prisma.roomItem.findFirst({ where: { itemId, roomId } });
    assert.strictEqual(Number(roomItemAfterReturn?.qty), 1, 'RoomItem qty=1 (sisa 1)');

    // ── 3. IN (restok) ─────────────────────────────────────────────────
    console.log('  Step 3: IN (5 pcs)');
    const inResult = await svc.create(
      { itemId, movementType: 'IN', qty: '5', note: 'Restok 5 pcs dari supplier' },
      admin,
    );
    assert.strictEqual(inResult.movementType, 'IN');
    const itemAfterIn = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    assert.strictEqual(Number(itemAfterIn?.qtyOnHand), 14, 'Stok naik 9→14');

    // ── 4. OUT (keluar gudang) ─────────────────────────────────────────
    console.log('  Step 4: OUT (3 pcs)');
    const outResult = await svc.create(
      { itemId, movementType: 'OUT', qty: '3', note: 'Ambil 3 pcs untuk maintenance' },
      admin,
    );
    assert.strictEqual(outResult.movementType, 'OUT');
    const itemAfterOut = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    assert.strictEqual(Number(itemAfterOut?.qtyOnHand), 11, 'Stok turun 14→11');

    // ── 5. Guard: OUT dengan stok tidak cukup → ConflictException ──────
    console.log('  Step 5: Guard — OUT insufficient stock');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'OUT', qty: '999', note: 'Ambil 999 pcs (stok kurang)' }, admin),
      (e) => e instanceof ConflictException && e.message.includes('Stok'),
      'OUT dengan stok kurang harus ConflictException',
    );

    // ── 6. Guard: ASSIGN_TO_ROOM tanpa roomId → ConflictException ──────
    console.log('  Step 6: Guard — ASSIGN_TO_ROOM tanpa roomId');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'ASSIGN_TO_ROOM', qty: '1', note: 'Pasang tanpa roomId' }, admin),
      (e) => e instanceof ConflictException && e.message.includes('Data room'),
      'ASSIGN_TO_ROOM tanpa roomId harus ConflictException',
    );

    // ── 7. Guard: IN dengan roomId → ConflictException ─────────────────
    console.log('  Step 7: Guard — IN dengan roomId');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'IN', qty: '1', roomId, note: 'IN dengan roomId (salah)' }, admin),
      (e) => e instanceof ConflictException && e.message.includes('Data room'),
      'IN dengan roomId harus ConflictException',
    );

    // ── 8. Guard: STAFF create → ForbiddenException ────────────────────
    console.log('  Step 8: Guard — STAFF create');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'IN', qty: '1', note: 'Staff mencoba mutasi' }, staff),
      (e) => e instanceof ForbiddenException,
      'STAFF create harus ForbiddenException',
    );

    // ── 9. Guard: Catatan pendek → ConflictException ───────────────────
    console.log('  Step 9: Guard — note too short');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'IN', qty: '1', note: 'pendek' }, admin),
      (e) => e instanceof ConflictException && e.message.includes('minimal 8'),
      'Note pendek harus ConflictException',
    );

    // ── 10. Guard: RETURN_FROM_ROOM lebih dari stok kamar → Conflict ───
    console.log('  Step 10: Guard — RETURN qty > room qty');
    await assert.rejects(
      () => svc.create({ itemId, movementType: 'RETURN_FROM_ROOM', qty: '99', roomId, note: 'Kembalikan 99 pcs (stok kamar cuma 1)' }, admin),
      (e) => e instanceof ConflictException && e.message.includes('tidak cukup'),
      'RETURN melebihi room stock harus ConflictException',
    );

    console.log('  ✅ Semua step lulus');
  } catch (err) {
    console.error('  ❌ Test gagal:', err.message);
    throw err;
  }
});
