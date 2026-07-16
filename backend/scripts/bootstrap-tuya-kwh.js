/*
 * Idempotently register the 13 active KWH meter installations from M14 and,
 * optionally, pull their first read-only telemetry snapshot.
 *
 * Usage (backend/):
 *   npm run build
 *   node scripts/bootstrap-tuya-kwh.js
 *   node scripts/bootstrap-tuya-kwh.js --sync
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma');

const DEVICES = [
  ['A', 'KWH Kmr A', 'ebb45dcb6878c96529vjfe'],
  ['B', 'KWH Kmr B', 'eb978d316fb9be79a1ed9k'],
  ['C', 'KWH Kmr C', 'ebd46b4d391f079e2b4akm'],
  ['D', 'KWH Kmr D', 'ebcafb5450a35bdaeciyii'],
  ['G', 'KWH Kmr G', 'ebe076481e1e344ce95dkb'],
  ['H', 'KWH Kmr H', 'eb693507851acf697fnmhj'],
  ['I', 'KWH Kmr I', 'ebf39e59e1bb788173rzal'],
  ['J', 'KWH Kmr J', 'eb8bc29c48b31bc433achz'],
  ['K', 'KWH Kmr K', 'eb62ad9276b9da9c93hf8c'],
  ['L', 'KWH Kmr L', 'eb2b7769c20fab47c2v8um'],
  ['M', 'KWH Kmr M', 'eb54cf1ee1dba020d6kfuy'],
  ['F1', 'KWH Kmr F1', 'ebd9f624a02848fc8c8ift'],
  ['F2', 'KWH Kmr F2', 'eb7087736aa53084b8uxmd'],
];

async function register() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const rooms = await prisma.room.findMany({ select: { id: true, code: true } });
    const roomByCode = new Map(rooms.map((room) => [room.code.toUpperCase(), room.id]));
    let created = 0;
    let updated = 0;
    for (const [roomCode, displayName, externalDeviceId] of DEVICES) {
      const deviceCode = `kwh-${roomCode.toLowerCase()}`;
      const existing = await prisma.iotDevice.findUnique({ where: { deviceCode }, select: { id: true } });
      await prisma.iotDevice.upsert({
        where: { deviceCode },
        create: {
          deviceCode,
          displayName,
          provider: 'TUYA',
          deviceType: 'ELECTRICITY_METER',
          externalDeviceId,
          roomId: roomByCode.get(roomCode) ?? null,
        },
        update: {
          displayName,
          externalDeviceId,
          roomId: roomByCode.get(roomCode) ?? null,
        },
      });
      if (existing) updated += 1; else created += 1;
    }
    console.log(JSON.stringify({ registered: DEVICES.length, created, updated, unmappedRooms: DEVICES.filter(([code]) => !roomByCode.has(code)).map(([code]) => code) }));
  } finally {
    await prisma.$disconnect();
  }
}

async function sync() {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module');
  const { IotService } = require('../dist/modules/iot/iot.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(IotService).syncAllTuya();
    console.log(JSON.stringify({ synced: result.succeeded, failed: result.failed, total: result.total }));
  } finally {
    await app.close();
  }
}

(async () => {
  await register();
  if (process.argv.includes('--sync')) await sync();
})().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
