/*
 * Seed user OWNER pertama (prasyarat go-live F1-12).
 * DB produksi fresh itu kosong → tanpa OWNER, seeding via API (COA/periode/opening balance)
 * tak bisa jalan karena butuh login OWNER/ADMIN. Jalankan SEKALI setelah schema + bootstrap.sql.
 *
 * Cara pakai (dari backend/, setelah `prisma generate`/`npm run build`):
 *   OWNER_EMAIL=liem.lui@gmail.com OWNER_PASSWORD='RahasiaKuat#2026' OWNER_FULLNAME='Pemilik KOST48' node scripts/seed-owner.js
 * Atau set di .env lalu: node scripts/seed-owner.js
 *
 * Idempoten: bila email OWNER sudah ada, tidak menimpa (skip). Aman dijalankan ulang.
 */
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
} catch { /* dotenv opsional — env bisa dari shell/cPanel */ }
const bcrypt = require('bcryptjs');
const { PrismaPg } = require('@prisma/adapter-pg');
// Paket deploy ramping tidak membawa src/ — pakai client hasil build (dist/) lebih dulu.
const { PrismaClient } = (() => {
  try { return require('../dist/generated/prisma'); }
  catch { return require('../src/generated/prisma'); }
})();

const email = (process.env.OWNER_EMAIL || '').trim();
const password = process.env.OWNER_PASSWORD || '';
const fullName = (process.env.OWNER_FULLNAME || 'Pemilik KOST48').trim();

function fail(msg) {
  console.error('❌ ' + msg);
  process.exit(1);
}

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('OWNER_EMAIL wajib & valid (mis. liem.lui@gmail.com).');
if (!password || password.length < 8) fail('OWNER_PASSWORD wajib, minimal 8 karakter (gunakan password kuat).');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

(async () => {
  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, role: true },
    });
    if (existing) {
      console.log(`ℹ️  User dengan email ${email} sudah ada (id #${existing.id}, role ${existing.role}). Tidak diubah.`);
      await prisma.$disconnect();
      return process.exit(0);
    }
    const anyOwner = await prisma.user.count({ where: { role: 'OWNER' } });
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { fullName, email, passwordHash, role: 'OWNER', isActive: true },
      select: { id: true, email: true, fullName: true, role: true },
    });
    console.log('✅ OWNER dibuat:', JSON.stringify(created));
    if (anyOwner > 0) console.log(`ℹ️  Catatan: sudah ada ${anyOwner} OWNER lain sebelumnya.`);
    console.log('   Lanjut: login OWNER → seed COA (POST /api/accounting/default-coa/seed) + periode OPEN + CashAccount + opening balance, lalu POST /api/faqs/seed.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed OWNER gagal:', e && e.message ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
