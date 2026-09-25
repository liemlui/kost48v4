// STATUS 25 Sep 2026 — bukti DB pertama:
//   T7-DB LULUS (3 putaran), T6-DB GAGAL.
//   Penyebab T6 BUKAN race yang bocor, melainkan klaim atomik selalu 0 baris pada DB
//   dengan zona waktu sesi != UTC (UAT: Asia/Bangkok). Defect dilacak sebagai BE-002-T6B:
//   `"expiresAt" >= NOW()` membandingkan timestamp UTC dengan timestamptz lokal,
//   sedangkan `(NOW() AT TIME ZONE 'UTC')` memberi 1 baris (terbukti via probe).
//   Test T6 sengaja dibiarkan MERAH sebagai regresi sampai defect itu diperbaiki;
//   jangan "diperbaiki" dengan melunakkan assertion.
//
// T6 & T7 pada POSTGRES NYATA (UAT) — menutup batas bukti laporan audit BE-002:
// unit test sebelumnya memakai Prisma tiruan, sehingga isolasi/locking nyata belum terbukti.
//
// Hanya berjalan bila diberi izin eksplisit (owner: AKSES-UAT-25SEP):
//   $env:KOST48_UAT_CONCURRENCY_TEST='1'; npm run test:integration
// Guard: NODE_ENV bukan production, flag izin diset, dan DATABASE_URL bertanda UAT (:5433).
// Fixture dibuat unik lalu dihapus pada akhir test; tidak menyentuh data lain.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createHash, randomBytes, randomUUID } = require('node:crypto');

const bcrypt = require('bcryptjs');

const { AuthService } = require('../../dist/auth/auth.service.js');
const { AuthController } = require('../../dist/auth/auth.controller.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');

const OLD_PASSWORD = 'PasswordLama123';
const NEW_PASSWORD_A = 'PasswordBaruA456';
const NEW_PASSWORD_B = 'PasswordBaruB789';
const COOKIE_NAME = 'kost48_refresh_token';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Muat DATABASE_URL dari backend/.env tanpa mencetak isinya. */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '..', '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const line = raw.split(/\r?\n/).find((entry) => entry.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL tidak ditemukan di backend/.env');
  const value = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  process.env.DATABASE_URL = value;
  return value;
}

/** Menolak eksekusi kecuali lingkungan jelas UAT dan izin owner diberikan. */
function judgeGuard() {
  const url = ensureDatabaseUrl();
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, reason: 'NODE_ENV=production — uji DB ditolak.' };
  }
  if (process.env.KOST48_UAT_CONCURRENCY_TEST !== '1') {
    return { ok: false, reason: 'KOST48_UAT_CONCURRENCY_TEST=1 belum diset — uji DB dilewati (butuh izin owner).' };
  }
  if (!/:5433\b/.test(url)) {
    return { ok: false, reason: 'DATABASE_URL bukan bertanda UAT (:5433) — uji DB ditolak.' };
  }
  return { ok: true, reason: 'UAT terdeteksi (port 5433; host dan kredensial tidak dicetak).' };
}

const judgement = judgeGuard();
const dbTest = judgement.ok ? test : test.skip;
console.log(`[auth-concurrency] ${judgement.reason}`);

const prismaA = judgement.ok ? new PrismaService() : null;
const prismaB = judgement.ok ? new PrismaService() : null;

const configStub = { get: () => undefined, getOrThrow: () => 'x'.repeat(40) };
const jwtStub = { signAsync: async () => 'access-token-itest' };

async function makeUser(prisma, label) {
  const unique = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  return prisma.user.create({
    data: {
      fullName: `ITest ${label}`,
      email: `itest-${label}-${unique}@kost48.local`,
      passwordHash: bcrypt.hashSync(OLD_PASSWORD, 4),
      role: 'OWNER',
      isActive: true,
    },
  });
}

async function cleanupUser(prisma, userId) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

function makeRes() {
  const res = { cleared: [], setCookies: [] };
  res.clearCookie = (name, options) => res.cleared.push({ name, options });
  res.cookie = (name, value, options) => res.setCookies.push({ name, value, options });
  return res;
}

const httpStatus = (error) => (typeof error?.getStatus === 'function' ? error.getStatus() : null);

