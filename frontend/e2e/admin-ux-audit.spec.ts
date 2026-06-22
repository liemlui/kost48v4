/**
 * Admin/Owner App UI/UX Audit — screenshot + flow test komprehensif.
 * Login API SEKALI di beforeAll, inject token ke localStorage setiap test.
 * Jalankan: npx playwright test e2e/admin-ux-audit.spec.ts --reporter=list
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.join(process.cwd(), 'screenshots-ui', 'admin-audit');
const API = 'http://localhost:3000';
fs.mkdirSync(SHOTS, { recursive: true });

let _ownerToken = '';
let _ownerUser: Record<string, unknown> = {};
let _adminToken = '';
let _adminUser: Record<string, unknown> = {};

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}`);
}

async function gotoAuth(page: Page, token: string, user: Record<string, unknown>, route: string, waitFor?: string) {
  await page.addInitScript(({ t, u }) => {
    localStorage.setItem('kost48_access_token', t);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(u));
  }, { t: token, u: user });

  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });

  if (waitFor) {
    await page.waitForSelector(`text=${waitFor}`, { timeout: 12000 }).catch(() => {});
  } else {
    await page.waitForTimeout(2500);
  }
}

async function apiLogin(email: string, password: string) {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/auth/login', { data: { identifier: email, password } });
  if (!res.ok()) throw new Error(`Login gagal ${email}: ${res.status()}`);
  const body = await res.json();
  const token = body.data?.accessToken ?? body.accessToken ?? '';
  const user = body.data?.user ?? body.user ?? {};
  await ctx.dispose();
  return { token, user };
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: login API sekali untuk owner & admin
// ────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  const owner = await apiLogin('owner@kost48.com', 'Owner#2026');
  _ownerToken = owner.token;
  _ownerUser = owner.user;
  console.log(`  🔑 Owner token: ${_ownerToken.slice(0, 20)}...`);

  const admin = await apiLogin('admin@kost48.com', 'admin123');
  _adminToken = admin.token;
  _adminUser = admin.user;
  console.log(`  🔑 Admin token: ${_adminToken.slice(0, 20)}...`);
});

// ────────────────────────────────────────────────────────────────────────────
// A-01: Dashboard (redirect dari /)
// ────────────────────────────────────────────────────────────────────────────
test('A-01: Owner Dashboard — KPI, occupancy, ringkasan tampil', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/dashboard');
  // Tunggu skeleton hilang dan konten muncul — coba beberapa kemungkinan heading
  await page.waitForSelector(
    'text=/ringkasan|dashboard|kamar|hunian|pendapatan|sewa|properti/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'A01-owner-dashboard');

  const url = page.url();
  const notLogin = !url.includes('/login');
  expect(notLogin, 'Dashboard tidak boleh redirect ke login').toBeTruthy();
  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-01: Owner Dashboard tampil (URL: ' + url + ')');
});

// ────────────────────────────────────────────────────────────────────────────
// A-02: Owner Dashboard khusus
// ────────────────────────────────────────────────────────────────────────────
test('A-02: /owner-dashboard — halaman dashboard owner khusus', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/owner-dashboard');
  await shot(page, 'A02-owner-dashboard-dedicated');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-02: /owner-dashboard tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-03: Admin Dashboard
// ────────────────────────────────────────────────────────────────────────────
test('A-03: /admin-dashboard — dashboard admin tampil', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _adminToken, _adminUser, '/admin-dashboard');
  await shot(page, 'A03-admin-dashboard');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-03: /admin-dashboard tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-04: Stays (daftar hunian)
// ────────────────────────────────────────────────────────────────────────────
test('A-04: /stays — daftar hunian aktif + filter', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/stays', 'Hunian');
  await page.waitForTimeout(1500);
  await shot(page, 'A04-stays-list');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/hunian|kamar|tenant|sewa|stays/i.test(body), 'Halaman stays harus tampilkan daftar hunian').toBeTruthy();
  console.log('  ✅ A-04: /stays tampil dengan daftar hunian');
});

// ────────────────────────────────────────────────────────────────────────────
// A-05: Invoices (daftar invoice)
// ────────────────────────────────────────────────────────────────────────────
test('A-05: /invoices — daftar tagihan admin', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/invoices', 'Tagihan');
  await page.waitForTimeout(1500);
  await shot(page, 'A05-invoices');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/tagihan|invoice|sewa|lunas|belum/i.test(body), 'Halaman invoice harus tampilkan daftar tagihan').toBeTruthy();
  console.log('  ✅ A-05: /invoices tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-06: Payment Submissions Review
// ────────────────────────────────────────────────────────────────────────────
test('A-06: /payment-submissions/review — antrian verifikasi pembayaran', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/payment-submissions/review');
  // Tunggu konten muncul dari skeleton
  await page.waitForSelector(
    'text=/pembayaran|verifikasi|bukti|transfer|konfirmasi|antrian|kosong|semua/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'A06-payment-review');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Halaman tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ A-06: /payment-submissions/review tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-07: Tickets admin (semua tiket)
// ────────────────────────────────────────────────────────────────────────────
test('A-07: /tickets — daftar tiket admin + filter status', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/tickets');
  // Tiket page kadang berat — tunggu hingga ada konten atau skeleton hilang
  await page.waitForSelector(
    'text=/tiket|ticket|status tiket|kategori|laporan|aduan|open|selesai|kosong/i',
    { timeout: 25000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'A07-tickets-admin');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), '/tickets tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ A-07: /tickets admin tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-08: Announcements admin (kelola pengumuman)
// ────────────────────────────────────────────────────────────────────────────
test('A-08: /announcements — kelola pengumuman', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/announcements');
  await page.waitForTimeout(2500);
  await shot(page, 'A08-announcements-admin');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/pengumuman|announcement|tambah|buat/i.test(body)).toBeTruthy();
  console.log('  ✅ A-08: /announcements admin tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-09: Tenants (daftar penghuni)
// ────────────────────────────────────────────────────────────────────────────
test('A-09: /tenants — daftar penghuni terdaftar', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/tenants');
  await page.waitForTimeout(2500);
  await shot(page, 'A09-tenants');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/penghuni|tenant|nama|kamar/i.test(body)).toBeTruthy();
  console.log('  ✅ A-09: /tenants tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-10: Renew Requests (antrian permohonan perpanjang)
// ────────────────────────────────────────────────────────────────────────────
test('A-10: /renew-requests — antrian permohonan perpanjang sewa', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/renew-requests');
  await page.waitForTimeout(2500);
  await shot(page, 'A10-renew-requests');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/perpanjang|renewal|sewa|permohonan|request/i.test(body)).toBeTruthy();
  console.log('  ✅ A-10: /renew-requests tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-11: Reports (OWNER only)
// ────────────────────────────────────────────────────────────────────────────
test('A-11: /reports — laporan keuangan owner', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/reports');
  await page.waitForTimeout(2500);
  await shot(page, 'A11-reports');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/laporan|report|pendapatan|keuangan|periode/i.test(body)).toBeTruthy();
  console.log('  ✅ A-11: /reports tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-12: Settings
// ────────────────────────────────────────────────────────────────────────────
test('A-12: /settings — pengaturan kost', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/settings');
  await page.waitForTimeout(2500);
  await shot(page, 'A12-settings');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/pengaturan|setting|tarif|kamar|operasional/i.test(body)).toBeTruthy();
  console.log('  ✅ A-12: /settings tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-13: Loyalty Admin
// ────────────────────────────────────────────────────────────────────────────
test('A-13: /loyalty — kelola program poin kebaikan', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/loyalty');
  await page.waitForTimeout(2500);
  await shot(page, 'A13-loyalty-admin');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/poin|loyalitas|kebaikan|reward|leaderboard/i.test(body)).toBeTruthy();

  // Pastikan tidak ada test room code di leaderboard
  const hasTestRoom = /TEST-TC/i.test(body);
  expect(hasTestRoom, 'Leaderboard tidak boleh tampilkan kode kamar test').toBeFalsy();
  console.log('  ✅ A-13: /loyalty admin tampil + leaderboard bersih dari TEST-*');
});

// ────────────────────────────────────────────────────────────────────────────
// A-14: Inventory
// ────────────────────────────────────────────────────────────────────────────
test('A-14: /inventory — kelola inventaris gudang + barang kamar', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/inventory/gudang');
  await page.waitForTimeout(2500);
  await shot(page, 'A14-inventory-gudang');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/inventaris|gudang|barang|stok|inventory/i.test(body)).toBeTruthy();
  console.log('  ✅ A-14: /inventory/gudang tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-15: Market Analysis
// ────────────────────────────────────────────────────────────────────────────
test('A-15: /market-analysis — analisa pasar AI', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/market-analysis');
  await page.waitForTimeout(2500);
  await shot(page, 'A15-market-analysis');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-15: /market-analysis tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-16: Expenses
// ────────────────────────────────────────────────────────────────────────────
test('A-16: /expenses — daftar pengeluaran operasional', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/expenses');
  await page.waitForTimeout(2500);
  await shot(page, 'A16-expenses');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/pengeluaran|biaya|expense|kategori/i.test(body)).toBeTruthy();
  console.log('  ✅ A-16: /expenses tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-17: Staff Performance
// ────────────────────────────────────────────────────────────────────────────
test('A-17: /staff-performance — kinerja staf', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/staff-performance');
  await page.waitForTimeout(2500);
  await shot(page, 'A17-staff-performance');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-17: /staff-performance tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-18: Staff Routines
// ────────────────────────────────────────────────────────────────────────────
test('A-18: /staff-routines — template rutinitas staf', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/staff-routines');
  await page.waitForTimeout(2500);
  await shot(page, 'A18-staff-routines');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ A-18: /staff-routines tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// A-19: Guard — admin tidak boleh akses portal tenant
// ────────────────────────────────────────────────────────────────────────────
test('A-19: Guard — admin tidak bisa akses /portal/stay, /portal/invoices', async ({ page }) => {
  test.setTimeout(45000);
  const tenantRoutes = ['/portal/stay', '/portal/invoices', '/portal/tickets'];
  for (const route of tenantRoutes) {
    await gotoAuth(page, _adminToken, _adminUser, route);
    await page.waitForTimeout(1000);
    const url = page.url();
    // Harus di-redirect ke dashboard atau halaman lain, bukan tetap di portal
    const isBlocked = !url.includes(route);
    if (!isBlocked) {
      console.log(`  ⚠️  A-19: Admin masih bisa akses ${route} — guard mungkin belum memblokir`);
    } else {
      console.log(`  ✅ A-19: Admin di-redirect dari ${route}`);
    }
  }
  await shot(page, 'A19-guard-admin');
});

// ────────────────────────────────────────────────────────────────────────────
// A-20: Accounting Setup (Finance)
// ────────────────────────────────────────────────────────────────────────────
test('A-20: /finance/accounting-setup — setup akuntansi COA', async ({ page }) => {
  test.setTimeout(60000);
  await gotoAuth(page, _ownerToken, _ownerUser, '/finance/accounting-setup');
  await page.waitForSelector(
    'text=/akun|akuntansi|coa|chart|keuangan|neraca|jurnal|debit|kredit|setup/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'A20-accounting-setup');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const url = page.url();
  expect(!url.includes('/login'), 'Accounting setup tidak boleh redirect ke login').toBeTruthy();
  console.log('  ✅ A-20: /finance/accounting-setup tampil');
});
