// T1 (audit FE-002 / BE-002): regresi "ganti password wajib mencabut refresh token".
//
// Sebelum perbaikan: reset-password & change-password hanya meng-update hash password
// (+ menandai token reset terpakai). Access token lama memang mati lewat klaim `pwdAt`
// (jwt.strategy), TETAPI refresh token tetap sah sampai 7 hari sehingga access token
// baru masih bisa diterbitkan. Test ini mengunci invariannya:
//   1. Seluruh refresh token user dicabut (revokedAt diisi) DI DALAM transaksi yang sama
//      dengan penggantian hash password.
//   2. Reset token ditandai terpakai pada transaksi yang sama.
//   3. Jalur gagal (password lama salah / token sudah dipakai) tidak menulis apa pun.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');

const bcrypt = require('bcryptjs');
const { AuthService } = require('../../dist/auth/auth.service.js');

const USER_ID = 42;
const OLD_PASSWORD = 'PasswordLama123';
const NEW_PASSWORD = 'PasswordBaru456';
const RAW_RESET_TOKEN = 'a'.repeat(64);
const RESET_TOKEN_HASH = createHash('sha256').update(RAW_RESET_TOKEN).digest('hex');

// Hash asli dibuat sekali supaya test memakai bcrypt sungguhan (AuthService memanggil
// modul bcryptjs langsung, jadi modul tidak bisa disuntik lewat constructor).
const OLD_PASSWORD_HASH = bcrypt.hashSync(OLD_PASSWORD, 10);

/** Prisma tiruan: mencatat urutan operasi agar bisa diperiksa. */
function makePrisma({ user, resetRow, resetClaimCount = 1 }) {
  const events = [];
  const record = (entry) => {
    events.push(entry);
    return entry;
  };
  const tx = {
    $executeRaw: async (query) => {
      const sql = String(query?.sql ?? query);
      record({ op: 'executeRaw', sql });
      if (/UPDATE "PasswordResetToken"/.test(sql)) return resetClaimCount;
      return 1;
    },
    refreshToken: {
      updateMany: async (args) => {
        record({ op: 'revokeAll', args });
        return { count: 1 };
      },
      findUnique: async () => null,
      update: async () => ({}),
    },
  };
  const prisma = {
    events,
    user: { findUnique: async () => user, findFirst: async () => user },
    $queryRaw: async () => (resetRow ? [resetRow] : []),
    refreshToken: {
      updateMany: async (args) => {
        record({ op: 'revokeAll-di-luar-transaksi', args });
        return { count: 1 };
      },
      findUnique: async () => null,
      update: async () => ({}),
    },
    $transaction: async (callback) => {
      record({ op: 'tx-start' });
      const result = await callback(tx);
      record({ op: 'tx-commit' });
      return result;
    },
  };
  return prisma;
}

const makeService = (prisma) => new AuthService(prisma, {}, {});

test('T1a — resetPassword mencabut seluruh refresh token di dalam transaksi yang sama', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const resetRow = { userId: USER_ID, usedAt: null, expiresAt: new Date(Date.now() + 60_000) };
  const prisma = makePrisma({ user, resetRow });

  const result = await makeService(prisma).resetPassword({ token: RAW_RESET_TOKEN, newPassword: NEW_PASSWORD });
  assert.deepEqual(result, { success: true });

  const ops = prisma.events.map((e) => e.op);
  assert.ok(ops.includes('tx-start') && ops.includes('tx-commit'), 'harus memakai transaksi');

  const userUpdate = prisma.events.find((e) => e.op === 'executeRaw' && /UPDATE "User"/.test(e.sql));
  assert.ok(userUpdate, 'harus meng-update User');
  assert.match(userUpdate.sql, /"passwordChangedAt" = NOW\(\)/);

  const tokenUpdate = prisma.events.find((e) => e.op === 'executeRaw' && /UPDATE "PasswordResetToken"/.test(e.sql));
  assert.ok(tokenUpdate, 'harus menandai reset token terpakai');
  assert.match(tokenUpdate.sql, /"usedAt" IS NULL/);
  assert.match(tokenUpdate.sql, /"expiresAt" >= NOW\(\)/);
  assert.ok(
    prisma.events.indexOf(tokenUpdate) < prisma.events.indexOf(userUpdate),
    'reset token harus diklaim sebelum password diubah',
  );

  // INVARIAN YANG DULU HILANG: seluruh refresh token user dicabut.
  const revocation = prisma.events.find((e) => e.op === 'revokeAll');
  assert.ok(revocation, 'refresh token user HARUS dicabut saat reset password');
  assert.deepEqual(revocation.args.where, { userId: USER_ID, revokedAt: null });
  assert.ok(revocation.args.data.revokedAt instanceof Date, 'revokedAt harus diisi timestamp');

  // Pencabutan terjadi DI DALAM transaksi (atomik dengan penggantian hash).
  assert.ok(ops.indexOf('revokeAll') > ops.indexOf('tx-start'), 'pencabutan harus setelah transaksi mulai');
  assert.ok(ops.indexOf('revokeAll') < ops.indexOf('tx-commit'), 'pencabutan tidak boleh menunggu commit');
  assert.ok(!ops.includes('revokeAll-di-luar-transaksi'), 'tidak boleh mencabut lewat klien non-transaksi');
});

test('T1b — changePassword mencabut seluruh refresh token di dalam transaksi yang sama', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const prisma = makePrisma({ user, resetRow: null });

  const result = await makeService(prisma).changePassword(USER_ID, {
    currentPassword: OLD_PASSWORD,
    newPassword: NEW_PASSWORD,
  });
  assert.deepEqual(result, { success: true });

  const ops = prisma.events.map((e) => e.op);
  const userUpdate = prisma.events.find((e) => e.op === 'executeRaw' && /UPDATE "User"/.test(e.sql));
  assert.ok(userUpdate, 'harus meng-update User');
  assert.match(userUpdate.sql, /"passwordChangedAt" = NOW\(\)/);

  const revocation = prisma.events.find((e) => e.op === 'revokeAll');
  assert.ok(revocation, 'refresh token user HARUS dicabut saat ganti password');
  assert.deepEqual(revocation.args.where, { userId: USER_ID, revokedAt: null });
  assert.ok(ops.indexOf('revokeAll') > ops.indexOf('tx-start') && ops.indexOf('revokeAll') < ops.indexOf('tx-commit'));
});

test('T1c — password lama yang salah tidak mengubah apa pun', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const prisma = makePrisma({ user, resetRow: null });

  await assert.rejects(
    () => makeService(prisma).changePassword(USER_ID, { currentPassword: 'PastiSalah999', newPassword: NEW_PASSWORD }),
    /Password lama tidak sesuai/,
  );

  assert.equal(prisma.events.length, 0, 'verifikasi gagal tidak boleh menulis/mentransaksikan apa pun');
});

test('T1d — reset token yang sudah dipakai ditolak sebelum menyentuh password', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const resetRow = { userId: USER_ID, usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) };
  const prisma = makePrisma({ user, resetRow });

  await assert.rejects(
    () => makeService(prisma).resetPassword({ token: RAW_RESET_TOKEN, newPassword: NEW_PASSWORD }),
    /sudah pernah digunakan/,
  );

  assert.equal(prisma.events.length, 0, 'token sekali pakai tidak boleh memicu transaksi apa pun');
});

test('T1e — reset token dicari sebagai SHA-256, bukan token mentah', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const resetRow = { userId: USER_ID, usedAt: null, expiresAt: new Date(Date.now() + 60_000) };
  const prisma = makePrisma({ user, resetRow });

  let captured = null;
  const originalQueryRaw = prisma.$queryRaw;
  prisma.$queryRaw = async (query) => {
    captured = query;
    return originalQueryRaw(query);
  };

  await makeService(prisma).resetPassword({ token: RAW_RESET_TOKEN, newPassword: NEW_PASSWORD });

  assert.ok(captured, 'harus ada query pembacaan token');
  const serialized = JSON.stringify(captured);
  assert.ok(serialized.includes(RESET_TOKEN_HASH), 'harus mencari hash SHA-256 token');
  assert.ok(!serialized.includes(RAW_RESET_TOKEN), 'token mentah tidak boleh dikirim ke query');
});

test('T6 - request yang kalah claim reset token tidak boleh mengubah password', async () => {
  const user = { id: USER_ID, isActive: true, passwordHash: OLD_PASSWORD_HASH };
  const resetRow = { userId: USER_ID, usedAt: null, expiresAt: new Date(Date.now() + 60_000) };
  const prisma = makePrisma({ user, resetRow, resetClaimCount: 0 });

  await assert.rejects(
    () => makeService(prisma).resetPassword({ token: RAW_RESET_TOKEN, newPassword: NEW_PASSWORD }),
    /sudah digunakan/,
  );

  const userUpdates = prisma.events.filter((e) => e.op === 'executeRaw' && /UPDATE "User"/.test(e.sql));
  assert.equal(userUpdates.length, 0, 'loser claim tidak boleh mengubah password');
  assert.equal(prisma.events.filter((e) => e.op === 'revokeAll').length, 0, 'loser claim tidak boleh mencabut sesi');
  assert.equal(prisma.events.some((e) => e.op === 'tx-commit'), false, 'transaksi loser harus rollback');
});
