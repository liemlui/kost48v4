import { chromium } from 'playwright';
const API = 'http://localhost:3000/api', APP = 'http://localhost:5173';
const tok = async (id, pw) => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: id, password: pw }) })).json())?.data?.accessToken;
const b = await chromium.launch();
async function shot(name, token, path) {
  const ctx = await b.newContext({ viewport: { width: 1320, height: 1200 } });
  await ctx.addInitScript((t) => window.localStorage.setItem('kost48_access_token', t), token);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message || e)));
  await p.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errs.push('GOTO ' + e.message));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `ui-shots/${name}.png`, fullPage: true });
  console.log(`${name} (${path}): errors ${errs.length ? errs.slice(0, 2) : 'none'}`);
  await ctx.close();
}
await shot('owner_dash', await tok('owner@kost48.com', 'Owner#2026'), '/owner-dashboard');
await shot('admin_dash', await tok('admin@kost48.com', 'admin123'), '/dashboard');
await b.close();
