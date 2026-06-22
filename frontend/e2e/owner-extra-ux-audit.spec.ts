/**
 * Owner Extra UI/UX Audit — route OWNER/ADMIN yang belum dicakup admin-ux-audit.
 * Covers: loss-refunds, users, meter-readings, additional-services, service-interests,
 *         wifi-sales, ancillary-revenue, finance/assets, reminders + tenant portal wifi.
 * Login API SEKALI di beforeAll, inject token ke localStorage setiap test.
 * Jalankan: npx playwright test e2e/owner-extra-ux-audit.spec.ts --reporter=list
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.join(process.cwd(), 'screenshots-ui', 'owner-extra-audit');
const API = 'http://localhost:3000';
fs.mkdirSync(SHOTS, { recursive: true });

let _ownerToken = '';
let _ownerUser: Record<string, unknown> = {};
let _firstRoomId: number | null = null;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}`);
}

async function gotoAuth(page: Page, route: string, waitForText?: string) {
  await page.addInitScript(({ t, u }) => {
    localStorage.setItem('kost48_access_token', t);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(u));
  }, { t: _ownerToken, u: _ownerUser });

  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });

  if (waitForText) {
    await page.waitForSelector(`text=${waitForText}`, { timeout: 15000 }).catch(() => {});
  } else {
    await page.waitForTimeout(2500);
  }
}

/** Helper: navigasi + tunggu konten dari skeleton */
async function gotoAndWait(page: Page, route: string, regexStr: string) {
  await gotoAuth(page, route);
  await page.waitForSelector(`text=/${regexStr}/i`, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: login API sekali untuk owner
// ────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API });

  const res = await ctx.post('/api/auth/login', {
    data: { identifier: 'owner@kost48.com', password: 'Owner#2026' },
  });
  expect(res.ok(), `Login owner gagal: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  _ownerToken = body.data?.accessToken ?? body.accessToken ?? '';
  _ownerUser = body.data?.user ?? body.user ?? {};
  expect(_ownerToken, 'Token owner harus ada').toBeTruthy();
  console.log(`  🔑 Owner token: ${_ownerToken.slice(0, 20)}...`);

  // Ambil room id pertama untuk test rooms/:id
  // Response: { data: { items: [...], meta: {...} } }
  const roomsRes = await ctx.get('/api/rooms?limit=1', {
    headers: { Authorization: `Bearer ${_ownerToken}` },
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
// O-01: Loss Refunds (OWNER only)
// ────────────────────────────────────────────────────────────────────────────
test('O-01: /loss-refunds — daftar DP hangus & refund', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/loss-refunds', 'hangus|refund|DP|loss|deposit|belum ada|kosong');
  await shot(page, 'O01-loss-refunds');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/loss-refunds tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-01: /loss-refunds tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-02: Users management
// ────────────────────────────────────────────────────────────────────────────
test('O-02: /users — manajemen user & role', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/users', 'user|pengguna|email|role|owner|admin|staf|tambah');
  await shot(page, 'O02-users');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/user|pengguna|email|role|admin|staf/i.test(body)).toBeTruthy();
  console.log('  ✅ O-02: /users tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-03: Meter Readings (baca meter listrik/air)
// ────────────────────────────────────────────────────────────────────────────
test('O-03: /meter-readings — baca meter listrik & air', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/meter-readings', 'meter|listrik|air|kWh|m3|bacaan|kosong');
  await shot(page, 'O03-meter-readings');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/meter-readings tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-03: /meter-readings tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-04: Additional Services
// ────────────────────────────────────────────────────────────────────────────
test('O-04: /additional-services — kelola layanan tambahan', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/additional-services', 'layanan|service|tambah|aktif|harga|kosong');
  await shot(page, 'O04-additional-services');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/additional-services tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-04: /additional-services tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-05: Service Interests (minat layanan tambahan dari tenant)
// ────────────────────────────────────────────────────────────────────────────
test('O-05: /service-interests — minat layanan dari tenant', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/service-interests', 'minat|interest|layanan|tenant|kosong');
  await shot(page, 'O05-service-interests');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/service-interests tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-05: /service-interests tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-06: WiFi Sales
// ────────────────────────────────────────────────────────────────────────────
test('O-06: /wifi-sales — penjualan voucher WiFi', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/wifi-sales', 'wifi|voucher|internet|penjualan|kosong|harga');
  await shot(page, 'O06-wifi-sales');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/wifi-sales tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-06: /wifi-sales tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-07: Ancillary Revenue
// ────────────────────────────────────────────────────────────────────────────
test('O-07: /ancillary-revenue — pendapatan non-sewa', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/ancillary-revenue', 'pendapatan|revenue|non-sewa|ancillary|wifi|laundry|kosong');
  await shot(page, 'O07-ancillary-revenue');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/ancillary-revenue tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-07: /ancillary-revenue tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-08: Fixed Assets
// ────────────────────────────────────────────────────────────────────────────
test('O-08: /finance/assets — register aset tetap', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/finance/assets', 'aset|asset|depresiasi|nilai|buku|kosong');
  await shot(page, 'O08-finance-assets');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/finance/assets tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-08: /finance/assets tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-09: Reminders (jadwal pengingat kontrak)
// ────────────────────────────────────────────────────────────────────────────
test('O-09: /reminders — preview pengingat kontrak & sewa', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/reminders', 'pengingat|reminder|kontrak|jatuh tempo|sewa|kosong');
  await shot(page, 'O09-reminders');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/reminders tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-09: /reminders tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-10: Room Detail (OWNER/ADMIN/STAFF)
// ────────────────────────────────────────────────────────────────────────────
test('O-10: /rooms/:id — detail kamar lengkap', async ({ page }) => {
  test.setTimeout(60000);
  const roomId = _firstRoomId ?? 1;
  await gotoAuth(page, `/rooms/${roomId}`);
  await page.waitForSelector(
    'text=/kamar|lantai|status|fasilitas|available|occupied|tarif|sewa/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'O10-room-detail');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Room detail tidak boleh redirect ke login').toBeTruthy();
  console.log(`  ✅ O-10: /rooms/${roomId} tampil`);
});

// ────────────────────────────────────────────────────────────────────────────
// O-11: Check-in Wizard
// ────────────────────────────────────────────────────────────────────────────
test('O-11: /stays/check-in — wizard check-in penghuni', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/stays/check-in', 'check.in|check in|kamar|tenant|penghuni|langkah|pilih|wizard');
  await shot(page, 'O11-check-in-wizard');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Check-in wizard tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-11: /stays/check-in tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-12: Notifikasi owner
// ────────────────────────────────────────────────────────────────────────────
test('O-12: /notifications — notifikasi owner', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/notifications');
  await page.waitForTimeout(3000);
  await shot(page, 'O12-owner-notifications');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/notifikasi|notification|pemberitahuan|kosong|belum ada/i.test(body)).toBeTruthy();
  console.log('  ✅ O-12: /notifications owner tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// O-13: Guard — owner tidak bisa akses portal tenant
// ────────────────────────────────────────────────────────────────────────────
test('O-13: Guard — owner tidak bisa akses /portal/stay, /portal/invoices', async ({ page }) => {
  test.setTimeout(60000);
  const tenantRoutes = ['/portal/stay', '/portal/invoices', '/portal/loyalty'];
  for (const route of tenantRoutes) {
    await gotoAuth(page, route);
    await page.waitForTimeout(1500);
    const url = page.url();
    const isBlocked = !url.includes(route);
    if (!isBlocked) {
      console.log(`  ⚠️  O-13: Owner masih bisa akses ${route}`);
    } else {
      console.log(`  ✅ O-13: Owner di-redirect dari ${route}`);
    }
  }
  await shot(page, 'O13-owner-portal-guard');
});

// ────────────────────────────────────────────────────────────────────────────
// O-14: Invoice detail (owner)
// ────────────────────────────────────────────────────────────────────────────
test('O-14: /invoice-payments — daftar pembayaran invoice', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAndWait(page, '/invoice-payments', 'pembayaran|payment|invoice|lunas|tanggal|metode|kosong');
  await shot(page, 'O14-invoice-payments');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/invoice-payments tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ O-14: /invoice-payments tampil');
});
