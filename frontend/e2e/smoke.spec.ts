import { test, expect } from '@playwright/test';

test.describe('Smoke Test — Public Flow', () => {
  test('public browse → room catalog page', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page).toHaveURL(/\/rooms/);
    // Halaman katalog kamar publik — cari judul atau elemen kamar
    await expect(page.locator('h1, .page-eyebrow, .rm-card, .gx-room-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('public landing page has content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
    // Landing page harus punya judul atau hero
    await expect(page.locator('h1, .gx-hero, .hero-section').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Smoke Test — Login Flows', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('button[type="submit"], .btn-primary').first()).toBeVisible({ timeout: 10000 });
  });
});
