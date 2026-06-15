/*
 * Seed DUMMY DEV yang lengkap & konsisten untuk pengembangan.
 * ATOMIK: wipe seluruh tabel (RESTART IDENTITY CASCADE) lalu isi ulang dalam SATU run,
 * sehingga DB tidak pernah ditinggal kosong setengah jadi.
 *
 * HANYA untuk DB DEV/UAT (port 5433 kost48_v3_pro). JANGAN jalankan di produksi (5432).
 *
 * Jalankan dari backend/:  node scripts/seed-dev-dummy.js
 *
 * Akun hasil seed:
 *   OWNER  owner@kost48.com  / Owner#2026
 *   ADMIN  admin@kost48.com  / admin123
 *   STAFF  staff@kost48.com  / staff123
 *   TENANT <nama>.tenant@kost48.test / Tenant#2026  (semua tenant password sama)
 *
 * Catatan akuntansi: seed ini mengisi data OPERASIONAL (kamar, tenant, stay, invoice,
 * pembayaran, inventaris, aset). Fondasi akuntansi (Bagan Akun/COA, periode, kas,
 * saldo awal) disiapkan via UI: login owner → "Siapkan Bagan Akun (COA)".
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Guard: pastikan bukan DB produksi (5432). Seed dev hanya untuk 5433.
function assertDevDb() {
  const url = process.env.DATABASE_URL || '';
  if (url.includes(':5432') || /kost48_v3(\b|\?)/.test(url) && !url.includes('kost48_v3_pro')) {
    console.error('❌ DATABASE_URL tampak seperti PRODUKSI. Seed dev dibatalkan demi keamanan.');
    process.exit(1);
  }
}

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const dateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const now = new Date();
const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

async function wipeAll() {
  const rows = await prisma.$queryRawUnsafe(
    `select tablename from pg_tables where schemaname='public' and tablename <> '_prisma_migrations'`,
  );
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  console.log(`🧹 Wipe selesai (${rows.length} tabel).`);
}

const ROOM_TYPES = [
  { name: 'Budget Room', rent: 800_000, deposit: 500_000, ac: false },
  { name: 'Standard Room', rent: 1_050_000, deposit: 700_000, ac: false },
  { name: 'Deluxe Room', rent: 1_350_000, deposit: 900_000, ac: true },
  { name: 'Premium Room', rent: 1_650_000, deposit: 1_000_000, ac: true },
];

const TENANTS = [
  ['Maya Pratiwi', 'FEMALE'], ['Dimas Saputra', 'MALE'], ['Cindy Wijaya', 'FEMALE'],
  ['Hendra Gunawan', 'MALE'], ['Gita Lestari', 'FEMALE'], ['Indah Permata', 'FEMALE'],
  ['Bayu Nugroho', 'MALE'], ['Karin Salsabila', 'FEMALE'], ['Lani Kusuma', 'FEMALE'],
  ['Rizky Ramadhan', 'MALE'], ['Putri Anggraini', 'FEMALE'], ['Fajar Maulana', 'MALE'],
  ['Sari Melati', 'FEMALE'], ['Andi Wirawan', 'MALE'], ['Nadia Safitri', 'FEMALE'],
  ['Eko Prasetyo', 'MALE'],
];

const INVENTORY = [
  { name: 'Kasur Spring Bed', category: 'Furnitur', unit: 'pcs', qty: 30, min: 5 },
  { name: 'Lemari Pakaian', category: 'Furnitur', unit: 'pcs', qty: 28, min: 4 },
  { name: 'Meja Belajar', category: 'Furnitur', unit: 'pcs', qty: 25, min: 4 },
  { name: 'Kursi', category: 'Furnitur', unit: 'pcs', qty: 26, min: 4 },
  { name: 'AC Split 1/2 PK', category: 'Elektronik', unit: 'unit', qty: 10, min: 2 },
  { name: 'Kipas Angin', category: 'Elektronik', unit: 'unit', qty: 15, min: 3 },
  { name: 'Dispenser Galon', category: 'Elektronik', unit: 'unit', qty: 6, min: 1 },
  { name: 'Sprei & Bantal', category: 'Perlengkapan', unit: 'set', qty: 40, min: 8 },
  { name: 'Gorden Jendela', category: 'Perlengkapan', unit: 'pcs', qty: 24, min: 4 },
  { name: 'Lampu LED', category: 'Perlengkapan', unit: 'pcs', qty: 50, min: 10 },
];

async function main() {
  assertDevDb();
  await wipeAll();

  // 1) Users back-office
  const hashOwner = await bcrypt.hash('Owner#2026', 10);
  const hashAdmin = await bcrypt.hash('admin123', 10);
  const hashStaff = await bcrypt.hash('staff123', 10);
  const owner = await prisma.user.create({ data: { fullName: 'Pemilik KOST48', email: 'owner@kost48.com', passwordHash: hashOwner, role: 'OWNER' } });
  const admin = await prisma.user.create({ data: { fullName: 'Admin KOST48', email: 'admin@kost48.com', passwordHash: hashAdmin, role: 'ADMIN' } });
  const staff = await prisma.user.create({ data: { fullName: 'Staf Operasional', email: 'staff@kost48.com', passwordHash: hashStaff, role: 'STAFF' } });

  // 2) Inventory master
  const items = [];
  for (const it of INVENTORY) {
    items.push(await prisma.inventoryItem.create({
      data: { name: it.name, category: it.category, unit: it.unit, qtyOnHand: it.qty, minQty: it.min, status: 'GOOD' },
    }));
  }
  const itemByName = Object.fromEntries(items.map((i) => [i.name, i]));

  // 3) Rooms (21) + fasilitas + room items
  const rooms = [];
  for (let i = 0; i < 21; i++) {
    const code = String.fromCharCode(65 + i); // A..U
    const type = ROOM_TYPES[i % ROOM_TYPES.length];
    const floor = i < 11 ? '1' : '2';
    const room = await prisma.room.create({
      data: {
        code, name: `${type.name}`, floor, status: 'AVAILABLE',
        dailyRateRupiah: Math.round(type.rent / 25), weeklyRateRupiah: Math.round(type.rent / 4),
        monthlyRateRupiah: type.rent, defaultDepositRupiah: type.deposit,
        electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 5000,
        hasAc: type.ac, acWattage: type.ac ? 400 : null,
        images: [], notes: `Kamar ${code} - ${type.name}`,
        facilities: {
          create: [
            { name: 'Kamar mandi dalam', category: 'Sanitasi', publicVisible: true },
            { name: type.ac ? 'AC' : 'Kipas angin', category: 'Pendingin', publicVisible: true },
            { name: 'WiFi', category: 'Konektivitas', publicVisible: true },
            { name: 'Kasur + lemari + meja', category: 'Perabot', publicVisible: true },
          ],
        },
      },
    });
    // room items
    const baseItems = ['Kasur Spring Bed', 'Lemari Pakaian', 'Meja Belajar', 'Kursi', type.ac ? 'AC Split 1/2 PK' : 'Kipas Angin'];
    for (const nm of baseItems) {
      await prisma.roomItem.create({ data: { roomId: room.id, itemId: itemByName[nm].id, qty: 1, status: 'GOOD' } });
    }
    rooms.push({ room, type });
  }

  // 4) Tenants + user + stay + invoice (16 kamar pertama terisi)
  const occupiedCount = 16;
  for (let i = 0; i < occupiedCount; i++) {
    const [name, gender] = TENANTS[i];
    const slug = name.split(' ')[0].toLowerCase();
    const { room, type } = rooms[i];
    const tenant = await prisma.tenant.create({
      data: {
        fullName: name, phone: `0812${String(10000000 + i * 137).slice(0, 8)}`,
        email: `${slug}.tenant@kost48.test`, gender, originCity: 'Surabaya',
        occupation: i % 3 === 0 ? 'Mahasiswa' : 'Karyawan', isActive: true,
      },
    });
    await prisma.user.create({
      data: {
        fullName: name, email: `${slug}.tenant@kost48.test`,
        passwordHash: await bcrypt.hash('Tenant#2026', 10), role: 'TENANT',
        tenantId: tenant.id, isActive: true,
      },
    });
    const checkIn = dateOnly(daysAgo(40 + i * 2));
    const plannedOut = dateOnly(daysAhead(20 - i)); // sebagian dekat habis
    await prisma.stay.create({
      data: {
        tenantId: tenant.id, roomId: room.id, status: 'ACTIVE', pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: type.rent, checkInDate: checkIn, plannedCheckOutDate: plannedOut,
        depositAmountRupiah: type.deposit, depositPaidAmountRupiah: type.deposit,
        depositPaymentStatus: 'PAID', depositStatus: 'HELD',
        electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 5000,
        initialMetersPromotedAt: new Date(), createdById: admin.id,
      },
    });
    await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });

    // Invoice bulan berjalan: mix PAID / ISSUED / PARTIAL
    const stayRow = await prisma.stay.findFirst({ where: { roomId: room.id, status: 'ACTIVE' } });
    const elec = 25 * 1500; // ~25 kWh
    const total = type.rent + elec;
    const mode = i % 5 === 0 ? 'PARTIAL' : i % 3 === 0 ? 'ISSUED' : 'PAID';
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${ym}-${String(i + 1).padStart(3, '0')}`,
        stayId: stayRow.id, status: mode, periodStart: dateOnly(new Date(now.getFullYear(), now.getMonth(), 1)),
        periodEnd: dateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        issuedAt: daysAgo(8), dueDate: dateOnly(daysAhead(2)),
        paidAt: mode === 'PAID' ? daysAgo(3) : null,
        totalAmountRupiah: total, createdById: admin.id,
        lines: {
          create: [
            { lineType: 'RENT', description: `Sewa ${type.name} (${room.code})`, qty: 1, unitPriceRupiah: type.rent, lineAmountRupiah: type.rent, sortOrder: 0 },
            { lineType: 'ELECTRICITY', utilityType: 'ELECTRICITY', description: 'Listrik ~25 kWh', qty: 25, unit: 'kWh', unitPriceRupiah: 1500, lineAmountRupiah: elec, sortOrder: 1 },
          ],
        },
      },
    });
    if (mode === 'PAID') {
      await prisma.invoicePayment.create({ data: { invoiceId: inv.id, paymentDate: daysAgo(3), amountRupiah: total, method: 'TRANSFER', capturedById: admin.id } });
    } else if (mode === 'PARTIAL') {
      await prisma.invoicePayment.create({ data: { invoiceId: inv.id, paymentDate: daysAgo(2), amountRupiah: Math.round(total / 2), method: 'CASH', capturedById: admin.id } });
    }
  }

  // 5) Fixed Assets — DITAUTKAN ke inventaris/room item (AC) untuk tunjukkan koneksi aset↔inventaris
  const acItem = itemByName['AC Split 1/2 PK'];
  const acRoomItems = await prisma.roomItem.findMany({ where: { itemId: acItem.id }, take: 4, include: { room: true } });
  let n = 1;
  for (const ri of acRoomItems) {
    await prisma.fixedAsset.create({
      data: {
        assetCode: `AST-AC-${String(n).padStart(3, '0')}`, name: `AC Split ${ri.room.code}`,
        category: 'ELECTRONIC', status: 'ACTIVE', locationType: 'ROOM',
        acquisitionDate: dateOnly(daysAgo(300)), depreciationStartDate: dateOnly(daysAgo(300)),
        acquisitionCostRupiah: 3_500_000, salvageValueRupiah: 350_000, usefulLifeMonths: 60,
        depreciationEnabled: true, roomId: ri.roomId, inventoryItemId: acItem.id, roomItemId: ri.id,
        createdById: owner.id, notes: 'Aset tertaut ke barang inventaris (AC).',
      },
    });
    n++;
  }

  // Ringkasan
  const counts = {
    users: await prisma.user.count(), rooms: await prisma.room.count(),
    tenants: await prisma.tenant.count(), stays: await prisma.stay.count(),
    invoices: await prisma.invoice.count(), payments: await prisma.invoicePayment.count(),
    inventory: await prisma.inventoryItem.count(), roomItems: await prisma.roomItem.count(),
    assets: await prisma.fixedAsset.count(),
  };
  console.log('✅ Seed dev selesai:', JSON.stringify(counts, null, 2));
  console.log('   Login owner@kost48.com / Owner#2026 → Pengaturan → "Siapkan Bagan Akun (COA)" untuk fondasi akuntansi.');
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (e) => { console.error('❌ Seed gagal:', e && e.message ? e.message : e); await prisma.$disconnect(); process.exit(1); });