dbTest('T6-DB — dua resetPassword paralel pada Postgres nyata: tepat satu pemenang', async () => {
  const user = await makeUser(prismaA, 't6');
  const raw = randomBytes(32).toString('hex');
  await prismaA.passwordResetToken.create({
    data: { userId: user.id, token: sha256(raw), expiresAt: new Date(Date.now() + 60_000) },
  });

  // Dua service = dua PrismaService = dua pool koneksi terpisah, jadi ini balapan nyata
  // (bukan simulasi tiruan seperti pada unit test).
  const serviceA = new AuthService(prismaA, {}, configStub);
  const serviceB = new AuthService(prismaB, {}, configStub);
  const outcomes = await Promise.allSettled([
    serviceA.resetPassword({ token: raw, newPassword: NEW_PASSWORD_A }),
    serviceB.resetPassword({ token: raw, newPassword: NEW_PASSWORD_B }),
  ]);

  const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
  const summary = outcomes
    .map((outcome, index) => {
      const label = index === 0 ? 'A' : 'B';
      if (outcome.status === 'fulfilled') return `${label}:ok`;
      const reason = outcome.reason;
      const detail = reason?.message ?? String(reason);
      return `${label}:${httpStatus(reason) ?? 'no-status'} ${detail}`;
    })
    .join(' | ');
  assert.equal(fulfilled.length, 1, `hanya satu request boleh memakai token sekali pakai → ${summary}`);

  const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
  assert.ok(rejected?.reason, 'request yang kalah harus gagal');
  assert.equal(httpStatus(rejected.reason), 401, 'yang kalah ditolak 401 (token sudah dipakai)');

  const winnerIsA = outcomes[0].status === 'fulfilled';
  const winnerPassword = winnerIsA ? NEW_PASSWORD_A : NEW_PASSWORD_B;
  const loserPassword = winnerIsA ? NEW_PASSWORD_B : NEW_PASSWORD_A;

  const fresh = await prismaA.user.findUnique({ where: { id: user.id } });
  assert.equal(await bcrypt.compare(winnerPassword, fresh.passwordHash), true, 'hash = password pemenang');
  assert.equal(await bcrypt.compare(loserPassword, fresh.passwordHash), false, 'password yang kalah tidak tersimpan');
  assert.ok(fresh.passwordChangedAt instanceof Date, 'passwordChangedAt diperbarui');

  const tokenRow = await prismaA.passwordResetToken.findUnique({ where: { token: sha256(raw) } });
  assert.ok(tokenRow?.usedAt instanceof Date, 'token ditandai terpakai');

  await cleanupUser(prismaA, user.id);
});

dbTest('T7-DB — refresh berkompetisi dengan logout pada Postgres nyata (3 putaran)', async () => {
  for (let round = 1; round <= 3; round += 1) {
    const user = await makeUser(prismaA, `t7r${round}`);
    const raw = randomBytes(32).toString('hex');
    const oldHash = sha256(raw);
    await prismaA.refreshToken.create({
      data: { userId: user.id, token: oldHash, expiresAt: new Date(Date.now() + 60_000) },
    });

    const service = new AuthService(prismaB, jwtStub, configStub);
    const controller = new AuthController({}, prismaA);
    const res = makeRes();
    const req = { headers: { cookie: `${COOKIE_NAME}=${raw}` } };

    const [refreshOutcome, logoutOutcome] = await Promise.allSettled([
      service.refresh(raw),
      controller.logout(req, res),
    ]);
    assert.equal(logoutOutcome.status, 'fulfilled', `putaran ${round}: logout tetap idempoten`);
    assert.equal(logoutOutcome.value.message, 'Logout berhasil');

    // Invarian utama: setelah balapan, token lama tidak boleh bisa dipakai lagi —
    // apa pun urutan yang menang.
    const verifier = new AuthService(prismaA, jwtStub, configStub);
    await assert.rejects(
      () => verifier.refresh(raw),
      /tidak valid|sudah dicabut|digunakan/,
      `putaran ${round}: token lama wajib mati`,
    );

    const rows = await prismaA.refreshToken.findMany({ where: { userId: user.id } });
    const oldRow = rows.find((row) => row.token === oldHash);

    if (refreshOutcome.status === 'fulfilled') {
      assert.equal(oldRow, undefined, `putaran ${round}: rotasi menghapus baris lama`);
      assert.equal(rows.length, 1, `putaran ${round}: tepat satu token baru`);
      assert.match(refreshOutcome.value.refreshToken, /^[0-9a-f]{64}$/);
    } else {
      const leaked = rows.filter((row) => row.token !== oldHash);
      assert.equal(leaked.length, 0, `putaran ${round}: refresh yang kalah tidak menerbitkan token`);
      assert.ok(oldRow, `putaran ${round}: baris lama masih ada (dicabut, bukan dihapus)`);
      assert.ok(oldRow.revokedAt instanceof Date, `putaran ${round}: baris lama dicabut logout`);
    }

    await cleanupUser(prismaA, user.id);
  }
});

test.after(async () => {
  if (!prismaA) return;
  // Sapuan pengaman: hapus sisa fixture test bila ada yang tertinggal karena kegagalan.
  const leftover = await prismaA.user.findMany({
    where: { email: { endsWith: '@kost48.local' } },
    select: { id: true, email: true },
  });
  for (const user of leftover) {
    await cleanupUser(prismaA, user.id);
  }
  if (leftover.length > 0) {
    console.log(`[auth-concurrency] membersihkan ${leftover.length} fixture tersisa`);
  }
  await prismaA.$disconnect();
  if (prismaB) await prismaB.$disconnect();
});
