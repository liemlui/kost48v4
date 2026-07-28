import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const ownerUser = {
  id: 1,
  fullName: 'Owner UI Review',
  email: 'owner-ui@kost48.test',
  role: 'OWNER',
  tenantId: null,
  isActive: true,
};

const tenantUser = {
  id: 21,
  fullName: 'Penghuni UI Review',
  email: 'tenant-ui@kost48.test',
  role: 'TENANT',
  tenantId: 11,
  isActive: true,
};

const now = new Date();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

const ownerOverview = {
  staleAfterMinutes: 30,
  configuration: {
    tuya: { configured: true, clientIdPresent: true, secretPresent: true, baseUrlValid: true, region: 'Western America' },
    esp32CredentialVaultConfigured: true,
    waterIngestPath: '/api/iot/ingest/water',
    billingIsolation: true,
  },
  summary: { total: 4, enabled: 3, online: 2, stale: 1, tuya: 3, water: 1 },
  devices: [
    {
      id: 1, deviceCode: 'kwh-a01', displayName: 'Meter kWh A01', provider: 'TUYA', deviceType: 'ELECTRICITY_METER', roomId: 101,
      room: { id: 101, code: 'A01', name: 'Kamar Timur' }, externalDeviceId: 'tuya-a01', enabled: true, online: true,
      lastSeenAt: minutesAgo(2), lastSuccessfulSyncAt: minutesAgo(2), credentialProvisioned: false, credentialVersion: 1,
      latestTelemetry: [
        { id: 't1', metric: 'electricity.energy_total_kwh', value: 512.345, unit: 'kWh', observedAt: minutesAgo(2), quality: 'GOOD' },
        { id: 't2', metric: 'electricity.power_w', value: 438, unit: 'W', observedAt: minutesAgo(2), quality: 'GOOD' },
      ],
    },
    {
      id: 2, deviceCode: 'kwh-a02', displayName: 'Meter kWh A02', provider: 'TUYA', deviceType: 'ELECTRICITY_METER', roomId: 102,
      room: { id: 102, code: 'A02', name: 'Kamar Tengah' }, externalDeviceId: 'tuya-a02', enabled: true, online: false,
      lastSeenAt: minutesAgo(4), lastSuccessfulSyncAt: minutesAgo(4), credentialProvisioned: false, credentialVersion: 1,
      latestTelemetry: [{ id: 't3', metric: 'electricity.energy_total_kwh', value: 221.81, unit: 'kWh', observedAt: minutesAgo(4), quality: 'REJECTED', reason: 'Counter turun tidak wajar' }],
    },
    {
      id: 3, deviceCode: 'water-a03', displayName: 'Meter Air A03', provider: 'KOST48_ESP32', deviceType: 'WATER_FLOW_METER', roomId: 103,
      room: { id: 103, code: 'A03', name: 'Kamar Barat' }, enabled: true, online: true, lastSeenAt: minutesAgo(75),
      credentialProvisioned: true, credentialVersion: 2,
      latestTelemetry: [{ id: 't4', metric: 'water.volume_total_m3', value: 18.73, unit: 'm3', observedAt: minutesAgo(75), quality: 'GOOD' }],
    },
    {
      id: 4, deviceCode: 'kwh-cadangan', displayName: 'Meter Cadangan', provider: 'TUYA', deviceType: 'ELECTRICITY_METER', roomId: null,
      room: null, externalDeviceId: 'tuya-spare', enabled: false, online: null, lastSeenAt: null,
      credentialProvisioned: false, credentialVersion: 1, latestTelemetry: [],
    },
  ],
};

const stay = {
  id: 501,
  tenantId: 11,
  roomId: 101,
  status: 'ACTIVE',
  pricingTerm: 'MONTHLY',
  checkInDate: '2026-07-05T00:00:00+07:00',
  plannedCheckOutDate: '2027-01-05T00:00:00+07:00',
  electricityTariffPerKwhRupiah: 1500,
  waterTariffPerM3Rupiah: 8000,
  room: {
    id: 101,
    code: 'A01',
    name: 'Kamar Timur',
    status: 'OCCUPIED',
    electricityTariffPerKwhRupiah: 1500,
    waterTariffPerM3Rupiah: 8000,
  },
};

