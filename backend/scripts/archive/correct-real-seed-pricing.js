/*
 * Koreksi satu kali data seed hasil salah-alokasi biaya.
 * Sumber tarif: kuitansi asli pada sheet "Master Data Kwitansi", dipetakan
 * satu-per-satu melalui kolom "Baris Master" pada "Transaksi Final".
 *
 * Jalankan dari root proyek:
 *   node backend/scripts/archive/correct-real-seed-pricing.js
 */

const fs = require('fs');
const path = require('path');
const { getAdditionalChargeTotal, validateRealSeedPricing } = require('../real-seed-pricing');
const { auditSeedAgainstSource, assertSourceAudit, getSourceEvidenceIndex } = require('../real-seed-source-audit');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_FILES = [
  path.join(__dirname, '..', 'seed-data.json'),
  path.join(ROOT, 'scripts', 'seed-data.json'),
];

// Harga sewa tenant aktif tetap diisi untuk validasi aplikasi berjalan.
const CURRENT_TENANT_PRICES = new Map([
  ['3574036206990003|A', 1700000],
  ['3275085012800021|B', 1500000],
  ['6471051708970006|C', 1600000],
  ['3173052309720009|D', 1500000],
  ['6405025701970003|F1', 1700000],
  ['3275020504910019|F2', 1600000],
  ['3519122204030003|G', 800000],
  ['3578070811730004|H', 800000],
  ['3571021308860003|I', 800000],
  ['3175070312930003|J', 1500000],
  ['3578125102000002|K', 1600000],
  ['1671065812020008|L', 1600000],
  ['3511115908030001|M', 1200000],
]);

function correctSeed(seed) {
  let correctedInvoices = 0;
  let baseRentCorrections = 0;
  let componentCorrections = 0;
  let totalIncrease = 0;
  const sourceIndex = getSourceEvidenceIndex(seed);
  if (sourceIndex.mappingFailures.length) {
    throw new Error(`Pemetaan kuitansi gagal untuk ${sourceIndex.mappingFailures.length} invoice`);
  }
  const { evidenceByInvoice } = sourceIndex;

  for (const tenant of seed.currentTenants ?? []) {
    const key = `${tenant.identityNumber}|${tenant.roomCode}`;
    const monthlyRentRupiah = CURRENT_TENANT_PRICES.get(key);
    if (!monthlyRentRupiah) throw new Error(`Tarif tidak ditemukan untuk tenant aktif ${tenant.fullName} (${key})`);
    tenant.monthlyRentRupiah = monthlyRentRupiah;
  }

  for (const invoice of seed.paidInvoices ?? []) {
    const evidence = evidenceByInvoice.get(invoice.invoiceNumber);
    if (!evidence) throw new Error(`Kuitansi sumber tidak ditemukan untuk ${invoice.invoiceNumber}`);

    const previousTotal = Number(invoice.totalAmount);
    let changed = false;

    if (Number(invoice.rentAmount) !== evidence.rentAmount) {
      invoice.rentAmount = evidence.rentAmount;
      baseRentCorrections++;
      changed = true;
    }

    for (const field of ['electricityAmount', 'wifiAmount', 'discountAmount']) {
      const sourceAmount = evidence.charges[field];
      if (sourceAmount !== null && Number(invoice[field] ?? 0) !== sourceAmount) {
        invoice[field] = sourceAmount;
        componentCorrections++;
        changed = true;
      }
    }

    const correctedTotal = evidence.rentAmount + getAdditionalChargeTotal(invoice);
    if (Number(invoice.totalAmount) !== correctedTotal) {
      invoice.totalAmount = correctedTotal;
      changed = true;
    }

    if (changed) {
      totalIncrease += correctedTotal - previousTotal;
      correctedInvoices++;
    }
  }

  const validation = validateRealSeedPricing(seed);
  const sourceAudit = auditSeedAgainstSource(seed);
  assertSourceAudit(sourceAudit);
  return { correctedInvoices, baseRentCorrections, componentCorrections, totalIncrease, validation, sourceAudit };
}

function main() {
  const canonicalPath = DATA_FILES[0];
  const seed = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  const result = correctSeed(seed);
  const content = `${JSON.stringify(seed, null, 2)}\n`;

  for (const filePath of DATA_FILES) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  console.log(`Koreksi selesai: ${result.correctedInvoices} invoice, ${result.baseRentCorrections} tarif sewa, ${result.componentCorrections} komponen biaya.`);
  console.log(`Perubahan total kumulatif: Rp${result.totalIncrease.toLocaleString('id-ID')}.`);
  console.log(`Validasi: ${result.validation.invoices} invoice, ${result.validation.currentTenantPrices} tarif tenant aktif.`);
  console.log(`Audit sumber: ${result.sourceAudit.mappedInvoiceCount}/${result.sourceAudit.invoiceCount} invoice, ${result.sourceAudit.componentEvidenceCount} komponen bernominal.`);
}

main();
