/**
 * Y-K3 — API Contract: Staff Endpoints
 * ======================================
 * Memverifikasi:
 *  - Endpoint STAFF: 401 tanpa token
 *  - STAFF-only endpoints: ADMIN tidak bisa akses → 403
 *  - Shared endpoints: STAFF bisa akses (bersama OWNER/ADMIN)
 *
 * Prasyarat: DB UAT running + ter-seed.
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

let app, request, staffReq, adminReq;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
  await getToken('STAFF', request);
  await getToken('ADMIN', request);
  staffReq = withAuth(request, 'STAFF');
  adminReq = withAuth(request, 'ADMIN');
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: STAFF Guard — endpoint STAFF 401 tanpa token
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K3.1 — Guard: staff endpoints tanpa token → 401', () => {
  it('GET /api/staff-routines/today → 401', async () => {
    const res = await request.get('/api/staff-routines/today');
    assertError(res, 401);
  });

  it('GET /api/staff-performance/me/monthly → 401', async () => {
    const res = await request.get('/api/staff-performance/me/monthly');
    assertError(res, 401);
  });

  it('GET /api/tickets → 401', async () => {
    const res = await request.get('/api/tickets');
    assertError(res, 401);
  });

  it('GET /api/staff-field-reports → 401', async () => {
    const res = await request.get('/api/staff-field-reports');
    assertError(res, 401);
  });

  it('GET /api/inventory-items → 401', async () => {
    const res = await request.get('/api/inventory-items');
    assertError(res, 401);
  });

  it('GET /api/meter-readings → 401', async () => {
    const res = await request.get('/api/meter-readings');
    assertError(res, 401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: STAFF dapat akses shared endpoints (bersama OWNER/ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K3.2 — Staff dapat akses shared endpoints → 200', () => {
  it('GET /api/tickets → 200 + data.items', async () => {
    const res = await staffReq.get('/api/tickets');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });

  it('GET /api/inventory-items → 200 + data.items', async () => {
    const res = await staffReq.get('/api/inventory-items');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });

  it('GET /api/meter-readings → 200', async () => {
    const res = await staffReq.get('/api/meter-readings');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });

  it('GET /api/rooms → 200 + data.items', async () => {
    const res = await staffReq.get('/api/rooms');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });

  it('GET /api/staff-field-reports → 200', async () => {
    const res = await staffReq.get('/api/staff-field-reports');
    assertSuccess(res);
    assert.ok(res.body.data !== undefined, 'data harus ada');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: STAFF-only endpoints — ADMIN tidak bisa akses
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K3.3 — Role guard: ADMIN ditolak di STAFF-only endpoint → 403', () => {
  it('GET /api/staff-routines/today → 403', async () => {
    const res = await adminReq.get('/api/staff-routines/today');
    assert.ok(res.status === 403 || res.status === 401,
      `Expected 403/401, got ${res.status}`);
  });

  it('GET /api/staff-performance/me/monthly → 403', async () => {
    const res = await adminReq.get('/api/staff-performance/me/monthly');
    assert.ok(res.status === 403 || res.status === 401);
  });
});
