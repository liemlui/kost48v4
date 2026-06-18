import { chromium } from 'playwright';
const API = 'http://localhost:3000/api', APP = 'http://localhost:5173';
const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'staff@kost48.com', password: 'staff123' }) });
const token = (await r.json())?.data?.accessToken;
const b = await chromium.launch();
const routes = [['dashboard', '/dashboard'], ['warehouse', '/staff-warehouse'], ['report', '/staff-report'], ['tickets', '/tickets'], ['rooms', '/rooms']];
for (const [name, path] of routes) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 } });
  await ctx.addInitScript((t) => window.localStorage.setItem('kost48_access_token', t), token);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message || e)));
  await p.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errs.push('GOTO ' + e.message));
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `ui-shots/staff_${name}.png`, fullPage: true });
  console.log(`${name} (${path}): errors ${errs.length ? errs.slice(0, 2) : 'none'}`);
  await ctx.close();
}
await b.close();
