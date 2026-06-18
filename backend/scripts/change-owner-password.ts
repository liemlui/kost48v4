#!/usr/bin/env npx ts-node
/**
 * Script satu-kali: overwrite password user OWNER langsung di DB.
 *
 * Cara pakai (dari backend/):
 *   npx ts-node scripts/change-owner-password.ts
 *
 * Password baru dibaca dari env OWNER_NEW_PASSWORD, atau prompt bila kosong.
 * Idempoten: aman dijalankan berapa kali pun.
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import { createInterface } from 'readline';

// Load .env dari backend/
dotenv.config({ path: resolve(__dirname, '../.env') });

async function promptPassword(): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Password baru untuk OWNER: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Prioritaskan env, fallback ke prompt manual
  let newPassword = (process.env.OWNER_NEW_PASSWORD || '').trim();
  if (!newPassword) {
    newPassword = await promptPassword();
  }
  if (!newPassword || newPassword.length < 8) {
    console.error('❌ Password minimal 8 karakter.');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL tidak ditemukan di environment atau .env');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    // Cari user dengan role OWNER (aktif maupun tidak)
    const owners = await prisma.user.findMany({
      where: { role: 'OWNER' },
      select: { id: true, email: true, fullName: true, isActive: true },
      orderBy: { id: 'asc' },
    });

    if (owners.length === 0) {
      console.error('❌ Tidak ada user dengan role OWNER di database.');
      console.error('   Jalankan dulu: node scripts/seed-owner.js');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`Ditemukan ${owners.length} user OWNER:`);
    owners.forEach((o, i) => {
      console.log(`  ${i + 1}. #${o.id} — ${o.email} (${o.fullName || '-'}) [${o.isActive ? 'AKTIF' : 'NONAKTIF'}]`);
    });

    // Pilih OWNER pertama yang aktif, atau yang pertama
    const target = owners.find((o) => o.isActive) || owners[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`\n✅ Password OWNER #${target.id} (${target.email}) berhasil diubah.`);
    console.log(`   passwordChangedAt → ${new Date().toISOString()}`);
    console.log('⚠️  Semua sesi JWT yang aktif SEKARANG TIDAK SAH (guard pwdAt).');
    console.log('   Owner WAJIB login ulang dengan password baru.');
  } catch (e: any) {
    console.error('❌ Gagal mengubah password:', e?.message ?? e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
