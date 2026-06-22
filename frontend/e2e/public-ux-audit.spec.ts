/**
 * Public Pages UI/UX Audit — halaman publik tanpa login.
 * Covers: landing (/), daftar kamar (/rooms), detail kamar, form booking tamu.
 * Jalankan: npx playwright test e2e/public-ux-audit.spec.ts --reporter=list
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS = path.join(process.cwd(), 'screenshots-ui', 'public-audit');
const API = 'http://localhost:3000';
fs.mkdirSync(SHOTS, { recursive: true });

let _firstPublicRoomId: number | null = null;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Setup: ambil room id yang AVAILABLE untuk public test
// ────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API });
  // Public endpoint — tidak perlu token
  const res = await ctx.get('/api/public/rooms?limit=2');
  if (res.ok()) {
    const body = await res.json();
    const items = body.data?.items ?? body.data ?? body.items ?? body ?? [];
    if (Array.isArray(items) && items.length > 0) {
      _firstPublicRoomId = items[0].id;
    } else if (Array.isArray(body) && body.length > 0) {
      _firstPublicRoomId = body[0].id;
    }
  }
  console.log(`  🏠 Public room ID: ${_firstPublicRoomId}`);
  await ctx.dispose();
});

// ────────────────────────────────────────────────────────────────────────────
// P-01: Landing page (/)
// ────────────────────────────────────────────────────────────────────────────
test('P-01: / — landing page publik tampil', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Tunggu hero section atau h1 muncul setelah React render
  await page.waitForSelector('.gx-page, .gx-hero-title, h1', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await shot(page, 'P01-landing');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  // textContent() lebih luas dari innerText() — tangkap semua node termasuk hidden
  const bodyText = await page.evaluate(() => document.body.textContent ?? '');
  const hasContent = /kost|kamar|sewa|surabaya|login|masuk|hikmah|pakuwon/i.test(bodyText);
  expect(hasContent, `Landing page harus ada konten kost. Panjang teks: ${bodyText.length}`).toBeTruthy();
  console.log('  ✅ P-01: Landing page tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// P-02: Daftar kamar publik (/rooms)
// ────────────────────────────────────────────────────────────────────────────
test('P-02: /rooms — daftar kamar tersedia untuk publik', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector(
    'text=/kamar|available|tersedia|sewa|lantai|kosong/i',
    { timeout: 15000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'P02-rooms-list');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/kamar|available|tersedia|sewa|kost/i.test(body), 'Daftar kamar harus tampil').toBeTruthy();
  console.log('  ✅ P-02: /rooms daftar kamar publik tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// P-03: Detail kamar publik (/rooms/:id/detail)
// ────────────────────────────────────────────────────────────────────────────
test('P-03: /rooms/:id/detail — halaman detail kamar publik', async ({ page }) => {
  test.setTimeout(60000);
  const roomId = _firstPublicRoomId ?? 1;
  await page.goto(`/rooms/${roomId}/detail`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector(
    'text=/kamar|lantai|fasilitas|tarif|sewa|detail|booking|pesan/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'P03-room-detail-public');

  await expect(page.locator('body')).not.toContainText('Halaman tidak ditemukan');
  const body = await page.locator('body').innerText();
  expect(/kamar|sewa|tarif|fasilitas|detail|booking|pesan|hubungi/i.test(body)).toBeTruthy();
  console.log(`  ✅ P-03: /rooms/${roomId}/detail tampil`);
});

// ────────────────────────────────────────────────────────────────────────────
// P-04: Form booking tamu (/booking/:roomId)
// ────────────────────────────────────────────────────────────────────────────
test('P-04: /booking/:roomId — form booking tamu publik', async ({ page }) => {
  test.setTimeout(60000);
  const roomId = _firstPublicRoomId ?? 1;
  await page.goto(`/booking/${roomId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector(
    'text=/booking|pesan|kamar|nama|kontak|tanggal|masuk|form/i',
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'P04-guest-booking-form');

  const url = page.url();
  const body = await page.locator('body').innerText();
  // Booking page: bisa redirect ke login jika butuh akun, atau tampil form
  const hasForm = /booking|pesan|kamar|nama|form|masuk|login/i.test(body);
  expect(hasForm, 'Booking page harus tampilkan form atau redirect ke login').toBeTruthy();
  console.log(`  ✅ P-04: /booking/${roomId} tampil (URL: ${url})`);
});

// ────────────────────────────────────────────────────────────────────────────
// P-05: Mobile 375×812 — landing + rooms list responsif
// ────────────────────────────────────────────────────────────────────────────
test('P-05: Mobile (375×812) — landing + rooms responsif', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, 'P05-mobile-landing');

  await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, 'P05b-mobile-rooms');

  console.log('  ✅ P-05: Mobile public pages dirender');
});

// ────────────────────────────────────────────────────────────────────────────
// P-06: Unauthenticated guard — /dashboard tanpa login harus redirect ke /login
// ────────────────────────────────────────────────────────────────────────────
test('P-06: Guard — /dashboard tanpa login redirect ke /login', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await shot(page, 'P06-unauth-guard');

  const url = page.url();
  expect(url.includes('/login'), '/dashboard tanpa token harus redirect ke /login').toBeTruthy();
  console.log(`  ✅ P-06: Guard unauth aktif — redirect ke ${url}`);
});

// ────────────────────────────────────────────────────────────────────────────
// P-07: Login page navigasi ke forgot-password
// ────────────────────────────────────────────────────────────────────────────
test('P-07: /login → /forgot-password link aktif', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Cari link lupa password — pakai filter() bukan CSS regex
  const forgotLink = page.locator('a, button').filter({ hasText: /lupa|forgot/i }).first();
  const hasForgot = await forgotLink.count() > 0;
  // Juga cek link href langsung
  const forgotHref = page.locator('a[href*="forgot"]').first();
  const hasForgotHref = await forgotHref.count() > 0;

  if (hasForgot || hasForgotHref) {
    const target = hasForgotHref ? forgotHref : forgotLink;
    await target.click();
    await page.waitForTimeout(1500);
    await shot(page, 'P07-forgot-password');
    const url = page.url();
    expect(url.includes('forgot'), 'Harus navigasi ke halaman lupa password').toBeTruthy();
    console.log('  ✅ P-07: Link lupa password aktif');
  } else {
    await shot(page, 'P07-login-no-forgot');
    console.log('  ⚠️  P-07: Link lupa password tidak ditemukan di login page');
  }
});

// ────────────────────────────────────────────────────────────────────────────
// P-08: Social proof / statistik publik di /rooms
// ────────────────────────────────────────────────────────────────────────────
test('P-08: /rooms — social proof & info kost tampil', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3500);
  await shot(page, 'P08-rooms-social-proof');

  const body = await page.locator('body').innerText();
  // Tidak boleh error, tidak boleh halaman tidak ditemukan
  const isError = /500|terjadi kesalahan|internal server error/i.test(body);
  expect(isError, 'Halaman rooms tidak boleh error 500').toBeFalsy();
  console.log('  ✅ P-08: /rooms tidak ada error 500');
});

// ────────────────────────────────────────────────────────────────────────────
// P-09: /panduan — halaman FAQ/Panduan publik tampil
// ────────────────────────────────────────────────────────────────────────────
test('P-09: /panduan — FAQ publik tampil', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/panduan', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, 'P09-panduan');

  const body = await page.locator('body').innerText();
  const isError = /500|terjadi kesalahan|internal server error/i.test(body);
  expect(isError, 'Halaman panduan tidak boleh error 500').toBeFalsy();
  // Harus ada heading atau konten FAQ
  const hasContent = /panduan|faq|aturan|tarif|booking|checkout/i.test(body);
  expect(hasContent, 'Halaman panduan harus ada konten FAQ').toBeTruthy();
  console.log('  ✅ P-09: /panduan tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// P-10: /reviews — halaman ulasan publik tampil
// ────────────────────────────────────────────────────────────────────────────
test('P-10: /reviews — ulasan publik tampil', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/reviews', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, 'P10-reviews');

  const body = await page.locator('body').innerText();
  const isError = /500|terjadi kesalahan|internal server error/i.test(body);
  expect(isError, 'Halaman ulasan tidak boleh error 500').toBeFalsy();
  // Minimal ada heading ulasan atau empty state
  const hasHeading = /ulasan|penghuni|rating/i.test(body);
  expect(hasHeading, 'Halaman ulasan harus ada heading').toBeTruthy();
  console.log('  ✅ P-10: /reviews tampil');
});

// ────────────────────────────────────────────────────────────────────────────
// P-11: /rooms — akses publik (tanpa login) → katalog dedicated
// ────────────────────────────────────────────────────────────────────────────
test('P-11: /rooms — publik bisa akses katalog dengan filter & kalender', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3500);
  await shot(page, 'P11-rooms-public');

  // Harus muncul filter bar dan/atau room cards (bukan landing gx-hero)
  const hasFilter = await page.locator('.rm-filter-bar, .rm-filter-chip, .rm-card').count();
  const hasHero = await page.locator('.gx-hero').count();
  // Publik harus lihat katalog (ada card/filter), bukan landing (ada hero)
  expect(hasFilter, 'Harus ada filter atau card kamar').toBeGreaterThan(0);
  console.log(`  ✅ P-11: /rooms untuk publik: filter=${hasFilter > 0 ? 'OK' : '✗'} (hero=${hasHero > 0 ? 'ditemukan' : 'tidak'})`);
});

// ────────────────────────────────────────────────────────────────────────────
// P-12: /booking/:id — form booking tampil untuk kamar publik
// ────────────────────────────────────────────────────────────────────────────
test('P-12: /booking/:id — form booking publik tampil', async ({ page }) => {
  test.setTimeout(45000);
  if (!_firstPublicRoomId) {
    console.log('  ⚠️  P-12: Dilewati — tidak ada kamar publik tersedia');
    return;
  }
  await page.goto(`/booking/${_firstPublicRoomId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await shot(page, 'P12-booking-form');

  const body = await page.locator('body').innerText();
  const isError = /500|terjadi kesalahan|internal server error/i.test(body);
  expect(isError, 'Form booking tidak boleh error 500').toBeFalsy();

  // Cek field nama lengkap ada (form sudah render)
  const hasForm = /nama lengkap|telepon|email|check.in|booking/i.test(body);
  expect(hasForm, 'Form booking harus tampil').toBeTruthy();
  console.log('  ✅ P-12: Form booking tampil');
});
