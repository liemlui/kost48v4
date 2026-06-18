import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('Landing page memuat dan menampilkan judul', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2, .hero-title, .navbar-brand').first()).toBeVisible();
  });

  test('Katalog kamar publik dapat diakses', async ({ page }) => {
    await page.goto('/');
    // Cari link/button ke katalog kamar
    const roomLink = page.locator('a[href*="rooms"], a[href*="kamar"], a[href*="katalog"]').first();
    if (await roomLink.isVisible()) {
      await roomLink.click();
      await expect(page).toHaveURL(/rooms|kamar|katalog/);
    }
  });

  test('Halaman login memiliki form identifier + password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="identifier"], input[type="email"], input[id="identifier"], input[id="email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
  });
});
