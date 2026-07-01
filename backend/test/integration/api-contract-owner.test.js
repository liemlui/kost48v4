/**
 * Y-K5 — API Contract: Owner Endpoints
 * ======================================
 * Memverifikasi:
 *  - Owner bisa akses SEMUA endpoint termasuk OWNER-only
 *  - Owner bisa akses AI, settings, accounting sensitive
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

function assertSuccess(res) {
  const code = res.req.method === 'POST' ? 201 : 200;
  assert.strictEqual(res.status, code, `Expected ${code}, got ${res.status} — ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.success, true, 'success must be true');
}

let app, request, ownerReq;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
  await getToken('OWNER', request);
  ownerReq = withAuth(request, 'OWNER');
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Owner akses OWNER-only accounting endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K5.1 — Owner akses accounting sensitive → 200', () => {
  it('GET /api/accounting/accounts → 200', async () => {
    const res = await ownerReq.get('/api/accounting/accounts');
    assertSuccess(res);
  });

  it('GET /api/accounting/period-close/auto-policy → 200', async () => {
    const res = await ownerReq.get('/api/accounting/period-close/auto-policy');
    assertSuccess(res);
  });

  it('GET /api/accounting/cash-accounts → 200', async () => {
    const res = await ownerReq.get('/api/accounting/cash-accounts');
    assertSuccess(res);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Owner akses settings & AI endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K5.2 — Owner akses settings & AI → 200', () => {
  it('GET /api/settings/operational → 200', async () => {
    const res = await ownerReq.get('/api/settings/operational');
    assertSuccess(res);
  });

  it('GET /api/finance/business-health → 200', async () => {
    const res = await ownerReq.get('/api/finance/business-health');
    assertSuccess(res);
  });

  it('GET /api/finance/owner-dashboard → 200', async () => {
    const res = await ownerReq.get('/api/finance/owner-dashboard');
    assertSuccess(res);
  });

  it('GET /api/analytics/finance/summary → 200', async () => {
    const res = await ownerReq.get('/api/analytics/finance/summary');
    assertSuccess(res);
  });

  it('GET /api/analytics/strategy/summary → 200', async () => {
    const res = await ownerReq.get('/api/analytics/strategy/summary');
    assertSuccess(res);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Owner akses shared & admin endpoints juga
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-K5.3 — Owner akses shared endpoints → 200', () => {
  it('GET /api/invoices → 200', async () => {
    const res = await ownerReq.get('/api/invoices');
    assertSuccess(res);
  });

  it('GET /api/rooms → 200', async () => {
    const res = await ownerReq.get('/api/rooms');
    assertSuccess(res);
  });

  it('GET /api/stays → 200', async () => {
    const res = await ownerReq.get('/api/stays');
    assertSuccess(res);
  });

  it('GET /api/analytics/marketing/summary → 200', async () => {
    const res = await ownerReq.get('/api/analytics/marketing/summary');
    assertSuccess(res);
  });
});
