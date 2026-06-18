// Skrip sementara: screenshot UI di beberapa lebar viewport untuk studi responsivitas.
// Jalankan: node ui-shots/shoot.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const API = 'http://localhost:3000/api';
const APP = 'http://localhost:5173';
const TOKEN_KEY = 'kost48_access_token';

const EMAIL = 'owner@kost48.com';
const PASSWORD = 'Owner#2026';

const VIEWPORTS = [
  { name: 'mobile-390',  width: 390,  height: 844 },
  { name: 'tablet-834',  width: 834,  height: 1112 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-1920',   width: 1920, height: 1080 },
];

// Halaman owner yang mau distudi (path -> nama file)
const PAGES = [
  { path: '/reports', name: 'reports' },
];

async function getToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  const json = await res.json();
  const token = json?.data?.accessToken;
  if (!token) throw new Error('Login gagal: ' + JSON.stringify(json));
  return token;
}

const token = await getToken();
console.log('Token OK');

const browser = await chromium.launch();
const summary = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  // Suntik token sebelum app boot
  await ctx.addInitScript(([key, val]) => {
    window.localStorage.setItem(key, val);
  }, [TOKEN_KEY, token]);
  const page = await ctx.newPage();

  for (const pg of PAGES) {
    await page.goto(APP + pg.path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200); // beri waktu render chart/query
    const file = `ui-shots/shot_${pg.name}_${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });

    // Ukur lebar konten utama vs viewport untuk deteksi "konten mepet"
    const metrics = await page.evaluate(() => {
      const pick = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().width) : null; };
      return {
        innerWidth: window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        appShellGrid: pick('.app-shell-grid'),
        appMain: pick('.app-main'),
        ownerDashboard: pick('.owner-dashboard'),
        firstCardWidth: pick('.card'),
        gridTemplateColumns: (() => { const el = document.querySelector('.app-shell-grid'); return el ? getComputedStyle(el).gridTemplateColumns : null; })(),
      };
    });
    summary.push({ viewport: vp.name, page: pg.name, file, ...metrics });
    console.log(vp.name, pg.name, JSON.stringify(metrics));
  }
  await ctx.close();
}

writeFileSync('ui-shots/metrics.json', JSON.stringify(summary, null, 2));
await browser.close();
console.log('Selesai. Lihat ui-shots/*.png + metrics.json');
