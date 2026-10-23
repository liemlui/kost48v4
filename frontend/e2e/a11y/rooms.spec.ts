import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * S4 (23 Okt 2026) — katalog `/rooms`: label "Kmr X", kartu compact, target sentuh.
 *
 * Yang dibuktikan spec ini (dan hanya ini):
 *  - 390/768/1440 px: tanpa scroll horizontal, axe-core 0 violation;
 *  - semua kontrol di kartu ≥ 44 x 44 CSS px menurut `getBoundingClientRect()`;
 *  - label "Kmr <kode>" tampil, chip peluang kosong S3 tetap ada + tanggalnya benar;
 *  - tabel bobot di heatmap tetap terbaca pembaca layar (caption + th scope, role table).
 *
 * Data API dimock deterministik (tanpa backend, tanpa data penghuni).
 * Tangkapan layar ditulis DI LUAR repo (default: <tmpdir>/kost48-s4-shots).
 */

const SHOT_DIR = process.env.KOST48_S4_SHOT_DIR ?? join(tmpdir(), 'kost48-s4-shots');
mkdirSync(SHOT_DIR, { recursive: true });

const WIDTHS = [390, 768, 1440] as const;

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "1/11" — format chip di kartu (sama dengan `shortDay()` di RoomCard). */
function shortDay(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split('-');
  return `${Number(day)}/${Number(month)}`;
}

// Kontrak contoh: kamar "A" berakhir 6 hari lagi → chip "Perkiraan kosong <tgl>".
const CHECKOUT_A = isoOffset(6);

type RoomFixture = {
  id: number;
  code: string;
  name: string;
  status: string;
  publicAvailabilityStatus: 'AVAILABLE' | 'FULL';
  pricing: { monthlyRateRupiah: number; weeklyRateRupiah: number; dailyRateRupiah: number };
  checkInDate: string | null;
  plannedCheckOutDate: string | null;
  pricingTerm: string | null;
  remainingDays: number | null;
};

function buildRooms(): RoomFixture[] {
  const codes = ['A', 'B', 'C', 'D', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'F1', 'F2'];
  return codes.map((code, index) => {
    const isVacant = code === 'F1';
    const hasContract = code !== 'C' && !isVacant; // C sengaja tanpa tanggal (cacat data nyata)
    const monthsAhead = 2 + index;
    return {
      id: index + 1,
      code,
      name: `Kamar ${code}`,
      status: isVacant ? 'AVAILABLE' : 'OCCUPIED',
      publicAvailabilityStatus: isVacant ? 'AVAILABLE' : 'FULL',
      pricing: {
        monthlyRateRupiah: 1_500_000 + index * 50_000,
        weeklyRateRupiah: 500_000,
        dailyRateRupiah: 200_000,
      },
      checkInDate: hasContract ? isoOffset(-30 * monthsAhead) : null,
      plannedCheckOutDate: hasContract ? (code === 'A' ? CHECKOUT_A : isoOffset(30 * monthsAhead)) : null,
      pricingTerm: hasContract ? (code === 'A' ? 'MONTHLY' : 'SMESTERLY') : null,
      remainingDays: hasContract ? (code === 'A' ? 6 : 30 * monthsAhead) : null,
    };
  });
}

function calendarPayload() {
  const from = isoOffset(-1);
  const to = isoOffset(40);
  const rooms = buildRooms().map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    floor: '1',
    status: room.status,
    checkInDate: room.checkInDate,
    plannedCheckOutDate: room.plannedCheckOutDate,
    pricingTerm: room.pricingTerm,
    remainingDays: room.remainingDays ?? 0,
    hasPendingRenew: false,
    renewStatus: null,
    checkoutRequest: null,
    days: { [from]: room.status === 'AVAILABLE' ? 'KOSONG' : 'HUNI' },
  }));
  return { from, to, dates: [from, to], rooms };
}

type ControlBox = { label: string; width: number; height: number };

async function mockPublicApi(page: Page) {
  const unexpected: string[] = [];
  // Predikat pada pathname, BUKAN glob `**/api/**` — glob itu juga menangkap
  // modul dev Vite (`/src/api/client.ts`) sehingga halaman gagal dimuat.
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });

    if (path === '/public/rooms') {
      const rooms = buildRooms();
      await fulfill({ items: rooms, total: rooms.length, page: 1, limit: 100, totalPages: 1 });
      return;
    }
    if (path === '/public/rooms/availability-calendar') {
      await fulfill(calendarPayload());
      return;
    }
    const detailMatch = /^\/public\/rooms\/(\d+)$/.exec(path);
    if (detailMatch) {
      const room = buildRooms().find((item) => String(item.id) === detailMatch[1]);
      if (!room) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        return;
      }
      await fulfill({
        ...room,
        floor: '1',
        category: 'STANDARD',
        roomType: 'STANDARD',
        roomSize: 'STANDARD',
        defaultDepositRupiah: 300_000,
        highlightedPricingTerm: 'MONTHLY',
        availablePricingTerms: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SMESTERLY', 'YEARLY'],
        images: [],
        facilities: [
          { id: 1, name: 'Kasur springbed', category: 'FURNITURE', publicVisible: true },
          { id: 2, name: 'Lemari pakaian', category: 'FURNITURE', publicVisible: true },
        ],
      });
      return;
    }
    unexpected.push(`${route.request().method()} ${path}`);
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: `Endpoint test belum dimock: ${path}` } }),
    });
  });
  return unexpected;
}

