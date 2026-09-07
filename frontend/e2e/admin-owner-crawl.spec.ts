import { test, expect, type Page } from '@playwright/test';
import { auditCredentials, BASE, ROLE_ROUTES, loginAs, type AuditCredential } from './audit-users';

// Crawl UI/UX Admin & Owner — login nyata via UI, kunjungi semua route menu,
// tangkap: pageerror (JS crash), console.error, HTTP >=500, request gagal, halaman blank.
// AO-03: kredensial TIDAK di-hard-code di sini — dibaca dari env lokal (audit-users.ts).
// Rute per role dijaga sinkron dengan frontend/src/App.tsx.

const IGNORE_CONSOLE = [
  'Download the React DevTools',
  'React DevTools',
  '[vite]',
  'Service worker',
  'manifest',
  'favicon',
];

type Finding = { route: string; kind: string; detail: string };

async function crawlRole(page: Page, roleName: 'OWNER' | 'ADMIN', creds: AuditCredential, onFinding: (f: Finding) => void) {
  let current = '(login)';
  const on = onFinding;

  page.on('pageerror', (err) => on({ route: current, kind: 'PAGEERROR', detail: String(err.message).slice(0, 300) }));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORE_CONSOLE.some((s) => text.includes(s))) return;
    on({ route: current, kind: 'CONSOLE', detail: text.slice(0, 300) });
  });
  page.on('response', (res) => {
    const st = res.status();
    if (st >= 500) on({ route: current, kind: 'HTTP5XX', detail: `${st} ${res.request().method()} ${res.url().slice(0, 180)}` });
    else if (st === 401 || st === 403 || st === 404) {
      if (res.url().includes('/api/')) on({ route: current, kind: `HTTP${st}`, detail: `${res.request().method()} ${res.url().slice(0, 180)}` });
    }
  });
  page.on('requestfailed', (req) => {
    const f = req.failure()?.errorText ?? '';
    if (f.includes('ERR_ABORTED')) return; // navigasi SPA membatalkan request lama — normal
    on({ route: current, kind: 'REQFAIL', detail: `${f} ${req.url().slice(0, 160)}` });
  });

  await loginAs(page, creds);

  const blank: string[] = [];
  const okPages: string[] = [];
  for (const route of ROLE_ROUTES[roleName]) {
    current = route;
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    // masih ke-redirect ke login? = guard salah
    if (page.url().includes('/login')) {
      on({ route, kind: 'REDIRECT-LOGIN', detail: 'terlempar kembali ke /login' });
      await loginAs(page, creds);
      continue;
    }
    const text = (await page.locator('#root').innerText().catch(() => '')).trim();
    if (text.length < 40) {
      blank.push(route);
      on({ route, kind: 'BLANK', detail: `render hanya ${text.length} karakter` });
    } else {
      okPages.push(route);
    }
    const slug = roleName + route.replace(/[/?:]+/g, '_');
    await page.screenshot({ path: `e2e-out/${slug}.png` }).catch(() => undefined);
  }

  console.log(`##RINGKAS## ${roleName}: ${okPages.length}/${ROLE_ROUTES[roleName].length} halaman render OK, ${blank.length} blank`);
}

for (const roleName of ['OWNER', 'ADMIN'] as const) {
  const creds = auditCredentials(roleName);
  test(`crawl ${roleName} — semua halaman bersih`, async ({ page }) => {
    test.skip(!creds, `Isi E2E_${roleName}_IDENTIFIER dan E2E_${roleName}_PASSWORD di env lokal untuk menjalankan crawl ${roleName}.`);
    test.setTimeout(360000);
    const findings: Finding[] = [];
    await crawlRole(page, roleName, creds!, (f) => findings.push(f));

    console.log('##TEMUAN##' + JSON.stringify(findings));

    const kritis = findings.filter((f) => ['PAGEERROR', 'HTTP5XX', 'BLANK', 'REDIRECT-LOGIN'].includes(f.kind));
    expect(kritis, 'Temuan KRITIS (JS crash / 5xx / halaman blank / guard salah):\n' + JSON.stringify(kritis, null, 2)).toEqual([]);
  });
}
