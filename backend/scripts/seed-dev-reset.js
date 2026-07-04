/*
 * SI-1 — RESET + FONDASI (DEV SAJA). Fase 1 dari seeding "event-path".
 * Hanya menyiapkan KONFIGURASI (bukan data bisnis): schema bersih + bootstrap SQL +
 * user (owner/admin/staf) + COA + periode + kas. DATA BISNIS (tenant/stay/invoice/
 * pembayaran/perpanjangan) TIDAK dibuat di sini — itu lewat `seed-dev-via-api.js`
 * (HTTP, supaya aturan bisnis jalan; owner: "jangan by pass ke database").
 *
 * Pakai (dari backend/, server dev SEBAIKNYA dimatikan dulu):
 *   node scripts/seed-dev-reset.js
 * Lalu START backend, lalu: node scripts/seed-dev-via-api.js
 *
 * GUARD: menolak jalan bila DATABASE_URL bukan DEV (kost48_v3_pro). Prod (kost48_v3) AMAN.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');

const DB_URL = process.env.DATABASE_URL || '';
const mask = (u) => u.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
function step(n, m) { console.log(`\n[${n}] ${m}`); }
function fail(m) { console.error('❌ ' + m); process.exit(1); }

// ── GUARD DEV-ONLY ──
if (!/kost48_v3_pro/.test(DB_URL)) {
  fail(`Tolak: DATABASE_URL bukan DEV (kost48_v3_pro). Sekarang: ${mask(DB_URL)}. Script ini HANYA untuk DB pengembangan (5433).`);
}

const USERS = [
  { fullName: 'Pemilik KOST48', email: 'owner@kost48.com', password: 'Owner#2026', role: 'OWNER' },
  { fullName: 'Admin KOST48', email: 'admin@kost48.com', password: 'admin123', role: 'ADMIN' },
  { fullName: 'Staf KOST48', email: 'staff@kost48.com', password: 'staff123', role: 'STAFF' },
];

async function runSqlFile(rel) {
  const file = path.join(__dirname, '..', rel);
  if (!fs.existsSync(file)) { console.log(`   (lewati, tak ada: ${rel})`); return; }
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
}

(async () => {
  console.log('=== SI-1 RESET + FONDASI (DEV) ===');
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
    step(3, 'User (owner/admin/staf)…');
    for (const u of USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({ data: { fullName: u.fullName, email: u.email, passwordHash, role: u.role, isActive: true } });
      console.log(`   ${u.role}: ${u.email}`);
    }

    step(4, 'COA (akun default)…');
    // L13: graceful kalau dist/ belum build — beri pesan jelas.
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

    // L12: dinamis pakai tahun berjalan, bukan hardcode 2026.
    const Y = new Date().getFullYear();
    step(5, `Periode akuntansi ${Y} (12 bulan) = OPEN…`);
    for (let m = 1; m <= 12; m++) {
      await prisma.accountingPeriod.upsert({
        where: { year_month: { year: Y, month: m } },
        create: { year: Y, month: m, startDate: new Date(Date.UTC(Y, m - 1, 1)), endDate: new Date(Date.UTC(Y, m, 0)), status: 'OPEN' },
        update: { status: 'OPEN' },
      });
    }
    console.log('   12 periode OPEN (hindari error "periode tertutup" saat seeding lintas-bulan).');

    step(6, 'Kas & Bank default…');
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
    console.log('   1) START backend dev (npm run start:dev) — WAJIB restart karena schema baru di-reset.');
    console.log('   2) node scripts/seed-dev-via-api.js   (isi data bisnis via HTTP).');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Reset/fondasi gagal:', e?.message ?? e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
