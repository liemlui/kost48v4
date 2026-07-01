/**
 * Helper supertest untuk API contract tests (Fase Y-K)
 * =====================================================
 * Prasyarat: DB UAT (port 5433 / kost48_v3_pro) running + ter-seed.
 *
 * Pemakaian:
 *   const { createTestApp, withAuth } = require('../helpers/supertest-helper');
 *   const { app, request } = await createTestApp();
 *   // Unauthenticated
 *   const res = await request.get('/api/faqs/public');
 *   // Authenticated
 *   const ownerReq = withAuth(request, 'OWNER');
 *   const res2 = await ownerReq.get('/api/accounting/accounts');
 */

const { Test } = require('@nestjs/testing');
const supertest = require('supertest');
const { AppModule } = require('../../dist/app.module.js');

const LOGIN_CREDENTIALS = {
  OWNER: { identifier: 'owner@kost48.com', password: 'Owner#2026' },
  ADMIN: { identifier: 'admin@kost48.com', password: 'admin123' },
  STAFF: { identifier: 'staff@kost48.com', password: 'staff123' },
  TENANT_A: { identifier: 'maya.tenant@kost48.test', password: 'Tenant#2026' },
  TENANT_B: { identifier: 'dimas.tenant@kost48.test', password: 'Tenant#2026' },
};

const tokenCache = {};

/**
 * Bootstrap NestJS app + supertest request object.
 * Konfigurasi (globalPrefix, pipes, filters, interceptors) disamakan dengan main.ts.
 */
async function createTestApp() {
  const { ValidationPipe } = require('@nestjs/common');
  const { AllExceptionsFilter } = require('../../dist/common/filters/all-exceptions.filter.js');
  const { RequestIdInterceptor } = require('../../dist/common/interceptors/request-id.interceptor.js');
  const { OwnerViewModeInterceptor } = require('../../dist/common/interceptors/owner-view-mode.interceptor.js');
  const { ResponseEnvelopeInterceptor } = require('../../dist/common/interceptors/response-envelope.interceptor.js');

  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new OwnerViewModeInterceptor(),
    new ResponseEnvelopeInterceptor(),
  );

  await app.init();

  return { app, request: supertest(app.getHttpServer()) };
}

/**
 * Login via API — dapatkan JWT token untuk role tertentu.
 */
async function getToken(role, requestObj) {
  if (tokenCache[role]) return tokenCache[role];

  const creds = LOGIN_CREDENTIALS[role];
  if (!creds) {
    throw new Error(`Role ${role} tidak punya credentials default.`);
  }

  const needOwnApp = !requestObj;
  let appCtx;
  if (needOwnApp) {
    appCtx = await createTestApp();
    requestObj = appCtx.request;
  }

  try {
    const res = await requestObj.post('/api/auth/login').send(creds);
    if (res.body.success && res.body.data?.accessToken) {
      tokenCache[role] = res.body.data.accessToken;
      return tokenCache[role];
    }
    throw new Error(`Login ${role} gagal: ${JSON.stringify(res.body)}`);
  } finally {
    if (needOwnApp && appCtx) await appCtx.app.close();
  }
}

/**
 * Bungkus supertest request dengan auth header untuk role tertentu.
 * Mengembalikan objek dengan method .get/.post/.patch/.put/.delete yang sudah
 * otomatis menyertakan Authorization: Bearer <token>.
 */
function withAuth(requestObj, role) {
  const token = tokenCache[role];
  if (!token) {
    throw new Error(`Token untuk ${role} belum di-load. Panggil await getToken('${role}', requestObj) dulu.`);
  }
  const authSetter = (req) => req.set('Authorization', `Bearer ${token}`);

  return {
    get: (url) => authSetter(requestObj.get(url)),
    post: (url) => authSetter(requestObj.post(url)),
    patch: (url) => authSetter(requestObj.patch(url)),
    put: (url) => authSetter(requestObj.put(url)),
    delete: (url) => authSetter(requestObj.delete(url)),
  };
}

function clearTokenCache() {
  Object.keys(tokenCache).forEach((k) => delete tokenCache[k]);
}

module.exports = {
  createTestApp,
  getToken,
  withAuth,
  clearTokenCache,
  LOGIN_CREDENTIALS,
};
