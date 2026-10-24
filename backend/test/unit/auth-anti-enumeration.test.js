// S5 (docs/kerja/TASK-RUANG-WIZARD.md §8.10 S5) — bukti anti-enumerasi + penguncian percobaan
// pada jalur login. Tiga kontrak yang dikunci:
//   (a) pesan galat identik untuk identifier tak dikenal vs sandi salah;
//   (b) selisih **median** waktu respons dua jalur di bawah ambang di berkas ini —
//       artinya jalur "identifier tak dikenal" benar-benar membayar satu `bcrypt.compare`
//       terhadap hash tiruan, bukan selesai lebih cepat;
//   (c) penguncian aktif setelah N gagal (429 + sisa waktu), AuditLog ditulis dengan
//       identifier tersamar, dan kunci pulih setelah jeda 15 menit (tidak permanen).
//
// CATATAN AMBANG: `MEDIAN_DIFF_LIMIT_MS` sengaja dipilih dari biaya bcrypt nyata, bukan
// dinaikkan supaya lulus. Pada mesin ini satu `bcrypt.compare` cost 10 (bcryptjs) ≈ 98 ms.
// Jalur tanpa hash tiruan (keadaan sebelum S5) akan berselisih ≈ satu bcrypt penuh (~98 ms),
// jadi 20 ms masih memisahkan "sudah setara" dari "belum setara" dengan margin noise ±beberapa ms.
// `bcrypt.hashSync(..., 10)` dipakai untuk hash sandi user di berkas ini: cost-nya harus SAMA
// dengan DUMMY_PASSWORD_HASH (cost 10) supaya perbandingan waktu apple-to-apple.
const assert = require('node:assert/strict');
const test = require('node:test');

const bcrypt = require('bcryptjs');
const { AuthService } = require('../../dist/auth/auth.service.js');

const USER_ID = 42;
const TENANT_ID = 7;
const PASSWORD = 'PasswordLama123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);
const IP = '203.0.113.7';
const WRONG_PASSWORD = 'SandiSalah999';

// Duplikat konstanta produksi (auth.service.ts) — sengaja ditulis di sini supaya test GAGAL
// bila angka di produksi diubah tanpa disadari.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Ambang selisih median waktu respons dua jalur (ms). Lihat catatan di kepala berkas.
const MEDIAN_DIFF_LIMIT_MS = 20;
// Jumlah pengukuran per jalur untuk median.
const TIMING_RUNS = 9;

const START = Date.parse('2026-10-24T00:00:00.000Z');

const makeUser = (overrides = {}) => ({
  id: USER_ID,
  email: 'owner@kost48.test',
  fullName: 'Owner Uji',
  role: 'OWNER',
  tenantId: TENANT_ID,
  isActive: true,
  passwordHash: PASSWORD_HASH,
  passwordChangedAt: new Date('2026-09-01T00:00:00.000Z'),
  ...overrides,
});

const makeJwt = () => ({
  signAsync: async () => 'access-token-baru',
});

/** Prisma tiruan minimal untuk jalur login; setiap operasi direkam untuk diperiksa. */
function makeLoginPrisma({ emailUser = null, phoneUser = null, tenant = null, auditFails = false } = {}) {
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
    auditLog: {
      create: async (args) => {
        events.push({ op: 'auditLog.create', args });
        if (auditFails) throw new Error('audit down');
        return {};
      },
    },
  };
}

const makeService = (prisma) =>
  new AuthService(prisma, makeJwt(), { get: () => undefined, getOrThrow: () => 'x'.repeat(40) });

const auditRowsOf = (prisma) => prisma.events.filter((event) => event.op === 'auditLog.create');

const captureError = async (run) => {
  try {
    await run();
  } catch (err) {
    return err;
  }
  throw new Error('diharapkan melempar galat, tetapi berhasil');
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** Biaya satu `bcrypt.compare` cost 10 di mesin ini — pembanding ambang waktu. */
const measureBcryptCostMs = (runs = 3) => {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    const startedAt = process.hrtime.bigint();
    bcrypt.compareSync(WRONG_PASSWORD, PASSWORD_HASH);
    samples.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
  }
  return median(samples);
};

test('ENUM-1 — pesan galat identik: identifier tak dikenal vs sandi salah', async () => {
  const unknownPrisma = makeLoginPrisma({ emailUser: null });
  const unknownErr = await captureError(() =>
    makeService(unknownPrisma).login({ identifier: 'hantu@kost48.test', password: PASSWORD }, { ip: IP }),
  );

  const wrongPrisma = makeLoginPrisma({ emailUser: makeUser() });
  const wrongErr = await captureError(() =>
    makeService(wrongPrisma).login({ identifier: 'owner@kost48.test', password: WRONG_PASSWORD }, { ip: IP }),
  );

  assert.equal(unknownErr.message, wrongErr.message, 'pesan galat dua jalur harus identik');
  assert.match(unknownErr.message, /Email\/nomor HP atau password salah/);
  assert.equal(unknownErr.getStatus(), 401);
  assert.equal(wrongErr.getStatus(), 401, 'status HTTP dua jalur juga harus identik');

  // Jalur identifier tak dikenal tidak boleh memberi sinyal apa pun selain galat yang sama.
  assert.equal(unknownPrisma.events.some((event) => event.op === 'refreshToken.create'), false);
  assert.equal(unknownPrisma.events.some((event) => event.op === 'user.update'), false);
});

