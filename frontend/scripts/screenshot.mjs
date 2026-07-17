/**
 * Screenshot Wizard Audit Kamar - jalan dari folder frontend/
 * 
 * Cara: cd frontend && node scripts/screenshot.mjs
 * Output: docs/screenshots-audit/
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIZARD_URL = 'https://auditkamartenantkost48.vercel.app/';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots-audit');

const VIEWPORTS = [
  { name: 'story', width: 1080, height: 1920 },
  { name: 'feed',  width: 1080, height: 1080 },
  { name: 'phone', width: 390,  height: 844 },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Klik tombol dengan teks tertentu di step yang aktif */
async function clickActiveBtn(page, text) {
  await page.evaluate((t) => {
    const steps = document.querySelectorAll('.step');
    let btn = null;
    for (const s of steps) {
      if (s.classList.contains('active')) {
        btn = s.querySelector(`button`);
        // Cari yang teksnya mengandung t
        const allBtns = s.querySelectorAll('button');
        for (const b of allBtns) {
          if (b.textContent.includes(t)) { btn = b; break; }
        }
        break;
      }
    }
    if (btn) btn.click();
  }, text);
  await sleep(300);
}

/** Klik opsi di dalam group tertentu */
async function clickOpt(page, field, cls) {
  await page.evaluate(({ field, cls }) => {
    const group = document.querySelector(`.options-group[data-field="${field}"]`);
    if (!group) return;
    const btn = group.querySelector(`.${cls}`);
    if (btn) btn.click();
  }, { field, cls });
  await sleep(100);
}

async function screenshotStep(page, stepName, vpName) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `step${stepName}_${vpName}.png`),
    fullPage: false,
  });
}

async function run() {
  console.log('🚀 Screenshot Wizard Audit Kamar dimulai...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ deviceScaleFactor: 2, locale: 'id-ID' });

  for (const vp of VIEWPORTS) {
    console.log(`📱 ${vp.name} (${vp.width}x${vp.height})`);
    const page = await ctx.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto(WIZARD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(800);

    // Step 0: Hero
    console.log('   Step 0: Hero');
    await screenshotStep(page, '0-hero', vp.name);

    // Step 1: Data diri
    await clickActiveBtn(page, 'Mulai Cek Kamar');
    await page.selectOption('#room', 'A');
    await page.fill('#tenantName', 'Maya Pratiwi');
    await page.fill('#phone', '081234567890');
    await sleep(200);
    console.log('   Step 1: Data Diri (terisi)');
    await screenshotStep(page, '1-data-diri', vp.name);

    // Step 2: Dinding & Plafon
    await clickActiveBtn(page, 'Lanjut');
    await clickOpt(page, 'wall', 'opt-ok');
    await clickOpt(page, 'ceiling', 'opt-masalah');
    console.log('   Step 2: Dinding & Plafon');
    await screenshotStep(page, '2-dinding-plafon', vp.name);

    // Step 3: Lantai, Pintu, Jendela
    await clickActiveBtn(page, 'Lanjut');
    await clickOpt(page, 'floor', 'opt-ok');
    await clickOpt(page, 'door', 'opt-ok');
    await clickOpt(page, 'window', 'opt-ok');
    await clickActiveBtn(page, 'Lanjut');

    // Step 4: Kasur & Furniture
    await clickOpt(page, 'mattress', 'opt-ok');
    await clickOpt(page, 'wardrobe', 'opt-ok');
    await clickOpt(page, 'bedding', 'opt-ok');
    await clickActiveBtn(page, 'Lanjut');

    // Step 5: Listrik
    await clickOpt(page, 'mainLamp', 'opt-ok');
    await clickOpt(page, 'socket', 'opt-ok');
    await clickOpt(page, 'switch', 'opt-ok');
    await clickActiveBtn(page, 'Lanjut');

    // Step 6: AC & Kipas
    await clickOpt(page, 'ac', 'opt-masalah');
    await clickOpt(page, 'fan', 'opt-tidak-ada');
    console.log('   Step 6: AC & Kipas');
    await screenshotStep(page, '6-ac-kipas', vp.name);

    await clickActiveBtn(page, 'Lanjut');

    // Step 7: Kamar Mandi
    await clickOpt(page, 'toilet', 'opt-ok');
    await clickOpt(page, 'jetShower', 'opt-ok');
    await clickOpt(page, 'drain', 'opt-ok');
    await clickOpt(page, 'exhaust', 'opt-ok');
    await clickActiveBtn(page, 'Lanjut');

    // Step 8: Kenyamanan & Hama
    await clickOpt(page, 'odor', 'opt-ok');
    await clickOpt(page, 'pest', 'opt-masalah');
    await clickActiveBtn(page, 'Lanjut');

    // Step 9: Catatan & Foto
    await page.fill('#notes', 'AC kurang dingin, mungkin freon habis. Ada kecoa di pojok lemari.');
    await clickOpt(page, 'photoTaken', 'opt-ok');
    console.log('   Step 9: Catatan & Foto');
    await screenshotStep(page, '9-catatan-foto', vp.name);

    // Submit
    console.log('   Mengirim laporan...');
    await clickActiveBtn(page, 'Kirim Laporan');
    await sleep(4000);

    // Step 10: Sukses
    const success = await page.evaluate(() => {
      const el = document.querySelector('.success-container');
      return el && el.offsetParent !== null;
    });
    if (success) {
      console.log('   Step 10: Sukses ✅');
      await screenshotStep(page, '10-sukses', vp.name);
    } else {
      console.log('   ⚠️ Halaman sukses tidak muncul');
    }

    await page.close();
  }

  await browser.close();

  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ Selesai! ${files.length} file PNG di docs/screenshots-audit/`);
  files.forEach(f => console.log(`   📄 ${f}`));
}

run().catch(err => { console.error('❌', err); process.exit(1); });
