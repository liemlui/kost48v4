import { test, expect } from '@playwright/test';

// Y-Q8 — Print layout: konten inti tetap terbaca saat media = print (CSS cetak).
test.describe('Y-Q8 — Print layout (media print)', () => {
  test('halaman panduan/FAQ tetap menampilkan konten pada media print', async ({ page }) => {
    await page.goto('/panduan');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
    // Body tetap punya konten (tidak ter-hide seluruhnya oleh @media print)
    const textLen = await page.evaluate(() => (document.body.innerText || '').trim().length);
    expect(textLen, 'Konten cetak tidak boleh kosong').toBeGreaterThan(30);
  });

  test('landing page dapat dirender pada media print', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('body')).toBeVisible();
  });
});
