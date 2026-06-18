// Reproduksi bug "Lihat Perbandingan" di /rooms.
import { chromium } from 'playwright';
const APP = 'http://localhost:5173';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(APP + '/rooms', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

const compareBtns = page.locator('.rm-card-compare-btn');
const n = await compareBtns.count();
console.log('tombol + (compare) ditemukan:', n);

if (n >= 2) {
  await compareBtns.nth(0).click();
  await compareBtns.nth(1).click();
  await page.waitForTimeout(500);

  const barVisible = await page.locator('.rm-compare-bar').isVisible().catch(() => false);
  console.log('rm-compare-bar terlihat:', barVisible);

  const panelExists = await page.locator('.room-market-compare-panel').count();
  console.log('panel count (DOM):', panelExists);

  // klik "Lihat Perbandingan"
  await page.getByRole('button', { name: 'Lihat Perbandingan' }).click();
  await page.waitForTimeout(1200);

  const panel = page.locator('.room-market-compare-panel');
  const panelVisible = await panel.isVisible().catch(() => false);
  const box = await panel.boundingBox().catch(() => null);
  const scrollY = await page.evaluate(() => window.scrollY);
  console.log('SETELAH KLIK -> panelVisible:', panelVisible, '| box:', JSON.stringify(box), '| scrollY:', scrollY);

  await page.screenshot({ path: 'ui-shots/compare_after_click.png', fullPage: true });
} else {
  await page.screenshot({ path: 'ui-shots/compare_no_btn.png', fullPage: true });
}

console.log('CONSOLE ERRORS:', errors.length ? errors : 'none');
await browser.close();
