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

// IDs discovered from DB via OWNER
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

  // ── Discover IDs from DB via OWNER ────────────────────────────────────

  // 1) STAFF user ID — for deactivation test
  try {
    const usersRes = await ownerReq.get('/api/users?limit=50');
    const users = usersRes.body?.data?.items ?? usersRes.body?.data ?? [];
    const staffUser = Array.isArray(users)
      ? users.find((u) => u.role === 'STAFF' || u.email === 'staff@kost48.com')
      : null;
    if (staffUser) userStaffId = staffUser.id;
  } catch {
    // non-fatal — prerequisite test will skip
  }

  // 2) Stay IDs for two different tenants — for IDOR test
  try {
    const staysRes = await ownerReq.get('/api/stays?page=1&limit=50');
    const stays = staysRes.body?.data?.items ?? [];
    if (stays.length >= 2) {
      stayAId = stays[0].id;
      tenantAId = stays[0].tenantId;
      for (const s of stays) {
        if (s.tenantId !== tenantAId) {
          stayBId = s.id;
          tenantBId = s.tenantId;
          break;
        }
      }
    }
  } catch {
    // non-fatal — prerequisite test will skip
  }
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-L2: Tenant Data Isolation (IDOR Prevention)
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-L2 — Tenant data isolation (IDOR prevention)', () => {
  it('prerequisite — dua tenant berbeda ditemukan', () => {
    assert.ok(stayAId, 'stayAId harus ditemukan dari DB');
    assert.ok(stayBId, 'stayBId harus ditemukan dari DB');
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
    // Verify the response includes tenant's own data
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

  it('TENANT_A tidak bisa akses deposit ledger stay TENANT_B → 404', async () => {
    const res = await tenantAReq.get(`/api/deposit-ledger/stays/${stayBId}`);
    assertError(res, 404);
  });

  it('TENANT_A tidak bisa akses deposit ledger tenant TENANT_B → 404', async () => {
    const res = await tenantAReq.get(`/api/deposit-ledger/tenants/${tenantBId}`);
    assertError(res, 404);
  });

  it('TENANT_B tidak bisa akses deposit ledger tenant TENANT_A → 404', async () => {
    const res = await tenantBReq.get(`/api/deposit-ledger/tenants/${tenantAId}`);
    assertError(res, 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-L5: Deactivated User Guard
// ─────────────────────────────────────────────────────────────────────────────

describe('Y-L5 — Deactivated user → 401 semua endpoint', () => {
  it('prerequisite — STAFF user ID ditemukan', () => {
    assert.ok(userStaffId, 'userStaffId harus ditemukan dari DB via GET /api/users');
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