test('ENUM-2 — median selisih waktu respons dua jalur di bawah ambang', async (t) => {
  const unknownDurations = [];
  const wrongDurations = [];

  const timeOf = async (run) => {
    const startedAt = process.hrtime.bigint();
    await captureError(run);
    return Number(process.hrtime.bigint() - startedAt) / 1e6;
  };

  const runUnknownPath = () => {
    const unknownPrisma = makeLoginPrisma({ emailUser: null });
    return makeService(unknownPrisma).login({ identifier: 'hantu@kost48.test', password: PASSWORD }, { ip: IP });
  };

  const runWrongPasswordPath = () => {
    const wrongPrisma = makeLoginPrisma({ emailUser: makeUser() });
    return makeService(wrongPrisma).login(
      { identifier: 'owner@kost48.test', password: WRONG_PASSWORD },
      { ip: IP },
    );
  };

  // Pemanasan (dibuang): dua jalur sama-sama memanaskan JIT dan bcrypt sebelum diukur,
  // supaya selisih yang terukur adalah perbedaan jalur, bukan perbedaan pemanasan.
  for (let i = 0; i < 2; i += 1) {
    await timeOf(runUnknownPath);
    await timeOf(runWrongPasswordPath);
  }

  for (let i = 0; i < TIMING_RUNS; i += 1) {
    // Instance baru tiap percobaan: peta penguncian selalu bersih sehingga tidak ada
    // percobaan yang berubah jadi 429 di tengah pengukuran.
    unknownDurations.push(await timeOf(runUnknownPath));
    wrongDurations.push(await timeOf(runWrongPasswordPath));
  }

  const bcryptCostMs = measureBcryptCostMs();
  const unknownMedian = median(unknownDurations);
  const wrongMedian = median(wrongDurations);
  const diff = Math.abs(unknownMedian - wrongMedian);

  t.diagnostic(
    `bcrypt.compare cost-10 ≈ ${bcryptCostMs.toFixed(1)} ms · median identifier tak dikenal ${unknownMedian.toFixed(1)} ms ` +
      `(min ${Math.min(...unknownDurations).toFixed(1)} / maks ${Math.max(...unknownDurations).toFixed(1)}) · ` +
      `median sandi salah ${wrongMedian.toFixed(1)} ms ` +
      `(min ${Math.min(...wrongDurations).toFixed(1)} / maks ${Math.max(...wrongDurations).toFixed(1)}) · ` +
      `selisih ${diff.toFixed(1)} ms (ambang ${MEDIAN_DIFF_LIMIT_MS} ms)`,
  );

  // Pagar struktural: kedua jalur harus benar-benar membayar bcrypt. Tanpa hash tiruan,
  // jalur identifier tak dikenal selesai dalam < ½ biaya bcrypt dan test ini gagal.
  assert.ok(
    unknownMedian > bcryptCostMs * 0.5,
    `jalur identifier tak dikenal harus membayar satu bcrypt.compare (median ${unknownMedian.toFixed(1)} ms vs biaya ${bcryptCostMs.toFixed(1)} ms)`,
  );
  assert.ok(
    wrongMedian > bcryptCostMs * 0.5,
    `jalur sandi salah harus membayar satu bcrypt.compare (median ${wrongMedian.toFixed(1)} ms)`,
  );
  assert.ok(
    diff < MEDIAN_DIFF_LIMIT_MS,
    `median selisih ${diff.toFixed(1)} ms harus < ${MEDIAN_DIFF_LIMIT_MS} ms — bila gagal, hash tiruan tidak dipakai atau cost-nya tidak setara`,
  );
});

