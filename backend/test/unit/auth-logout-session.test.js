// T2 (audit FE-002 / BE-002): regresi perilaku logout per-sesi.
//
// Keputusan owner (18 Sep 2026): tombol "Keluar" tetap mencabut sesi LOKAL saja.
// Sebelum perbaikan, route logout (@Public) memakai `@CurrentUser() user?` yang tidak
// pernah terisi sehingga cabang "cabut SEMUA sesi" adalah kode mati — perilaku nyatanya
// memang per-sesi, tetapi kodenya tampak seolah bisa global logout.
//
// Test ini mengunci perilaku yang benar:
//   1. Cookie refresh token yang dikirim → HANYA baris token itu yang dicabut.
//   2. Cookie kosong/tidak ada → tidak ada pencabutan, tetapi logout tetap sukses (200).
//   3. Token yang sudah dicabut → tidak ditulis ulang (idempoten).
//   4. Cookie refresh selalu dibersihkan pada semua jalur.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const { AuthController } = require('../../dist/auth/auth.controller.js');

const RAW_TOKEN = 'b'.repeat(64);
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');
const COOKIE_NAME = 'kost48_refresh_token';

/** Prisma tiruan: hanya model refreshToken yang dibutuhkan logout. */
function makePrisma({ stored }) {
  const events = [];
  return {
    events,
    refreshToken: {
      findUnique: async (args) => {
        events.push({ op: 'findUnique', args });
        return stored;
      },
      update: async (args) => {
        events.push({ op: 'update', args });
        return {};
      },
      updateMany: async (args) => {
        events.push({ op: 'updateMany', args });
        return { count: 0 };
      },
    },
  };
}

/** Response tiruan: mencatat pembersihan cookie. */
function makeRes() {
  const cleared = [];
  return {
    cleared,
    clearCookie: (name, options) => {
      cleared.push({ name, options });
    },
  };
}

const makeController = (prisma) => new AuthController({}, prisma);

const reqWithCookie = (raw) => ({ headers: { cookie: `${COOKIE_NAME}=${raw}` } });

test('T2a — logout mencabut HANYA sesi pada cookie, bukan seluruh sesi user', async () => {
  const stored = { id: 7, userId: 42, token: TOKEN_HASH, revokedAt: null };
  const prisma = makePrisma({ stored });
  const res = makeRes();

  const result = await makeController(prisma).logout(reqWithCookie(RAW_TOKEN), res);

  assert.deepEqual(result, { message: 'Logout berhasil' });

  const update = prisma.events.find((e) => e.op === 'update');
  assert.ok(update, 'token pada cookie harus dicabut');
  assert.equal(update.args.where.id, stored.id, 'hanya baris token ini yang boleh dicabut');
  assert.ok(update.args.data.revokedAt instanceof Date, 'revokedAt harus diisi');

  assert.equal(
    prisma.events.filter((e) => e.op === 'updateMany').length,
    0,
    'logout TIDAK boleh mencabut semua sesi user (keputusan owner: per-sesi)',
  );
  assert.deepEqual(res.cleared, [{ name: COOKIE_NAME, options: { httpOnly: true, path: '/api/auth' } }]);
});

test('T2b — tanpa cookie refresh: logout tetap sukses tanpa pencabutan', async () => {
  const prisma = makePrisma({ stored: null });
  const res = makeRes();

  const result = await makeController(prisma).logout({ headers: {} }, res);

  assert.deepEqual(result, { message: 'Logout berhasil' });
  assert.equal(prisma.events.length, 0, 'tidak ada token → tidak ada operasi DB');
  assert.equal(res.cleared.length, 1, 'cookie tetap dibersihkan');
});

test('T2c — token yang sudah dicabut tidak ditulis ulang (idempoten)', async () => {
  const stored = { id: 9, userId: 42, token: TOKEN_HASH, revokedAt: new Date('2026-09-01T00:00:00.000Z') };
  const prisma = makePrisma({ stored });
  const res = makeRes();

  await makeController(prisma).logout(reqWithCookie(RAW_TOKEN), res);

  assert.equal(prisma.events.filter((e) => e.op === 'update').length, 0, 'tidak perlu update ulang');
  assert.equal(res.cleared.length, 1, 'cookie tetap dibersihkan');
});

test('T2d — token tidak dikenal di DB: tidak ada error, cookie tetap dibersihkan', async () => {
  const prisma = makePrisma({ stored: null });
  const res = makeRes();

  const result = await makeController(prisma).logout(reqWithCookie('c'.repeat(64)), res);

  assert.deepEqual(result, { message: 'Logout berhasil' });
  assert.equal(prisma.events.filter((e) => e.op === 'update').length, 0);
  assert.equal(res.cleared.length, 1);
});

test('T2e — token dicari sebagai SHA-256 dari cookie, bukan nilai mentah', async () => {
  const stored = { id: 11, userId: 42, token: TOKEN_HASH, revokedAt: null };
  const prisma = makePrisma({ stored });
  const res = makeRes();

  await makeController(prisma).logout(reqWithCookie(RAW_TOKEN), res);

  const lookup = prisma.events.find((e) => e.op === 'findUnique');
  assert.ok(lookup, 'harus mencari baris token');
  assert.equal(lookup.args.where.token, TOKEN_HASH, 'pencarian memakai hash SHA-256');
  assert.notEqual(lookup.args.where.token, RAW_TOKEN, 'token mentah tidak boleh dicari langsung');
});
