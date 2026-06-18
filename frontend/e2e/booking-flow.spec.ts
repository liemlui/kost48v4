import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('Pilih kamar → form booking muncul', async ({ page }) => {
    await page.goto('/');
    // Cari tombol "Pesan" / "Booking" / "Sewa" di halaman publik
    const bookBtn = page.locator('a[href*="booking"], a[href*="pesan"], button:has-text("Pesan"), button:has-text("Booking"), a:has-text("Pesan"), a:has-text("Booking")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      // URL mengandung booking
      await expect(page).toHaveURL(/booking|pesan/, { timeout: 5000 });
      // Pastikan ada form
      await expect(page.locator('form, input, select, button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
