import { expect, test, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:5174';

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
    await login(page, 'owner@kost48.com', 'Owner#2026');
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.getByText('Mode aman read-only.')).toBeVisible();
    await expect(page.getByText('13', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.iot-device-table tbody tr')).toHaveCount(13);
    await expect(page.getByText('KWH Kmr A', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tuya KWH', exact: true })).toBeVisible();
    await page.screenshot({ path: 'e2e-out/iot-owner-desktop.png', fullPage: true });

    await page.getByRole('button', { name: 'ESP32 Air' }).click();
    await expect(page.getByRole('heading', { name: 'Belum ada perangkat pada kategori ini' })).toBeVisible();
    await page.getByRole('button', { name: 'Tambah perangkat', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Provider', { exact: true })).toHaveValue('TUYA');
    await page.getByLabel('Provider', { exact: true }).selectOption('KOST48_ESP32');
    await expect(page.getByLabel('Tuya device ID')).toHaveCount(0);
    await expect(page.getByText('ESP32 akan memakai HMAC device secret')).toBeVisible();
    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sinkronkan Tuya' })).toBeVisible();
    await expect(page.locator('.iot-kpi-grid')).toBeVisible();
    await page.screenshot({ path: 'e2e-out/iot-owner-mobile.png', fullPage: false });

    expect(findings).toEqual([]);
  });

  test('ADMIN: route dan data IoT dapat dibaca', async ({ page }) => {
    await login(page, 'admin@kost48.com', 'admin123');
    await page.goto(`${BASE}/iot`);
    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.locator('.iot-device-table tbody tr')).toHaveCount(13);
    await expect(page.getByRole('button', { name: 'Sinkronkan Tuya' })).toBeVisible();
  });
});
