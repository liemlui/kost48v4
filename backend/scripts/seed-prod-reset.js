/*
 * SI-PROD — RESET + FONDASI (PRODUKSI).
 * Hanya menyiapkan KONFIGURASI: schema bersih + user (owner/admin) + COA + periode + kas.
 * DATA BISNIS (tenant/stay/invoice/pembayaran) TIDAK dibuat di sini —
 * itu lewat `seed-prod-real.js`.
 *
 * Pakai (dari backend/, server SEBAIKNYA dimatikan dulu):
 *   node scripts/seed-prod-reset.js
 * Lalu: node scripts/seed-prod-real.js
 *
 * ⚠️ HANYA untuk database KOSONG / fresh deploy. Jangan dijalankan ulang di DB berisi data.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
// Prisma client: production pakai dist/generated, dev pakai src/generated
let PrismaPg, PrismaClient;
try {
  ({ PrismaPg } = require('@prisma/adapter-pg'));
  ({ PrismaClient } = require('../dist/generated/prisma'));
} catch {
  ({ PrismaPg } = require('@prisma/adapter-pg'));
  ({ PrismaClient } = require('../src/generated/prisma'));
}

const DB_URL = process.env.DATABASE_URL || '';
const mask = (u) => u.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
function step(n, m) { console.log(`\n[${n}] ${m}`); }
function fail(m) { console.error('❌ ' + m); process.exit(1); }

function requireSeedEmail(name) {
  const value = String(process.env[name] || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    fail(`${name} wajib diisi dengan email yang valid sebelum seed produksi dijalankan.`);
  }
  return value;
}

function requireSeedPassword(name) {
  const value = String(process.env[name] || '');
  if (value.length < 12) {
    fail(`${name} wajib diisi dan minimal 12 karakter. Jangan gunakan password contoh/default.`);
  }
  return value;
}

// Kredensial produksi sengaja tidak boleh tertanam di source/deploy bundle.
// Isi sementara lewat environment hanya saat database FRESH di-seed.
const USERS = [
  {
    fullName: String(process.env.SEED_OWNER_FULLNAME || 'Pemilik KOST48').trim(),
    email: requireSeedEmail('SEED_OWNER_EMAIL'),
    password: requireSeedPassword('SEED_OWNER_PASSWORD'),
    role: 'OWNER',
  },
  {
    fullName: String(process.env.SEED_ADMIN_FULLNAME || 'Admin KOST48').trim(),
    email: requireSeedEmail('SEED_ADMIN_EMAIL'),
    password: requireSeedPassword('SEED_ADMIN_PASSWORD'),
    role: 'ADMIN',
  },
];

(async () => {
  console.log('=== SI-PROD RESET + FONDASI ===');
  console.log('DB :', mask(DB_URL));

  step(1, 'Hapus SEMUA data (TRUNCATE … CASCADE) — schema + trigger/CHECK dipertahankan…');
  {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    try {
      const { rows } = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`,
      );
      if (rows.length) {
        const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
        await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
      }
      console.log(`   ${rows.length} tabel dikosongkan (data wiped, DDL/bootstrap utuh).`);
    } finally { await client.end(); }
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DB_URL }) });
  try {
    step(2, 'User (owner + admin)…');
    for (const u of USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({ data: { fullName: u.fullName, email: u.email, passwordHash, role: u.role, isActive: true } });
      console.log(`   ${u.role}: ${u.email}`);
    }

    step(3, 'COA (akun default)…');
    let DEFAULT_COA;
    try {
      DEFAULT_COA = require('../dist/modules/accounting/constants/default-coa.js').DEFAULT_COA;
    } catch {
      console.error('\n❌ Gagal load DEFAULT_COA dari dist/. Jalankan "npm run build" dulu di backend/.');
      console.error('   Atau: cd backend && npx tsc');
      process.exit(1);
    }
    for (const a of DEFAULT_COA) {
      await prisma.chartOfAccount.upsert({
        where: { code: a.code },
        create: { code: a.code, name: a.name, type: a.type, normalBalance: a.normalBalance, description: a.description, isSystemDefault: true, isActive: true },
        update: {},
      });
    }
    console.log(`   ${DEFAULT_COA.length} akun.`);

    const Y = new Date().getFullYear();
    step(4, `Periode akuntansi ${Y} (12 bulan) = OPEN…`);
    for (let m = 1; m <= 12; m++) {
      await prisma.accountingPeriod.upsert({
        where: { year_month: { year: Y, month: m } },
        create: { year: Y, month: m, startDate: new Date(Date.UTC(Y, m - 1, 1)), endDate: new Date(Date.UTC(Y, m, 0)), status: 'OPEN' },
        update: { status: 'OPEN' },
      });
    }
    console.log('   12 periode OPEN.');

    step(5, 'Kas & Bank default…');
    const coaId = async (code) => (await prisma.chartOfAccount.findUnique({ where: { code }, select: { id: true } }))?.id;
    const cash = await coaId('1000');
    const bank = await coaId('1010');
    const ensureCash = async (name, id, type, isDefault) => {
      if (!id) return;
      await prisma.cashAccount.create({ data: { name, accountType: type, chartOfAccountId: id, openingBalanceRupiah: 0, currentBalanceRupiah: 0, isDefault } });
    };
    await ensureCash('Kas Tunai', cash, 'CASH', false);
    await ensureCash('Bank Utama', bank, 'BANK', true);
    console.log('   Kas Tunai (1000) + Bank Utama (1010, default).');

    console.log('\n✅ FONDASI SIAP. Berikutnya:');
    console.log('   node scripts/seed-prod-real.js   (isi data bisnis: tenant, stay, invoice, payment).');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Reset/fondasi gagal:', e?.message ?? e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
