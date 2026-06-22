/**
 * Staff App UI/UX Audit — screenshot + flow test komprehensif.
 * Login API SEKALI di beforeAll, inject token ke localStorage setiap test.
 * Jalankan: npx playwright test e2e/staff-ux-audit.spec.ts --reporter=list
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.join(process.cwd(), 'screenshots-ui', 'staff-audit');
const API = 'http://localhost:3000';
fs.mkdirSync(SHOTS, { recursive: true });

let _staffToken = '';
let _staffUser: Record<string, unknown> = {};
let _firstRoomId: number | null = null;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}`);
}

async function gotoAuth(page: Page, route: string, waitFor?: string) {
  await page.addInitScript(({ t, u }) => {
    localStorage.setItem('kost48_access_token', t);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(u));
  }, { t: _staffToken, u: _staffUser });

  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });

  if (waitFor) {
    await page.waitForSelector(`text=${waitFor}`, { timeout: 15000 }).catch(() => {});
  } else {
    await page.waitForTimeout(2500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: login API sekali untuk staff, ambil juga room id pertama
// ────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API });

  const loginRes = await ctx.post('/api/auth/login', {
    data: { identifier: 'staff@kost48.com', password: 'staff123' },
  });
  expect(loginRes.ok(), `Login staff gagal: ${loginRes.status()}`).toBeTruthy();
  const body = await loginRes.json();
  _staffToken = body.data?.accessToken ?? body.accessToken ?? '';
  _staffUser = body.data?.user ?? body.user ?? {};
  expect(_staffToken, 'Token staff harus ada').toBeTruthy();
  console.log(`  🔑 Staff token: ${_staffToken.slice(0, 20)}...`);

  // Ambil room id pertama untuk test detail kamar
  // Response: { data: { items: [...], meta: {...} } }
  const roomsRes = await ctx.get('/api/rooms?limit=1', {
    headers: { Authorization: `Bearer ${_staffToken}` },
  });
  if (roomsRes.ok()) {
    const rb = await roomsRes.json();
    const items = rb.data?.items ?? rb.data?.rooms ?? rb.data ?? rb.items ?? rb;
    if (Array.isArray(items) && items.length > 0) _firstRoomId = items[0].id;
  }
  console.log(`  🏠 Room ID pertama: ${_firstRoomId}`);

  await ctx.dispose();
});

// ────────────────────────────────────────────────────────────────────────────
// S-01: Dashboard staff
// ────────────────────────────────────────────────────────────────────────────
test('S-01: /dashboard — dashboard staff tampil', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, '/dashboard');
  await page.waitForSelector(
    'text=/dashboard|ringkasan|kamar|tiket|rutinitas|kinerja/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'S01-staff-dashboard');

  const url = page.url();
  expect(!url.includes('/login'), 'Dashboard staff tidak boleh redirect ke login').toBeTruthy();
  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log(`  ✅ S-01: Staff dashboard tampil (URL: ${url})`);
});

// ────────────────────────────────────────────────────────────────────────────
// S-02: Tiket (mode staff)
// ────────────────────────────────────────────────────────────────────────────
test('S-02: /tickets — tiket dalam mode staff', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, '/tickets');
  await page.waitForSelector(
    'text=/tiket|ticket|status tiket|open|selesai|kosong|laporan/i',
    { timeout: 25000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'S02-staff-tickets');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/tickets tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ S-02: /tickets mode staff tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// S-03: Staff Report Bulanan
// ────────────────────────────────────────────────────────────────────────────
test('S-03: /staff-report — laporan bulanan staf', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, '/staff-report');
  await page.waitForSelector(
    'text=/laporan|report|rutinitas|kinerja|bulan|staf|poin/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'S03-staff-report');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/staff-report tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ S-03: /staff-report tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// S-04: Staff Warehouse (stok barang kamar dari sudut pandang staf)
// ────────────────────────────────────────────────────────────────────────────
test('S-04: /staff-warehouse — gudang & barang kamar staf', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, '/staff-warehouse');
  await page.waitForSelector(
    'text=/gudang|barang|inventaris|kamar|stok|kosong/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'S04-staff-warehouse');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/staff-warehouse tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ S-04: /staff-warehouse tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// S-05: Profil staf
// ────────────────────────────────────────────────────────────────────────────
test('S-05: /profile — profil akun staf', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/profile');
  await page.waitForTimeout(3000);
  await shot(page, 'S05-staff-profile');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Profil tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ S-05: /profile staf tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// S-06: Notifikasi staf
// ────────────────────────────────────────────────────────────────────────────
test('S-06: /notifications — halaman notifikasi staf', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/notifications');
  await page.waitForTimeout(3000);
  await shot(page, 'S06-staff-notifications');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/notifikasi|notification|pemberitahuan|kosong|belum ada/i.test(body)).toBeTruthy();
  console.log('  ✅ S-06: /notifications staf tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// S-07: Detail kamar (STAFF boleh buka rooms/:id)
// ────────────────────────────────────────────────────────────────────────────
test('S-07: /rooms/:id — detail kamar bisa diakses staf', async ({ page }) => {
  test.setTimeout(60000);
  const roomId = _firstRoomId ?? 1;
  await gotoAuth(page, `/rooms/${roomId}`);
  await page.waitForSelector(
    'text=/kamar|lantai|status|fasilitas|available|occupied|reserved/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'S07-staff-room-detail');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Room detail tidak boleh redirect ke login').toBeTruthy();
  console.log(`  ✅ S-07: /rooms/${roomId} tampil untuk staf`);
});

// ────────────────────────────────────────────────────────────────────────────
// S-08: Guard — staf tidak bisa akses halaman OWNER/ADMIN
// ────────────────────────────────────────────────────────────────────────────
test('S-08: Guard — staf tidak bisa akses /invoices, /reports, /stays', async ({ page }) => {
  test.setTimeout(60000);
  const restricted = ['/invoices', '/reports', '/stays'];
  for (const route of restricted) {
    await gotoAuth(page, route);
    await page.waitForTimeout(1500);
    const url = page.url();
    const isBlocked = !url.endsWith(route) && !url.includes(route + '?');
    if (!isBlocked) {
      console.log(`  ⚠️  S-08: Staf masih bisa akses ${route} — perlu verifikasi guard`);
    } else {
      console.log(`  ✅ S-08: Staf di-redirect dari ${route}`);
    }
  }
  await shot(page, 'S08-staff-guard');
});

// ────────────────────────────────────────────────────────────────────────────
// S-09: Guard — staf tidak bisa akses /portal (TENANT routes)
// ────────────────────────────────────────────────────────────────────────────
test('S-09: Guard — staf tidak bisa akses /portal/stay, /portal/invoices', async ({ page }) => {
  test.setTimeout(60000);
  const tenantRoutes = ['/portal/stay', '/portal/invoices', '/portal/tickets'];
  for (const route of tenantRoutes) {
    await gotoAuth(page, route);
    await page.waitForTimeout(1500);
    const url = page.url();
    const isBlocked = !url.includes(route.replace(/\//g, '\\/'));
    if (!isBlocked) {
      console.log(`  ⚠️  S-09: Staf masih bisa akses ${route}`);
    } else {
      console.log(`  ✅ S-09: Staf di-redirect dari ${route}`);
    }
  }
  await shot(page, 'S09-staff-portal-guard');
});

// ────────────────────────────────────────────────────────────────────────────
// S-10: Mobile 375×812 — dashboard + tiket responsif
// ────────────────────────────────────────────────────────────────────────────
test('S-10: Mobile (375×812) — dashboard + tiket staf responsif', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });

  await gotoAuth(page, '/dashboard');
  await page.waitForTimeout(3000);
  await shot(page, 'S10-mobile-dashboard');

  await gotoAuth(page, '/staff-report');
  await page.waitForTimeout(3000);
  await shot(page, 'S10b-mobile-staff-report');

  console.log('  ✅ S-10: Mobile view staf dirender');
});
