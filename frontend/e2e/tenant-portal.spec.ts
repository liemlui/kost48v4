import { test, expect } from '@playwright/test';

test.describe('Tenant Portal', () => {
  test('Login tenant → portal → loyalty page', async ({ page }) => {
    await page.goto('/login');
    // Isi form login — cari field identifier + password
    const identifierField = page.locator('input[name="identifier"], input[type="email"], input[id="identifier"], input[id="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    await expect(identifierField).toBeVisible({ timeout: 5000 });
    await expect(passwordField).toBeVisible({ timeout: 5000 });

    // Coba login dengan kredensial tenant test
    await identifierField.fill('tenant.g2@kost48.com');
    await passwordField.fill('tenant123');
    await page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")').first().click();

    // Tunggu redirect ke portal tenant
    await expect(page).toHaveURL(/portal|dashboard/, { timeout: 10000 });

    // Navigasi ke loyalty page
    await page.goto('/portal/loyalty');
    await expect(page).toHaveURL(/loyalty/, { timeout: 5000 });

    // Verifikasi konten loyalty page
    await expect(page.locator('text=Poin, text=Loyalty, text=Kebaikan, text=Ranking').first()).toBeVisible({ timeout: 5000 });
  });
});
