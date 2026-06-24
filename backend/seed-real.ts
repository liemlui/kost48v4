/// <reference types="node" />
/**
 * Seed data REAL KOST48 Surabaya.
 * Mengganti dummy data G2-xxx dengan 13 kamar nyata (A, B, C, D, F1, F2, G, H, I, J, K, L, M).
 *
 * Harga formula baru:
 *   Base 800k | +500k KM dalam | +300k AC | +150k Mezzanine | +200k Uk Besar
 *
 * Status: A + F1 = AVAILABLE, sisanya OCCUPIED.
 * Run: npx ts-node -r tsconfig-paths/register seed-real.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import {
  PrismaClient,
  UserRole,
  RoomStatus,
  RoomCategory,
  RoomType,
  RoomSize,
  StayStatus,
  PricingTerm,
  LeadSource,
} from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL required. Check backend/.env.');
const databaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const OWNER_EMAIL    = 'liem.lui@gmail.com';
const OWNER_PASSWORD = 'admin123';
const ADMIN_EMAIL    = 'admin@kost48.com';
const ADMIN_PASSWORD = 'admin123';
const STAFF_EMAIL    = 'staff@kost48.com';
const STAFF_PASSWORD = 'staff123';

// Deposit = 1 bulan sewa (konvensi kost48)
const ELEC_TARIFF = 2500;  // Rp/kWh (tarif kost48, bukan PLN dasar)
const WATER_TARIFF = 5500; // Rp/m3

function monthly(n: number) { return n; }

interface RoomDef {
  code: string;
  name: string;
  category: RoomCategory;
  roomType: RoomType;
  roomSize: RoomSize;
  monthlyRateRupiah: number;
  notes: string;
  status: RoomStatus;
}

const ROOMS: RoomDef[] = [
  {
    code: 'A',
    name: 'Kamar A',
    category: RoomCategory.DELUXE,
    roomType: RoomType.MEZZANINE,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_750_000),
    notes: '2m×3.5m + Mezzanine 2m×2m. KM dalam 1.2×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.AVAILABLE,
  },
  {
    code: 'B',
    name: 'Kamar B',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_600_000),
    notes: '2.5m×3.5m. KM dalam 1.2×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'C',
    name: 'Kamar C',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_600_000),
    notes: '2.5m×3.5m. KM dalam 1.5×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'D',
    name: 'Kamar D',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_600_000),
    notes: '2m×3.5m. KM dalam 1.5×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'F1',
    name: 'Kamar F1',
    category: RoomCategory.DELUXE,
    roomType: RoomType.MEZZANINE,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_750_000),
    notes: '2.5m×3m + Mezzanine 1.5m×3m. KM dalam 1.5×1.2m (shower+jet shower+WC sikat). AC. Kasur 90×200 / double bed, lemari baju.',
    status: RoomStatus.AVAILABLE,
  },
  {
    code: 'F2',
    name: 'Kamar F2',
    category: RoomCategory.DELUXE,
    roomType: RoomType.MEZZANINE,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_750_000),
    notes: '2.5m×3m + Mezzanine 1.5m×3m. KM dalam 1.5×1.2m (shower+jet shower+WC sikat). AC. Kasur 90×200 / double bed, lemari baju, perabot lengkap.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'G',
    name: 'Kamar G',
    category: RoomCategory.ECONOMY,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(800_000),
    notes: '2m×3.5m. KM luar. Kipas angin. Busa tebal 180×200, lemari baju, gantungan baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'H',
    name: 'Kamar H',
    category: RoomCategory.ECONOMY,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(800_000),
    notes: '2m×3.5m. KM luar. Kipas angin. Busa tebal 180×200, lemari baju, gantungan baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'I',
    name: 'Kamar I',
    category: RoomCategory.ECONOMY,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(800_000),
    notes: '2m×3.5m. KM luar. Kipas angin. Busa tebal 180×200, lemari baju, gantungan baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'J',
    name: 'Kamar J',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.STANDARD,
    monthlyRateRupiah: monthly(1_600_000),
    notes: '2m×3.5m. KM dalam 1.2×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'K',
    name: 'Kamar K',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.LARGE,
    monthlyRateRupiah: monthly(1_800_000),
    notes: '3m×3.5m (besar). KM dalam 1.2×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'L',
    name: 'Kamar L',
    category: RoomCategory.DELUXE,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.LARGE,
    monthlyRateRupiah: monthly(1_800_000),
    notes: '3m×3.5m (besar). KM dalam 1.2×1.5m (shower+jet shower+WC sikat). AC. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
  {
    code: 'M',
    name: 'Kamar M',
    category: RoomCategory.STANDARD,
    roomType: RoomType.REGULAR,
    roomSize: RoomSize.LARGE,
    monthlyRateRupiah: monthly(1_500_000),
    notes: '3m×3.5m (besar). KM dalam 1.2×1.5m (shower+jet shower+WC sikat). Kipas angin. Busa tebal 180×200, lemari baju.',
    status: RoomStatus.OCCUPIED,
  },
];

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function upsertStaff(email: string, password: string, name: string, role: UserRole) {
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash: await hash(password), fullName: name, role, isActive: true, tenantId: null },
    create: { email, passwordHash: await hash(password), fullName: name, role, isActive: true, tenantId: null },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-real.ts DILARANG dijalankan di production!');
  }

  console.log('🌱 Memulai seed data real KOST48 Surabaya...');

  // ── 1. Wipe old dummy data ─────────────────────────────────────────────
  // TRUNCATE CASCADE lebih aman — handle semua FK chain sekaligus.
  console.log('🗑️  Menghapus data dummy lama...');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "User", "Tenant", "Room" CASCADE`
  );
  console.log('   ✓ Data lama dihapus.');

  // ── 2. Buat owner / admin / staff ──────────────────────────────────────
  console.log('👤 Membuat user backoffice...');
  const owner = await upsertStaff(OWNER_EMAIL, OWNER_PASSWORD, 'Liem Lui (Owner)', UserRole.OWNER);
  const admin = await upsertStaff(ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin KOST48', UserRole.ADMIN);
  const staff = await upsertStaff(STAFF_EMAIL, STAFF_PASSWORD, 'Staff Operasional', UserRole.STAFF);
  console.log(`   ✓ OWNER  : ${OWNER_EMAIL}  pw=${OWNER_PASSWORD}`);
  console.log(`   ✓ ADMIN  : ${ADMIN_EMAIL}  pw=${ADMIN_PASSWORD}`);
  console.log(`   ✓ STAFF  : ${STAFF_EMAIL}  pw=${STAFF_PASSWORD}`);

  // ── 3. Buat 13 kamar real ─────────────────────────────────────────────
  console.log('🏠 Membuat 13 kamar real...');
  const createdRooms: Record<string, any> = {};

  for (const def of ROOMS) {
    const deposit = def.monthlyRateRupiah; // deposit = 1 bulan sewa
    const room = await prisma.room.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        floor: '1',
        status: def.status,
        category: def.category,
        roomType: def.roomType,
        roomSize: def.roomSize,
        monthlyRateRupiah: def.monthlyRateRupiah,
        dailyRateRupiah: null,
        weeklyRateRupiah: null,
        biWeeklyRateRupiah: null,
        defaultDepositRupiah: deposit,
        electricityTariffPerKwhRupiah: ELEC_TARIFF,
        waterTariffPerM3Rupiah: WATER_TARIFF,
        notes: def.notes,
        isActive: true,
        images: [],
      },
      create: {
        code: def.code,
        name: def.name,
        floor: '1',
        status: def.status,
        category: def.category,
        roomType: def.roomType,
        roomSize: def.roomSize,
        monthlyRateRupiah: def.monthlyRateRupiah,
        dailyRateRupiah: null,
        weeklyRateRupiah: null,
        biWeeklyRateRupiah: null,
        defaultDepositRupiah: deposit,
        electricityTariffPerKwhRupiah: ELEC_TARIFF,
        waterTariffPerM3Rupiah: WATER_TARIFF,
        notes: def.notes,
        isActive: true,
        images: [],
      },
    });
    createdRooms[def.code] = room;
    const icon = def.status === RoomStatus.AVAILABLE ? '🟢' : '🔴';
    console.log(`   ${icon} ${def.code.padEnd(3)} | ${def.category.padEnd(8)} | ${def.roomType.padEnd(9)} | ${def.roomSize.padEnd(8)} | Rp${(def.monthlyRateRupiah/1000).toFixed(0)}k/bln`);
  }

  // ── 4. Buat tenant dummy untuk kamar OCCUPIED ─────────────────────────
  console.log('👥 Membuat tenant + stay dummy untuk kamar terisi...');
  const occupiedRooms = ROOMS.filter((r) => r.status === RoomStatus.OCCUPIED);
  const checkIn = new Date('2026-01-01');
  const checkOut = new Date('2026-12-31');

  for (const def of occupiedRooms) {
    const room = createdRooms[def.code];
    const tenantEmail = `tenant.kamar${def.code.toLowerCase()}@kost48-dummy.com`;
    const tenantPhone = `0812000000${String(ROOMS.indexOf(def)).padStart(2,'0')}`;

    const tenant = await prisma.tenant.create({
      data: {
        fullName: `Penghuni Kamar ${def.code}`,
        phone: tenantPhone,
        email: tenantEmail,
        isActive: true,
      },
    });

    const tenantUser = await prisma.user.create({
      data: {
        email: tenantEmail,
        passwordHash: await hash('tenant123'),
        fullName: `Penghuni Kamar ${def.code}`,
        role: UserRole.TENANT,
        isActive: true,
        tenantId: tenant.id,
      },
    });

    // Buat stay ACTIVE + promoted (= kamar benar-benar terisi)
    await prisma.stay.create({
      data: {
        tenantId: tenant.id,
        roomId: room.id,
        status: StayStatus.ACTIVE,
        pricingTerm: PricingTerm.MONTHLY,
        agreedRentAmountRupiah: def.monthlyRateRupiah,
        checkInDate: checkIn,
        plannedCheckOutDate: checkOut,
        depositAmountRupiah: def.monthlyRateRupiah,
        depositPaidAmountRupiah: def.monthlyRateRupiah,
        depositPaymentStatus: 'PAID' as any,
        downPaymentAmountRupiah: Math.round(def.monthlyRateRupiah * 0.3),
        downPaymentPaidRupiah: Math.round(def.monthlyRateRupiah * 0.3),
        electricityTariffPerKwhRupiah: ELEC_TARIFF,
        waterTariffPerM3Rupiah: WATER_TARIFF,
        bookingSource: LeadSource.WEBSITE,
        initialMetersPromotedAt: checkIn, // menandai kamar sudah aktif dihuni
        createdById: owner.id,
      },
    });

    console.log(`   ✓ Kamar ${def.code} — tenant dummy dibuat`);
  }

  // ── 5. Google Reviews (ExternalReview) ───────────────────────────────
  console.log('⭐ Memasukkan ulasan Google KOST48...');
  await prisma.externalReview.deleteMany({ where: { source: 'google' } });

  const GOOGLE_REVIEWS = [
    { authorName: 'ranny uswatun khasanah', rating: 5, comment: 'Bersih, bapak/ibu kos yg ramah, sangat memperhatikan penghuni kos dan memastikan bahwa kos tetap bersih', reviewedAt: new Date('2025-10-28') },
    { authorName: 'Yuvita J', rating: 5, comment: 'Pernah tinggal di kos ini, kos yg paling enak dan nyaman selama kami di Surabaya, bisa bawa hewan anjing/kucing, pemilik nya ramah', reviewedAt: new Date('2025-07-15') },
    { authorName: 'syaiful pikolo', rating: 5, comment: 'Lumayan bagus dan murah', reviewedAt: new Date('2023-08-27') },
    { authorName: 'dini marlia', rating: 5, comment: 'Hampir satu tahun tinggal di kost ini karena pekerjaan, pemilik kos sangat cepat tanggap, kalau ada kendala apapun langsung ditanggapi dengan baik. Kos bersih dan nyaman.', reviewedAt: new Date('2023-06-28') },
    { authorName: 'lukman pelu', rating: 5, comment: 'Near biggest Mall in Indonesia. The owner very fast response to fix problem with the room.', reviewedAt: new Date('2023-06-19') },
    { authorName: 'Fery Kaharuddin', rating: 5, comment: 'Berkelas dan mewah penuh kelengkapan', reviewedAt: new Date('2022-07-29') },
    { authorName: 'lukman pelu', rating: 5, comment: 'Tempatnya bagus bersih halaman parkir luas. Bapak kos nya masih muda, millenial banget, canggih paham IT banget.', reviewedAt: new Date('2022-02-15') },
    { authorName: 'Angga Tukangimpi', rating: 5, comment: 'Pemiliknya Ramah, Harga cukup worth it', reviewedAt: new Date('2021-11-07') },
    { authorName: 'Mitha Wijaya', rating: 5, comment: 'Tempat nya bersih, nyaman. Pelayanan nya juga ramah. Ada keluhan sedikit langsung ditanggapi.', reviewedAt: new Date('2021-09-23') },
    { authorName: 'Ss', rating: 5, comment: 'Nice place to stay, near by mall, so many facility near this place, Nice people', reviewedAt: new Date('2021-09-23') },
    { authorName: 'Helli Antonio', rating: 5, comment: 'Nyaman bgt pelayanan ramah..', reviewedAt: new Date('2021-09-23') },
    { authorName: 'Sari Puspida', rating: 5, comment: 'Bersih, nyaman, aman', reviewedAt: new Date('2021-09-23') },
    { authorName: 'Andy Handoyo', rating: 5, comment: 'Feel like a home', reviewedAt: new Date('2021-09-23') },
    { authorName: 'ARSYAD ilyas', rating: 5, comment: 'Bagus, baik tempatnya', reviewedAt: new Date('2021-09-24') },
  ];

  for (const review of GOOGLE_REVIEWS) {
    await prisma.externalReview.create({
      data: { ...review, source: 'google', isVisible: true },
    });
  }
  console.log(`   ✓ ${GOOGLE_REVIEWS.length} ulasan Google berhasil dimasukkan`);

  // ── 7. OperationalSetting default ─────────────────────────────────────
  await prisma.operationalSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      freeElectricityKwhPerMonth: 30,
      electricityTariffPerKwhRupiah: ELEC_TARIFF,
      waterMeteringEnabled: false,
      waterTariffPerM3Rupiah: WATER_TARIFF,
      freeWaterM3PerMonth: 0,
    },
  });

  // ── 8. Ringkasan ──────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ SEED REAL SELESAI');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('LOGIN BACKOFFICE');
  console.log(`  OWNER  : ${OWNER_EMAIL}  /  ${OWNER_PASSWORD}`);
  console.log(`  ADMIN  : ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  console.log(`  STAFF  : ${STAFF_EMAIL}  /  ${STAFF_PASSWORD}`);
  console.log('');
  console.log('KAMAR TERSEDIA (AVAILABLE)');
  ROOMS.filter(r => r.status === RoomStatus.AVAILABLE).forEach(r => {
    console.log(`  ${r.code} — ${r.category} ${r.roomType} ${r.roomSize} — Rp${(r.monthlyRateRupiah/1000).toFixed(0)}k/bln`);
  });
  console.log('');
  console.log('KAMAR TERISI (OCCUPIED)');
  ROOMS.filter(r => r.status === RoomStatus.OCCUPIED).forEach(r => {
    console.log(`  ${r.code} — ${r.category} ${r.roomType} ${r.roomSize} — Rp${(r.monthlyRateRupiah/1000).toFixed(0)}k/bln`);
  });
  console.log('');
  console.log(`Total kamar  : ${ROOMS.length}`);
  console.log(`Tersedia     : ${ROOMS.filter(r => r.status === RoomStatus.AVAILABLE).length}`);
  console.log(`Terisi       : ${ROOMS.filter(r => r.status === RoomStatus.OCCUPIED).length}`);
}

main()
  .catch((err) => { console.error('❌ Seed gagal:', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
