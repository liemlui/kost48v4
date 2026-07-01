import { test, expect } from '@playwright/test';

// Y-Q7 — PWA / offline: manifest, service worker API, dan (bila SW aktif) offline shell.
test.describe('Y-Q7 — PWA / offline capability', () => {
  test('manifest terpasang & service worker API tersedia', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSW, 'Browser harus mendukung service worker').toBe(true);
  });

  test('shell tetap tampil saat offline (dilewati bila SW belum aktif — mode dev)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1200); // beri waktu SW register (aktif di build/preview)
    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg && (reg.active || reg.waiting));
    });
    test.skip(!swActive, 'Service worker belum aktif (kemungkinan mode dev) — uji offline dilewati');

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    await context.setOffline(false);
  });
});
