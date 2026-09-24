// Regresi BE-002 (temuan terbuka #3, audit 2026-09-24): login + refresh.
//
// Sebelum file ini, hanya pencabutan sesi (T1) dan logout per-sesi (T2) yang punya
// regresi. Test ini mengunci kontrak yang belum tercakup:
//   login  : pesan kredensial seragam, user nonaktif tidak memperoleh sesi,
//            claim token (sub/role/pwdAt) + TTL 900s, refresh token disimpan sebagai
//            SHA-256 (bukan token mentah), lastLoginAt ditulis.
//   refresh: token kosong/tak dikenal/dicabut/kedaluwarsa ditolak tanpa menerbitkan
//            sesi baru; rotasi sukses memakai claim `revokedAt: null` dan menyimpan
//            hash token baru (bukan token mentah).
const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const bcrypt = require('bcryptjs');
const { AuthService } = require('../../dist/auth/auth.service.js');

const USER_ID = 42;
const TENANT_ID = 7;
const PASSWORD = 'PasswordLama123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const PWD_CHANGED_AT = new Date('2026-09-01T00:00:00.000Z');
const RAW_REFRESH = 'd'.repeat(64);
const REFRESH_HASH = createHash('sha256').update(RAW_REFRESH).digest('hex');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const makeUser = (overrides = {}) => ({
  id: USER_ID,
  email: 'owner@kost48.test',
  fullName: 'Owner Uji',
  role: 'OWNER',
  tenantId: TENANT_ID,
  isActive: true,
  passwordHash: PASSWORD_HASH,
  passwordChangedAt: PWD_CHANGED_AT,
  ...overrides,
});

/** JwtService tiruan yang merekam claim agar bisa diperiksa. */
function makeJwt() {
  const calls = [];
  return {
    calls,
    signAsync: async (payload, options) => {
      calls.push({ payload, options });
      return 'access-token-baru';
    },
  };
}

const makeService = (prisma, jwt = makeJwt()) =>
  new AuthService(prisma, jwt, { get: () => undefined, getOrThrow: () => 'x'.repeat(40) });

const opsOf = (prisma) => prisma.events.map((event) => event.op);

/** Prisma tiruan untuk login: `findFirst` dibedakan dari klausa `where`. */
function makeLoginPrisma({ emailUser = null, phoneUser = null, tenant = null } = {}) {
  const events = [];
  return {
    events,
    user: {
      findFirst: async (args) => {
        events.push({ op: 'user.findFirst', args });
        return args?.where?.tenantId !== undefined ? phoneUser : emailUser;
      },
      update: async (args) => {
        events.push({ op: 'user.update', args });
        return {};
      },
    },
    tenant: {
      findFirst: async (args) => {
        events.push({ op: 'tenant.findFirst', args });
        return tenant;
      },
    },
    refreshToken: {
      create: async (args) => {
        events.push({ op: 'refreshToken.create', args });
        return {};
      },
    },
  };
}

test('LOGIN-1 — kredensial benar: claim token lengkap, TTL 900s, refresh token disimpan sebagai SHA-256', async () => {
  const prisma = makeLoginPrisma({ emailUser: makeUser() });
  const jwt = makeJwt();

  const result = await makeService(prisma, jwt).login({ identifier: 'owner@kost48.test', password: PASSWORD });

  assert.equal(result.accessToken, 'access-token-baru');
  assert.equal(result.user.role, 'OWNER');

  const [claim] = jwt.calls;
  assert.deepEqual(claim.payload, {
    sub: USER_ID,
    email: 'owner@kost48.test',
    role: 'OWNER',
    tenantId: TENANT_ID,
    pwdAt: PWD_CHANGED_AT.getTime(),
  });
  assert.deepEqual(claim.options, { expiresIn: 900 });

  const stored = prisma.events.find((event) => event.op === 'refreshToken.create').args.data;
  assert.equal(stored.userId, USER_ID);
  assert.equal(stored.token, sha256(result.refreshToken), 'DB harus menyimpan hash SHA-256');
  assert.notEqual(stored.token, result.refreshToken, 'token mentah tidak boleh masuk DB');
  const ttlDays = (stored.expiresAt.getTime() - Date.now()) / 86_400_000;
  assert.ok(ttlDays > 6.9 && ttlDays <= 7, `TTL refresh harus ~7 hari, dapat ${ttlDays}`);

  const lastLogin = prisma.events.find((event) => event.op === 'user.update').args.data.lastLoginAt;
  assert.ok(lastLogin instanceof Date, 'lastLoginAt harus ditulis saat login sukses');
});

