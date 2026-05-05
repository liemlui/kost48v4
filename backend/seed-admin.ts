/// <reference types="node" />

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, UserRole, RoomStatus } from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

// Load .env from the backend directory (where this script lives),
// regardless of CWD when the script is invoked.
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

const OWNER_EMAIL = 'admin@kost48.com';
const OWNER_PASSWORD = 'admin123';

const TENANT_EMAIL = 'tenant.g2@kost48.com';
const TENANT_PASSWORD = 'tenant123';

async function main() {
  const ownerHash = await bcrypt.hash(OWNER_PASSWORD, 10);
  const tenantHash = await bcrypt.hash(TENANT_PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      passwordHash: ownerHash,
      fullName: 'Admin Utama',
      role: UserRole.OWNER,
      isActive: true,
      tenantId: null,
    },
    create: {
      fullName: 'Admin Utama',
      email: OWNER_EMAIL,
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const existingTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ email: TENANT_EMAIL }, { phone: '081234567890' }],
    },
  });

  const tenant = existingTenant
    ? await prisma.tenant.update({
        where: { id: existingTenant.id },
        data: {
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
          notes: 'Seed tenant untuk Fresh UAT G2.',
          isActive: true,
        },
      })
    : await prisma.tenant.create({
        data: {
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
          notes: 'Seed tenant untuk Fresh UAT G2.',
          isActive: true,
        },
      });

  const tenantUser = await prisma.user.upsert({
    where: { email: TENANT_EMAIL },
    update: {
      passwordHash: tenantHash,
      fullName: 'Tenant UAT G2',
      role: UserRole.TENANT,
      isActive: true,
      tenantId: tenant.id,
    },
    create: {
      fullName: 'Tenant UAT G2',
      email: TENANT_EMAIL,
      passwordHash: tenantHash,
      role: UserRole.TENANT,
      isActive: true,
      tenantId: tenant.id,
    },
  });

  const roomSeeds = [
    {
      code: 'G2-001',
      name: 'Kamar UAT G2 001',
      floor: '1',
      notes: 'Seed room 1 untuk Fresh UAT G2.',
    },
    {
      code: 'G2-002',
      name: 'Kamar UAT G2 002',
      floor: '1',
      notes: 'Seed room 2 untuk Fresh UAT G2.',
    },
    {
      code: 'G2-003',
      name: 'Kamar UAT G2 003',
      floor: '2',
      notes: 'Seed room 3 untuk Fresh UAT G2.',
    },
  ];

  const rooms = [];

  for (const roomSeed of roomSeeds) {
    const room = await prisma.room.upsert({
      where: { code: roomSeed.code },
      update: {
        name: roomSeed.name,
        floor: roomSeed.floor,
        status: RoomStatus.AVAILABLE,
        dailyRateRupiah: 225000,
        weeklyRateRupiah: 765000,
        biWeeklyRateRupiah: 1275000,
        monthlyRateRupiah: 1700000,
        defaultDepositRupiah: 1000000,
        electricityTariffPerKwhRupiah: 1445,
        waterTariffPerM3Rupiah: 5500,
        images: [],
        notes: roomSeed.notes,
        isActive: true,
      },
      create: {
        code: roomSeed.code,
        name: roomSeed.name,
        floor: roomSeed.floor,
        status: RoomStatus.AVAILABLE,
        dailyRateRupiah: 225000,
        weeklyRateRupiah: 765000,
        biWeeklyRateRupiah: 1275000,
        monthlyRateRupiah: 1700000,
        defaultDepositRupiah: 1000000,
        electricityTariffPerKwhRupiah: 1445,
        waterTariffPerM3Rupiah: 5500,
        images: [],
        notes: roomSeed.notes,
        isActive: true,
      },
    });

    rooms.push(room);
  }

  const counts = {
    users: await prisma.user.count(),
    tenants: await prisma.tenant.count(),
    rooms: await prisma.room.count(),
    stays: await prisma.stay.count(),
    meterReadings: await prisma.meterReading.count(),
    invoices: await prisma.invoice.count(),
    paymentSubmissions: await prisma.paymentSubmission.count(),
  };

  console.log('');
  console.log('✅ Seed dev/UAT siap.');
  console.log('');
  console.log('OWNER');
  console.log(`📧 Email    : ${OWNER_EMAIL}`);
  console.log(`🔑 Password : ${OWNER_PASSWORD}`);
  console.log(`🆔 User ID  : ${owner.id}`);
  console.log('');
  console.log('TENANT');
  console.log(`📧 Email     : ${TENANT_EMAIL}`);
  console.log(`🔑 Password  : ${TENANT_PASSWORD}`);
  console.log(`🆔 User ID   : ${tenantUser.id}`);
  console.log(`🆔 Tenant ID : ${tenant.id}`);
  console.log('');
  console.log('ROOMS');
  for (const room of rooms) {
    console.log(`🏠 ${room.code} | id=${room.id} | status=${room.status}`);
  }
  console.log('');
  console.log('COUNTS');
  console.dir(counts, { depth: null });
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