/** Ukur semua kontrol di kartu dengan getBoundingClientRect (CSS px). */
async function measureCardControls(page: Page): Promise<ControlBox[]> {
  return page.$$eval('.rm-card button, .rm-card a[href]', (elements) =>
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const label = (
          element.getAttribute('aria-label') ??
          element.textContent ??
          element.getAttribute('title') ??
          element.tagName
        ).replace(/\s+/g, ' ').trim().slice(0, 40);
        return {
          label,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          rendered: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        };
      })
      .filter((box) => box.rendered)
      .map(({ label, width, height }) => ({ label, width, height })),
  );
}

test.describe('S4 — katalog /rooms: label "Kmr X", kartu compact, target sentuh', () => {
  test.use({ serviceWorkers: 'block' });

  test('390 / 768 / 1440 px: tanpa scroll horizontal, axe 0 violation, target sentuh ≥ 44 px', async ({ page }, testInfo) => {
    // Halaman katalog memuat 9 kartu bergambar + panel 3 bulan kalender; 3 lebar
    // x (axe + tangkapan layar penuh) butuh waktu lebih dari batas bawaan 30 detik.
    testInfo.setTimeout(240_000);
    const unexpected = await mockPublicApi(page);
    const report: Record<string, unknown> = {};
    const shots: string[] = [];

    // avail=all → 13 kartu (default katalog hanya menampilkan kamar tersedia),
    // sort=price-asc → urutan deterministik: A..K di halaman 1.
    await page.goto('/rooms?avail=all&sort=price-asc');
    await expect(page.locator('.rm-card').first()).toBeVisible();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('.rm-card').first()).toBeVisible();

      // slide prev/next hanya dirender saat gambar di-hover → paksa tampil dulu
      // supaya ikut terukur (di layar sentuh kontrol ini memang tidak muncul).
      await page.locator('.rm-card-img-wrap').first().hover();

      const noHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );

      const controls = await measureCardControls(page);
      const cardBox = await page.locator('.rm-card').first().boundingBox();
      const cardShot = join(SHOT_DIR, `rooms-${width}-card.png`);
      await page.locator('.rm-card').first().screenshot({ path: cardShot, animations: 'disabled', timeout: 30_000 });
      shots.push(cardShot);
      const labels = await page.$$eval('.rm-card-code', (nodes) => nodes.map((node) => (node.textContent ?? '').trim()));
      // Netralkan posisi tetikus dulu: kartu memakai :hover pada tombol "Lihat
      // detail" (warna lebih gelap), jadi axe harus diukur pada keadaan dasar.
      await page.mouse.move(2, 2);
      const axeResult = await new AxeBuilder({ page }).analyze();
      const violationCount = axeResult.violations.length;
      const violationDetail = axeResult.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
      }));

      const shot = join(SHOT_DIR, `rooms-${width}.png`);
      await page.screenshot({ path: shot, fullPage: true, animations: 'disabled', timeout: 60_000 });
      shots.push(shot);
      console.log(
        `[S4] ${width}px: kartu=${labels.length} kontrol=${controls.length} minW=${Math.min(...controls.map((c) => c.width))} minH=${Math.min(...controls.map((c) => c.height))} axe=${violationCount} scrollH=${!noHorizontalScroll}`,
      );

      report[`w${width}`] = {
        cards: labels.length,
        labels,
        controls: controls.length,
        minWidth: Math.min(...controls.map((c) => c.width)),
        minHeight: Math.min(...controls.map((c) => c.height)),
        axeViolations: violationCount,
        axeDetail: violationDetail,
        noHorizontalScroll,
        cardWidth: Math.round(cardBox?.width ?? 0),
        cardHeight: Math.round(cardBox?.height ?? 0),
        controlsBelow44: controls.filter((c) => c.width < 44 || c.height < 44),
      };

      expect.soft(noHorizontalScroll, `scroll horizontal di ${width} px`).toBe(true);
      expect.soft(violationCount, `axe violation di ${width} px`).toBe(0);
      expect.soft(labels.length, `jumlah kartu di ${width} px`).toBeGreaterThan(0);
      for (const label of labels) expect.soft(label, `label kartu "${label}"`).toMatch(/^Kmr \S+$/);
      for (const control of controls) {
        expect.soft(control.width, `lebar kontrol "${control.label}" @${width}px`).toBeGreaterThanOrEqual(44);
        expect.soft(control.height, `tinggi kontrol "${control.label}" @${width}px`).toBeGreaterThanOrEqual(44);
      }
    }

    // Warna hover "Lihat detail" pernah gagal kontras (4,09:1 di build sebelum
    // perbaikan S4) — diukur lagi di sini supaya tidak kembali diam-diam.
    await page.locator('.rm-btn-detail').first().hover();
    const hoverViolations = (await new AxeBuilder({ page }).analyze()).violations.map((violation) => violation.id);
    expect(hoverViolations, 'axe violation saat tombol detail di-hover').toEqual([]);
    await page.mouse.move(2, 2);

    // Chip peluang kosong S3 wajib tetap tampil di kartu yang sudah compact.
    await page.setViewportSize({ width: 390, height: 900 });
    const chip = page.locator('.rm-card-vacancy-chip').first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(`Perkiraan kosong ${shortDay(CHECKOUT_A)}`);
    await expect(page.locator('.rm-card-vacancy').first()).toHaveAttribute('title', /bukan janji/);
    report['chip'] = await chip.textContent();

    expect(unexpected, 'endpoint API tak terduga').toEqual([]);

    const reportPath = join(SHOT_DIR, 's4-rooms-measure.json');
    writeFileSync(reportPath, JSON.stringify({ shots, report }, null, 2));
    // Angka target sentuh + violation dicetak supaya bisa disalin ke laporan.
    console.log(`[S4] laporan ukur: ${reportPath}`);
    console.log(`[S4] ${JSON.stringify(report)}`);
  });

  test('halaman detail menulis "Kmr <kode>" dan rinciannya tetap lengkap', async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    const unexpected = await mockPublicApi(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/rooms/1/detail');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kmr A');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Kamar A').first()).toBeVisible();

    // Rincian TIDAK dipangkas seperti kartu katalog: tabel semua term tetap ada.
    const rateSection = page.locator('.room-detail-section-card', {
      has: page.getByRole('heading', { name: 'Daftar tarif lengkap' }),
    });
    await expect(rateSection.getByRole('heading', { name: 'Daftar tarif lengkap' })).toBeVisible();
    const rateTable = rateSection.getByRole('table');
    await expect(rateTable).toBeVisible();
    expect(await rateTable.locator('tbody tr').count()).toBe(6); // DAILY…YEARLY — detail utuh

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    // Axe di halaman detail DICATAT, bukan digerbang: halaman ini punya
    // pelanggaran lama (color-contrast, landmark-one-main, region) yang tidak
    // berasal dari S4 dan tidak diperbaiki di fase ini (gate axe S4 = /rooms).
    const violations = (await new AxeBuilder({ page }).analyze()).violations.map(
      (violation) => `${violation.id} -> ${violation.nodes.slice(0, 3).map((node) => node.target.join(' ')).join(' | ')}`,
    );
    const shot = join(SHOT_DIR, 'rooms-detail-390.png');
    await page.screenshot({ path: shot, fullPage: true, animations: 'disabled', timeout: 60_000 });
    console.log(`[S4] detail 390px: axe=${violations.length} ${JSON.stringify(violations)} (dicatat, bukan gate S4) shot=${shot}`);
    expect(unexpected, 'endpoint API tak terduga').toEqual([]);
  });

  test('tabel bobot masa sewa di heatmap tetap terbaca pembaca layar', async ({ page }) => {
    const unexpected = await mockPublicApi(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/rooms?avail=all&sort=price-asc');
    await expect(page.locator('.rm-card').first()).toBeVisible();

    const details = page.locator('details.rm-heatmap-weights');
    await expect(details.locator('summary')).toHaveText('Bobot masa sewa pada perkiraan peluang kosong');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');

    // Nama tabel diambil dari <caption> — itulah yang diumumkan pembaca layar.
    const table = details.getByRole('table', { name: /Semakin pendek masa sewa/i });
    await expect(table).toBeVisible();
    await expect(table.locator('caption')).toContainText('perkiraan, bukan janji');

    const headers = await table.locator('th[scope]').evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute('scope')}:${(node.textContent ?? '').trim()}`),
    );
    expect(headers.slice(0, 4)).toEqual(['col:Masa sewa', 'col:Kelas', 'col:Bobot', 'col:Alasan']);
    expect(headers.length).toBeGreaterThan(4); // + th scope="row" per baris bobot

    const rows = await table.locator('tbody tr').count();
    expect(rows).toBe(7); // VACANCY_WEIGHT_TABLE: DAILY…YEARLY + tanpa data
    await expect(table.locator('tbody tr').first()).toContainText('+24');

    expect(unexpected, 'endpoint API tak terduga').toEqual([]);
  });
});
