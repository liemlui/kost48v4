import { test, expect } from '@playwright/test';

// Y-Q6 — Mobile viewport: halaman publik kritis di lebar 375px (iPhone SE/mini).
test.use({ viewport: { width: 375, height: 812 } });

const PUBLIC_PAGES = ['/', '/rooms', '/login', '/panduan'];

test.describe('Y-Q6 — Mobile viewport 375px', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} tampil & tidak ada horizontal scroll berlebih`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      // Konten utama terlihat (heading/hero/brand)
      await expect(page.locator('h1, h2, .navbar-brand, .rm-topbar-brand').first()).toBeVisible({ timeout: 8000 });
      // Tidak boleh ada overflow horizontal signifikan pada viewport mobile
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `Horizontal overflow ${overflow}px di ${path}`).toBeLessThanOrEqual(24);
    });
  }
});
