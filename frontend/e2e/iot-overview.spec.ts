import { expect, test, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:5174';
const OWNER_IDENTIFIER = process.env.E2E_OWNER_IDENTIFIER;
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD;
const ADMIN_IDENTIFIER = process.env.E2E_ADMIN_IDENTIFIER;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function login(page: Page, identifier: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.getByRole('tab', { name: 'Admin / Operasional' }).click();
  await page.getByPlaceholder('admin@kost48.com').fill(identifier);
  await page.getByPlaceholder('Masukkan password admin').fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

test.describe('IoT Listrik & Air', () => {
  test('OWNER: telemetry Tuya, filter, modal, responsive, dan console bersih', async ({ page }) => {
    test.skip(!OWNER_IDENTIFIER || !OWNER_PASSWORD, 'Isi E2E_OWNER_IDENTIFIER dan E2E_OWNER_PASSWORD untuk menjalankan test owner.');
    test.setTimeout(90_000);
    const findings: string[] = [];
    page.on('pageerror', (error) => findings.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('React DevTools')) findings.push(`console: ${message.text()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 500) findings.push(`http ${response.status()}: ${response.url()}`);
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page, OWNER_IDENTIFIER!, OWNER_PASSWORD!);
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.getByText('Pemantauan aman.')).toBeVisible();
    await expect(page.locator('.iot-kpi-grid')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tuya kWh', exact: true })).toBeVisible();
    await page.screenshot({ path: 'e2e-out/iot-owner-desktop.png', fullPage: true });

    await page.getByRole('button', { name: 'Tambah perangkat', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Jenis koneksi', { exact: true })).toHaveValue('TUYA');
    await page.getByLabel('Jenis koneksi', { exact: true }).selectOption('KOST48_ESP32');
    await expect(page.getByLabel('Tuya device ID')).toHaveCount(0);
    await expect(page.getByText('ESP32 akan memakai HMAC device secret')).toBeVisible();
    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sinkronkan Tuya' })).toBeVisible();
    await expect(page.locator('.iot-kpi-grid')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (await page.locator('.iot-device-mobile-card').count()) {
      await expect(page.locator('.iot-device-mobile-card').first()).toBeVisible();
      await expect(page.locator('.iot-device-desktop')).toBeHidden();
    }
    await page.screenshot({ path: 'e2e-out/iot-owner-mobile.png', fullPage: false });

    expect(findings).toEqual([]);
  });

  test('ADMIN: route dan data IoT dapat dibaca', async ({ page }) => {
    test.skip(!ADMIN_IDENTIFIER || !ADMIN_PASSWORD, 'Isi E2E_ADMIN_IDENTIFIER dan E2E_ADMIN_PASSWORD untuk menjalankan test admin.');
    await login(page, ADMIN_IDENTIFIER!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.locator('.iot-kpi-grid')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sinkronkan Tuya' })).toBeVisible();
  });
});