test('LOGIN-2 — user tidak dikenal: pesan kredensial seragam, tidak ada sesi/refresh token', async () => {
  const prisma = makeLoginPrisma({ emailUser: null });

  await assert.rejects(
    () => makeService(prisma).login({ identifier: 'hantu@kost48.test', password: PASSWORD }),
    /Email\/nomor HP atau password salah/,
  );

  assert.equal(opsOf(prisma).includes('refreshToken.create'), false, 'tidak boleh menerbitkan refresh token');
  assert.equal(opsOf(prisma).includes('user.update'), false, 'tidak boleh menulis lastLoginAt');
});

test('LOGIN-3 — password salah: pesan sama seperti user tidak dikenal (tanpa enumerasi)', async () => {
  const prisma = makeLoginPrisma({ emailUser: makeUser() });

  await assert.rejects(
    () => makeService(prisma).login({ identifier: 'owner@kost48.test', password: 'SalahSekali999' }),
    /Email\/nomor HP atau password salah/,
  );

  assert.equal(opsOf(prisma).includes('refreshToken.create'), false);
});

test('LOGIN-4 — user nonaktif tidak memperoleh sesi (guard defensif 403)', async () => {
  // Jalur normal: kueri findUserByEmailOrPhone sudah memfilter isActive=true sehingga user
  // nonaktif kembali sebagai null dan ditolak sebagai kredensial salah. Mock ini menembus
  // filter itu untuk mengunci pagar defensif di dalam login().
  const prisma = makeLoginPrisma({ emailUser: makeUser({ isActive: false }) });

  await assert.rejects(
    () => makeService(prisma).login({ identifier: 'owner@kost48.test', password: PASSWORD }),
    (err) => {
      assert.equal(typeof err?.getStatus === 'function' ? err.getStatus() : null, 403);
      return true;
    },
  );

  assert.equal(opsOf(prisma).includes('refreshToken.create'), false);
});

test('LOGIN-5 — login via nomor HP memakai tenant aktif lalu user TENANT', async () => {
  const tenantUser = makeUser({ email: null, role: 'TENANT' });
  const prisma = makeLoginPrisma({ emailUser: null, tenant: { id: TENANT_ID }, phoneUser: tenantUser });

  const result = await makeService(prisma).login({ identifier: '081234567890', password: PASSWORD });

  assert.ok(prisma.events.find((event) => event.op === 'tenant.findFirst'), 'nomor HP harus dicari lewat tenant');
  const userLookup = prisma.events.filter((event) => event.op === 'user.findFirst').pop();
  assert.equal(userLookup.args.where.tenantId, TENANT_ID);
  assert.equal(userLookup.args.where.role, 'TENANT');
  assert.equal(result.user.tenantId, TENANT_ID);
});

/** Prisma tiruan untuk refresh: transaksi + klaim token. */
function makeRefreshPrisma({ stored = null, user = makeUser(), claimCount = 1 } = {}) {
  const events = [];
  const tx = {
    refreshToken: {
      deleteMany: async (args) => {
        events.push({ op: 'claim', args });
        return { count: claimCount };
      },
      create: async (args) => {
        events.push({ op: 'refreshToken.create', args });
        return {};
      },
    },
    user: {
      findUnique: async (args) => {
        events.push({ op: 'user.findUnique', args });
        return user;
      },
    },
  };
  return {
    events,
    refreshToken: {
      findUnique: async (args) => {
        events.push({ op: 'refreshToken.findUnique', args });
        return stored;
      },
      delete: async (args) => {
        events.push({ op: 'refreshToken.delete', args });
        return {};
      },
    },
    $transaction: async (callback) => {
      events.push({ op: 'tx-start' });
      const result = await callback(tx);
      events.push({ op: 'tx-commit' });
      return result;
    },
  };
}

