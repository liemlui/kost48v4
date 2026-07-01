/**
 * Y-R — Security & Edge Cases
 * ===========================
 * Memverifikasi properti keamanan lewat app NestJS nyata (supertest + DB UAT):
 *  - Y-R1 SQL injection  → query terparametrisasi (Prisma), tidak 500, data utuh
 *  - Y-R2 XSS            → payload disimpan verbatim + dikembalikan sebagai JSON (bukan HTML)
 *  - Y-R3 CSRF           → endpoint state-changing wajib Bearer token (tanpa cookie ambient)
 *  - Y-R4 JWT            → tanpa/rusak/tamper/expired ditolak 401; valid diterima
 *  - Y-R5 Rate limit     → brute-force login memicu 429 (lihat juga Y-K7)
 *  - Y-R6 Concurrency    → double-submit idempoten tidak menggandakan data
 *  - Y-R7 File upload     → whitelist tipe + batas ukuran + file wajib
 *
 * Prasyarat: DB UAT (port 5433) running + ter-seed. Jalankan via:
 *   node --test "test/integration/security-edge-cases.test.js"
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { createTestApp, getToken, withAuth } = require('../helpers/supertest-helper');

let app, request, ownerReq, adminReq, tenantReq;

function readJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const envPath = path.join(__dirname, '../../.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  const m = txt.match(/^JWT_SECRET=(.*)$/m);
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : null;
}

// 1x1 WEBP kecil valid (header RIFF....WEBP) — cukup untuk lolos/gagal validator tipe.
function webpBuffer(sizeBytes) {
  const buf = Buffer.alloc(sizeBytes, 0);
  buf.write('RIFF', 0, 'ascii');
  buf.write('WEBP', 8, 'ascii');
  return buf;
}

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
  // Ambil SEMUA token sebelum tes rate-limit (login limit 10/5menit per proses).
  await getToken('OWNER', request);
  await getToken('ADMIN', request);
  await getToken('TENANT_A', request);
  ownerReq = withAuth(request, 'OWNER');
  adminReq = withAuth(request, 'ADMIN');
  tenantReq = withAuth(request, 'TENANT_A');
});

after(async () => {
  if (app) await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R1 — SQL Injection
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R1 — SQL injection: search terparametrisasi', () => {
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE accounts; --",
    "\" OR 1=1 --",
    "1' UNION SELECT * FROM users --",
  ];

  for (const payload of payloads) {
    it(`GET /accounting/accounts?search=${JSON.stringify(payload)} → tidak 500, sukses`, async () => {
      const res = await ownerReq.get('/api/accounting/accounts').query({ search: payload });
      assert.notStrictEqual(res.status, 500, `Injection tidak boleh memicu 500: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data) || Array.isArray(res.body.data?.items) || typeof res.body.data === 'object');
    });
  }

  it('setelah percobaan DROP TABLE, tabel accounts masih utuh (query normal tetap sukses)', async () => {
    const res = await ownerReq.get('/api/accounting/accounts');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('search di expenses (ADMIN) dengan payload injeksi → tidak 500', async () => {
    const res = await adminReq.get('/api/expenses').query({ search: "'; DELETE FROM \"Expense\"; --" });
    assert.notStrictEqual(res.status, 500);
    assert.ok(res.status === 200 || res.status === 400, `status tak terduga: ${res.status}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R2 — XSS (stored + reflected)
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R2 — XSS: payload tidak dieksekusi server, dikembalikan sebagai JSON', () => {
  const XSS = '<script>alert("xss-Y-R2")</script>';

  it('reflected: search dengan tag <script> → Content-Type JSON (bukan HTML)', async () => {
    const res = await ownerReq.get('/api/accounting/accounts').query({ search: XSS });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'] || '', /application\/json/, 'respons harus JSON, bukan HTML');
  });

  it('stored: buat tiket portal (TENANT) dgn deskripsi <script>, tersimpan verbatim & dibaca sbg JSON', async () => {
    const create = await tenantReq.post('/api/tickets/portal').send({
      title: 'Uji XSS Y-R2',
      description: `Keluhan ${XSS}`,
    });
    assert.ok([200, 201].includes(create.status), `create gagal: ${create.status} ${JSON.stringify(create.body)}`);
    const created = create.body.data;
    assert.ok(created?.id, 'tiket harus punya id');
    // Deskripsi tersimpan apa adanya (tidak dieksekusi, tidak di-strip jadi rusak di server).
    assert.match(String(created.description || ''), /<script>/, 'payload disimpan verbatim (escaping = tugas render frontend)');

    const list = await tenantReq.get('/api/tickets/my');
    assert.strictEqual(list.status, 200);
    assert.match(list.headers['content-type'] || '', /application\/json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R3 — CSRF: state-changing wajib Bearer (API stateless, tanpa cookie ambient)
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R3 — CSRF: endpoint state-changing menolak request tanpa Authorization', () => {
  const cases = [
    ['post', '/api/accounting/default-coa/seed'],
    ['post', '/api/expenses'],
    ['patch', '/api/accounting/accounts/1'],
    ['delete', '/api/facility-images/whatever-slug'],
    ['post', '/api/tickets/portal'],
  ];
  for (const [method, url] of cases) {
    it(`${method.toUpperCase()} ${url} tanpa token → 401`, async () => {
      const res = await request[method](url).send({});
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R4 — JWT: none / malformed / tampered / wrong-sig / expired ditolak; valid diterima
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R4 — JWT security', () => {
  const GUARDED = '/api/accounting/readiness';

  it('tanpa token → 401', async () => {
    const res = await request.get(GUARDED);
    assert.strictEqual(res.status, 401);
  });

  it('token malformed → 401', async () => {
    const res = await request.get(GUARDED).set('Authorization', 'Bearer not.a.real.jwt');
    assert.strictEqual(res.status, 401);
  });

  it('signature salah (secret lain) → 401', async () => {
    const bad = jwt.sign({ sub: 1, role: 'OWNER' }, 'secret-yang-salah-total', { expiresIn: 3600 });
    const res = await request.get(GUARDED).set('Authorization', `Bearer ${bad}`);
    assert.strictEqual(res.status, 401);
  });

  it('token di-tamper (byte signature diubah) → 401', async () => {
    const secret = readJwtSecret();
    assert.ok(secret, 'JWT_SECRET harus terbaca');
    const good = jwt.sign({ sub: 1, role: 'OWNER' }, secret, { expiresIn: 3600 });
    const parts = good.split('.');
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('A') ? 'BB' : 'AA');
    const res = await request.get(GUARDED).set('Authorization', `Bearer ${parts.join('.')}`);
    assert.strictEqual(res.status, 401);
  });

  it('token expired (signed dgn secret asli, exp lampau) → 401', async () => {
    const secret = readJwtSecret();
    const expired = jwt.sign({ sub: 1, role: 'OWNER' }, secret, { expiresIn: -60 });
    const res = await request.get(GUARDED).set('Authorization', `Bearer ${expired}`);
    assert.strictEqual(res.status, 401);
  });

  it('token valid (OWNER) → 200', async () => {
    const res = await ownerReq.get(GUARDED);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R6 — Concurrency: double-submit idempoten tidak menggandakan COA
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R6 — Concurrent double-submit (idempotent seed COA)', () => {
  it('3 seed-COA paralel → semua 2xx, jumlah akun tidak bertambah (idempoten)', async () => {
    const before = await ownerReq.get('/api/accounting/accounts');
    assert.strictEqual(before.status, 200);
    const countBefore = Array.isArray(before.body.data) ? before.body.data.length : (before.body.data?.items?.length ?? null);

    const results = await Promise.all([
      ownerReq.post('/api/accounting/default-coa/seed').send({}),
      ownerReq.post('/api/accounting/default-coa/seed').send({}),
      ownerReq.post('/api/accounting/default-coa/seed').send({}),
    ]);
    for (const r of results) {
      assert.ok(r.status >= 200 && r.status < 300, `seed harus 2xx, got ${r.status}`);
    }

    const after = await ownerReq.get('/api/accounting/accounts');
    const countAfter = Array.isArray(after.body.data) ? after.body.data.length : (after.body.data?.items?.length ?? null);
    if (countBefore !== null && countAfter !== null) {
      assert.strictEqual(countAfter, countBefore, 'seed idempoten tidak boleh menggandakan akun');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R7 — File upload: whitelist tipe + batas ukuran + file wajib
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R7 — Upload facility-images (OWNER): validasi tipe & ukuran', () => {
  const URL = '/api/facility-images/upload/uji-keamanan';

  it('tanpa file → ditolak 4xx (file wajib)', async () => {
    const res = await ownerReq.post(URL);
    assert.ok(res.status >= 400 && res.status < 500, `Expected 4xx, got ${res.status}`);
  });

  it('tipe tidak di-whitelist (text/plain) → ditolak 4xx', async () => {
    const res = await ownerReq.post(URL).attach('file', Buffer.from('halo bukan gambar'), {
      filename: 'evil.txt',
      contentType: 'text/plain',
    });
    assert.ok(res.status >= 400 && res.status < 500, `Expected 4xx, got ${res.status}`);
  });

  it('melebihi 2MB → ditolak 4xx', async () => {
    const big = webpBuffer(2 * 1024 * 1024 + 1024);
    const res = await ownerReq.post(URL).attach('file', big, {
      filename: 'besar.webp',
      contentType: 'image/webp',
    });
    assert.ok(res.status >= 400 && res.status < 500, `Expected 4xx, got ${res.status}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-R5 — Rate limit (login) — DIJALANKAN TERAKHIR agar tidak menghabiskan
// limiter login sebelum token lain terambil. Lihat juga Y-K7.
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-R5 — Rate limit: brute-force login → 429', () => {
  it('burst 15 login gagal cepat → minimal 1 respons 429', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        request.post('/api/auth/login').send({
          identifier: `bruteforce-${i}@test.invalid`,
          password: 'rahasia123',
        }).then((r) => r.status),
      ),
    );
    const got429 = statuses.filter((s) => s === 429).length;
    assert.ok(got429 >= 1, `harus ada minimal 1 respons 429, statuses=${statuses.join(',')}`);
  });
});
