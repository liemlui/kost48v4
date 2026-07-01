/**
 * Y-K4 — API Contract: Admin Endpoints
 * ======================================
 * Memverifikasi:
 *  - Admin bisa akses endpoint CRUD standar
 *  - Admin TIDAK bisa akses endpoint OWNER-only → 403
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

function assertSuccess(res) {
  const code = res.req.method === 'POST' ? 201 : 200;
  assert.strictEqual(res.status, code, `Expected ${code}, got ${res.status} — ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.success, true, 'success must be true');
}

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
// Section 1: Admin dapat akses shared ADMIN/OWNER endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K4.1 — Admin akses shared endpoints → 200', () => {
  it('GET /api/accounting/accounts → 200', async () => {
    const res = await adminReq.get('/api/accounting/accounts');
    assertSuccess(res);
  });

  it('GET /api/accounting/periods → 200', async () => {
    const res = await adminReq.get('/api/accounting/periods');
    assertSuccess(res);
  });

  it('GET /api/invoices → 200', async () => {
    const res = await adminReq.get('/api/invoices');
    assertSuccess(res);
  });

  it('GET /api/tenants → 200', async () => {
    const res = await adminReq.get('/api/tenants');
    assertSuccess(res);
  });

  it('GET /api/rooms → 200', async () => {
    const res = await adminReq.get('/api/rooms');
    assertSuccess(res);
  });

  it('GET /api/expenses → 200', async () => {
    const res = await adminReq.get('/api/expenses');
    assertSuccess(res);
  });

  it('GET /api/announcements → 200', async () => {
    const res = await adminReq.get('/api/announcements');
    assertSuccess(res);
  });

  it('GET /api/finance/business-health → 200', async () => {
    const res = await adminReq.get('/api/finance/business-health');
    assertSuccess(res);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Admin TIDAK bisa akses OWNER-only endpoints → 403
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K4.2 — Admin ditolak di OWNER-only endpoint → 403', () => {
  it('POST /api/accounting/period-close/post → 403', async () => {
    const res = await adminReq.post('/api/accounting/period-close/post').send({});
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('POST /api/accounting/period-close/reopen → 403', async () => {
    const res = await adminReq.post('/api/accounting/period-close/reopen').send({});
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('POST /api/accounting/periods → 403', async () => {
    const res = await adminReq.post('/api/accounting/periods').send({ year: 2099, month: 12 });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('POST /api/accounting/opening-balances/draft → 403', async () => {
    const res = await adminReq.post('/api/accounting/opening-balances/draft').send({});
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('POST /api/accounting/auto-journal/backfill → 403', async () => {
    const res = await adminReq.post('/api/accounting/auto-journal/backfill').send({});
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  it('PUT /api/settings/operational → 403', async () => {
    const res = await adminReq.put('/api/settings/operational').send({});
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });
});
