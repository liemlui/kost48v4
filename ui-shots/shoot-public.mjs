// Screenshot halaman PUBLIK (tanpa auth): login, katalog kamar, beranda tamu.
import { chromium } from 'playwright';

const APP = 'http://localhost:5173';
const VIEWPORTS = [
  { name: 'mobile-390',  width: 390,  height: 844 },
  { name: 'tablet-834',  width: 834,  height: 1112 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const PAGES = [
  { path: '/login', name: 'login' },
  { path: '/rooms', name: 'rooms' },
  { path: '/',      name: 'home' },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const pg of PAGES) {
    await page.goto(APP + pg.path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // viewport shot (bukan fullPage) untuk lihat "fit tanpa scroll"
    await page.screenshot({ path: `ui-shots/pub_${pg.name}_${vp.name}.png`, fullPage: false });
    const scroll = await page.evaluate(() => ({ sh: document.body.scrollHeight, ih: window.innerHeight }));
    console.log(pg.name, vp.name, `scrollH=${scroll.sh} innerH=${scroll.ih} ${scroll.sh > scroll.ih ? 'PERLU-SCROLL' : 'FIT'}`);
  }
  await ctx.close();
}
await browser.close();
console.log('Selesai publik.');
