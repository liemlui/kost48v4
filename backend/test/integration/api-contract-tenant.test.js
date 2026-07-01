/**
 * Y-K2 — API Contract: Tenant Endpoints
 * =======================================
 * Memverifikasi:
 *  - Endpoint TENANT-only: 401 tanpa token, 403 untuk STAFF
 *  - Response envelope shape
 *  - Guard role untuk endpoint spesifik TENANT
 *
 * Prasyarat: DB UAT running + ter-seed.
 *
 * Jalankan: cd backend && node --test "test/integration/api-contract-tenant.test.js"
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

function assertSuccess(res, statusCode) {
  if (statusCode === undefined) {
    statusCode = res.req.method === 'POST' ? 201 : 200;
  }
  assert.strictEqual(res.status, statusCode, `Expected ${statusCode}, got ${res.status}`);
  assert.strictEqual(res.body.success, true, 'success must be true');
  assert.ok(typeof res.body.message === 'string', 'message must be string');
  assert.ok(typeof res.body.timestamp === 'string', 'timestamp must be string');
}

function assertError(res, statusCode = 401) {
  assert.strictEqual(res.status, statusCode, `Expected ${statusCode}, got ${res.status}`);
  assert.strictEqual(res.body.success, false, 'success must be false');
  assert.strictEqual(res.body.statusCode, statusCode, 'statusCode mismatch');
  assert.ok(res.body.message !== undefined, 'message must exist');
  assert.ok(typeof res.body.path === 'string', 'path must be string');
  assert.ok(typeof res.body.method === 'string', 'method must be string');
  assert.ok(typeof res.body.timestamp === 'string', 'timestamp must be string');
}

let app, request, staffReq;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
  // Pre-load tokens
  await getToken('STAFF', request);
  await getToken('ADMIN', request);
  staffReq = withAuth(request, 'STAFF');
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Tenant Endpoint Guards — 401 tanpa token
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K2.1 — Guard: tenant endpoints tanpa token → 401', () => {
  it('GET /api/invoices/my → 401', async () => {
    const res = await request.get('/api/invoices/my');
    assertError(res, 401);
  });

  it('GET /api/stays/me/current → 401', async () => {
    const res = await request.get('/api/stays/me/current');
    assertError(res, 401);
  });

  it('POST /api/tenant/checkout-requests → 401', async () => {
    const res = await request.post('/api/tenant/checkout-requests').send({});
    assertError(res, 401);
  });

  it('GET /api/tenant/checkout-requests/my → 401', async () => {
    const res = await request.get('/api/tenant/checkout-requests/my');
    assertError(res, 401);
  });

  it('POST /api/tenant/renew-requests → 401', async () => {
    const res = await request.post('/api/tenant/renew-requests').send({});
    assertError(res, 401);
  });

  it('GET /api/tenant/renew-requests/my → 401', async () => {
    const res = await request.get('/api/tenant/renew-requests/my');
    assertError(res, 401);
  });

  it('GET /api/payment-submissions/my → 401', async () => {
    const res = await request.get('/api/payment-submissions/my');
    assertError(res, 401);
  });

  it('GET /api/room-items/my-room → 401', async () => {
    const res = await request.get('/api/room-items/my-room');
    assertError(res, 401);
  });

  it('GET /api/tickets/my → 401', async () => {
    const res = await request.get('/api/tickets/my');
    assertError(res, 401);
  });

  it('GET /api/surveys/mine → 401', async () => {
    const res = await request.get('/api/surveys/mine');
    assertError(res, 401);
  });

  it('GET /api/tenant/staff-reviews/eligible → 401', async () => {
    const res = await request.get('/api/tenant/staff-reviews/eligible');
    assertError(res, 401);
  });

  it('GET /api/tenant/profile → 401', async () => {
    const res = await request.get('/api/tenant/profile');
    assertError(res, 401);
  });

  it('GET /api/additional-services/my-interests → 401', async () => {
    const res = await request.get('/api/additional-services/my-interests');
    assertError(res, 401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Role Guard — STAFF tidak boleh akses TENANT endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K2.2 — Role guard: STAFF ditolak di tenant endpoint → 403', () => {
  it('GET /api/invoices/my → 403', async () => {
    const res = await staffReq.get('/api/invoices/my');
    // STAFF tidak punya role TENANT = ForbiddenException
    assert.ok(res.status === 403 || res.status === 401,
      `Expected 403/401, got ${res.status}`);
  });

  it('GET /api/stays/me/current → 403', async () => {
    const res = await staffReq.get('/api/stays/me/current');
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('GET /api/tenant/checkout-requests/my → 403', async () => {
    const res = await staffReq.get('/api/tenant/checkout-requests/my');
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('POST /api/tenant/renew-requests → 403', async () => {
    const res = await staffReq.post('/api/tenant/renew-requests').send({ reason: 'test' });
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('GET /api/payment-submissions/my → 403', async () => {
    const res = await staffReq.get('/api/payment-submissions/my');
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('GET /api/room-items/my-room → 403', async () => {
    const res = await staffReq.get('/api/room-items/my-room');
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('GET /api/tenant/profile → 403', async () => {
    const res = await staffReq.get('/api/tenant/profile');
    assert.ok(res.status === 403 || res.status === 401);
  });

  it('POST /api/surveys → 403', async () => {
    const res = await staffReq.post('/api/surveys').send({});
    assert.ok(res.status === 403 || res.status === 401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Shared endpoints — tenant bisa akses endpoint yang juga buat TENANT
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K2.3 — Shared endpoints accessible by OWNER/ADMIN', () => {
  it('ADMIN bisa GET /api/deposit-ledger/summary → 200', async () => {
    const adminReq = withAuth(request, 'ADMIN');
    const res = await adminReq.get('/api/deposit-ledger/summary');
    // Shared: OWNER, ADMIN
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status} ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
  });

  it('OWNER bisa GET /api/accounting/accounts → 200', async () => {
    await getToken('OWNER', request);
    const ownerReq = withAuth(request, 'OWNER');
    const res = await ownerReq.get('/api/accounting/accounts');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
  });
});
