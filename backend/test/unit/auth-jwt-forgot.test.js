// Regresi BE-002 (temuan terbuka #3, audit 2026-09-24): JwtStrategy + forgot-password.
//
// Kontrak yang dikunci:
//   JwtStrategy.validate : user di DB wajib ada & aktif, token yang diterbitkan sebelum
//                          passwordChangedAt ditolak (klaim `pwdAt`), dan role/tenant
//                          selalu diambil dari DB (bukan dari klaim token lama).
//   forgotPassword       : respons selalu generik (tanpa enumerasi), akun tak dikenal
//                          tidak menulis token, token disimpan sebagai SHA-256 dengan
//                          TTL 30 menit, dan kegagalan kirim email tidak membocorkan
//                          status ke pemanggil.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const { AuthService } = require('../../dist/auth/auth.service.js');
const { JwtStrategy } = require('../../dist/auth/jwt.strategy.js');

const USER_ID = 42;
const TENANT_ID = 7;
const JWT_SECRET = 'uji'.repeat(20);
const PWD_CHANGED_AT = new Date('2026-09-01T00:00:00.000Z');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const opsOf = (prisma) => prisma.events.map((event) => event.op);

const makeUser = (overrides = {}) => ({
  id: USER_ID,
  email: 'owner@kost48.test',
  fullName: 'Owner Uji',
  role: 'OWNER',
  tenantId: TENANT_ID,
  isActive: true,
  passwordHash: '$2a$04$hash-rahasia-tidak-boleh-bocor',
  passwordChangedAt: PWD_CHANGED_AT,
  ...overrides,
});

/** Membangun JwtStrategy dengan PrismaService tiruan. */
function makeStrategy(user) {
  const events = [];
  const prisma = {
    events,
    user: {
      findUnique: async (args) => {
        events.push({ op: 'user.findUnique', args });
        return user;
      },
    },
  };
  const configService = { getOrThrow: () => JWT_SECRET, get: () => undefined };
  return { strategy: new JwtStrategy(configService, prisma), prisma };
}

const payload = (overrides = {}) => ({
  sub: USER_ID,
  email: 'owner@kost48.test',
  role: 'OWNER',
  tenantId: TENANT_ID,
  pwdAt: PWD_CHANGED_AT.getTime(),
  ...overrides,
});

test('JWT-1 — user pada token tidak ada di DB ditolak', async () => {
  const { strategy } = makeStrategy(null);

  await assert.rejects(() => strategy.validate(payload()), /User pada token tidak ditemukan/);
});

test('JWT-2 — user nonaktif ditolak walau token masih sah', async () => {
  const { strategy } = makeStrategy(makeUser({ isActive: false }));

  await assert.rejects(() => strategy.validate(payload()), /User tidak aktif atau akses dicabut/);
});

test('JWT-3 — token terbit sebelum perubahan password ditolak (klaim pwdAt)', async () => {
  const { strategy } = makeStrategy(makeUser());

  await assert.rejects(
    () => strategy.validate(payload({ pwdAt: PWD_CHANGED_AT.getTime() - 1 })),
    /Sesi kedaluwarsa karena password telah diubah/,
  );
});

test('JWT-4 — role & tenant diambil dari DB, bukan dari klaim token lama', async () => {
  const { strategy } = makeStrategy(makeUser({ role: 'STAFF', tenantId: null }));

  const result = await strategy.validate(payload({ role: 'OWNER', tenantId: TENANT_ID }));

  assert.equal(result.role, 'STAFF', 'penurunan role harus langsung berlaku');
  assert.equal(result.tenantId, null);
  assert.deepEqual(Object.keys(result).sort(), ['email', 'fullName', 'id', 'isActive', 'role', 'tenantId']);
  assert.equal('passwordHash' in result, false, 'hash password tidak boleh ikut ke request');
});

test('JWT-5 — user tanpa passwordChangedAt tetap boleh memakai token sah', async () => {
  const { strategy } = makeStrategy(makeUser({ passwordChangedAt: null }));

  const result = await strategy.validate(payload({ pwdAt: 0 }));

  assert.equal(result.id, USER_ID);
});

test('JWT-6 — validasi selalu membaca user terbaru dari DB per request', async () => {
  const { strategy, prisma } = makeStrategy(makeUser());

  await strategy.validate(payload());

  assert.equal(prisma.events.filter((event) => event.op === 'user.findUnique').length, 1);
  assert.equal(prisma.events[0].args.where.id, USER_ID);
});

