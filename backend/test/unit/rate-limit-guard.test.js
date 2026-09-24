// Regresi BE-002 (temuan terbuka #3, audit 2026-09-24): rate limiting.
//
// Kontrak yang dikunci:
//   RateLimitGuard : bucket eksplisit (@RateLimit) menang atas nama handler; nama handler
//                    adalah fallback legacy; bucket tak terdaftar = lolos tanpa limit;
//                    identitas memakai id user bila terautentikasi, kalau tidak IP;
//                    store dibagi antar instance guard (static).
//   middleware     : fixed-window per IP, mengembalikan 429 + header Retry-After, dan
//                    bucket antar limiter (nama) terpisah.
const assert = require('node:assert/strict');
const test = require('node:test');

const { RateLimitGuard } = require('../../dist/common/guards/rate-limit.guard.js');
const { createRateLimiter } = require('../../dist/common/middleware/rate-limit.middleware.js');

const makeContext = (handlerName, request = {}) => ({
  switchToHttp: () => ({ getRequest: () => ({ ip: '10.1.1.1', ...request }) }),
  getHandler: () => ({ name: handlerName }),
  getClass: () => class Dummy {},
});

const reflector = (bucket) => ({ getAllAndOverride: () => bucket });

const isTooManyRequests = (err) => {
  assert.equal(typeof err?.getStatus === 'function' ? err.getStatus() : null, 429);
  assert.match(String(err?.message ?? ''), /Terlalu banyak percobaan/);
  return true;
};

test('RL-1 — bucket `login`: 10 percobaan lolos, percobaan ke-11 ditolak 429', () => {
  const guard = new RateLimitGuard();
  const context = () => makeContext('login', { ip: '10.9.0.1' });

  for (let i = 1; i <= 10; i += 1) {
    assert.equal(guard.canActivate(context()), true, `percobaan ${i} harus lolos`);
  }
  assert.throws(() => guard.canActivate(context()), isTooManyRequests);
});

test('RL-2 — bucket `forgotPassword` lebih ketat, dan handler tanpa bucket tidak dibatasi', () => {
  const guard = new RateLimitGuard();

  for (let i = 1; i <= 3; i += 1) {
    assert.equal(guard.canActivate(makeContext('forgotPassword', { ip: '10.9.0.2' })), true);
  }
  assert.throws(() => guard.canActivate(makeContext('forgotPassword', { ip: '10.9.0.2' })), isTooManyRequests);

  // `refresh` tidak didekorasi RateLimitGuard di controller auth; ia hanya mengandalkan
  // limiter global/moderat di main.ts, sehingga guard ini harus meloloskannya.
  for (let i = 1; i <= 25; i += 1) {
    assert.equal(guard.canActivate(makeContext('refresh', { ip: '10.9.0.3' })), true);
  }
});

test('RL-3 — metadata @RateLimit menang atas nama handler', () => {
  const guard = new RateLimitGuard(reflector('publicBooking'));

  for (let i = 1; i <= 5; i += 1) {
    assert.equal(guard.canActivate(makeContext('create', { ip: '10.9.0.4' })), true);
  }
  assert.throws(() => guard.canActivate(makeContext('create', { ip: '10.9.0.4' })), isTooManyRequests);
});

test('RL-4 — identitas memakai id user bila ada, sehingga satu user tidak bisa menghindar lewat IP', () => {
  const guard = new RateLimitGuard();

  for (let i = 1; i <= 10; i += 1) {
    assert.equal(guard.canActivate(makeContext('login', { ip: `10.9.1.${i}`, user: { id: 555 } })), true);
  }
  assert.throws(
    () => guard.canActivate(makeContext('login', { ip: '10.9.1.200', user: { id: 555 } })),
    isTooManyRequests,
  );

  assert.equal(guard.canActivate(makeContext('login', { ip: '10.9.1.200', user: { id: 556 } })), true);
});

test('RL-5 — store dibagi antar instance guard (static store)', () => {
  const first = new RateLimitGuard();
  const second = new RateLimitGuard();

  for (let i = 1; i <= 5; i += 1) {
    assert.equal(first.canActivate(makeContext('login', { ip: '10.9.2.1' })), true);
  }
  for (let i = 1; i <= 5; i += 1) {
    assert.equal(second.canActivate(makeContext('login', { ip: '10.9.2.1' })), true);
  }
  assert.throws(() => second.canActivate(makeContext('login', { ip: '10.9.2.1' })), isTooManyRequests);
});

const makeRes = () => {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      res.headers[name] = value;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
};

const runMiddleware = (middleware, ip = '10.5.0.1') => {
  const res = makeRes();
  let nextCalls = 0;
  middleware({ ip }, res, () => {
    nextCalls += 1;
  });
  return { res, nextCalls };
};

test('RL-6 — middleware: melewati `next` sampai batas, lalu 429 dengan Retry-After', () => {
  const middleware = createRateLimiter({ windowMs: 60_000, max: 2, name: 'unit-a' });

  assert.equal(runMiddleware(middleware).nextCalls, 1);
  assert.equal(runMiddleware(middleware).nextCalls, 1);

  const blocked = runMiddleware(middleware);
  assert.equal(blocked.nextCalls, 0, 'permintaan ke-3 tidak boleh diteruskan');
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.body.error, 'Too Many Requests');
  assert.match(String(blocked.res.headers['Retry-After'] ?? ''), /^[1-9][0-9]*$/);
});

test('RL-7 — middleware memisahkan bucket per IP dan per nama limiter', () => {
  const middleware = createRateLimiter({ windowMs: 60_000, max: 1, name: 'unit-b' });

  assert.equal(runMiddleware(middleware, '10.5.1.1').nextCalls, 1);
  assert.equal(runMiddleware(middleware, '10.5.1.2').nextCalls, 1, 'IP lain punya jendela sendiri');
  assert.equal(runMiddleware(middleware, '10.5.1.1').nextCalls, 0, 'IP pertama sudah mentok');

  const other = createRateLimiter({ windowMs: 60_000, max: 1, name: 'unit-c' });
  assert.equal(runMiddleware(other, '10.5.1.1').nextCalls, 1, 'nama limiter lain tidak saling mengunci');
});

test('RL-8 — middleware memakai pesan khusus bila diberikan (bucket auth ketat)', () => {
  const middleware = createRateLimiter({
    windowMs: 60_000,
    max: 1,
    name: 'unit-d',
    message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
  });

  runMiddleware(middleware, '10.5.2.1');
  const blocked = runMiddleware(middleware, '10.5.2.1');

  assert.equal(blocked.res.statusCode, 429);
  assert.match(String(blocked.res.body.message), /Terlalu banyak percobaan login/);
});
