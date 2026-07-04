import { chromium } from 'playwright';
const API = 'http://localhost:3000/api', APP = 'http://localhost:5173';
async function tok(id, pw) { const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: id, password: pw }) }); return (await r.json())?.data?.accessToken; }
const b = await chromium.launch();
async function shot(name, token, path, file) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 } });
  await ctx.addInitScript((t) => window.localStorage.setItem('kost48_access_token', t), token);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message || e)));
  await p.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errs.push('GOTO ' + e.message));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: file, fullPage: true });
  const hasRiwayat = await p.locator('text=/Riwayat Sewa/').count();
  console.log(`${name}: Riwayat Sewa=${hasRiwayat} | errors: ${errs.length ? errs.slice(0,2) : 'none'}`);
  await ctx.close();
}
const owner = await tok('owner@kost48.com', 'Owner#2026');
await shot('owner /stays/1', owner, '/stays/1', 'ui-shots/stay_timeline_owner.png');
const maya = await tok('maya.tenant@kost48.test', 'Tenant#2026');
await shot('tenant /portal/stay', maya, '/portal/stay', 'ui-shots/stay_timeline_tenant.png');
await b.close();
