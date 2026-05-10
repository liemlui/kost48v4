/// <reference types="node" />

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, UserRole, RoomStatus } from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

// Load .env from backend folder, regardless of CWD.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is required. Check backend/.env.');
}

const databaseUrl = rawDatabaseUrl.trim().replace(/^["']|["']$/g, '');

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

const prismaAny = prisma as any;

const PASSWORD_ROUNDS = 10;

const OWNER_EMAIL = 'liem.lui@gmail.com';
const OWNER_PASSWORD = 'admin123';

const ADMIN_EMAIL = 'admin@kost48.com';
const ADMIN_PASSWORD = 'admin123';

const STAFF_EMAIL = 'staff@kost48.com';
const STAFF_PASSWORD = 'staff123';

const TENANT_EMAIL = 'tenant.g2@kost48.com';
const TENANT_PASSWORD = 'tenant123';

type TenantSeed = {
  fullName: string;
  phone: string;
  email: string;
  identityNumber: string;
  gender: 'MALE' | 'FEMALE';
  originCity: string;
  occupation: string;
  companyOrCampus: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

type RoomSeed = {
  code: string;
  name: string;
  floor: string;
  dailyRateRupiah: number;
  weeklyRateRupiah: number;
  biWeeklyRateRupiah: number;
  monthlyRateRupiah: number;
  defaultDepositRupiah: number;
  notes: string;
};

async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

async function upsertBackofficeUser(params: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(params.password);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      passwordHash,
      fullName: params.fullName,
      role: params.role,
      isActive: true,
      tenantId: null,
    },
    create: {
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      role: params.role,
      isActive: true,
      tenantId: null,
    },
  });
}

async function upsertTenant(seed: TenantSeed) {
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { email: seed.email },
        { phone: seed.phone },
        { identityNumber: seed.identityNumber },
      ],
    },
  });

  const data = {
    fullName: seed.fullName,
    phone: seed.phone,
    email: seed.email,
    identityNumber: seed.identityNumber,
    gender: seed.gender,
    originCity: seed.originCity,
    occupation: seed.occupation,
    companyOrCampus: seed.companyOrCampus,
    emergencyContactName: seed.emergencyContactName,
    emergencyContactPhone: seed.emergencyContactPhone,
    notes: seed.notes,
    isActive: true,
  };

  if (existingTenant) {
    return prisma.tenant.update({
      where: { id: existingTenant.id },
      data,
    });
  }

  return prisma.tenant.create({ data });
}

async function upsertTenantUser(params: {
  email: string;
  password: string;
  fullName: string;
  tenantId: number;
}) {
  const passwordHash = await hashPassword(params.password);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      passwordHash,
      fullName: params.fullName,
      role: UserRole.TENANT,
      isActive: true,
      tenantId: params.tenantId,
    },
    create: {
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      role: UserRole.TENANT,
      isActive: true,
      tenantId: params.tenantId,
    },
  });
}

async function upsertRoom(seed: RoomSeed) {
  const data = {
    name: seed.name,
    floor: seed.floor,
    status: RoomStatus.AVAILABLE,
    dailyRateRupiah: seed.dailyRateRupiah,
    weeklyRateRupiah: seed.weeklyRateRupiah,
    biWeeklyRateRupiah: seed.biWeeklyRateRupiah,
    monthlyRateRupiah: seed.monthlyRateRupiah,
    defaultDepositRupiah: seed.defaultDepositRupiah,
    electricityTariffPerKwhRupiah: 1445,
    waterTariffPerM3Rupiah: 5500,
    images: [],
    notes: seed.notes,
    isActive: true,
  };

  return prisma.room.upsert({
    where: { code: seed.code },
    update: data,
    create: {
      code: seed.code,
      ...data,
    },
  });
}