const publicConfig = {
  freeElectricityKwhPerMonth: 30,
  waterMeteringEnabled: true,
  tenantLoyaltyEnabled: false,
};

const meterReadings = [
  { id: 1, roomId: 101, utilityType: 'ELECTRICITY', readingAt: '2026-07-05T00:00:00+07:00', readingValue: 100 },
  { id: 2, roomId: 101, utilityType: 'ELECTRICITY', readingAt: '2026-07-20T00:00:00+07:00', readingValue: 110 },
  { id: 3, roomId: 101, utilityType: 'WATER', readingAt: '2026-07-05T00:00:00+07:00', readingValue: 20 },
  { id: 4, roomId: 101, utilityType: 'WATER', readingAt: '2026-07-20T00:00:00+07:00', readingValue: 21.25 },
];

const tenantTelemetry = {
  room: { code: 'A01', name: 'Kamar Timur' },
  refreshedAt: minutesAgo(1),
  staleAfterMinutes: 30,
  billingNotice: 'Pemantauan otomatis terpisah dari catatan meter untuk tagihan.',
  cycle: {
    start: '2026-07-04T17:00:00.000Z',
    end: '2026-08-04T17:00:00.000Z',
    allowanceMonths: 1,
    source: 'METER_READING',
    electricity: {
      usageKwh: 42.5,
      freeKwh: 30,
      chargeableKwh: 12.5,
      tariffRupiah: 2450,
      estimatedChargeRupiah: 30625,
      billingReady: true,
      resetDetected: false,
    },
    meter: { baselineKwh: 100, baselineAt: '2026-07-05T00:00:00+07:00', latestKwh: 142.5, latestAt: '2026-07-20T00:00:00+07:00', usageKwh: 42.5 },
    telemetry: { baselineKwh: 9956.5, baselineAt: minutesAgo(300), latestKwh: 9999, latestAt: minutesAgo(1), usageKwh: 42.5, quality: 'GOOD' },
  },
  electricity: {
    utilityType: 'ELECTRICITY', status: 'ONLINE', statusMessage: 'Sensor listrik terhubung.', lastSeenAt: minutesAgo(1), observedAt: minutesAgo(1),
    total: 9999, unit: 'kWh', flowRateLpm: null, quality: 'GOOD', powerW: 425, voltageV: 221, currentA: 1.9,
  },
  water: {
    utilityType: 'WATER', status: 'NO_FLOW', statusMessage: 'Siaga, tidak ada aliran.', lastSeenAt: minutesAgo(1), observedAt: minutesAgo(1),
    total: 88.5, unit: 'm3', flowRateLpm: 0, quality: 'GOOD', powerW: null, voltageV: null, currentA: null,
  },
};

function envelope(data: unknown) {
  return JSON.stringify({ success: true, data });
}

type MockApiOptions = {
  meterReadingsStatus?: number;
};

async function seedSession(page: Page, user: typeof ownerUser | typeof tenantUser) {
  await page.addInitScript(({ sessionUser }) => {
    localStorage.setItem('kost48_access_token', 'ui-review-token');
    sessionStorage.setItem('kost48_last_authenticated_user', JSON.stringify(sessionUser));
    if (sessionUser.role === 'OWNER') localStorage.setItem('kost48_owner_view_mode', 'admin');
  }, { sessionUser: user });
}

