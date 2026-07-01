/**
 * VISUAL CAPTURE — audit UI/UX berbasis screenshot (bukan smoke-test teks).
 * Memotret SEMUA rute × 5 role × 2 viewport (desktop 1280×900 + mobile 390×844)
 * ke screenshots-ui/visual/<role>/<viewport>/<NN-slug>.png — capture-only, tidak
 * pernah gagal di assertion. Hasilnya diinspeksi visual oleh manusia/AI.
 *
 * Jalankan (dari frontend/, backend+vite harus hidup):
 *   $env:VITE_PORT='5173'; npx playwright test e2e/visual-capture.spec.ts --reporter=list
 */
import { test, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(process.cwd(), 'screenshots-ui', 'visual');
const API = 'http://localhost:3000';

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

type Tok = { token: string; user: Record<string, unknown> };
const tokens: Record<string, Tok> = {};
let roomId = 1;

async function apiLogin(identifier: string, password: string): Promise<Tok> {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/auth/login', { data: { identifier, password } });
  const body = res.ok() ? await res.json() : {};
  await ctx.dispose();
  return { token: body.data?.accessToken ?? '', user: body.data?.user ?? {} };
}

async function cap(page: Page, role: string, vp: 'desktop' | 'mobile', name: string) {
  const dir = path.join(ROOT, role, vp);
  fs.mkdirSync(dir, { recursive: true });
  try {
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    console.log(`  📸 ${role}/${vp}/${name}`);
  } catch (e) {
    console.log(`  ⚠️  gagal shot ${role}/${vp}/${name}: ${(e as Error).message}`);
  }
}

/** Navigasi 1 rute lalu capture di kedua viewport. Tidak pernah throw. */
async function visit(page: Page, role: string, route: string, name: string) {
  for (const [vp, size] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
    try {
      await page.setViewportSize(size);
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // beri waktu React render + query selesai; abaikan timeout networkidle
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
    } catch (e) {
      console.log(`  ⚠️  nav gagal ${route} (${vp}): ${(e as Error).message}`);
    }
    await cap(page, role, vp, name);
  }
}

/** Inject token role ke storage sebelum tiap navigasi. */
async function authAs(page: Page, role: string) {
  const t = tokens[role];
  if (!t?.token) return;
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('kost48_access_token', token);
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(user));
  }, { token: t.token, user: t.user });
}

test.beforeAll(async () => {
  tokens.owner = await apiLogin('owner@kost48.com', 'Owner#2026');
  tokens.admin = await apiLogin('admin@kost48.com', 'admin123');
  tokens.staff = await apiLogin('staff@kost48.com', 'staff123');
  tokens.tenant = await apiLogin('maya.tenant@kost48.test', 'Tenant#2026');
  // ambil room id pertama (publik) untuk rute detail/booking
  const ctx = await pwRequest.newContext({ baseURL: API });
  const r = await ctx.get('/api/public/rooms?limit=1');
  if (r.ok()) {
    const b = await r.json();
    const items = b.data?.items ?? b.data ?? b.items ?? [];
    if (Array.isArray(items) && items.length) roomId = items[0].id;
  }
  await ctx.dispose();
  console.log(`  🔑 tokens: owner=${!!tokens.owner.token} admin=${!!tokens.admin.token} staff=${!!tokens.staff.token} tenant=${!!tokens.tenant.token} · roomId=${roomId}`);
});

// ── PUBLIC (tanpa login) ─────────────────────────────────────────────────────
test('capture PUBLIC', async ({ page }) => {
  test.setTimeout(300000);
  const routes: [string, string][] = [
    ['/', '01-landing'],
    ['/rooms', '02-katalog'],
    [`/rooms/${roomId}/detail`, '03-room-detail'],
    [`/booking/${roomId}`, '04-booking-form'],
    ['/panduan', '05-panduan-faq'],
    ['/reviews', '06-reviews'],
    ['/login', '07-login'],
    ['/forgot-password', '08-forgot-password'],
  ];
  for (const [route, name] of routes) await visit(page, 'public', route, name);
});