/** Prisma tiruan untuk forgotPassword: transaksi + pencatatan SQL. */
function makeForgotPrisma({ user = null, resetRow = null } = {}) {
  const events = [];
  const tx = {
    $executeRaw: async (query) => {
      events.push({ op: 'executeRaw', sql: String(query?.sql ?? query), values: query?.values ?? [] });
      return 1;
    },
  };
  return {
    events,
    user: {
      findFirst: async (args) => {
        events.push({ op: 'user.findFirst', args });
        return args?.where?.tenantId !== undefined ? null : user;
      },
    },
    tenant: {
      findFirst: async () => null,
    },
    operationalSetting: {
      findUnique: async (args) => {
        events.push({ op: 'operationalSetting.findUnique', args });
        return resetRow;
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

const makeForgotService = (prisma) =>
  new AuthService(prisma, {}, { get: () => undefined, getOrThrow: () => 'x'.repeat(40) });

test('FORGOT-1 — identifier kosong: sukses generik tanpa menyentuh DB', async () => {
  const prisma = makeForgotPrisma({ user: null });

  const result = await makeForgotService(prisma).forgotPassword({ identifier: '   ' });

  assert.deepEqual(result, { success: true });
  assert.equal(prisma.events.length, 0);
});

test('FORGOT-2 — akun tak dikenal: respons sama, tanpa transaksi/token baru', async () => {
  const prisma = makeForgotPrisma({ user: null });

  const result = await makeForgotService(prisma).forgotPassword({ identifier: 'hantu@kost48.test' });

  assert.deepEqual(result, { success: true }, 'respons tidak boleh membedakan akun ada/tidak');
  assert.equal(opsOf(prisma).includes('tx-start'), false, 'tidak boleh membuat token');
});

test('FORGOT-3 — akun ada: token lama dibersihkan, token baru disimpan sebagai SHA-256 dengan TTL 30 menit', async () => {
  const prisma = makeForgotPrisma({ user: makeUser() });
  const service = makeForgotService(prisma);
  const sent = [];
  service.sendResetEmail = async (email, rawToken) => {
    sent.push({ email, rawToken });
  };

  const result = await service.forgotPassword({ identifier: 'owner@kost48.test' });

  assert.deepEqual(result, { success: true });

  const statements = prisma.events.filter((event) => event.op === 'executeRaw');
  assert.equal(statements.length, 2, 'harus ada DELETE token lama + INSERT token baru');
  assert.match(statements[0].sql, /DELETE FROM "PasswordResetToken"/);
  assert.match(statements[1].sql, /INSERT INTO "PasswordResetToken"/);

  assert.equal(sent.length, 1, 'email reset dikirim memakai token mentah');
  const rawToken = sent[0].rawToken;
  assert.match(rawToken, /^[0-9a-f]{64}$/);
  assert.ok(
    statements[1].values.includes(sha256(rawToken)),
    'DB harus menerima hash SHA-256 token',
  );
  assert.equal(
    JSON.stringify(statements[1].values).includes(rawToken),
    false,
    'token mentah tidak boleh sampai ke query DB',
  );

  const expiresAt = statements[1].values.find((value) => value instanceof Date);
  assert.ok(expiresAt, 'token baru harus punya expiresAt');
  const ttlMinutes = (expiresAt.getTime() - Date.now()) / 60_000;
  assert.ok(ttlMinutes > 29 && ttlMinutes <= 30, `TTL token reset harus ~30 menit, dapat ${ttlMinutes}`);
});

test('FORGOT-4 — akun nonaktif: tidak ada token dibuat (respons tetap generik)', async () => {
  const prisma = makeForgotPrisma({ user: makeUser({ isActive: false }) });

  const result = await makeForgotService(prisma).forgotPassword({ identifier: 'owner@kost48.test' });

  assert.deepEqual(result, { success: true });
  assert.equal(opsOf(prisma).includes('tx-start'), false);
});

test('FORGOT-5 — kegagalan kirim email tidak membocorkan status ke pemanggil', async () => {
  const prisma = makeForgotPrisma({ user: makeUser() });
  const service = makeForgotService(prisma);
  let attempted = 0;
  service.sendResetEmail = async () => {
    attempted += 1;
    throw new Error('brevo tidak tersedia');
  };

  const result = await service.forgotPassword({ identifier: 'owner@kost48.test' });

  assert.deepEqual(result, { success: true }, 'kegagalan email tidak boleh mengubah respons');
  assert.equal(attempted, 1);
  assert.equal(opsOf(prisma).includes('tx-commit'), true, 'token tetap tersimpan walau email gagal');
});

test('FORGOT-6 — akun tanpa email: token tetap dibuat, pengiriman dilewati', async () => {
  const prisma = makeForgotPrisma({ user: makeUser({ email: null }) });
  const service = makeForgotService(prisma);
  let attempted = 0;
  service.sendResetEmail = async () => {
    attempted += 1;
  };

  const result = await service.forgotPassword({ identifier: '081234567890' });

  assert.deepEqual(result, { success: true });
  assert.equal(attempted, 0, 'tanpa email tidak ada pengiriman');
  assert.equal(prisma.events.filter((event) => event.op === 'executeRaw').length, 2);
});
