/*
 * GO-LIVE SETUP — satu perintah: dari DB kosong → siap pakai.
 * Jalankan dari backend/ (otomatis lewat `npm run golive:setup` yang build dulu):
 *   OWNER_EMAIL=owner@kost48surabaya.com OWNER_PASSWORD='RahasiaKuat#2026' npm run golive:setup
 *
 * Yang dilakukan (idempoten, aman diulang):
 *  1) Schema      : prisma db push ke DB PRODUKSI kost48_v3 (derive dari .env)
 *  2) Bootstrap   : sql/bootstrap.sql + bootstrap_v4_addendum.sql (trigger/CHECK/carve-out)
 *  3) OWNER       : user OWNER pertama (env OWNER_EMAIL/PASSWORD/FULLNAME, bcrypt)
 *  4) COA         : 38 akun default (upsert)
 *  5) Periode     : AccountingPeriod bulan berjalan = OPEN
 *  6) Kas/Bank    : 2 CashAccount default (Kas Tunai → 1000, Bank Utama → 1010, isDefault)
 * Setelah ini cukup `npm run golive` (backend) + `cd frontend && npm run golive`.
 *
 * Saldo awal (opening balance) tetap diisi owner via UI bila ada (default 0).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');

// ── Target DB PRODUKSI (kost48_v3). Override eksplisit via GOLIVE_DB_URL. ──
function prodDbUrl() {
  if (process.env.GOLIVE_DB_URL) return process.env.GOLIVE_DB_URL;
  let url = process.env.DATABASE_URL || '';
  url = url.replace('kost48_v3_pro', 'kost48_v3');
  if (!/\/kost48_v3(\?|$)/.test(url)) url = url.replace(/\/[a-zA-Z0-9_]+(\?|$)/, '/kost48_v3$1');
  return url;
}
const DB_URL = prodDbUrl();
const mask = (u) => u.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');

const email = (process.env.OWNER_EMAIL || '').trim();
const password = process.env.OWNER_PASSWORD || '';
const fullName = (process.env.OWNER_FULLNAME || 'Pemilik KOST48').trim();

function step(n, msg) { console.log(`\n[${n}] ${msg}`); }
function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

if (!DB_URL) fail('DATABASE_URL tidak ada di .env (atau set GOLIVE_DB_URL).');
if (!/\/kost48_v3(\?|$)/.test(DB_URL) && !process.env.GOLIVE_DB_URL) fail('DB target bukan kost48_v3. Cek DATABASE_URL di .env.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('OWNER_EMAIL wajib & valid.');
if (!password || password.length < 8) fail('OWNER_PASSWORD wajib, min 8 karakter.');

async function runSqlFile(rel) {
  const file = path.join(__dirname, '..', rel);
  if (!fs.existsSync(file)) fail(`File SQL tak ditemukan: ${rel}`);
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
}

(async () => {
  console.log('=== GO-LIVE SETUP KOST48 ===');
  console.log('DB target :', mask(DB_URL));
  console.log('OWNER     :', email);

  // 1) Schema
  step(1, 'Schema (prisma db push)…');
  execSync('npx prisma db push', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: DB_URL } });

  // 2) Bootstrap SQL
  step(2, 'Bootstrap SQL (trigger/CHECK/carve-out)…');
  await runSqlFile('sql/bootstrap.sql');
  await runSqlFile('sql/bootstrap_v4_addendum.sql');
  console.log('   bootstrap.sql + addendum OK');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DB_URL }) });
  try {
    // 3) OWNER
    step(3, 'Seed OWNER…');
    const existingOwner = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (existingOwner) {
      console.log(`   OWNER ${email} sudah ada (id #${existingOwner.id}) — dilewati.`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const u = await prisma.user.create({ data: { fullName, email, passwordHash, role: 'OWNER', isActive: true }, select: { id: true } });
      console.log(`   OWNER dibuat (id #${u.id}).`);
    }

    // 4) COA
    step(4, 'Seed COA (38 akun)…');
    const { DEFAULT_COA } = require('../dist/modules/accounting/constants/default-coa.js');
    for (const a of DEFAULT_COA) {
      await prisma.chartOfAccount.upsert({
        where: { code: a.code },
        create: { code: a.code, name: a.name, type: a.type, normalBalance: a.normalBalance, description: a.description, isSystemDefault: true, isActive: true },
        update: { name: a.name, type: a.type, normalBalance: a.normalBalance, description: a.description, isSystemDefault: true, isActive: true },
      });
    }
    console.log(`   ${DEFAULT_COA.length} akun COA siap.`);

    // 5) Periode bulan berjalan = OPEN
    step(5, 'Periode akuntansi bulan berjalan = OPEN…');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    await prisma.accountingPeriod.upsert({
      where: { year_month: { year, month } },
      create: { year, month, startDate, endDate, status: 'OPEN' },
      update: {},
    });
    console.log(`   Periode ${year}-${String(month).padStart(2, '0')} OPEN.`);

    // 6) CashAccount default (idempoten by name)
    step(6, 'Kas & Bank default…');
    const coaByCode = async (code) => prisma.chartOfAccount.findUnique({ where: { code }, select: { id: true } });
    const cash = await coaByCode('1000');
    const bank = await coaByCode('1010');
    const ensureCash = async (name, coaId, type, isDefault) => {
      if (!coaId) return;
      const ex = await prisma.cashAccount.findUnique({ where: { name }, select: { id: true } });
      if (ex) return;
      await prisma.cashAccount.create({ data: { name, accountType: type, chartOfAccountId: coaId, openingBalanceRupiah: 0, currentBalanceRupiah: 0, isDefault } });
    };
    await ensureCash('Kas Tunai', cash?.id, 'CASH', false);
    await ensureCash('Bank Utama', bank?.id, 'BANK', true);
    console.log('   Kas Tunai (1000) + Bank Utama (1010, default) siap.');

    console.log('\n✅ SETUP SELESAI. DB produksi siap pakai.');
    console.log('   Berikutnya:');
    console.log('   • (opsional) seed FAQ panduan tenant: setelah golive jalan → POST /api/faqs/seed  (atau biarkan, bisa kapan saja)');
    console.log('   • set di .env: KTP_ACTIVATION_GATE_ENABLED=true');
    console.log('   • jalankan:  npm run golive        (backend, port 3000)');
    console.log('   •            cd ../frontend && npm run golive   (frontend, port 5173)');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Setup gagal:', e && e.message ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
