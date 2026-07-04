import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

/**
 * AJ-02 (C05-01) — verifikasi LIVE anti-loop:
 * Tenant TANPA stay aktif membuka /portal/stay → query /stays/me/current harus SETTLE
 * (≤3 request dalam jendela pengamatan, bukan ratusan/detik) dan halaman menampilkan
 * empty-state, bukan skeleton selamanya / crash tab (dulu: ~150 req/detik, backend jatuh 2×).
 *
 * Prasyarat: backend :3000 hidup + akun admin seed (admin@kost48.com/admin123).
 * Tenant uji dibuat on-the-fly via API (tanpa stay) sehingga tidak tergantung data seed.
 */

const API = 'http://localhost:3000/api';
const PASSWORD = 'Aj02#Loop2026';

async function loginWithRetry(api: APIRequestContext, identifier: string, password: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await api.post(`${API}/auth/login`, { data: { identifier, password } });
    if (res.ok()) return res;
    if (res.status() === 429 && attempt < 3) {
      // Rate limit login (W-01): 10 req / 5 menit / IP — tunggu jendela lewat.
      await new Promise((r) => setTimeout(r, 5.5 * 60 * 1000));
      continue;
    }
    return res;
  }
  throw new Error('unreachable');
}

test('AJ-02 (C05-01): tenant tanpa stay — /portal/stay settle tanpa loop + empty-state', async ({ page }) => {
  test.setTimeout(15 * 60 * 1000); // toleransi 2× jendela rate-limit login

  // 1) Siapkan tenant TANPA stay via API
  const api = await pwRequest.newContext();
  const adminLogin = await loginWithRetry(api, 'admin@kost48.com', 'admin123');
  expect(adminLogin.ok(), `login admin gagal: ${adminLogin.status()}`).toBeTruthy();
  const adminToken = (await adminLogin.json()).data.accessToken;
  const H = { Authorization: `Bearer ${adminToken}` };

  const stamp = Date.now();
  const email = `aj02.${stamp}@kost48.test`;
  const tenantRes = await api.post(`${API}/tenants`, {
    headers: H,
    data: {
      fullName: 'AJ02 Tanpa Stay',
      phone: `0899${String(stamp).slice(-8)}`,
      email,
      identityNumber: `3578${String(stamp).padStart(12, '0').slice(-12)}`,
      gender: 'FEMALE',
      originCity: 'Surabaya',
      occupation: 'Karyawan',
    },
  });
  expect(tenantRes.ok(), `buat tenant gagal: ${tenantRes.status()} ${await tenantRes.text()}`).toBeTruthy();
  const tenantId = (await tenantRes.json()).data.id;

  const pa = await api.post(`${API}/tenants/${tenantId}/portal-access`, {
    headers: H,
    data: { email, password: PASSWORD, fullName: 'AJ02 Tanpa Stay' },
  });
  expect(pa.ok(), `portal-access gagal: ${pa.status()} ${await pa.text()}`).toBeTruthy();

  // 2) Hitung request /stays/me/current yang keluar dari browser
  let stayCurrentCount = 0;
  page.on('request', (req) => {
    if (req.url().includes('/stays/me/current')) stayCurrentCount += 1;
  });

  // 3) Login via UI sebagai tenant tanpa stay (tab Penghuni = default)
  await page.goto('/login');
  await page.getByPlaceholder('Contoh: nama@email.com atau 0812...').fill(email);
  await page.getByPlaceholder('Masukkan password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });

  // 4) Buka /portal/stay langsung (jalur pemicu loop C05-01)
  const baselineBeforeStay = stayCurrentCount;
  await page.goto('/portal/stay');

  // 5) Amati 15 detik — dulu loop menghasilkan ~150 req/DETIK (≈2250 dalam 15 dtk)
  await page.waitForTimeout(15_000);
  const totalAfterObservation = stayCurrentCount;

  expect(
    totalAfterObservation,
    `refetch storm terdeteksi: ${totalAfterObservation} request /stays/me/current`,
  ).toBeLessThanOrEqual(6); // login-redirect + mount /portal/stay + margin refetch wajar

  // 6) Empty-state tampil (bukan skeleton selamanya)
  await expect(page.getByText('Kamu belum memiliki masa sewa aktif').first()).toBeVisible({ timeout: 10_000 });

  // 7) Halaman lain yang dulu ikut terdampak juga harus settle
  for (const path of ['/portal/bookings', '/portal/invoices']) {
    const before = stayCurrentCount;
    await page.goto(path);
    await page.waitForTimeout(8_000);
    expect(
      stayCurrentCount - before,
      `refetch storm di ${path}: +${stayCurrentCount - before} request`,
    ).toBeLessThanOrEqual(4);
  }

  // 8) Backend tetap sehat setelah pengamatan
  const healthy = await api.get(`${API}/public/rooms?limit=1`);
  expect(healthy.status(), 'backend tidak sehat pasca observasi').toBeLessThan(500);

  console.log(`AJ-02 OK — total request /stays/me/current selama uji: ${stayCurrentCount} (baseline sebelum /portal/stay: ${baselineBeforeStay})`);
});