async function seedTickets(params: {
  adminUserId: number;
  staffUserId: number;
  tenants: Record<string, any>;
  rooms: Record<string, any>;
}) {
  if (!prismaAny.ticket) {
    console.warn('⚠️ Model Ticket tidak ditemukan di Prisma Client. Seed tickets dilewati.');
    return [];
  }

  const ticketSeeds = [
    {
      ticketNumber: 'TIC-UAT-0001',
      tenantId: params.tenants.g2.id,
      roomId: params.rooms['G2-001'].id,
      title: 'AC kurang dingin',
      description: 'Tenant melaporkan AC kamar kurang dingin dan perlu dicek teknisi.',
      category: 'MAINTENANCE',
      status: 'OPEN',
      assignedToId: params.staffUserId,
    },
    {
      ticketNumber: 'TIC-UAT-0002',
      tenantId: params.tenants.siti.id,
      roomId: params.rooms['G2-002'].id,
      title: 'Lampu kamar berkedip',
      description: 'Lampu utama kamar sering berkedip saat malam hari.',
      category: 'ELECTRICAL',
      status: 'IN_PROGRESS',
      assignedToId: params.staffUserId,
    },
    {
      ticketNumber: 'TIC-UAT-0003',
      tenantId: params.tenants.budi.id,
      roomId: params.rooms['G2-003'].id,
      title: 'Keran kamar mandi bocor',
      description: 'Keran kamar mandi bocor kecil dan perlu penggantian seal.',
      category: 'PLUMBING',
      status: 'DONE',
      assignedToId: params.adminUserId,
      resolutionNote: 'Sudah dicek dan seal keran diganti.',
      resolvedAt: new Date(),
    },
    {
      ticketNumber: 'TIC-UAT-0004',
      tenantId: params.tenants.rina.id,
      roomId: params.rooms['G2-004'].id,
      title: 'Permintaan kebersihan area koridor',
      description: 'Koridor lantai dua perlu dibersihkan setelah hujan.',
      category: 'CLEANING',
      status: 'CLOSED',
      assignedToId: params.staffUserId,
      resolutionNote: 'Area koridor sudah dibersihkan.',
      resolvedAt: new Date(),
      closedAt: new Date(),
    },
  ];

  const createdTickets = [];

  for (const ticketSeed of ticketSeeds) {
    await prismaAny.ticket.deleteMany({
      where: { ticketNumber: ticketSeed.ticketNumber },
    });

    const created = await prismaAny.ticket.create({
      data: {
        ticketNumber: ticketSeed.ticketNumber,
        tenantId: ticketSeed.tenantId,
        roomId: ticketSeed.roomId,
        stayId: null,
        title: ticketSeed.title,
        description: ticketSeed.description,
        category: ticketSeed.category,
        status: ticketSeed.status,
        assignedToId: ticketSeed.assignedToId,
        resolutionNote: ticketSeed.resolutionNote ?? null,
        resolvedAt: ticketSeed.resolvedAt ?? null,
        closedAt: ticketSeed.closedAt ?? null,
      },
    });

    createdTickets.push(created);
  }

  return createdTickets;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-admin.ts tidak boleh dijalankan di production');
  }

  const owner = await upsertBackofficeUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    fullName: 'Owner Liem Lui',
    role: UserRole.OWNER,
  });

  const admin = await upsertBackofficeUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    fullName: 'Admin KOST48',
    role: UserRole.ADMIN,
  });

  const staff = await upsertBackofficeUser({
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
    fullName: 'Staff Operasional KOST48',
    role: UserRole.STAFF,
  });

  const tenantSeeds: Record<string, TenantSeed> = {
    g2: {
      fullName: 'Tenant UAT G2',
      phone: '081234567890',
      email: TENANT_EMAIL,
      identityNumber: 'UAT-G2-001',
      gender: 'MALE',
      originCity: 'Surabaya',
      occupation: 'UAT Tester',
      companyOrCampus: 'KOST48 Test',
      emergencyContactName: 'Kontak Darurat UAT',
      emergencyContactPhone: '081298765432',
      notes: 'Seed tenant utama untuk portal tenant dan fresh UAT.',
    },
    siti: {
      fullName: 'Siti UAT Maintenance',
      phone: '081234567891',
      email: 'siti.uat@example.com',
      identityNumber: 'UAT-G2-002',
      gender: 'FEMALE',
      originCity: 'Sidoarjo',
      occupation: 'Mahasiswa',
      companyOrCampus: 'Universitas UAT',
      emergencyContactName: 'Ibu Siti UAT',
      emergencyContactPhone: '081298765433',
      notes: 'Dummy tenant untuk ticket maintenance dan search tenant.',
    },
    budi: {
      fullName: 'Budi UAT Ticket',
      phone: '081234567892',
      email: 'budi.uat@example.com',
      identityNumber: 'UAT-G2-003',
      gender: 'MALE',
      originCity: 'Gresik',
      occupation: 'Karyawan',
      companyOrCampus: 'PT UAT Testing',
      emergencyContactName: 'Bapak Budi UAT',
      emergencyContactPhone: '081298765434',
      notes: 'Dummy tenant untuk ticket done/closed dan tenant list.',
    },
    rina: {
      fullName: 'Rina UAT Search',
      phone: '081234567893',
      email: 'rina.uat@example.com',
      identityNumber: 'UAT-G2-004',
      gender: 'FEMALE',
      originCity: 'Malang',
      occupation: 'Freelancer',
      companyOrCampus: 'Mandiri',
      emergencyContactName: 'Kakak Rina UAT',
      emergencyContactPhone: '081298765435',
      notes: 'Dummy tenant untuk filter/search dan data variasi.',
    },
  };

  const tenants: Record<string, any> = {};

  for (const [key, seed] of Object.entries(tenantSeeds)) {
    tenants[key] = await upsertTenant(seed);
  }

  const tenantUser = await upsertTenantUser({
    email: TENANT_EMAIL,
    password: TENANT_PASSWORD,
    fullName: 'Tenant UAT G2',
    tenantId: tenants.g2.id,
  });

  const roomSeeds: RoomSeed[] = [
    {
      code: 'G2-001',
      name: 'Kamar G2-001 Standard',
      floor: '2',
      dailyRateRupiah: 225000,
      weeklyRateRupiah: 765000,
      biWeeklyRateRupiah: 1275000,
      monthlyRateRupiah: 1700000,
      defaultDepositRupiah: 1000000,
      notes: 'Seed room standard untuk booking UAT.',
    },
    {
      code: 'G2-002',
      name: 'Kamar G2-002 Standard Plus',
      floor: '2',
      dailyRateRupiah: 240000,
      weeklyRateRupiah: 810000,
      biWeeklyRateRupiah: 1350000,
      monthlyRateRupiah: 1800000,
      defaultDepositRupiah: 1000000,
      notes: 'Seed room standard plus untuk admin approval/payment UAT.',
    },
    {
      code: 'G2-003',
      name: 'Kamar G2-003 Deluxe',
      floor: '2',
      dailyRateRupiah: 260000,
      weeklyRateRupiah: 900000,
      biWeeklyRateRupiah: 1500000,
      monthlyRateRupiah: 2000000,
      defaultDepositRupiah: 1200000,
      notes: 'Seed room deluxe untuk full checkout UAT.',
    },
    {
      code: 'G2-004',
      name: 'Kamar G2-004 Compact',
      floor: '2',
      dailyRateRupiah: 210000,
      weeklyRateRupiah: 700000,
      biWeeklyRateRupiah: 1175000,
      monthlyRateRupiah: 1550000,
      defaultDepositRupiah: 900000,
      notes: 'Seed room compact untuk public catalog/filter UAT.',
    },
    {
      code: 'G2-005',
      name: 'Kamar G2-005 Corner',
      floor: '2',
      dailyRateRupiah: 250000,
      weeklyRateRupiah: 855000,
      biWeeklyRateRupiah: 1425000,
      monthlyRateRupiah: 1900000,
      defaultDepositRupiah: 1100000,
      notes: 'Seed room corner untuk booking alternatif.',
    },
    {
      code: 'G3-001',
      name: 'Kamar G3-001 Standard',
      floor: '3',
      dailyRateRupiah: 225000,
      weeklyRateRupiah: 765000,
      biWeeklyRateRupiah: 1275000,
      monthlyRateRupiah: 1700000,
      defaultDepositRupiah: 1000000,
      notes: 'Seed room lantai 3 untuk filter lantai.',
    },
    {
      code: 'G3-002',
      name: 'Kamar G3-002 Deluxe',
      floor: '3',
      dailyRateRupiah: 275000,
      weeklyRateRupiah: 945000,
      biWeeklyRateRupiah: 1575000,
      monthlyRateRupiah: 2100000,
      defaultDepositRupiah: 1200000,
      notes: 'Seed room lantai 3 deluxe untuk variasi harga.',
    },
    {
      code: 'G3-003',
      name: 'Kamar G3-003 Premium',
      floor: '3',
      dailyRateRupiah: 300000,
      weeklyRateRupiah: 990000,
      biWeeklyRateRupiah: 1650000,
      monthlyRateRupiah: 2200000,
      defaultDepositRupiah: 1500000,
      notes: 'Seed room premium untuk catalog dan approval UAT.',
    },
  ];

  const rooms: Record<string, any> = {};

  for (const seed of roomSeeds) {
    rooms[seed.code] = await upsertRoom(seed);
  }

  let tickets: any[] = [];

  try {
    tickets = await seedTickets({
      adminUserId: admin.id,
      staffUserId: staff.id,
      tenants,
      rooms,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('');
    console.warn('⚠️ Seed tickets dilewati/gagal, seed utama tetap lanjut.');
    console.warn(`Reason: ${message}`);
    console.warn('Jika category/status enum berbeda di schema, sesuaikan category ticketSeeds.');
    console.warn('');
  }

  const counts: Record<string, any> = {
    users: await prisma.user.count(),
    tenants: await prisma.tenant.count(),
    rooms: await prisma.room.count(),
    stays: await prisma.stay.count(),
    meterReadings: await prisma.meterReading.count(),
    invoices: await prisma.invoice.count(),
    paymentSubmissions: await prisma.paymentSubmission.count(),
  };

  if (prismaAny.ticket) {
    counts.tickets = await prismaAny.ticket.count().catch(() => 'SKIPPED');
  }

  console.log('');
  console.log('✅ Seed dev/UAT siap.');
  console.log('');
  console.log('OWNER');
  console.log(`📧 Email    : ${OWNER_EMAIL}`);
  console.log(`🔑 Password : ${OWNER_PASSWORD}`);
  console.log(`🆔 User ID  : ${owner.id}`);
  console.log('');
  console.log('ADMIN');
  console.log(`📧 Email    : ${ADMIN_EMAIL}`);
  console.log(`🔑 Password : ${ADMIN_PASSWORD}`);
  console.log(`🆔 User ID  : ${admin.id}`);
  console.log('');
  console.log('STAFF');
  console.log(`📧 Email    : ${STAFF_EMAIL}`);
  console.log(`🔑 Password : ${STAFF_PASSWORD}`);
  console.log(`🆔 User ID  : ${staff.id}`);
  console.log('');
  console.log('TENANT PORTAL');
  console.log(`📧 Email     : ${TENANT_EMAIL}`);
  console.log(`🔑 Password  : ${TENANT_PASSWORD}`);
  console.log(`🆔 User ID   : ${tenantUser.id}`);
  console.log(`🆔 Tenant ID : ${tenants.g2.id}`);
  console.log('');
  console.log('TENANTS');
  for (const [key, tenant] of Object.entries(tenants)) {
    console.log(`👤 ${key} | ${tenant.fullName} | id=${tenant.id} | email=${tenant.email}`);
  }
  console.log('');
  console.log('ROOMS');
  for (const room of Object.values(rooms)) {
    console.log(`🏠 ${room.code} | id=${room.id} | status=${room.status} | monthly=${room.monthlyRateRupiah}`);
  }
  console.log('');
  console.log('TICKETS');
  if (tickets.length > 0) {
    for (const ticket of tickets) {
      console.log(`🎫 ${ticket.ticketNumber} | id=${ticket.id} | status=${ticket.status} | title=${ticket.title}`);
    }
  } else {
    console.log('No tickets seeded / skipped.');
  }
  console.log('');
  console.log('COUNTS');
  console.dir(counts, { depth: null });
  console.log('');
  console.log('NOTE');
  console.log('- Seed ini tidak membuat stay/invoice/payment submission agar full checkout UAT tetap bersih dari alur real booking.');
  console.log('- Untuk guest booking fresh, pakai email yang belum di-seed, misalnya guest.checkout.uat@example.com.');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });