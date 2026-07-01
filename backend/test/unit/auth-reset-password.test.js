const test = require('node:test');
const assert = require('node:assert');

// W-02: Unit test untuk AuthService.resetPassword — 4 validasi kunci:
// (a) token expired → ditolak
// (b) token reused → ditolak
// (c) password sama dengan sebelumnya → ditolak
// (d) user inactive → ditolak
// (e) token tidak valid (tidak ada di DB) → ditolak

// ── Mock bcrypt BEFORE loading AuthService ────────────────────────────────
const bcryptPath = require.resolve('bcryptjs');
const realBcrypt = require(bcryptPath);
const mockBcrypt = Object.assign({}, realBcrypt);
let compareResult = false;
mockBcrypt.compare = async () => compareResult;
mockBcrypt.hash = async (pw) => `hash:${pw}`;
require.cache[bcryptPath] = { id: bcryptPath, filename: bcryptPath, loaded: true, exports: mockBcrypt };

const { AuthService } = require('../../dist/auth/auth.service.js');

// ── Helper: bangun AuthService dengan dependency mock ──────────────────────
function buildService({ tokenRows, userRecord }) {
  const prisma = {
    $queryRaw: async () => tokenRows,
    user: {
      findUnique: async () => userRecord,
    },
    $transaction: async (cb) => cb({
      $executeRaw: async () => {},
    }),
  };
  const jwtService = {};
  const configService = {};
  compareResult = userRecord?.passwordHash === 'same-as-old';
  return new AuthService(prisma, jwtService, configService);
}

// ── (a) Token expired ──────────────────────────────────────────────────────
test('resetPassword rejects expired token', async () => {
  const service = buildService({
    tokenRows: [{ userId: 1, usedAt: null, expiresAt: new Date('2020-01-01') }],
    userRecord: { id: 1, isActive: true, passwordHash: 'oldhash' },
  });

  await assert.rejects(
    () => service.resetPassword({ token: 'valid-token', newPassword: 'NewP4ssword!' }),
    /Token reset sudah kedaluwarsa/,
  );
});

// ── (b) Token reused ───────────────────────────────────────────────────────
test('resetPassword rejects already-used token', async () => {
  const service = buildService({
    tokenRows: [{ userId: 1, usedAt: new Date(), expiresAt: new Date('2099-12-31') }],
    userRecord: { id: 1, isActive: true, passwordHash: 'oldhash' },
  });

  await assert.rejects(
    () => service.resetPassword({ token: 'used-token', newPassword: 'NewP4ssword!' }),
    /Token reset sudah pernah digunakan/,
  );
});

// ── (c) Password sama — harus ditolak ──────────────────────────────────────
test('resetPassword rejects same-as-old password', async () => {
  const service = buildService({
    tokenRows: [{ userId: 1, usedAt: null, expiresAt: new Date('2099-12-31') }],
    userRecord: { id: 1, isActive: true, passwordHash: 'same-as-old' },
  });

  await assert.rejects(
    () => service.resetPassword({ token: 'valid-token', newPassword: 'SameOldPassword' }),
    /Password baru harus berbeda dari password lama/,
  );
});

// ── (d) User inactive ──────────────────────────────────────────────────────
test('resetPassword rejects inactive user', async () => {
  const service = buildService({
    tokenRows: [{ userId: 1, usedAt: null, expiresAt: new Date('2099-12-31') }],
    userRecord: { id: 1, isActive: false, passwordHash: 'oldhash' },
  });

  await assert.rejects(
    () => service.resetPassword({ token: 'valid-token', newPassword: 'NewP4ssword!' }),
    /User tidak aktif/,
  );
});

// ── (e) Token tidak valid ──────────────────────────────────────────────────
test('resetPassword rejects non-existent token', async () => {
  const service = buildService({
    tokenRows: [],
    userRecord: null,
  });

  await assert.rejects(
    () => service.resetPassword({ token: 'nonexistent', newPassword: 'NewP4ssword!' }),
    /Token reset tidak valid/,
  );
});
