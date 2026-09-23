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
const { AuthService } = require('../../dist/auth/auth.service.js');

const RAW_TOKEN = 'b'.repeat(64);
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');
const COOKIE_NAME = 'kost48_refresh_token';

/** Prisma tiruan: hanya model refreshToken yang dibutuhkan logout. */
function makePrisma({ stored }) {
  const events = [];
  return {
    events,
    refreshToken: {
      updateMany: async (args) => {
        events.push({ op: 'updateMany', args });
        return { count: stored && !stored.revokedAt ? 1 : 0 };
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

  const update = prisma.events.find((e) => e.op === 'updateMany');
  assert.ok(update, 'token pada cookie harus dicabut');
  assert.equal(update.args.where.token, TOKEN_HASH, 'hanya token pada cookie yang boleh dicabut');
  assert.equal(update.args.where.revokedAt, null, 'update harus atomik hanya untuk token aktif');
  assert.ok(update.args.data.revokedAt instanceof Date, 'revokedAt harus diisi');
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

  assert.equal(prisma.events.filter((e) => e.op === 'updateMany').length, 1, 'conditional update tetap idempoten');
  assert.equal(res.cleared.length, 1, 'cookie tetap dibersihkan');
});

test('T2d — token tidak dikenal di DB: tidak ada error, cookie tetap dibersihkan', async () => {
  const prisma = makePrisma({ stored: null });
  const res = makeRes();

  const result = await makeController(prisma).logout(reqWithCookie('c'.repeat(64)), res);

  assert.deepEqual(result, { message: 'Logout berhasil' });
  assert.equal(prisma.events.filter((e) => e.op === 'updateMany').length, 1);
  assert.equal(res.cleared.length, 1);
});

test('T2e — token dicari sebagai SHA-256 dari cookie, bukan nilai mentah', async () => {
  const stored = { id: 11, userId: 42, token: TOKEN_HASH, revokedAt: null };
  const prisma = makePrisma({ stored });
  const res = makeRes();

  await makeController(prisma).logout(reqWithCookie(RAW_TOKEN), res);

  const update = prisma.events.find((e) => e.op === 'updateMany');
  assert.ok(update, 'harus mencabut baris token secara kondisional');
  assert.equal(update.args.where.token, TOKEN_HASH, 'pencabutan memakai hash SHA-256');
  assert.notEqual(update.args.where.token, RAW_TOKEN, 'token mentah tidak boleh dikirim ke query');
});

test('T7 - refresh yang kalah dari logout tidak menerbitkan token baru', async () => {
  const stored = {
    id: 17,
    userId: 42,
    token: TOKEN_HASH,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const events = [];
  const prisma = {
    refreshToken: { findUnique: async () => stored },
    $transaction: async (callback) => callback({
      refreshToken: {
        deleteMany: async (args) => {
          events.push({ op: 'claim', args });
          return { count: 0 };
        },
        create: async () => {
          events.push({ op: 'create' });
          return {};
        },
      },
      user: {
        findUnique: async () => {
          events.push({ op: 'user' });
          return { id: 42, isActive: true };
        },
      },
    }),
  };
  const service = new AuthService(prisma, { signAsync: async () => 'access' }, {});

  await assert.rejects(() => service.refresh(RAW_TOKEN), /digunakan atau dicabut/);

  const claim = events.find((event) => event.op === 'claim');
  assert.equal(claim.args.where.id, stored.id);
  assert.equal(claim.args.where.revokedAt, null);
  assert.equal(events.some((event) => event.op === 'user'), false, 'loser tidak boleh membaca user');
  assert.equal(events.some((event) => event.op === 'create'), false, 'loser tidak boleh membuat refresh token baru');
});
