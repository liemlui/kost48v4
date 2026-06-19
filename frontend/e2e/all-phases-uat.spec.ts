/*
 * UAT SMOKE SEMUA FASE (A–J) — alur kritis per fase + role guard + fitur UX.
 * Pelengkap fase-i-uat.spec.ts. Invarian uang/akunting (Fase A/D/E) diverifikasi
 * TERPISAH lewat `node --test` backend + reseed (assert trial balance) oleh runner.
 *
 * Dikelompokkan per-sesi role agar hemat login (rate-limit login = 10/5mnt per IP):
 *   PUBLIC(0) + OWNER(1) + ADMIN(1) + STAFF(1) + TENANT(1) = 4 login.
 *
 * Prasyarat runner: DB UAT 5433 reseed; backend :3000 (DIRESTART pasca-seed); frontend :5173.
 * Screenshot → frontend/e2e/uat-shots/ (gitignored).
 */
import { test, expect, request as pwRequest, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.UAT_API_BASE || 'http://localhost:3000/api/';
const SHOTS = path.join(HERE, 'uat-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CREDS = {
  owner: { id: 'owner@kost48.com', pw: 'Owner#2026' },
  admin: { id: 'admin@kost48.com', pw: 'admin123' },
  staff: { id: 'staff@kost48.com', pw: 'staff123' },
  tenant: { id: 'maya.tenant@kost48.test', pw: 'Tenant#2026' },
};

let availableRoomId: number | null = null;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function uiLogin(page: Page, identifier: string, password: string, home: RegExp) {
  await page.goto('/login');
  const isBackoffice = !identifier.endsWith('@kost48.test');
  if (isBackoffice) {
    const modeBtn = page.locator('button[role="tab"]', { hasText: 'Admin' }).first();
    await modeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await modeBtn.click();
    await page.locator('.login-helper-card.admin').waitFor({ state: 'visible', timeout: 5000 });
  }
  await page.locator('input.form-control').first().fill(identifier);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(home, { timeout: 20000 });
}

/** Navigasi + pastikan TIDAK 404 + (opsional) screenshot. */
async function gotoOk(page: Page, route: string, name?: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=Halaman tidak ditemukan'), `route ${route} tidak boleh 404`).toHaveCount(0);
  if (name) await shot(page, name);
}

/** Navigasi ke rute terlarang utk role → harus diarahkan ke defaultRoute (redirect guard). */
async function expectRedirect(page: Page, route: string, awayFrom: RegExp, to: RegExp) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(to, { timeout: 8000 });
  expect(page.url()).not.toMatch(awayFrom);
}

test.describe.configure({ mode: 'serial' });

