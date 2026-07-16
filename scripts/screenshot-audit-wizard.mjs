/**
 * Script: screenshot-audit-wizard.mjs
 * 
 * Mengambil screenshot wizard audit kamar tenant KOST48
 * untuk bahan iklan Instagram (feed + story/reels).
 * 
 * Cara pakai: node scripts/screenshot-audit-wizard.mjs
 * Output: docs/screenshots-audit/
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WIZARD_URL = 'https://auditkamartenantkost48.vercel.app/';
const OUTPUT_DIR = path.join(ROOT, 'docs', 'screenshots-audit');

// Ukuran untuk Instagram
const VIEWPORTS = [
  { name: 'story', width: 1080, height: 1920 },  // Instagram Story / Reels 9:16
  { name: 'feed',  width: 1080, height: 1080 },   // Instagram Feed 1:1
  { name: 'phone', width: 390,  height: 844 },     // iPhone 14 Pro (mobile realistis)
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  console.log('🚀 Memulai screenshot wizard audit kamar...\n');

  // Buat folder output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Folder dibuat: ${OUTPUT_DIR}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 2, // Retina quality
    locale: 'id-ID',
  });

  for (const vp of VIEWPORTS) {
    console.log(`\n📱 Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Buka halaman
    await page.goto(WIZARD_URL, { waitUntil: 'networkidle' });
    await sleep(500);

    // --- STEP 0: HERO ---
    console.log('   📸 Step 0: Hero');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `step0-hero_${vp.name}.png`),
      fullPage: false,
    });

    // --- STEP 1: DATA DIRI (isi sebagian) ---
    await page.click('text=Mulai Cek Kamar');
    await sleep(300);
    // Isi data
    await page.selectOption('#room', 'A');
    await page.fill('#tenantName', 'Maya Pratiwi');
    await page.fill('#phone', '081234567890');
    await sleep(200);
    console.log('   📸 Step 1: Data Diri (terisi)');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `step1-data-diri_${vp.name}.png`),
      fullPage: false,
    });

    // Lanjut ke step 2
    await page.click('button:has-text("Lanjut")');
    await sleep(300);

    // --- STEP 2: DINDING & PLAFON (pilih opsi) ---
    // Pilih Dinding: OK
    await page.click('.options-group[data-field="wall"] .opt-ok');
    await sleep(100);
    // Pilih Plafon: Ada Masalah
    await page.click('.options-group[data-field="ceiling"] .opt-masalah');
    await sleep(200);
    console.log('   📸 Step 2: Dinding & Plafon (dipilih)');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `step2-dinding-plafon_${vp.name}.png`),
      fullPage: false,
    });

    // Lanjut ke step 3-4-5 (skip, isi asal)
    await page.click('button:has-text("Lanjut")'); await sleep(200);
    // Step 3: pilih semua OK
    await page.click('.options-group[data-field="floor"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="door"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="window"] .opt-ok'); await sleep(80);
    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // Step 4: Kasur OK, Lemari OK, Bedding OK
    await page.click('.options-group[data-field="mattress"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="wardrobe"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="bedding"] .opt-ok'); await sleep(80);
    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // Step 5: Listrik
    await page.click('.options-group[data-field="mainLamp"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="socket"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="switch"] .opt-ok'); await sleep(80);
    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // --- STEP 6: AC & KIPAS (foto, pilih variasi) ---
    await page.click('.options-group[data-field="ac"] .opt-masalah'); await sleep(100);
    await page.click('.options-group[data-field="fan"] .opt-tidak-ada'); await sleep(100);
    console.log('   📸 Step 6: AC & Kipas');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `step6-ac-kipas_${vp.name}.png`),
      fullPage: false,
    });

    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // Step 7: Kamar Mandi
    await page.click('.options-group[data-field="toilet"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="jetShower"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="drain"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="exhaust"] .opt-ok'); await sleep(80);
    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // Step 8: Hama
    await page.click('.options-group[data-field="odor"] .opt-ok'); await sleep(80);
    await page.click('.options-group[data-field="pest"] .opt-masalah'); await sleep(80);
    await page.click('button:has-text("Lanjut")'); await sleep(200);

    // --- STEP 9: CATATAN & FOTO ---
    await page.fill('#notes', 'AC kurang dingin, mungkin freon habis. Ada kecoa di pojok lemari.');
    await sleep(100);
    await page.click('.options-group[data-field="photoTaken"] .opt-ok');
    await sleep(200);
    console.log('   📸 Step 9: Catatan & Foto (siap kirim)');
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `step9-catatan-foto_${vp.name}.png`),
      fullPage: false,
    });

    // Kirim laporan
    await page.click('#btnSubmit');
    await sleep(3000); // Tunggu submit + animasi sukses

    // --- STEP 10: SUKSES ---
    const successVisible = await page.isVisible('.success-container');
    if (successVisible) {
      console.log('   📸 Step 10: Sukses ✅');
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `step10-sukses_${vp.name}.png`),
        fullPage: false,
      });
    } else {
      console.log('   ⚠️ Halaman sukses tidak muncul (coba periksa koneksi/URL)');
    }

    await page.close();
  }

  await browser.close();

  // --- Hitung file hasil ---
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ Selesai! ${files.length} screenshot tersimpan di:`);
  console.log(`   ${OUTPUT_DIR}`);
  files.forEach(f => console.log(`   📄 ${f}`));
}

takeScreenshots().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
