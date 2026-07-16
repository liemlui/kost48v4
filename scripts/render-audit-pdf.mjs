import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const defaultHtml = 'docs/filePrint/08_FORM_AUDIT_RINGKAS_PRINTABLE.html';
const defaultPdf = 'docs/filePrint/08_FORM_AUDIT_RINGKAS_PRINTABLE.pdf';
const htmlPath = isAbsolute(process.argv[2] ?? '')
  ? process.argv[2]
  : resolve(repoRoot, process.argv[2] || defaultHtml);
const pdfPath = isAbsolute(process.argv[3] ?? '')
  ? process.argv[3]
  : resolve(repoRoot, process.argv[3] || defaultPdf);
const qaDir = resolve(tmpdir(), 'kost48-audit-ringkas-qa');

await mkdir(dirname(pdfPath), { recursive: true });
await mkdir(qaDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
});
const problems = [];

page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console: ${message.text()}`);
});

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready.then(() => true));

const screenSheets = page.locator('.sheet');
const sheetCount = await screenSheets.count();
if (sheetCount !== 6) problems.push(`jumlah halaman master harus 6, ditemukan ${sheetCount}`);
for (let index = 0; index < sheetCount; index += 1) {
  await screenSheets.nth(index).screenshot({
    path: resolve(qaDir, `page-${index + 1}.png`),
  });
}

await page.emulateMedia({ media: 'print' });
const layout = await page.evaluate(() => ({
  title: document.title,
  sheets: [...document.querySelectorAll('.sheet')].map((sheet, index) => ({
    page: index + 1,
    clientWidth: sheet.clientWidth,
    clientHeight: sheet.clientHeight,
    scrollWidth: sheet.scrollWidth,
    scrollHeight: sheet.scrollHeight,
    overflowX: sheet.scrollWidth > sheet.clientWidth + 1,
    overflowY: sheet.scrollHeight > sheet.clientHeight + 1,
  })),
  images: [...document.images].map((image) => ({
    src: image.getAttribute('src'),
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  })),
  text: document.body.innerText,
}));

const requiredText = [
  'FORM AUDIT INVENTARIS LAPANGAN',
  'A, B, C, D, F1, F2, G, H, I, J, K, L, M',
  'AUDIT INVENTARIS KAMAR MANDI',
  'AUDIT FASILITAS AREA BERSAMA',
  'HITUNG FISIK BARANG GUDANG',
  'Kran double shower',
  'Kran double kloset',
  'Selang shower',
  'Kepala shower',
  'Selang jet shower',
  'Kepala jet shower',
  'Hanger baju (lepas)',
  'Gantungan baju dinding / pintu',
  'Ember',
  'Gayung',
  'Sikat lantai',
  'Sikat kloset',
  'Lampu kamar',
  'Hard disk CCTV',
  'Regulator LPG',
  'Access point',
  'Ukuran kamar',
  'Ukuran kamar mandi',
  'Duduk',
  'Jongkok',
  'Merek',
  'Model / tipe',
];
for (const value of requiredText) {
  if (!layout.text.includes(value)) problems.push(`teks wajib hilang: ${value}`);
}
const forbiddenText = [
  'Tarif / deposit',
  'Ref foto',
  'Qty app',
  'Target app',
  'Aset Tetap',
  '/inventory/',
  '/tickets',
  'OPENING_BALANCE',
  'Estimasi harga',
  'Harga',
  'Foto',
  'SKU',
  'nomor seri',
  'Selisih',
  'AUDIT AREA BERSAMA & GUDANG',
  'hitung stok fisik',
];
for (const value of forbiddenText) {
  if (layout.text.toLocaleLowerCase('id').includes(value.toLocaleLowerCase('id'))) {
    problems.push(`teks non-lapangan masih ada: ${value}`);
  }
}
for (const sheet of layout.sheets) {
  if (sheet.overflowX || sheet.overflowY) problems.push(`overflow halaman ${sheet.page}`);
}
for (const image of layout.images) {
  if (!image.complete || image.naturalWidth < 1) problems.push(`gambar gagal: ${image.src}`);
}

await page.pdf({
  path: pdfPath,
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  outline: true,
});
await browser.close();

console.log(JSON.stringify({
  htmlPath,
  pdfPath,
  qaDir,
  sheetCount,
  layout: layout.sheets,
  images: layout.images,
  problems,
}, null, 2));

if (problems.length) process.exitCode = 1;