test.describe('UAT Semua Fase (A–J) — smoke', () => {
  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    try {
      const res = await ctx.get('public/rooms', { params: { limit: '50' } });
      const body = await res.json();
      const data = body.data ?? body;
      const rooms: any[] = data.items ?? data.rows ?? (Array.isArray(data) ? data : []);
      const avail = rooms.find((r) => String(r.status).toUpperCase() === 'AVAILABLE') ?? rooms[0];
      availableRoomId = avail?.id ?? null;
    } finally {
      await ctx.dispose();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FASE B — Publik & Marketing (tanpa login)
  // ─────────────────────────────────────────────────────────────────────────
  test('B PUBLIK — landing, katalog, detail kamar, form booking tamu', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoOk(page, '/', 'allphases-B1-landing');
    await gotoOk(page, '/rooms', 'allphases-B2-katalog');
    // katalog menampilkan minimal 1 kartu kamar
    await expect(page.locator('a[href*="/rooms/"], .room-card, [class*="room"]').first()).toBeVisible({ timeout: 10_000 });
    if (availableRoomId) {
      await gotoOk(page, `/rooms/${availableRoomId}/detail`, 'allphases-B3-detail');
      await gotoOk(page, `/booking/${availableRoomId}`, 'allphases-B4-booking-form');
      await expect(page.locator('form, input').first()).toBeVisible({ timeout: 10_000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FASE C/E/G/H + A — OWNER (workspace owner, finance setup, AI, loyalty, compact)
  // ─────────────────────────────────────────────────────────────────────────
  test('OWNER — owner-dashboard, reports, finance, market-analysis(G), loyalty(E), compact(H)', async ({ page }) => {
    test.setTimeout(120_000);
    await uiLogin(page, CREDS.owner.id, CREDS.owner.pw, /owner-dashboard/);
    await shot(page, 'allphases-C1-owner-dashboard');
    // H: sidebar owner ringkas — minimal ada link nav
    await expect(page.locator('.sidebar-link').first()).toBeVisible();

    await gotoOk(page, '/reports', 'allphases-C2-reports-owner');          // C: laporan OWNER-only
    await gotoOk(page, '/finance/accounting-setup', 'allphases-A1-accounting-setup'); // A: setup akunting
    await gotoOk(page, '/finance/assets', 'allphases-A2-assets');          // A: aset/depresiasi
    await gotoOk(page, '/market-analysis', 'allphases-G1-market-analysis');// G: AI analisa pasar (panel manual)
    await gotoOk(page, '/loyalty', 'allphases-E1-loyalty-admin');          // E: kelola reward loyalitas
    await gotoOk(page, '/settings', 'allphases-C3-owner-settings');
    await gotoOk(page, '/admin-dashboard', 'allphases-H1-owner-admin-view'); // H/C: OWNER mode admin
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FASE C/D/F/G/I — ADMIN (workspace, ops, guard owner-only, 404, logout, AI)
  // ─────────────────────────────────────────────────────────────────────────
  test('ADMIN — workspace, ops, guard OWNER-only, 404(F), logout-confirm(F)', async ({ page }) => {
    test.setTimeout(120_000);
    await uiLogin(page, CREDS.admin.id, CREDS.admin.pw, /\/dashboard/);
    await shot(page, 'allphases-C4-admin-dashboard');

    // D/ops + finance review
    await gotoOk(page, '/stays', 'allphases-D1-stays');
    await gotoOk(page, '/invoices', 'allphases-D2-invoices');
    await gotoOk(page, '/payment-submissions/review', 'allphases-D3-payment-review');
    await gotoOk(page, '/tickets', 'allphases-D4-tickets');
    await gotoOk(page, '/meter-readings', 'allphases-D5-meter-readings');
    await gotoOk(page, '/inventory/gudang', 'allphases-D6-gudang');
    await gotoOk(page, '/staff-performance', 'allphases-D7-staff-performance');
    await gotoOk(page, '/expenses', 'allphases-G2-expenses-ai');     // G: AiAssistButton di expenses
    // F: pencarian tenant
    await gotoOk(page, '/tenants', 'allphases-F1-tenant-search');
    await expect(page.locator('input[type="search"], input[placeholder*="ari" i], input[placeholder*="search" i]').first()).toBeVisible({ timeout: 8000 });

    // C: guard OWNER-only → ADMIN diarahkan ke /dashboard
    await expectRedirect(page, '/reports', /\/reports/, /\/dashboard/);
    await expectRedirect(page, '/market-analysis', /market-analysis/, /\/dashboard/);

    // F: halaman 404
    await page.goto('/rute-tidak-ada-xyz-123', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Halaman tidak ditemukan')).toBeVisible({ timeout: 8000 });
    await shot(page, 'allphases-F2-404');

    // F: konfirmasi logout (window.confirm) — pasang handler, dismiss agar tetap login
    await gotoOk(page, '/dashboard');
    let confirmText = '';
    page.once('dialog', (d) => { confirmText = d.message(); d.dismiss().catch(() => {}); });
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Keluar")').first();
    if (await logoutBtn.count()) {
      await logoutBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      expect(confirmText.toLowerCase()).toContain('keluar');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FASE D — STAFF (pusat kerja, tiket, gudang, laporan, guard)
  // ─────────────────────────────────────────────────────────────────────────
  test('STAFF — pusat kerja, tiket, gudang, laporan, guard non-staff', async ({ page }) => {
    test.setTimeout(90_000);
    await uiLogin(page, CREDS.staff.id, CREDS.staff.pw, /\/dashboard/);
    await shot(page, 'allphases-D8-staff-dashboard');
    await gotoOk(page, '/tickets', 'allphases-D9-staff-tickets');
    await gotoOk(page, '/staff-warehouse', 'allphases-D10-staff-warehouse');
    await gotoOk(page, '/staff-report', 'allphases-D11-staff-report');
    await gotoOk(page, '/rooms', 'allphases-D12-staff-rooms');
    // guard: STAFF tak boleh /invoices → redirect /dashboard
    await expectRedirect(page, '/invoices', /\/invoices/, /\/dashboard/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FASE B/E — TENANT (portal huni, tagihan, tiket, loyalty, manual, guard)
  // ─────────────────────────────────────────────────────────────────────────
  test('TENANT — portal stay/invoices/tickets, loyalty(E), manual(B), guard', async ({ page }) => {
    test.setTimeout(90_000);
    await uiLogin(page, CREDS.tenant.id, CREDS.tenant.pw, /portal\/stay/);
    await shot(page, 'allphases-B5-tenant-stay');
    await gotoOk(page, '/portal/invoices', 'allphases-B6-tenant-invoices');
    await gotoOk(page, '/portal/tickets', 'allphases-B7-tenant-tickets');
    await gotoOk(page, '/portal/loyalty', 'allphases-E2-tenant-loyalty');
    await expect(page.getByText(/Poin|Loyalitas|Reward|Kebaikan/i).first()).toBeVisible({ timeout: 8000 });
    await gotoOk(page, '/portal/manual', 'allphases-B8-tenant-manual'); // B/F4-12 FAQ manual
    // guard: TENANT tak boleh /stays (admin) → redirect /portal/stay
    await expectRedirect(page, '/stays', /^[^?]*\/stays(\?|$)/, /portal\/stay/);
  });
});
