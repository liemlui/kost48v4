/*
 * Import aditif, idempoten, dan tanpa reset untuk pengeluaran/aset historis.
 *
 * Pratinjau:
 *   node backend/scripts/archive/import-real-historical-assets.js
 * Terapkan setelah backup database:
 *   node backend/scripts/archive/import-real-historical-assets.js --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { PrismaPg } = require('@prisma/adapter-pg');
let PrismaClient;
try {
  ({ PrismaClient } = require('../../dist/generated/prisma'));
} catch {
  ({ PrismaClient } = require('../../src/generated/prisma'));
}
const { getRoomFacilities, validateRealSeedAssets } = require('../real-seed-assets');

const SEED_PATH = path.join(__dirname, '..', 'seed-data.json');
const shouldApply = process.argv.includes('--apply');
const dbUrl = process.env.DATABASE_URL || '';

function toDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function importData(prisma, seed) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!admin) throw new Error('User ADMIN tidak ditemukan; impor dibatalkan tanpa perubahan.');

  return prisma.$transaction(async (tx) => {
    const roomRows = await tx.room.findMany({ select: { id: true, code: true } });
    const roomMap = new Map(roomRows.map((room) => [room.code, room.id]));
    const expenseIds = new Map();
    const result = { expensesCreated: 0, expensesSkipped: 0, assetsCreated: 0, assetsSkipped: 0, facilitiesCreated: 0, facilitiesSkipped: 0 };

    for (const expense of seed.historicalExpenses) {
      const tag = `[KOST48-HIST:${expense.sourceKey}]`;
      const existing = await tx.expense.findFirst({ where: { note: { contains: tag } }, select: { id: true } });
      if (existing) {
        expenseIds.set(expense.sourceKey, existing.id);
        result.expensesSkipped++;
        continue;
      }
      const created = await tx.expense.create({
        data: {
          expenseDate: toDate(expense.expenseDate),
          type: expense.type,
          status: expense.status,
          category: expense.category,
          description: expense.description,
          amountRupiah: expense.amountRupiah,
          vendorName: expense.vendorName,
          note: expense.note,
          createdById: admin.id,
        },
        select: { id: true },
      });
      expenseIds.set(expense.sourceKey, created.id);
      result.expensesCreated++;
    }

    for (const asset of seed.historicalFixedAssets) {
      const existingAsset = await tx.fixedAsset.findUnique({ where: { assetCode: asset.assetCode }, select: { id: true } });
      if (existingAsset) {
        result.assetsSkipped++;
        continue;
      }
      const inventoryItem = await tx.inventoryItem.upsert({
        where: { sku: asset.assetCode },
        update: {},
        create: {
          sku: asset.assetCode,
          name: asset.name,
          category: asset.category,
          unit: 'pcs',
          qtyOnHand: asset.quantity,
          minQty: 0,
          status: 'PENDING_CHECK',
          notes: asset.notes,
        },
        select: { id: true },
      });
      const roomId = asset.roomCode ? roomMap.get(asset.roomCode) : null;
      let roomItemId = null;
      if (roomId) {
        const existingRoomItem = await tx.roomItem.findFirst({ where: { roomId, itemId: inventoryItem.id }, select: { id: true } });
        roomItemId = existingRoomItem?.id ?? (await tx.roomItem.create({
          data: { roomId, itemId: inventoryItem.id, qty: asset.quantity, status: 'GOOD', note: 'Lokasi dari keterangan pembelian historis.' },
          select: { id: true },
        })).id;
      }
      await tx.fixedAsset.create({
        data: {
          assetCode: asset.assetCode,
          name: asset.name,
          category: asset.category,
          status: 'DRAFT',
          locationType: roomId ? 'ROOM' : 'GENERAL',
          capitalizationSource: 'DISCLOSURE_ONLY',
          acquisitionDate: toDate(asset.acquisitionDate),
          acquisitionCostRupiah: asset.acquisitionCostRupiah,
          usefulLifeMonths: asset.usefulLifeMonths,
          depreciationEnabled: false,
          inventoryItemId: inventoryItem.id,
          roomItemId,
          expenseId: expenseIds.get(asset.expenseSourceKey),
          createdById: admin.id,
          ledgerAlignmentStatus: 'DISCLOSURE_ONLY',
          notes: asset.notes,
        },
      });
      result.assetsCreated++;
    }

    for (const asset of seed.propertyDisclosure.disclosureFixedAssets) {
      const existing = await tx.fixedAsset.findUnique({ where: { assetCode: asset.assetCode }, select: { id: true } });
      if (existing) {
        result.assetsSkipped++;
        continue;
      }
      await tx.fixedAsset.create({
        data: {
          assetCode: asset.assetCode,
          name: asset.name,
          category: asset.category,
          status: 'ACTIVE',
          locationType: 'GENERAL',
          capitalizationSource: 'DISCLOSURE_ONLY',
          acquisitionDate: toDate(asset.acquisitionDate),
          acquisitionCostRupiah: asset.acquisitionCostRupiah,
          usefulLifeMonths: asset.usefulLifeMonths,
          depreciationEnabled: false,
          createdById: admin.id,
          ledgerAlignmentStatus: 'DISCLOSURE_ONLY',
          notes: asset.notes,
        },
      });
      result.assetsCreated++;
    }

    for (const [roomCode, roomConfig] of Object.entries(seed.rooms)) {
      const roomId = roomMap.get(roomCode);
      if (!roomId) continue;
      for (const facility of getRoomFacilities(roomConfig, roomCode)) {
        const existing = await tx.roomFacility.findFirst({ where: { roomId, name: facility.name }, select: { id: true } });
        if (existing) {
          result.facilitiesSkipped++;
          continue;
        }
        await tx.roomFacility.create({ data: { roomId, ...facility, publicVisible: true } });
        result.facilitiesCreated++;
      }
    }
    return result;
  }, { timeout: 30000 });
}

async function main() {
  if (!fs.existsSync(SEED_PATH)) throw new Error('seed-data.json tidak ditemukan.');
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const validation = validateRealSeedAssets(seed);
  const plannedFacilities = Object.entries(seed.rooms).reduce((total, [roomCode, room]) => total + getRoomFacilities(room, roomCode).length, 0);
  console.log(`Data siap: ${validation.expenses} pengeluaran Rp${validation.expenseTotalRupiah.toLocaleString('id-ID')}, ${validation.assets} aset historis, 2 referensi properti, ${plannedFacilities} fasilitas kamar.`);
  if (!shouldApply) {
    console.log('DRY RUN — tidak ada perubahan database. Jalankan kembali dengan --apply setelah backup database.');
    return;
  }
  if (!dbUrl) throw new Error('DATABASE_URL kosong; tidak dapat menerapkan impor.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });
  try {
    const result = await importData(prisma, seed);
    console.log('Impor selesai:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Impor gagal:', error.message);
  process.exitCode = 1;
});
