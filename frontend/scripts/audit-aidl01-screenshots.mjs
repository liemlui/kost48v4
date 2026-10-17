/**
 * Bukti visual AIDL-01 untuk /portal/stay (390 px & 1440 px).
 *
 * Menjalankan build `frontend/dist` lewat `vite preview` (port 4173) dan
 * MEMOCK semua respons `/api/**` di browser. Tidak ada backend, DB, seed,
 * atau kredensial yang disentuh; data penghuni fiktif.
 *
 * Pakai:
 *   npx vite preview --port 4173 --strictPort   (terminal lain, cwd frontend)
 *   node scripts/audit-aidl01-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, '..');
const OUT = path.resolve(FRONTEND, '..', 'docs', 'kerja', 'bukti-aidl-01-2026-10-18');
const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:4173';

const user = {
  id: 99,
  fullName: 'Penghuni Uji',
  email: 'penghuni.uji@example.test',
  role: 'TENANT',
  tenantId: 99,
  isActive: true,
  lastLoginAt: '2026-10-17T00:00:00.000Z',
};

const room = {
  id: 12,
  code: 'A-1',
  name: 'Kamar A-1',
  status: 'OCCUPIED',
  monthlyRateRupiah: 1250000,
  floor: 1,
  roomType: 'STANDARD',
  size: '3x3',
  bathroomType: 'DALAM',
  maxOccupants: 2,
  acCount: 1,
  images: [],
  facilities: [],
};

const stay = {
  id: 7001,
  tenantId: 99,
  roomId: 12,
  status: 'ACTIVE',
  pricingTerm: 'MONTHLY',
  agreedRentAmountRupiah: 1250000,
  depositAmountRupiah: 500000,
  depositPaidAmountRupiah: 500000,
  depositPaymentStatus: 'PAID',
  depositStatus: 'PAID',
  checkInDate: '2026-08-01',
  plannedCheckOutDate: '2026-10-31',
  room,
  tenant: { id: 99, fullName: 'Penghuni Uji', phone: '081200000000', email: 'penghuni.uji@example.test' },
  invoices: [],
};

const overdueInvoice = {
  id: 4242,
  stayId: 7001,
  invoiceNumber: 'INV-2026-0042',
  status: 'ISSUED',
  dueDate: '2026-10-01',
  totalAmountRupiah: 1250000,
  paidAmountRupiah: 0,
  invoiceLines: [],
  createdAt: '2026-09-25T00:00:00.000Z',
};

const renewPendingDecision = {
  id: 9001,
  stayId: 7001,
  tenantId: 99,
  requestedTerm: 'MONTHLY',
  status: 'PENDING_DECISION',
  requestedCheckOutDate: '2026-12-31',
  createdAt: '2026-10-10T00:00:00.000Z',
};

const checkoutInProgress = {
  id: 1101,
  stayId: 7001,
  requestedCheckOutDate: '2026-10-31',
  checkoutReason: 'Pindah kerja',
  status: 'PENDING',
  createdAt: '2026-10-15T00:00:00.000Z',
};

const publicConfig = {
  freeElectricityKwhPerMonth: 30,
  electricityTariffPerKwhRupiah: 2500,
  waterMeteringEnabled: false,
  waterTariffPerM3Rupiah: 0,
  freeWaterM3PerMonth: 0,
  wifiRupiah: 50000,
  galonRupiah: 20000,
  petDepositRupiah: 100000,
  extraOccupantFeePercent: 20,
  tenantLoyaltyEnabled: false,
  adminWhatsappNumber: '6285648887628',
};

const envelope = (data) => ({
  success: true,
  message: 'mock',
  data,
  requestId: 'mock-aidl-01',
  timestamp: new Date().toISOString(),
});

function dataFor(pathname, scenario) {
  if (pathname === '/auth/me') return user;
  if (pathname === '/stays/me/current') return stay;
  if (pathname === '/tenant/bookings/my') return { items: [] };
  if (pathname === '/tenant/profile/completeness') {
    return { isComplete: true, completedFields: [], missingFields: [], completionPercent: 100 };
  }
  if (pathname === '/invoices/my') return { items: scenario.triggers ? [overdueInvoice] : [] };
  if (pathname === '/payment-submissions/my') return { items: [] };
  if (pathname === '/tenant/checkout-requests/my') return { items: scenario.triggers ? [checkoutInProgress] : [] };
  if (pathname === '/tenant/renew-requests/my') return { items: scenario.triggers ? [renewPendingDecision] : [] };
  if (pathname === '/tickets/my') return { items: [] };
  if (pathname === '/room-items/my-room') return { items: [] };
  if (pathname === '/meter-readings') return { items: [] };
  if (pathname === '/iot/tenant/my-room') return { cycle: null };
  if (pathname === '/settings/public-config') return publicConfig;
  if (pathname.startsWith('/announcements')) return { items: [] };
  if (pathname.startsWith('/surveys')) return { items: [] };
  if (pathname.startsWith('/notifications')) return { items: [] };
  return { items: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } };
}

async function installApiMocks(page, scenario) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope({ success: true })),
      });
    }
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api/, '');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(dataFor(pathname, scenario))),
    });
  });
}

async function capture(browser, scenario, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? '';
    // ERR_ABORTED = permintaan yang masih berjalan saat context ditutup (teardown),
    // bukan kegagalan render. Font eksternal juga tidak memblokir bukti kartu.
    if (reason.includes('ERR_ABORTED') || request.url().includes('fonts.gstatic.com')) return;
    errors.push(`requestfailed: ${request.url()} ${reason}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem('kost48_access_token', 'mock-access-token');
  });
  await installApiMocks(page, scenario);
  await page.goto(`${BASE}/portal/stay`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 20_000 });
  if (scenario.triggers) {
    await page.waitForSelector('.action-queue-card', { timeout: 20_000 });
  } else {
    await page.getByText('Kamar A-1').first().waitFor({ timeout: 20_000 });
  }
  await page.waitForTimeout(1800);

  const url = page.url();
  const title = await page.title();
  const queueCount = await page.locator('.action-queue-card').count();
  const bodyText = (await page.locator('body').innerText()).slice(0, 500);
  const prefix = `portal-stay-${scenario.name}-${width}`;

  await page.screenshot({ path: path.join(OUT, `${prefix}-viewport.png`), fullPage: false });
  await page.screenshot({ path: path.join(OUT, `${prefix}-full.png`), fullPage: true });
  if (queueCount) {
    await page.locator('.action-queue-card').first().screenshot({ path: path.join(OUT, `${prefix}-cards.png`) });
    // Bukti kartu tanpa chrome fixed (nav bawah + saklar mengambang). Ini hanya
    // untuk keterbacaan bukti; screenshot viewport/full tetap menampilkan UI asli.
    await page.addStyleTag({
      content: '.mobile-bottom-nav, .mobile-bottom-nav-overlay, .mode-cepat-floating { display: none !important; }',
    });
    await page.locator('.action-queue-card').first().screenshot({ path: path.join(OUT, `${prefix}-cards-clean.png`) });
  }

  const summary = {
    scenario: scenario.name,
    viewport: `${width}x${height}`,
    url,
    title,
    queueCardCount: queueCount,
    queueText: queueCount ? await page.locator('.action-queue-card').first().innerText() : null,
    bodyText,
    errors,
  };
  await writeFile(path.join(OUT, `${prefix}-summary.json`), JSON.stringify(summary, null, 2), 'utf8');
  await context.close();
  return summary;
}

const scenarios = [
  { name: 'triggers', triggers: true },
  { name: 'clean', triggers: false },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const scenario of scenarios) {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      results.push(await capture(browser, scenario, width, height));
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