const makeStored = (overrides = {}) => ({
  id: 17,
  userId: USER_ID,
  token: REFRESH_HASH,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
});

test('REFRESH-1 — token kosong ditolak tanpa menyentuh DB', async () => {
  const prisma = makeRefreshPrisma({ stored: makeStored() });

  await assert.rejects(() => makeService(prisma).refresh(''), /Refresh token tidak ditemukan/);
  assert.equal(prisma.events.length, 0);
});

test('REFRESH-2 — token tak dikenal dicari sebagai SHA-256 lalu ditolak', async () => {
  const prisma = makeRefreshPrisma({ stored: null });

  await assert.rejects(() => makeService(prisma).refresh(RAW_REFRESH), /Refresh token tidak valid/);

  const lookup = prisma.events.find((event) => event.op === 'refreshToken.findUnique');
  assert.equal(lookup.args.where.token, REFRESH_HASH, 'pencarian memakai hash SHA-256');
  assert.notEqual(lookup.args.where.token, RAW_REFRESH, 'token mentah tidak dikirim ke query');
  assert.equal(opsOf(prisma).includes('tx-start'), false, 'tidak boleh membuka transaksi');
});

test('REFRESH-3 — token sudah dicabut ditolak sebelum transaksi rotasi', async () => {
  const prisma = makeRefreshPrisma({ stored: makeStored({ revokedAt: new Date() }) });

  await assert.rejects(() => makeService(prisma).refresh(RAW_REFRESH), /Refresh token sudah dicabut/);
  assert.equal(opsOf(prisma).includes('tx-start'), false);
  assert.equal(opsOf(prisma).includes('refreshToken.create'), false);
});

test('REFRESH-4 — token kedaluwarsa dihapus lalu ditolak', async () => {
  const prisma = makeRefreshPrisma({ stored: makeStored({ expiresAt: new Date(Date.now() - 1_000) }) });

  await assert.rejects(() => makeService(prisma).refresh(RAW_REFRESH), /kedaluwarsa/);
  assert.ok(opsOf(prisma).includes('refreshToken.delete'), 'baris kedaluwarsa dibersihkan');
  assert.equal(opsOf(prisma).includes('refreshToken.create'), false);
});

test('REFRESH-5 — rotasi sukses: klaim kondisional, pwdAt dari DB, hash baru disimpan', async () => {
  const prisma = makeRefreshPrisma({ stored: makeStored() });
  const jwt = makeJwt();

  const result = await makeService(prisma, jwt).refresh(RAW_REFRESH);

  const claim = prisma.events.find((event) => event.op === 'claim').args;
  assert.equal(claim.where.id, 17);
  assert.equal(claim.where.revokedAt, null, 'klaim hanya untuk token yang belum dicabut');
  assert.ok(claim.where.expiresAt.gte instanceof Date, 'klaim menolak token kedaluwarsa');

  assert.equal(jwt.calls[0].payload.sub, USER_ID);
  assert.equal(jwt.calls[0].payload.pwdAt, PWD_CHANGED_AT.getTime());
  assert.deepEqual(jwt.calls[0].options, { expiresIn: 900 });

  const created = prisma.events.find((event) => event.op === 'refreshToken.create').args.data;
  assert.match(result.refreshToken, /^[0-9a-f]{64}$/, 'refresh token baru 32 byte hex');
  assert.equal(created.token, sha256(result.refreshToken));
  assert.notEqual(created.token, REFRESH_HASH, 'hash lama tidak boleh dipakai ulang');
  assert.notEqual(created.token, result.refreshToken, 'token mentah tidak boleh masuk DB');
});

test('REFRESH-6 — user hilang/nonaktif: tidak ada token baru (rollback di level DB)', async () => {
  const prisma = makeRefreshPrisma({ stored: makeStored(), user: null });

  await assert.rejects(
    () => makeService(prisma).refresh(RAW_REFRESH),
    /User tidak ditemukan atau tidak aktif/,
  );

  assert.equal(opsOf(prisma).includes('refreshToken.create'), false, 'loser tidak menerbitkan token');
  assert.equal(opsOf(prisma).includes('tx-commit'), false, 'transaksi harus berhenti sebelum commit');
});