test('ENUM-3 — setelah N gagal: percobaan berikutnya 429 + sisa waktu, AuditLog tersamar, pulih setelah 15 menit', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: START });

  const prisma = makeLoginPrisma({ emailUser: makeUser() });
  const service = makeService(prisma);
  const attempt = () =>
    service.login({ identifier: 'owner@kost48.test', password: WRONG_PASSWORD }, { ip: IP });

  for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i += 1) {
    const err = await captureError(attempt);
    assert.match(
      err.message,
      /Email\/nomor HP atau password salah/,
      `percobaan gagal ke-${i} masih dilaporkan sebagai kredensial salah (bukan 429)`,
    );
    assert.equal(err.getStatus(), 401);
  }

  // Percobaan ke-(N+1): terkunci, pesan menyebut sisa waktu.
  const lockedErr = await captureError(attempt);
  assert.equal(lockedErr.getStatus(), 429);
  assert.match(lockedErr.message, /Terlalu banyak percobaan masuk\. Coba lagi dalam 15 menit\./);

  const auditRows = auditRowsOf(prisma);
  assert.equal(auditRows.length, 1, 'penguncian ditulis ke AuditLog tepat sekali');
  const audit = auditRows[0].args.data;
  assert.equal(audit.action, 'AUTH_LOGIN_LOCKOUT');
  assert.equal(audit.entityType, 'Auth');
  assert.equal(audit.actorUserId, null);
  assert.match(audit.meta.identifierMask, /^email:hmac-[0-9a-f]{12}$/);
  assert.equal(audit.meta.failedAttempts, MAX_FAILED_ATTEMPTS);
  assert.equal(audit.meta.lockedForMinutes, 15);
  assert.equal(audit.meta.clientIp, IP);
  assert.doesNotMatch(
    JSON.stringify(auditRows[0].args),
    /owner@kost48\.test/,
    'identifier lengkap tidak boleh masuk AuditLog',
  );

  // Masih terkunci di menit ke-14 → sisa waktu 1 menit.
  t.mock.timers.tick(LOCKOUT_MS - 60_000);
  const stillLocked = await captureError(attempt);
  assert.equal(stillLocked.getStatus(), 429);
  assert.match(stillLocked.message, /Coba lagi dalam 1 menit\./);

  // Lewat jeda 15 menit: hitungan dibuang (tanpa kunci permanen) dan sandi benar diterima.
  t.mock.timers.tick(60_000 + 1);
  const result = await service.login({ identifier: 'owner@kost48.test', password: PASSWORD }, { ip: IP });
  assert.equal(result.accessToken, 'access-token-baru');
  assert.equal(result.user.role, 'OWNER');

  // AuditLog tidak ditambah lagi saat pulih.
  assert.equal(auditRowsOf(prisma).length, 1);
});

test('ENUM-4 — kunci berlaku per identifier + IP: klien lain tidak ikut terkunci', async () => {
  const prisma = makeLoginPrisma({ emailUser: makeUser() });
  const service = makeService(prisma);

  for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i += 1) {
    await captureError(() =>
      service.login({ identifier: 'owner@kost48.test', password: WRONG_PASSWORD }, { ip: IP }),
    );
  }

  // IP yang sama: terkunci.
  const lockedFromSameIp = await captureError(() =>
    service.login({ identifier: 'owner@kost48.test', password: PASSWORD }, { ip: IP }),
  );
  assert.equal(lockedFromSameIp.getStatus(), 429);

  // IP lain: tidak terkunci, dan sandi benar tetap diterima.
  const result = await service.login(
    { identifier: 'owner@kost48.test', password: PASSWORD },
    { ip: '198.51.100.9' },
  );
  assert.equal(result.accessToken, 'access-token-baru');
});

test('ENUM-5 — AuditLog gagal ditulis tidak membatalkan penguncian', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: START });

  const prisma = makeLoginPrisma({ emailUser: makeUser(), auditFails: true });
  const service = makeService(prisma);
  const attempt = () =>
    service.login({ identifier: 'owner@kost48.test', password: WRONG_PASSWORD }, { ip: IP });

  for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i += 1) {
    await captureError(attempt);
  }

  const lockedErr = await captureError(attempt);
  assert.equal(lockedErr.getStatus(), 429, 'penguncian tetap berlaku walau audit gagal');
  assert.equal(auditRowsOf(prisma).length, 1, 'percobaan menulis audit tetap tercatat di tiruan');
});

test('ENUM-6 — nomor HP 08xx dan 628xx berbagi satu hitungan (tidak bisa diakali bentuk penulisan)', async () => {
  const tenantUser = makeUser({ email: null, role: 'TENANT' });
  const prisma = makeLoginPrisma({ emailUser: null, tenant: { id: TENANT_ID }, phoneUser: tenantUser });
  const service = makeService(prisma);

  for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i += 1) {
    // Bergantian antara bentuk 08xx dan 628xx.
    const identifier = i % 2 === 0 ? '6281234567890' : '081234567890';
    await captureError(() => service.login({ identifier, password: WRONG_PASSWORD }, { ip: IP }));
  }

  const lockedErr = await captureError(() =>
    service.login({ identifier: '081234567890', password: PASSWORD }, { ip: IP }),
  );
  assert.equal(lockedErr.getStatus(), 429, 'dua bentuk nomor yang sama harus berbagi satu kunci');
});