async function fulfillApi(route: Route, user: typeof ownerUser | typeof tenantUser, unexpectedApiPaths: string[], options: MockApiOptions) {
  const requestUrl = new URL(route.request().url());
  const path = requestUrl.pathname.replace(/^\/api/, '');
  let data: unknown;

  if (/^\/tenants\/\d+\/profile-photo\/image$/.test(path)) {
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (path === '/auth/me') data = user;
  else if (path === '/me/notifications') data = { items: [], total: 0, unreadCount: 0 };
  else if (path === '/tenant/profile/completeness') data = { isComplete: true, completionPercent: 100, missingFields: [] };
  else if (path === '/announcements/active') data = { items: [] };
  else if (path === '/surveys/mine') data = { submitted: false, eligible: true };
  else if (['/invoices/my', '/payment-submissions/my', '/tenant/renew-requests/my', '/tenant/checkout-requests/my', '/tickets/my', '/room-items/my-room'].includes(path)) data = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  else if (path === '/settings/public-config') data = publicConfig;
  else if (path === '/iot/overview') data = ownerOverview;
  else if (path === '/stays/me/current') data = stay;
  else if (path === '/tenant/bookings/my') data = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  else if (path === '/meter-readings' && options.meterReadingsStatus) {
    await route.fulfill({ status: options.meterReadingsStatus, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: 'Riwayat meter test tidak tersedia' } }) });
    return;
  }
  else if (path === '/meter-readings') data = { items: meterReadings, total: meterReadings.length, page: 1, limit: 100, totalPages: 1 };
  else if (path === '/iot/tenant/my-room') data = tenantTelemetry;
  else if (path === '/iot/tenant/electricity-timeline') data = {
    start: tenantTelemetry.cycle.start,
    end: tenantTelemetry.cycle.end,
    source: 'IOT_TELEMETRY',
    baselineAvailable: true,
    resetDetected: false,
    points: [
      { date: '2026-07-06', observedAt: '2026-07-06T12:00:00+07:00', totalUsageKwh: 2.5, quality: 'GOOD' },
      { date: '2026-07-13', observedAt: '2026-07-13T12:00:00+07:00', totalUsageKwh: 19.25, quality: 'GOOD' },
      { date: '2026-07-20', observedAt: '2026-07-20T12:00:00+07:00', totalUsageKwh: 42.5, quality: 'GOOD' },
    ],
  };
  else {
    unexpectedApiPaths.push(`${route.request().method()} ${path}`);
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: `Endpoint test belum dimock: ${path}` } }),
    });
    return;
  }

  await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data) });
}

async function mockApi(page: Page, user: typeof ownerUser | typeof tenantUser, options: MockApiOptions = {}) {
  const unexpectedApiPaths: string[] = [];
  await seedSession(page, user);
  await page.route('**/api/**', (route) => fulfillApi(route, user, unexpectedApiPaths, options));
  return unexpectedApiPaths;
}

async function expectNoSeriousA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
}

