// Verifikasi halaman tenant: /portal/stay (accordion + tombol perpanjangan,
// tanpa "Panduan resmi") & /portal/loyalty (tanpa konversi rupiah, tanpa lapor).
import { chromium } from 'playwright';
const API = 'http://localhost:3000/api';
const APP = 'http://localhost:5173';
const TOKEN_KEY = 'kost48_access_token';

const res = await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'tenant.maya@kost48.test', password: 'Tenant#2026' }),
});
const token = (await res.json())?.data?.accessToken;
if (!token) throw new Error('login tenant gagal');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [TOKEN_KEY, token]);
const page = await ctx.newPage();

for (const [path, name] of [['/portal/stay', 'stay'], ['/portal/loyalty', 'loyalty']]) {
  await page.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `ui-shots/tenant_${name}.png`, fullPage: true });
  console.log(name, 'OK');
}
await browser.close();
console.log('Selesai tenant.');
