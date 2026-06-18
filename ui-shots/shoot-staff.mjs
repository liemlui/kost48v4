// Verifikasi 2 bug staf: (1) spasi judul/keterangan di /staff-report,
// (2) dropdown notifikasi tertimpa kartu di /dashboard.
import { chromium } from 'playwright';
const API = 'http://localhost:3000/api';
const APP = 'http://localhost:5173';
const TOKEN_KEY = 'kost48_access_token';

const res = await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'staff@kost48.com', password: 'staff123' }),
});
const token = (await res.json())?.data?.accessToken;
if (!token) throw new Error('login staf gagal');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [TOKEN_KEY, token]);
const page = await ctx.newPage();

// 1) staff-report
await page.goto(APP + '/staff-report', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'ui-shots/staff_report.png', fullPage: false });

// 2) dashboard + buka notifikasi
await page.goto(APP + '/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('#notification-bell-toggle').catch((e) => console.log('klik bell gagal:', e.message));
await page.waitForTimeout(700);
await page.screenshot({ path: 'ui-shots/staff_notif.png', fullPage: false });

// 3) detail kamar staf (jarak hero -> tab)
await page.goto(APP + '/rooms/1', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: 'ui-shots/staff_room_detail.png', fullPage: false });

// 4) gudang staf (filter Status vs Kategori)
await page.goto(APP + '/staff-warehouse', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1300);
await page.screenshot({ path: 'ui-shots/staff_warehouse.png', fullPage: true });

await browser.close();
console.log('Selesai staf.');
