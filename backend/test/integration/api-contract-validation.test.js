/**
 * Y-K6 — API Contract: Input Validation
 * =======================================
 * Memverifikasi DTO constraints:
 *  - Missing required fields → 400
 *  - Invalid types → 400
 *  - Boundary validation → 400
 *  - Error message format (array of strings)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

let app, request, adminReq;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
  await getToken('ADMIN', request);
  adminReq = withAuth(request, 'ADMIN');
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Missing required fields
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K6.1 — Missing required fields → 400', () => {
  it('POST /api/auth/login tanpa body → 400 + message array', async () => {
    const res = await request.post('/api/auth/login').send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(Array.isArray(res.body.message) || typeof res.body.message === 'string',
      'message harus string atau array');
  });

  it('POST /api/expenses tanpa body (admin) → 400', async () => {
    const res = await adminReq.post('/api/expenses').send({});
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  it('POST /api/invoices tanpa body (admin) → 400', async () => {
    const res = await adminReq.post('/api/invoices').send({});
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Invalid types
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K6.2 — Invalid types → 400', () => {
  it('POST /api/auth/login dengan identifier number → 400', async () => {
    const res = await request.post('/api/auth/login').send({
      identifier: 12345,
      password: 'test',
    });
    assert.strictEqual(res.status, 400);
  });

  it('POST /api/expenses dengan nilai string → 400', async () => {
    const res = await adminReq.post('/api/expenses').send({
      description: 'Test',
      amountRupiah: 'bukan-angka',
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Boundary values
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K6.3 — Boundary validation → 400', () => {
  it('POST /api/auth/forgot-password dengan identifier terlalu pendek → 400', async () => {
    const res = await request.post('/api/auth/forgot-password').send({
      identifier: 'ab',
    });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/public/rooms/:id dengan id string → 400', async () => {
    const res = await request.get('/api/public/rooms/abc');
    assert.strictEqual(res.status, 400);
  });
});
