/**
 * Y-L — Backend: Role & Authorization Matrix Tests
 * =================================================
 * Memverifikasi:
 *  - Y-L2: Tenant data isolation (IDOR prevention) — tenant tidak bisa lihat data tenant lain
 *  - Y-L5: Deactivated user → 401 pada semua endpoint
 *
 * Prasyarat: DB UAT running + ter-seed.
 *
 * Ketergantungan credential tenant (TENANT_A, TENANT_B) ditambahkan
 * di supertest-helper.js berdasarkan data seed `seed-dev-via-api.js`.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function assertSuccess(res, statusCode) {
  const code = statusCode ?? (res.req.method === 'POST' ? 201 : 200);
  assert.strictEqual(
    res.status, code,
    `Expected ${code}, got ${res.status} — ${JSON.stringify(res.body)}`,
  );
  assert.strictEqual(res.body.success, true, 'success must be true');
}

function assertError(res, statusCode = 401) {
  assert.strictEqual(
    res.status, statusCode,
    `Expected ${statusCode}, got ${res.status} — ${JSON.stringify(res.body)}`,
  );
  assert.strictEqual(res.body.success, false, 'success must be false');
  assert.strictEqual(res.body.statusCode, statusCode, 'statusCode mismatch');
  assert.ok(res.body.message !== undefined, 'message must exist');
}

// ─────────────────────────────────────────────────────────────────────────────
// Globals — populated in `before`
// ─────────────────────────────────────────────────────────────────────────────

let app, request;
let ownerReq, staffReq, tenantAReq, tenantBReq;

// IDs discovered from DB
let userStaffId;           // STAFF user's DB id (for deactivation test)
let stayAId, stayBId;     // Stay IDs belonging to two different tenants
let tenantAId, tenantBId; // Tenant IDs for deposit-ledger IDOR test

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;

  // Load tokens
  await getToken('OWNER', request);
  await getToken('STAFF', request);
  await getToken('TENANT_A', request);
  await getToken('TENANT_B', request);

  ownerReq = withAuth(request, 'OWNER');
  staffReq = withAuth(request, 'STAFF');
  tenantAReq = withAuth(request, 'TENANT_A');
  tenantBReq = withAuth(request, 'TENANT_B');

  // ── Discover IDs ──────────────────────────────────────────────────────

  // 1) Fetch full stays list from OWNER as fallback
  let allStays = [];
  try {
    const staysRes = await ownerReq.get('/api/stays?page=1&limit=50');
    allStays = staysRes.body?.data?.items ?? [];
  } catch { /* will fall back to empty */ }

  // 2) Each tenant discovers their OWN stay via /api/stays/me/current
  try {
    const myStayA = await tenantAReq.get('/api/stays/me/current');
    if (myStayA.body?.success && myStayA.body?.data) {
      stayAId = myStayA.body.data.id;
      tenantAId = myStayA.body.data.tenantId;
    }
  } catch { /* fallback below */ }

  // If TENANT_A's /me/current failed, find a stay with any tenantId
  if (!stayAId && allStays.length > 0) {
    stayAId = allStays[0].id;
    tenantAId = allStays[0].tenantId;
  }

  // TENANT_B: try /me/current first, then find a DIFFERENT tenant from the list
  try {
    const myStayB = await tenantBReq.get('/api/stays/me/current');
    if (myStayB.body?.success && myStayB.body?.data) {
      stayBId = myStayB.body.data.id;
      tenantBId = myStayB.body.data.tenantId;
    }
  } catch { /* fallback below */ }

  // If TENANT_B's stay wasn't found via /me/current, find a stay with
  // a DIFFERENT tenantId from TENANT_A
  if (!stayBId && tenantAId && allStays.length > 1) {
    const other = allStays.find((s) => s.tenantId !== tenantAId);
    if (other) {
      stayBId = other.id;
      tenantBId = other.tenantId;
    }
  }

  // 3) STAFF user ID — fetch users filtered by role=STAFF
  try {
    const usersRes = await ownerReq.get('/api/users?limit=50&role=STAFF');
    const users = usersRes.body?.data?.items ?? [];
    const staffUser = users.find((u) => u.role === 'STAFF');
    if (staffUser) userStaffId = staffUser.id;
  } catch { /* prerequisite will skip */ }
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-L2: Tenant Data Isolation (IDOR Prevention)
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-L2 — Tenant data isolation (IDOR prevention)', () => {
  it('prerequisite — dua tenant berbeda ditemukan', () => {
    assert.ok(stayAId, 'stayAId harus ditemukan dari /api/stays/me/current TENANT_A');
    assert.ok(stayBId, 'stayBId harus ditemukan dari /api/stays/me/current TENANT_B');
    assert.ok(tenantAId, 'tenantAId harus ditemukan');
    assert.ok(tenantBId, 'tenantBId harus ditemukan');
    assert.notStrictEqual(
      tenantAId, tenantBId,
      `tenantAId (${tenantAId}) dan tenantBId (${tenantBId}) harus berbeda`,
    );
  });

  it('TENANT_A bisa akses stay milik sendiri → 200', async () => {
    const res = await tenantAReq.get(`/api/stays/${stayAId}`);
    assertSuccess(res);
    assert.strictEqual(
      res.body.data?.tenantId ?? res.body.data?.stay?.tenantId,
      tenantAId,
      'stay harus milik tenant A',
    );
  });

  it('TENANT_A tidak bisa akses stay TENANT_B → 404 (IDOR blocked)', async () => {
    const res = await tenantAReq.get(`/api/stays/${stayBId}`);
    assertError(res, 404);
  });

  it('TENANT_B tidak bisa akses stay TENANT_A → 404 (IDOR blocked)', async () => {
    const res = await tenantBReq.get(`/api/stays/${stayAId}`);
    assertError(res, 404);
  });

  it('TENANT_A tidak bisa akses deposit ledger stay TENANT_B → 403 (IDOR blocked)', async () => {
    const res = await tenantAReq.get(`/api/deposit-ledger/stays/${stayBId}`);
    // Deposit ledger returns 403 Forbidden (not 404) untuk IDOR
    assert.ok(
      res.status === 403 || res.status === 404,
      `Expected 403/404, got ${res.status} — ${JSON.stringify(res.body)}`,
    );
    assert.strictEqual(res.body.success, false, 'success must be false');
  });

  it('TENANT_A tidak bisa akses deposit ledger tenant TENANT_B → 403 (IDOR blocked)', async () => {
    const res = await tenantAReq.get(`/api/deposit-ledger/tenants/${tenantBId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `Expected 403/404, got ${res.status} — ${JSON.stringify(res.body)}`,
    );
    assert.strictEqual(res.body.success, false, 'success must be false');
  });

  it('TENANT_B tidak bisa akses deposit ledger tenant TENANT_A → 403 (IDOR blocked)', async () => {
    const res = await tenantBReq.get(`/api/deposit-ledger/tenants/${tenantAId}`);
    assert.ok(
      res.status === 403 || res.status === 404,
      `Expected 403/404, got ${res.status} — ${JSON.stringify(res.body)}`,
    );
    assert.strictEqual(res.body.success, false, 'success must be false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-L5: Deactivated User Guard
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-L5 — Deactivated user → 401 semua endpoint', () => {
  it('prerequisite — STAFF user ID ditemukan', () => {
    assert.ok(userStaffId, 'userStaffId harus ditemukan dari DB via GET /api/users?role=STAFF');
  });

  it('STAFF bisa akses endpoint sebelum dideaktivasi → 200', async () => {
    const res = await staffReq.get('/api/tickets');
    assertSuccess(res);
  });

  it('OWNER deaktivasi STAFF user (isActive=false) → 200', async () => {
    const res = await ownerReq.patch(`/api/users/${userStaffId}`).send({ isActive: false });
    assertSuccess(res);
  });

  it('STAFF yang sudah dideaktivasi ditolak → 401', async () => {
    const res = await staffReq.get('/api/tickets');
    assertError(res, 401);
    const msg = (res.body.message ?? '').toLowerCase();
    assert.ok(
      msg.includes('tidak aktif') || msg.includes('dicabut') || msg.includes('aktivasi'),
      `Pesan error harus menyebut deaktivasi: "${res.body.message}"`,
    );
  });

  it('OWNER re-aktivasi STAFF user (isActive=true) → 200', async () => {
    const res = await ownerReq.patch(`/api/users/${userStaffId}`).send({ isActive: true });
    assertSuccess(res);
  });

  it('STAFF bisa akses lagi setelah direaktivasi → 200', async () => {
    const res = await staffReq.get('/api/tickets');
    assertSuccess(res);
  });
});