test.describe('Aksesibilitas dan hierarki UI IoT dengan data deterministik', () => {
  test.use({ serviceWorkers: 'block' });

  test('owner: hierarki operasional, registry mobile, reflow, dan aksesibilitas', async ({ page }, testInfo) => {
    const unexpectedApiPaths = await mockApi(page, ownerUser);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/iot');

    await expect(page.getByRole('heading', { name: 'IoT Listrik & Air' })).toBeVisible();
    await expect(page.getByText('2 perangkat perlu diperiksa')).toBeVisible();
    await expect(page.getByText('1/3', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daftar perangkat' })).toBeVisible();
    await expect(page.getByRole('table').getByText('Meter kWh A02', { exact: true })).toBeVisible();
    await expect(page.getByRole('table').locator('.iot-reading-pill').first()).toHaveAttribute('aria-label', /Kualitas ditolak/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectNoSeriousA11yViolations(page);
    await page.screenshot({ path: testInfo.outputPath('iot-owner-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCards = page.locator('.iot-device-mobile-card');
    await expect(mobileCards).toHaveCount(4);
    await expect(page.locator('.iot-device-desktop')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectNoSeriousA11yViolations(page);
    await page.screenshot({ path: testInfo.outputPath('iot-owner-mobile.png'), fullPage: true });
    expect(unexpectedApiPaths).toEqual([]);
  });

  test('tenant: angka canonical mengalahkan sensor kumulatif di halaman energi', async ({ page }, testInfo) => {
    const unexpectedApiPaths = await mockApi(page, tenantUser);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/portal/energy');

    await expect(page.getByRole('heading', { name: 'Energi Kamar A01' })).toBeVisible();
    await expect(page.locator('.energy-source-badge')).toHaveText('Catatan meter resmi');
    const periodOverview = page.locator('.energy-overview-section');
    await expect(periodOverview.getByText('42.50 kWh')).toBeVisible();
    await expect(periodOverview).toContainText('30.625');
    await expect(periodOverview).toContainText('2.450');
    await expect(periodOverview).not.toContainText('9.999');
    await expect(page.locator('.energy-live-section')).toContainText('9.999 kWh');
    await expect(page.locator('.utility-projection')).toContainText('42.5 kWh');
    await expect(page.locator('.utility-projection')).toContainText('+12.5 kWh');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectNoSeriousA11yViolations(page);
    await page.screenshot({ path: testInfo.outputPath('tenant-energy-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.energy-trend-section .recharts-line-area')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectNoSeriousA11yViolations(page);
    await page.screenshot({ path: testInfo.outputPath('tenant-energy-mobile.png'), fullPage: true });
    expect(unexpectedApiPaths).toEqual([]);
  });

  test('tenant: ringkasan stay memprioritaskan periode dan menyembunyikan detail sensor', async ({ page }, testInfo) => {
    const unexpectedApiPaths = await mockApi(page, tenantUser);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/portal/stay?tab=listrik');

    await expect(page.getByRole('heading', { name: 'Ringkasan periode berjalan' })).toBeVisible();
    await expect(page.locator('.tenant-utility-source')).toHaveText('Catatan meter resmi');
    await expect(page.locator('.tenant-utility-period-card')).toContainText('42.50 kWh');
    await expect(page.locator('.tenant-monitoring-disclosure')).not.toHaveAttribute('open', '');
    await expect(page.locator('.utility-projection')).toContainText('42.5 kWh');
    await expect(page.locator('.utility-projection')).toContainText('+12.5 kWh');
    const gaugeGeometry = await page.locator('.tenant-utility-period-card .recharts-donut-gauge').evaluate((gauge) => {
      const frame = gauge.getBoundingClientRect();
      const sectors = [...gauge.querySelectorAll<SVGPathElement>('.recharts-sector')].map((sector) => sector.getBoundingClientRect());
      return {
        frameWidth: frame.width,
        frameHeight: frame.height,
        maxSectorWidth: Math.max(0, ...sectors.map((sector) => sector.width)),
        maxSectorHeight: Math.max(0, ...sectors.map((sector) => sector.height)),
      };
    });
    expect(gaugeGeometry.maxSectorWidth).toBeLessThanOrEqual(gaugeGeometry.frameWidth);
    expect(gaugeGeometry.maxSectorHeight).toBeLessThanOrEqual(gaugeGeometry.frameHeight);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expectNoSeriousA11yViolations(page);
    await page.screenshot({ path: testInfo.outputPath('tenant-stay-utility-mobile.png'), fullPage: true });
    expect(unexpectedApiPaths).toEqual([]);
  });

  test('tenant: snapshot resmi tetap utuh ketika riwayat manual gagal', async ({ page }) => {
    const unexpectedApiPaths = await mockApi(page, tenantUser, { meterReadingsStatus: 503 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/portal/energy');

    await expect(page.locator('.energy-overview-section')).toContainText('42.50 kWh');
    await expect(page.locator('.energy-fact-grid')).toContainText('Riwayat air belum tersedia');
    await expect(page.locator('.energy-cumulative')).toContainText('Riwayat catatan manual belum dapat dimuat');

    await page.goto('/portal/stay?tab=listrik');
    await expect(page.locator('.tenant-utility-period-card')).toContainText('42.50 kWh');
    await expect(page.locator('.tenant-utility-facts')).toContainText('Riwayat air belum dapat dimuat');
    await expect(page.locator('.tenant-utility-total')).toContainText('Total catatan sejak masuk belum dapat dimuat');
    expect(unexpectedApiPaths).toEqual([]);
  });
});
