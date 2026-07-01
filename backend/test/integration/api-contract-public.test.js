/**
 * Y-K1 — API Contract: Public Endpoints (Tanpa Auth)
 * ===================================================
 * Memverifikasi:
 *  - Response envelope shape
 *  - Status code 200 untuk endpoint publik
 *  - 401 untuk endpoint terproteksi tanpa token
 *  - Error response shape
 *
 * Prasyarat: DB UAT running + ter-seed (user seed minimal).
 *
 * Jalankan: cd backend && node --test "test/integration/api-contract-public.test.js"
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp } = require('../helpers/supertest-helper');

/**
 * Helper: assert response envelope success shape.
 * POST endpoints di NestJS default 201 — terima 200/201.
 */
function assertSuccess(res, statusCode) {
  if (statusCode === undefined) {
    // Auto-detect: POST => 201, GET => 200
    statusCode = res.req.method === 'POST' ? 201 : 200;
  }
  assert.strictEqual(res.status, statusCode, `Expected ${statusCode}, got ${res.status}`);
  assert.strictEqual(res.body.success, true, 'success must be true');
  assert.ok(typeof res.body.message === 'string', 'message must be string');
  assert.ok(typeof res.body.timestamp === 'string', 'timestamp must be string');
  // requestId tersedia kalau RequestIdInterceptor jalan (tidak untuk 401 dari guard)
  if (res.body.requestId !== undefined) {
    assert.ok(typeof res.body.requestId === 'string', 'requestId must be string when present');
  }
}

/**
 * Helper: assert error response shape.
 * Catatan: 401 dari JwtAuthGuard terjadi SEBELUM RequestIdInterceptor,
 * sehingga requestId mungkin undefined.
 */
function assertError(res, statusCode = 401) {
  assert.strictEqual(res.status, statusCode, `Expected ${statusCode}, got ${res.status}`);
  assert.strictEqual(res.body.success, false, 'success must be false');
  assert.strictEqual(res.body.statusCode, statusCode, 'statusCode mismatch');
  assert.ok(res.body.message !== undefined, 'message must exist');
  assert.ok(typeof res.body.path === 'string', 'path must be string');
  assert.ok(typeof res.body.method === 'string', 'method must be string');
  assert.ok(typeof res.body.timestamp === 'string', 'timestamp must be string');
}

let app, request;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Auth Endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K1.1 — Auth: POST /api/auth/login', () => {
  it('login valid → 200 + accessToken', async () => {
    const res = await request.post('/api/auth/login').send({
      identifier: 'owner@kost48.com',
      password: 'Owner#2026',
    });
    assertSuccess(res);
    assert.ok(res.body.data.accessToken, 'accessToken harus ada');
    assert.ok(res.body.data.user, 'user object harus ada');
    assert.strictEqual(res.body.data.user.role, 'OWNER');
  });

  it('login dengan password salah → 401', async () => {
    const res = await request.post('/api/auth/login').send({
      identifier: 'owner@kost48.com',
      password: 'salah123',
    });
    assertError(res, 401);
  });

  it('login dengan email tidak dikenal → 401', async () => {
    const res = await request.post('/api/auth/login').send({
      identifier: 'tidak@ada.com',
      password: 'apapun',
    });
    assertError(res, 401);
  });

  it('login tanpa body → 400', async () => {
    const res = await request.post('/api/auth/login').send({});
    assertError(res, 400);
  });
});

describe('Y-K1.2 — Auth: POST /api/auth/forgot-password', () => {
  it('forgot-password dengan identifier valid → 200 (tanpa bocor info user)', async () => {
    const res = await request.post('/api/auth/forgot-password').send({
      identifier: 'owner@kost48.com',
    });
    assertSuccess(res);
    // Aman: selalu return 200 walaupun email tidak dikenal — tidak bocor info
  });

  it('forgot-password tanpa body → 400', async () => {
    const res = await request.post('/api/auth/forgot-password').send({});
    assertError(res, 400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Public Marketing Endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K1.3 — Public: GET /api/faqs/public', () => {
  it('daftar FAQ publik → 200 + array', async () => {
    const res = await request.get('/api/faqs/public');
    assertSuccess(res);
    assert.ok(Array.isArray(res.body.data), 'data harus array');
  });
});

describe('Y-K1.4 — Public: GET /api/public/rooms', () => {
  it('katalog kamar publik → 200 + items array', async () => {
    const res = await request.get('/api/public/rooms');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
    assert.ok(Array.isArray(res.body.data.items), 'data.items harus array');
    assert.ok(res.body.data.meta !== undefined, 'data.meta harus ada');
  });

  it('social proof → 200', async () => {
    const res = await request.get('/api/public/rooms/social-proof');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });
});

describe('Y-K1.5 — Public: GET /api/settings/public-config', () => {
  it('konfigurasi publik → 200', async () => {
    const res = await request.get('/api/settings/public-config');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });
});

describe('Y-K1.6 — Public: GET /api/marketing-assets', () => {
  it('aset marketing publik → 200 + array', async () => {
    const res = await request.get('/api/marketing-assets');
    assertSuccess(res);
    assert.ok(Array.isArray(res.body.data), 'data harus array');
  });
});

describe('Y-K1.7 — Public: GET /api/facility-images', () => {
  it('foto fasilitas publik → 200 + array', async () => {
    const res = await request.get('/api/facility-images');
    assertSuccess(res);
    assert.ok(Array.isArray(res.body.data), 'data harus array');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Guard — Endpoint terproteksi harus 401 tanpa token
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K1.8 — Guard: endpoint terproteksi tanpa auth → 401', () => {
  it('GET /api/auth/me tanpa token → 401', async () => {
    const res = await request.get('/api/auth/me');
    assertError(res, 401);
  });

  it('GET /api/accounting/accounts tanpa token → 401', async () => {
    const res = await request.get('/api/accounting/accounts');
    assertError(res, 401);
  });

  it('GET /api/invoices tanpa token → 401', async () => {
    const res = await request.get('/api/invoices');
    assertError(res, 401);
  });

  it('POST /api/stays tanpa token → 401', async () => {
    const res = await request.post('/api/stays').send({});
    assertError(res, 401);
  });

  it('GET /api/settings/operational tanpa token → 401', async () => {
    const res = await request.get('/api/settings/operational');
    assertError(res, 401);
  });

  it('PATCH /api/auth/me/tip-info tanpa token → 401', async () => {
    const res = await request.patch('/api/auth/me/tip-info').send({});
    assertError(res, 401);
  });
});
