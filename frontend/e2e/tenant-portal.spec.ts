import { test, expect } from '@playwright/test';

test.describe('Tenant Portal', () => {
  test('Login tenant → portal → loyalty page', async ({ page }) => {
    await page.goto('/login');
    // Form.Control merender <input class="form-control"> tanpa name/id; mode tenant = default.
    // Kredensial mengikuti seed-dev-via-api saat ini (sebelumnya usang: tenant.g2@kost48.com).
    await page.locator('input.form-control').first().fill('maya.tenant@kost48.test');
    await page.locator('input[type="password"]').first().fill('Tenant#2026');
    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/portal/, { timeout: 15000 });

    await page.goto('/portal/loyalty');
    await expect(page).toHaveURL(/loyalty/, { timeout: 5000 });
    await expect(page.getByText(/Poin|Loyalty|Kebaikan|Reward/i).first()).toBeVisible({ timeout: 8000 });
  });
});
