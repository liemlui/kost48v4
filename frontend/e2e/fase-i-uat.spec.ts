/*
 * FASE I — UAT OTOMATIS (Navigasi & Onboarding) + SMOKE KRUSIAL
 * Dossier: docs/M14_FASE_I_NAVIGASI_ONBOARDING.md (I1–I6) + UAT Global.
 *
 * Prasyarat (dikelola runner):
 *   1. DB UAT 5433 kost48_v3_pro sudah di-reseed (seed-dev-reset + seed-dev-via-api).
 *   2. Backend dev jalan di :3000 (DATABASE_URL=5433) — DIRESTART setelah seed agar
 *      bucket rate-limit login (10/5mnt per IP) bersih sebelum spec ini login banyak role.
 *   3. Frontend dev jalan di :5173 (playwright.config webServer reuse).
 *
 * Spec ini SELF-CONTAINED: beforeAll membuat fixture stage `browsing` & `booking`
 * lewat API nyata (tenant + portal-access; public booking → temp password).
 * Screenshot full-page disimpan ke frontend/e2e/uat-shots/.
 */
import { test, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.UAT_API_BASE || 'http://localhost:3000/api/';
const SHOTS = path.join(HERE, 'uat-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const STAMP = Date.now();
const CREDS = {
  owner: { id: 'owner@kost48.com', pw: 'Owner#2026' },
  admin: { id: 'admin@kost48.com', pw: 'admin123' },
  staff: { id: 'staff@kost48.com', pw: 'staff123' },
  occupied: { id: 'maya.tenant@kost48.test', pw: 'Tenant#2026' },
};
// Fixtures diisi di beforeAll
const browsing = { id: `uat.browse.${STAMP}@kost48.test`, pw: 'Uat#2026browse' };
const booking = { id: '', pw: '' };

function unwrap(body: any) {
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

async function bearer(ctx: APIRequestContext, identifier: string, password: string) {
  const res = await ctx.post('auth/login', { data: { identifier, password } });
  if (!res.ok()) throw new Error(`API login ${identifier} → ${res.status()} ${await res.text()}`);
  const d = unwrap(await res.json());
  const tok = d.accessToken ?? d.token;
  if (!tok) throw new Error(`API login ${identifier}: token kosong`);
  return tok;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function uiLogin(page: Page, identifier: string, password: string, home: RegExp) {
  await page.goto('/login');
  // Switch to Admin/Operasional mode for backoffice accounts (owner/admin/staff)
  const isBackoffice = !identifier.endsWith('@kost48.test');
  if (isBackoffice) {
    const modeBtn = page.locator('button[role="tab"]', { hasText: 'Admin' }).first();
    await modeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await modeBtn.click();
    // Wait for helper card text to confirm mode switch
    await page.locator('.login-helper-card.admin').waitFor({ state: 'visible', timeout: 5000 });
  }
  // Form.Control renders plain <input type="text"> without name/id
  await page.locator('input.form-control').first().fill(identifier);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(home, { timeout: 20000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('Fase I — UAT Navigasi & Onboarding + Smoke', () => {
  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    try {
      const ownerTok = await bearer(ctx, CREDS.owner.id, CREDS.owner.pw);
      const auth = { Authorization: `Bearer ${ownerTok}` };

      // Fixture BROWSING: tenant + portal-access, tanpa stay/booking.
      const tRes = await ctx.post('tenants', {
        headers: auth,
        data: { fullName: 'UAT Browsing', phone: `08120${String(STAMP).slice(-7)}`, email: browsing.id, gender: 'FEMALE', originCity: 'Surabaya', identityNumber: `3578${String(STAMP).slice(-12).padStart(12, '0')}` },
      });
      if (!tRes.ok()) throw new Error(`create tenant browsing → ${tRes.status()} ${await tRes.text()}`);
      const tId = unwrap(await tRes.json()).id;
      await ctx.post(`tenants/${tId}/portal-access`, { headers: auth, data: { email: browsing.id, password: browsing.pw, fullName: 'UAT Browsing' } });

      // Fixture BOOKING: public booking di kamar AVAILABLE → kamar jadi RESERVED + akun portal.
      const roomsRes = await ctx.get('public/rooms', { params: { limit: '50' } });
      const roomsBody = unwrap(await roomsRes.json());
      const rooms: any[] = roomsBody.items ?? roomsBody.rows ?? (Array.isArray(roomsBody) ? roomsBody : []);
      const avail = rooms.find((r) => String(r.status).toUpperCase() === 'AVAILABLE') ?? rooms[rooms.length - 1];
      if (!avail) throw new Error('Tidak ada kamar untuk fixture booking');
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const bRes = await ctx.post('public/bookings', {
        data: { roomId: avail.id, checkInDate: tomorrow, pricingTerm: 'MONTHLY', fullName: 'UAT Booking', phone: `08130${String(STAMP).slice(-7)}`, email: `uat.book.${STAMP}@kost48.test` },
      });
      if (!bRes.ok()) throw new Error(`public booking → ${bRes.status()} ${await bRes.text()}`);
      const bData = unwrap(await bRes.json());
      booking.id = bData.portalAccess.email;
      booking.pw = bData.portalAccess.temporaryPassword;
      expect(booking.pw, 'temp password booking fixture').toBeTruthy();
    } finally {
      await ctx.dispose();
    }
  });

  test('SMOKE OWNER — owner dashboard render', async ({ page }) => {
    await uiLogin(page, CREDS.owner.id, CREDS.owner.pw, /owner-dashboard/);
    await expect(page).toHaveURL(/owner-dashboard/);
    await expect(page.locator('.sidebar-link').first()).toBeVisible();
    await shot(page, '01-owner-dashboard');
  });

  test('UAT-I1+I3+I5+REGRESI (ADMIN)', async ({ page }) => {
    test.setTimeout(90_000);
    await uiLogin(page, CREDS.admin.id, CREDS.admin.pw, /\/dashboard/);

    // I1 — dashboard admin TIDAK menampilkan chip sub-menu (bahkan dalam area tab)
    await page.goto('/dashboard?area=stays-finance', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.admin-area-internal-menu')).toHaveCount(0);
    await expect(page.locator('.sidebar-link').first()).toBeVisible();
    await shot(page, '02-admin-dashboard-no-chips');

    // I3 — /meter-readings → sidebar "Kamar & Stok" active
    await page.goto('/meter-readings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar-link.active', { hasText: 'Kamar & Stok' }).first()).toBeVisible();
    await shot(page, '03-meter-readings-sidebar-active');

    // I5 — segmen pertama breadcrumb bisa diklik → default route (dashboard)
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' });
    const crumb = page.locator('a.app-breadcrumb-link').first();
    await expect(crumb).toBeVisible();
    await shot(page, '04-breadcrumb-link');
    await crumb.click();
    await expect(page).toHaveURL(/\/dashboard/);

    // REGRESI — rute existing tidak 404
    for (const route of ['/rooms', '/tickets', '/reports', '/invoices', '/stays', '/expenses', '/meter-readings']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Halaman tidak ditemukan'), `route ${route} tidak boleh 404`).toHaveCount(0);
    }
    await shot(page, '05-regresi-rute-terakhir');
  });

  test('UAT-I2 — StaffTopWorkspaceNav 5 tab (incl. Tugas)', async ({ page }) => {
    await uiLogin(page, CREDS.staff.id, CREDS.staff.pw, /\/dashboard/);
    const tabs = page.locator('.staff-workspace-tab');
    await expect(tabs).toHaveCount(5);
    await expect(page.locator('.staff-workspace-tab', { hasText: 'Tugas' })).toBeVisible();
    await shot(page, '06-staff-nav-5-tabs');
  });

  test('UAT-I4+I6 occupied — guide tersembunyi, strip "Panduan Kos Saya"', async ({ page }) => {
    await uiLogin(page, CREDS.occupied.id, CREDS.occupied.pw, /portal\/stay/);
    // tunggu stage settle (strip occupied) baru pastikan guide hilang
    await expect(page.locator('.tenant-workspace-guide-strip')).toContainText('Panduan Kos Saya');
    await expect(page.locator('.getting-started-guide')).toHaveCount(0);
    await shot(page, '07-tenant-occupied-no-guide');
  });

  test('UAT-I4+I6 browsing — guide 3 langkah pilih kamar', async ({ page }) => {
    await uiLogin(page, browsing.id, browsing.pw, /rooms|portal/);
    await page.goto('/rooms', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tenant-workspace-guide-strip')).toContainText('Pilih kamar yang cocok');
    await expect(page.locator('.getting-started-guide')).toBeVisible();
    await expect(page.locator('.getting-started-guide')).toContainText('menuju kamar Anda');
    await shot(page, '08-tenant-browsing-guide');
  });

  test('UAT-I4+I6 booking — guide status pemesanan', async ({ page }) => {
    await uiLogin(page, booking.id, booking.pw, /portal|rooms/);
    await page.goto('/portal/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.tenant-workspace-guide-strip')).toContainText('Pantau pemesanan');
    await expect(page.locator('.getting-started-guide')).toBeVisible();
    await expect(page.locator('.getting-started-guide')).toContainText('Status pemesanan Anda');
    await shot(page, '09-tenant-booking-guide');
  });
});
