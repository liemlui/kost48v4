/**
 * X-16 lanjutan — Axe a11y audit untuk halaman ber-login.
 *
 * Login via API (token injection), lalu jalankan axe-core pada rute kunci
 * per role. Target: ≤5 critical/serious violation per halaman.
 *
 * Jalankan:
 *   npx playwright test e2e/a11y/axe-auth.spec.ts --reporter=list
 *
 * Prasyarat: backend :3000 + frontend :5173 hidup, DB UAT 5433 sudah di-seed.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const API = 'http://localhost:3000';
const CREDS = {
  owner:  { id: 'owner@kost48.com',         pw: 'Owner#2026' },
  admin:  { id: 'admin@kost48.com',          pw: 'admin123' },
  staff:  { id: 'staff@kost48.com',          pw: 'staff123' },
  tenant: { id: 'maya.tenant@kost48.test',    pw: 'Tenant#2026' },
} as const;

type Tokens = Record<keyof typeof CREDS, { token: string; user: Record<string, unknown> }>;

async function apiLogin(email: string, password: string) {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/auth/login', { data: { identifier: email, password } });
  if (!res.ok()) throw new Error(`Login gagal ${email}: ${res.status()}`);
  const body = await res.json();
  const token = body.data?.accessToken ?? body.accessToken ?? '';
  const user  = body.data?.user ?? body.user ?? {};
  await ctx.dispose();
  return { token, user };
}

async function gotoAuth(
  page: import('@playwright/test').Page,
  token: string,
  user: Record<string, unknown>,
  route: string,
) {
  await page.addInitScript(({ t, u }) => {
    localStorage.setItem('kost48_access_token', t);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(u));
  }, { t: token, u: user });
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Tunggu sebentar agar skeleton/loading selesai
  await page.waitForTimeout(1500);
}

async function runAxe(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  if (critical.length > 0) {
    console.log(`  [${label}] ${critical.length} critical/serious violation:`);
    for (const v of critical) {
      console.log(`    - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node)`);
    }
  } else {
    console.log(`  [${label}] ✅ 0 critical/serious`);
  }

  return critical.length;
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: login API sekali untuk semua role
// ────────────────────────────────────────────────────────────────────────────
let tokens: Tokens;

test.beforeAll(async () => {
  const [owner, admin, staff, tenant] = await Promise.all([
    apiLogin(CREDS.owner.id,   CREDS.owner.pw),
    apiLogin(CREDS.admin.id,   CREDS.admin.pw),
    apiLogin(CREDS.staff.id,   CREDS.staff.pw),
    apiLogin(CREDS.tenant.id,  CREDS.tenant.pw),
  ]);
  tokens = { owner, admin, staff, tenant };
  console.log('🔑 4 token siap (OWNER/ADMIN/STAFF/TENANT)');
});

// ────────────────────────────────────────────────────────────────────────────
// OWNER
// ────────────────────────────────────────────────────────────────────────────
test.describe('OWNER', () => {
  test('X16-owner-dashboard — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.owner.token, tokens.owner.user, '/owner-dashboard');
    const count = await runAxe(page, 'owner-dashboard');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-owner-stays — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.owner.token, tokens.owner.user, '/stays');
    const count = await runAxe(page, 'owner-stays');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-owner-invoices — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.owner.token, tokens.owner.user, '/invoices');
    const count = await runAxe(page, 'owner-invoices');
    expect(count).toBeLessThanOrEqual(5);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ADMIN
// ────────────────────────────────────────────────────────────────────────────
test.describe('ADMIN', () => {
  test('X16-admin-dashboard — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.admin.token, tokens.admin.user, '/admin-dashboard');
    const count = await runAxe(page, 'admin-dashboard');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-admin-stays — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.admin.token, tokens.admin.user, '/stays');
    const count = await runAxe(page, 'admin-stays');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-admin-tickets — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.admin.token, tokens.admin.user, '/tickets');
    const count = await runAxe(page, 'admin-tickets');
    expect(count).toBeLessThanOrEqual(5);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// STAFF
// ────────────────────────────────────────────────────────────────────────────
test.describe('STAFF', () => {
  test('X16-staff-dashboard — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.staff.token, tokens.staff.user, '/dashboard');
    const count = await runAxe(page, 'staff-dashboard');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-staff-tickets — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.staff.token, tokens.staff.user, '/tickets');
    const count = await runAxe(page, 'staff-tickets');
    expect(count).toBeLessThanOrEqual(5);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TENANT
// ────────────────────────────────────────────────────────────────────────────
test.describe('TENANT', () => {
  test('X16-tenant-stay — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.tenant.token, tokens.tenant.user, '/portal/stay');
    const count = await runAxe(page, 'tenant-stay');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-tenant-invoices — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.tenant.token, tokens.tenant.user, '/portal/invoices');
    const count = await runAxe(page, 'tenant-invoices');
    expect(count).toBeLessThanOrEqual(5);
  });

  test('X16-tenant-tickets — ≤5 critical/serious', async ({ page }) => {
    test.setTimeout(45000);
    await gotoAuth(page, tokens.tenant.token, tokens.tenant.user, '/portal/tickets');
    const count = await runAxe(page, 'tenant-tickets');
    expect(count).toBeLessThanOrEqual(5);
  });
});
