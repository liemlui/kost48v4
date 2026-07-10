import { test, expect, type Page } from '@playwright/test';

// Crawl UI/UX Admin & Owner — login nyata via UI, kunjungi semua route menu,
// tangkap: pageerror (JS crash), console.error, HTTP >=500, request gagal, halaman blank.

const SHARED = [
  '/renew-requests', '/users', '/tenants', '/stays', '/stays/check-in', '/invoices',
  '/invoice-payments', '/payment-submissions/review', '/announcements', '/meter-readings',
  '/ac-maintenance', '/additional-services', '/service-interests', '/tickets',
  '/staff-routines', '/staff-performance', '/surveys', '/guest-preferences',
  '/inventory/gudang', '/inventory/barang-kamar', '/inventory/mutasi', '/wifi-sales',
  '/ancillary-revenue', '/finance/accounting-setup', '/finance/assets', '/expenses',
  '/reminders', '/settings', '/notifications', '/profile',
];

const ROLES = [
  {
    name: 'OWNER', id: 'owner@kost48.com', pw: 'Owner#2026',
    routes: ['/owner-dashboard', '/admin-dashboard', '/market-analysis', '/loss-refunds', '/reports', ...SHARED],
  },
  {
    name: 'ADMIN', id: 'admin@kost48.com', pw: 'admin123',
    routes: ['/dashboard', ...SHARED],
  },
];

type Finding = { route: string; kind: string; detail: string };

// Default uji terhadap server combined paket deploy (production-like). Override: E2E_BASE.
const BASE = process.env.E2E_BASE ?? 'http://localhost:3100';

const IGNORE_CONSOLE = [
  'Download the React DevTools',
  'React DevTools',
  '[vite]',
  'Service worker',
  'manifest',
  'favicon',
];

async function loginAs(page: Page, id: string, pw: string) {
  await page.goto(BASE + '/login');
  await page.getByText('Admin / Operasional', { exact: false }).first().click();
  const inputs = page.locator('form input');
  await inputs.first().fill(id);
  await page.locator('form input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

for (const role of ROLES) {
  test(`crawl ${role.name} — semua halaman bersih`, async ({ page }) => {
    test.setTimeout(360000);
    const findings: Finding[] = [];
    let current = '(login)';

    page.on('pageerror', (err) => findings.push({ route: current, kind: 'PAGEERROR', detail: String(err.message).slice(0, 300) }));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE_CONSOLE.some((s) => text.includes(s))) return;
      findings.push({ route: current, kind: 'CONSOLE', detail: text.slice(0, 300) });
    });
    page.on('response', (res) => {
      const st = res.status();
      if (st >= 500) findings.push({ route: current, kind: 'HTTP5XX', detail: `${st} ${res.request().method()} ${res.url().slice(0, 180)}` });
      else if (st === 401 || st === 403 || st === 404) {
        if (res.url().includes('/api/')) findings.push({ route: current, kind: `HTTP${st}`, detail: `${res.request().method()} ${res.url().slice(0, 180)}` });
      }
    });
    page.on('requestfailed', (req) => {
      const f = req.failure()?.errorText ?? '';
      if (f.includes('ERR_ABORTED')) return; // navigasi SPA membatalkan request lama — normal
      findings.push({ route: current, kind: 'REQFAIL', detail: `${f} ${req.url().slice(0, 160)}` });
    });

    await loginAs(page, role.id, role.pw);

    const blank: string[] = [];
    const okPages: string[] = [];
    for (const route of role.routes) {
      current = route;
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => undefined);
      await page.waitForTimeout(700);

      // masih ke-redirect ke login? = guard salah
      if (page.url().includes('/login')) {
        findings.push({ route, kind: 'REDIRECT-LOGIN', detail: 'terlempar kembali ke /login' });
        await loginAs(page, role.id, role.pw);
        continue;
      }
      const text = (await page.locator('#root').innerText().catch(() => '')).trim();
      if (text.length < 40) {
        blank.push(route);
        findings.push({ route, kind: 'BLANK', detail: `render hanya ${text.length} karakter` });
      } else {
        okPages.push(route);
      }
      const slug = role.name + route.replace(/[/?:]+/g, '_');
      await page.screenshot({ path: `e2e-out/${slug}.png` }).catch(() => undefined);
    }

    console.log(`##RINGKAS## ${role.name}: ${okPages.length}/${role.routes.length} halaman render OK, ${blank.length} blank`);
    console.log('##TEMUAN##' + JSON.stringify(findings));

    const kritis = findings.filter((f) => ['PAGEERROR', 'HTTP5XX', 'BLANK', 'REDIRECT-LOGIN'].includes(f.kind));
    expect(kritis, 'Temuan KRITIS (JS crash / 5xx / halaman blank / guard salah):\n' + JSON.stringify(kritis, null, 2)).toEqual([]);
  });
}
