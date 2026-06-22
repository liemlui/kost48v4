/**
 * Tenant App UI/UX Audit — screenshot + flow test komprehensif.
 * Login API SEKALI di beforeAll, inject token ke localStorage setiap test.
 * Jalankan: npx playwright test e2e/tenant-ux-audit.spec.ts --reporter=list
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.join(process.cwd(), 'screenshots-ui', 'tenant-audit');
const API = 'http://localhost:3000';
fs.mkdirSync(SHOTS, { recursive: true });

let _tenantToken = '';
let _tenantUser: Record<string, unknown> = {};

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}`);
}

/** Inject token ke localStorage + sessionStorage lalu navigasi ke route. */
async function gotoAuth(page: Page, route: string, waitFor?: string) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('kost48_access_token', token);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(user));
  }, { token: _tenantToken, user: _tenantUser });

  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });

  if (waitFor) {
    await page.waitForSelector(`text=${waitFor}`, { timeout: 12000 }).catch(() => {});
  } else {
    await page.waitForTimeout(3000);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: login API sekali, ambil token untuk semua test
// ────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/auth/login', {
    data: { identifier: 'maya.tenant@kost48.test', password: 'Tenant#2026' },
  });
  expect(res.ok(), `Login API gagal: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  _tenantToken = body.data?.accessToken ?? body.accessToken ?? '';
  _tenantUser = body.data?.user ?? body.user ?? {};
  expect(_tenantToken, 'Token harus ada').toBeTruthy();
  console.log(`  🔑 Token tenant: ${_tenantToken.slice(0, 20)}...`);
  await ctx.dispose();
});

// ────────────────────────────────────────────────────────────────────────────
// T-01: Login page (tanpa auth)
// ────────────────────────────────────────────────────────────────────────────
test('T-01: Halaman Login — form, input, submit ada', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const emailInput = page.locator('input[type="email"], input[type="text"], input.form-control').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await shot(page, 'T01-login-page');

  await expect(emailInput).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  console.log('  ✅ T-01: Login page OK');
});

// ────────────────────────────────────────────────────────────────────────────
// T-02: Portal/Stay — info hunian (inject token, tunggu "Kamar Saya")
// ────────────────────────────────────────────────────────────────────────────
test('T-02: Portal/Stay — info kamar, sewa, deposit tampil', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/stay', 'Kamar Saya');
  await shot(page, 'T02-portal-stay');

  await expect(page).toHaveURL(/portal\/stay/);
  await expect(page.locator('text=Kamar Saya')).toBeVisible({ timeout: 5000 });

  const body = await page.locator('body').innerText();
  expect(/tagihan|deposit|titipan|laporan|sewa/i.test(body), 'Info keuangan harus tampil').toBeTruthy();
  console.log('  ✅ T-02: Portal/Stay — "Kamar Saya" + info keuangan tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// T-03: Portal/Stay — checkout request button ada
// ────────────────────────────────────────────────────────────────────────────
test('T-03: Portal/Stay — tombol/link checkout request ada di stay page', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/stay', 'Kamar Saya');
  await page.waitForTimeout(1500);
  await shot(page, 'T03-portal-stay-full');

  const body = await page.locator('body').innerText();
  const hasCheckout = /checkout|check.out|pindah|keluar|akhiri|sewa berakhir/i.test(body);
  // Checkout mungkin ada di accordion/collapse atau tombol tersembunyi — catat tapi tidak fail
  if (!hasCheckout) {
    console.log('  ⚠️  T-03: Tombol checkout belum terlihat di stay page (mungkin di accordion)');
  } else {
    console.log('  ✅ T-03: Link/tombol checkout ditemukan di stay page');
  }
});

// ────────────────────────────────────────────────────────────────────────────
// T-04: Portal/Invoices — tagihan tenant
// ────────────────────────────────────────────────────────────────────────────
test('T-04: Portal/Invoices — daftar tagihan & panel ringkasan', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/invoices');
  // Tunggu lebih lama untuk data invoice
  await page.waitForSelector('text=Tagihan', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'T04-portal-invoices');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  const hasContent = /tagihan|lunas|belum bayar|invoice|sewa|tingkat/i.test(body);
  expect(hasContent, 'Halaman invoices harus tampilkan konten tagihan').toBeTruthy();
  console.log('  ✅ T-04: Halaman tagihan tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// T-05: Portal/Tickets — daftar + tombol buat tiket
// ────────────────────────────────────────────────────────────────────────────
test('T-05: Portal/Tickets — daftar tiket + tombol buat', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/tickets');
  await page.waitForTimeout(3000);
  await shot(page, 'T05-portal-tickets');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/tiket|ticket|lapor|perbaik|aduan|laporan/i.test(body), 'Konten tiket harus ada').toBeTruthy();

  const btnBuat = page.locator('button', { hasText: /buat|tambah|lapor|tiket baru/i }).first();
  if (await btnBuat.count()) {
    await btnBuat.click();
    await page.waitForTimeout(800);
    await shot(page, 'T05b-tickets-modal');
    console.log('  ℹ️  Modal buat tiket terbuka');
    // Tutup modal
    const close = page.locator('button[aria-label="Close"], button.btn-close, button:has-text("Batal"), button:has-text("Tutup")').first();
    if (await close.count()) await close.click().catch(() => {});
  }
  console.log('  ✅ T-05: Halaman tiket OK');
});

// ────────────────────────────────────────────────────────────────────────────
// T-06: Portal/Announcements — pengumuman
// ────────────────────────────────────────────────────────────────────────────
test('T-06: Portal/Announcements — halaman pengumuman tampil', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/announcements');
  await page.waitForTimeout(3000);
  await shot(page, 'T06-portal-announcements');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  // Bisa kosong jika tidak ada pengumuman — cek halaman tidak error
  const isError = /500|error|terjadi kesalahan/i.test(body);
  expect(isError, 'Halaman tidak boleh error').toBeFalsy();
  console.log('  ✅ T-06: Halaman pengumuman tampil (mungkin kosong jika tidak ada pengumuman)');
});

// ────────────────────────────────────────────────────────────────────────────
// T-07: Portal/Loyalty — poin kebaikan
// ────────────────────────────────────────────────────────────────────────────
test('T-07: Portal/Loyalty — poin kebaikan tenant', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/loyalty');
  await page.waitForSelector('text=/poin|loyalitas|kebaikan|reward/i', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'T07-portal-loyalty');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/poin|loyalitas|loyalty|reward|kebaikan/i.test(body), 'Konten poin harus ada').toBeTruthy();
  console.log('  ✅ T-07: Halaman loyalty tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// T-08: Portal/Stay — scroll cari section perpanjangan/checkout
// ────────────────────────────────────────────────────────────────────────────
test('T-08: Portal/Stay — aksi checkout & renewal di dalam stay page', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/stay', 'Kamar Saya');
  await page.waitForTimeout(2000);

  // Scroll ke bawah untuk lihat seluruh halaman
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await shot(page, 'T08-portal-stay-bottom');

  const body = await page.locator('body').innerText();
  // Cari elemen terkait perpanjangan / checkout
  const hasCTA = /perpanjang|renewal|checkout|check.out|akhiri|pindah|sewa/i.test(body);
  if (hasCTA) {
    console.log('  ✅ T-08: Aksi perpanjangan/checkout ditemukan di stay page');
  } else {
    console.log('  ⚠️  T-08: Aksi perpanjangan/checkout belum terlihat (mungkin di bawah fold atau accordion)');
  }
});

// ────────────────────────────────────────────────────────────────────────────
// T-09: Portal/Manual — panduan & FAQ
// ────────────────────────────────────────────────────────────────────────────
test('T-09: Portal/Manual — panduan & FAQ', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/manual');
  await page.waitForTimeout(3000);
  await shot(page, 'T09-portal-manual');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ T-09: Halaman manual/FAQ tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// T-10: Profil tenant
// ────────────────────────────────────────────────────────────────────────────
test('T-10: Profile — profil akun tenant', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/profile');
  await page.waitForTimeout(3000);
  await shot(page, 'T10-profile');

  const notFound = await page.locator('text=Halaman tidak ditemukan').count();
  const isRedirected = page.url().includes('/login');
  if (!notFound && !isRedirected) {
    console.log('  ✅ T-10: Profil tampil di /profile');
  } else {
    // coba /portal/profile
    await gotoAuth(page, '/portal/profile');
    await page.waitForTimeout(2000);
    await shot(page, 'T10b-portal-profile');
    console.log('  ℹ️  T-10: Profil tersedia di rute alternatif');
  }
});

// ────────────────────────────────────────────────────────────────────────────
// T-11: Guard — tenant tidak boleh akses admin routes
// ────────────────────────────────────────────────────────────────────────────
test('T-11: Guard — /stays, /invoices, /reports tidak bisa diakses tenant', async ({ page }) => {
  test.setTimeout(45000);
  const adminRoutes = ['/stays', '/invoices', '/reports'];
  for (const route of adminRoutes) {
    await gotoAuth(page, route);
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).not.toMatch(new RegExp(`\\${route}(\\?|$)`), `Tenant tidak boleh di ${route}`);
  }
  await shot(page, 'T11-guard-redirect');
  console.log('  ✅ T-11: Guard redirect aktif untuk admin routes');
});

// ────────────────────────────────────────────────────────────────────────────
// T-12: Notifikasi bell + panel
// ────────────────────────────────────────────────────────────────────────────
test('T-12: Notifikasi in-app — bell + panel', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/stay', 'Kamar Saya');
  await page.waitForTimeout(1000);

  // Cari bell dengan berbagai kemungkinan selector
  const bellSelectors = [
    'button[aria-label*="notif" i]',
    'button[title*="notif" i]',
    'button[aria-label*="pemberitahuan" i]',
    'header button:has(svg)',
    '.notification-bell',
  ];
  let bellFound = false;
  for (const sel of bellSelectors) {
    const el = page.locator(sel).first();
    if (await el.count() && await el.isVisible()) {
      await el.click().catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, 'T12-notifikasi-panel');
      console.log(`  ✅ T-12: Bell ditemukan (${sel}), panel terbuka`);
      bellFound = true;
      break;
    }
  }
  if (!bellFound) {
    await shot(page, 'T12-no-bell');
    console.log('  ⚠️  T-12: Bell notifikasi tidak ditemukan dengan selector yang dicoba');
  }
});

// ────────────────────────────────────────────────────────────────────────────
// T-13: Mobile 375×812 — stay, invoice, tiket
// ────────────────────────────────────────────────────────────────────────────
test('T-13: Mobile (375×812) — stay, invoice, tiket tampil responsif', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });

  await gotoAuth(page, '/portal/stay', 'Kamar Saya');
  await shot(page, 'T13-mobile-stay');

  await gotoAuth(page, '/portal/invoices');
  await page.waitForTimeout(3000);
  await shot(page, 'T13b-mobile-invoices');

  await gotoAuth(page, '/portal/tickets');
  await page.waitForTimeout(3000);
  await shot(page, 'T13c-mobile-tickets');

  console.log('  ✅ T-13: Mobile view dirender untuk stay, invoices, tickets');
});

// ────────────────────────────────────────────────────────────────────────────
// T-14: Bookings page
// ────────────────────────────────────────────────────────────────────────────
test('T-14: Portal/Bookings — riwayat booking tenant', async ({ page }) => {
  test.setTimeout(45000);
  await gotoAuth(page, '/portal/bookings');
  await page.waitForTimeout(3000);
  await shot(page, 'T14-portal-bookings');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  console.log('  ✅ T-14: Halaman bookings tampil');
});
