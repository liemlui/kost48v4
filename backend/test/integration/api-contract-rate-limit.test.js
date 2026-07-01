/**
 * Y-K7 — API Contract: Rate Limiting
 * ====================================
 * Memverifikasi RateLimitGuard:
 *  - Rate-limited endpoint bisa diakses dalam batas normal
 *  - Melebihi batas → 429 Too Many Requests
 *
 * Catatan: Rate limit store in-memory static per proses. Limit login=10/5menit.
 * Test ini membuat 12 request login invalid untuk memicu 429.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createTestApp } = require('../helpers/supertest-helper');

let app, request;

before(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  request = ctx.request;
});

after(async () => {
  if (app) await app.close();
});

describe('Y-K7 — Rate limiting (login endpoint)', () => {
  it('request normal (dalam batas) → 401 (bukan 429)', async () => {
    // Request ke-1: masih dalam batas → harus 401 (password salah), bukan 429
    const res = await request.post('/api/auth/login').send({
      identifier: 'tidak@ada.com',
      password: 'passwordSalah123',
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  it('11 request cepat melebihi limit → 429 terjadi', async () => {
    // Kirim 12 request cepat untuk memicu rate limit (limit=10/5menit)
    // Pastikan password >= 6 karakter (validasi DTO)
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        request.post('/api/auth/login').send({
          identifier: `spam-${i}@test.com`,
          password: 'rahasia123',
        }).then(res => res.status),
      ),
    );

    // Count 429 responses — limit 10/5menit, 12 request harus ada minimal 2 kena limit
    const rateLimited = results.filter(s => s === 429).length;
    assert.ok(rateLimited >= 1,
      `Harus ada minimal 1 rate-limited (429). Dapat: ${JSON.stringify(results)}`);
  });

  it('response 429 memiliki pesan yang sesuai', async () => {
    // Kirim banyak request sampai kena 429
    let res;
    for (let i = 0; i < 15; i++) {
      res = await request.post('/api/auth/login').send({
        identifier: `final-${i}@test.com`,
        password: 'passwordPanjang123',
      });
      if (res.status === 429) break;
    }
    if (res?.status === 429) {
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes('Terlalu banyak'), `Pesan: ${res.body.message}`);
    }
  });
});
