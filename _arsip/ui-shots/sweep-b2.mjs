import { chromium } from 'playwright';
const API = 'http://localhost:3000/api', APP = 'http://localhost:5173';
const WIDTHS = [390, 834, 1440];
const tok = async (id, pw) => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: id, password: pw }) })).json())?.data?.accessToken;

const ROLES = [
  { role: 'public', token: null, paths: ['/', '/rooms'] },
  { role: 'owner', cred: ['owner@kost48.com', 'Owner#2026'], paths: ['/owner-dashboard', '/reports', '/settings'] },
  { role: 'admin', cred: ['admin@kost48.com', 'admin123'], paths: ['/dashboard', '/stays', '/invoices'] },
  { role: 'staff', cred: ['staff@kost48.com', 'staff123'], paths: ['/staff-report'] },
  { role: 'tenant', cred: ['maya.tenant@kost48.test', 'Tenant#2026'], paths: ['/portal/stay'] },
];

const b = await chromium.launch();
let fails = 0, checks = 0;
for (const r of ROLES) {
  const token = r.cred ? await tok(...r.cred) : null;
  if (r.cred && !token) { console.log(`!! ${r.role}: LOGIN GAGAL`); fails++; continue; }
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    if (token) await ctx.addInitScript((t) => window.localStorage.setItem('kost48_access_token', t), token);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e.message || e)));
    for (const path of r.paths) {
      checks++;
      await p.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errs.push('GOTO ' + e.message));
      await p.waitForTimeout(900);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, title: document.title }));
      const overflow = m.sw - m.iw;
      const bad = overflow > 1;
      if (bad) fails++;
      const tag = `${r.role} ${w}w ${path}`;
      console.log(`${bad ? 'OVERFLOW' : 'ok      '} ${tag.padEnd(34)} scrollW=${m.sw} vw=${m.iw} ${bad ? `(+${overflow}px)` : ''} title="${m.title}"${errs.length ? ' ERR:' + errs.slice(0, 1) : ''}`);
      if (w === 390 && path === r.paths[0]) await p.screenshot({ path: `ui-shots/sweep_${r.role}_390.png`, fullPage: true }).catch(() => {});
    }
    await ctx.close();
  }
}
await b.close();
console.log(`\n=== ${checks} checks, ${fails} overflow/fail ===`);
process.exit(fails ? 1 : 0);