// ── TENANT ───────────────────────────────────────────────────────────────────
test('capture TENANT', async ({ page }) => {
  test.setTimeout(300000);
  await authAs(page, 'tenant');
  const routes: [string, string][] = [
    ['/portal/stay', '01-stay'],
    ['/portal/invoices', '02-invoices'],
    ['/portal/tickets', '03-tickets'],
    ['/portal/announcements', '04-announcements'],
    ['/portal/loyalty', '05-loyalty'],
    ['/portal/manual', '06-manual'],
    ['/portal/bookings', '07-bookings'],
    ['/profile', '08-profile'],
    ['/notifications', '09-notifications'],
  ];
  for (const [route, name] of routes) await visit(page, 'tenant', route, name);
});

// ── STAFF ────────────────────────────────────────────────────────────────────
test('capture STAFF', async ({ page }) => {
  test.setTimeout(300000);
  await authAs(page, 'staff');
  const routes: [string, string][] = [
    ['/dashboard', '01-dashboard'],
    ['/tickets', '02-tickets'],
    ['/staff-report', '03-staff-report'],
    ['/staff-warehouse', '04-staff-warehouse'],
    [`/rooms/${roomId}`, '05-room-detail'],
    ['/profile', '06-profile'],
    ['/notifications', '07-notifications'],
  ];
  for (const [route, name] of routes) await visit(page, 'staff', route, name);
});

// ── ADMIN ────────────────────────────────────────────────────────────────────
test('capture ADMIN', async ({ page }) => {
  test.setTimeout(300000);
  await authAs(page, 'admin');
  const routes: [string, string][] = [
    ['/admin-dashboard', '01-admin-dashboard'],
    ['/dashboard', '02-dashboard'],
    ['/stays', '03-stays'],
    ['/invoices', '04-invoices'],
    ['/payment-submissions/review', '05-payment-review'],
    ['/tickets', '06-tickets'],
    ['/tenants', '07-tenants'],
    ['/meter-readings', '08-meter-readings'],
    ['/inventory/gudang', '09-inventory'],
    ['/stays/check-in', '10-check-in-wizard'],
  ];
  for (const [route, name] of routes) await visit(page, 'admin', route, name);
});

// ── OWNER (paling lengkap) ───────────────────────────────────────────────────
test('capture OWNER', async ({ page }) => {
  test.setTimeout(600000);
  await authAs(page, 'owner');
  const routes: [string, string][] = [
    ['/dashboard', '01-dashboard'],
    ['/owner-dashboard', '02-owner-dashboard'],
    ['/stays', '03-stays'],
    ['/invoices', '04-invoices'],
    ['/payment-submissions/review', '05-payment-review'],
    ['/tickets', '06-tickets'],
    ['/announcements', '07-announcements'],
    ['/tenants', '08-tenants'],
    ['/renew-requests', '09-renew-requests'],
    ['/reports', '10-reports'],
    ['/settings', '11-settings'],
    ['/loyalty', '12-loyalty'],
    ['/inventory/gudang', '13-inventory'],
    ['/market-analysis', '14-market-analysis'],
    ['/expenses', '15-expenses'],
    ['/staff-performance', '16-staff-performance'],
    ['/staff-routines', '17-staff-routines'],
    ['/finance/accounting-setup', '18-accounting-setup'],
    ['/finance/assets', '19-finance-assets'],
    ['/loss-refunds', '20-loss-refunds'],
    ['/users', '21-users'],
    ['/meter-readings', '22-meter-readings'],
    ['/additional-services', '23-additional-services'],
    ['/service-interests', '24-service-interests'],
    ['/wifi-sales', '25-wifi-sales'],
    ['/ancillary-revenue', '26-ancillary-revenue'],
    ['/reminders', '27-reminders'],
    ['/invoice-payments', '28-invoice-payments'],
    [`/rooms/${roomId}`, '29-room-detail'],
    ['/stays/check-in', '30-check-in-wizard'],
    ['/notifications', '31-notifications'],
    ['/profile', '32-profile'],
  ];
  for (const [route, name] of routes) await visit(page, 'owner', route, name);
});
