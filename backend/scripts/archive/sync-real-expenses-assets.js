/*
 * Sinkronisasi pengeluaran dan aset historis dari laporan final KOST48.
 *
 * Data sumber tidak diubah. Aset lama diberi status disclosure/review agar
 * tidak otomatis mengubah jurnal atau nilai buku sebelum stock opname.
 *
 * Jalankan dari root proyek:
 *   node backend/scripts/archive/sync-real-expenses-assets.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const REPORT_PATH = path.join(ROOT, 'Scan', 'KOST48_Laporan_Bulanan_FINAL_Koreksi_Sewa_Plus_Utilitas.xlsx');
const DATA_FILES = [
  path.join(__dirname, '..', 'seed-data.json'),
  path.join(ROOT, 'scripts', 'seed-data.json'),
];

const MONTHS = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

const EXPENSE_CATEGORIES = new Set([
  'RENT_BUILDING', 'SALARY', 'ELECTRICITY', 'WATER', 'INTERNET',
  'MAINTENANCE', 'CLEANING', 'SUPPLIES', 'TAX', 'MARKETING', 'OTHER',
]);

function parseAmount(value) {
  const digits = String(value ?? '').replace(/[^\d-]/g, '');
  return digits && digits !== '-' ? Number(digits) : 0;
}

function toMonthNumber(monthName) {
  const month = MONTHS[String(monthName ?? '').trim().toLowerCase()];
  if (!month) throw new Error(`Bulan pengeluaran tidak dikenali: ${monthName}`);
  return month;
}

function sourceDate(year, monthName) {
  return `${year}-${String(toMonthNumber(monthName)).padStart(2, '0')}-01`;
}

function inferAsset(description, sourceCategory) {
  const text = String(description ?? '').toLowerCase();
  if (/pindah\s+ac|cuci\s+ac|servis|service|perbaikan/.test(text) || /pribadi/i.test(sourceCategory)) return null;

  const definitions = [
    [/\bac\b|air\s*cond/, 'ELECTRONIC', 60],
    [/kipas/, 'ELECTRONIC', 36],
    [/cctv/, 'ELECTRONIC', 48],
    [/kasur|spring\s*bed|tempat tidur/, 'FURNITURE', 60],
    [/lemari|meja|kursi/, 'FURNITURE', 60],
    [/mesin\s*cuci/, 'ELECTRONIC', 60],
    [/\btv\b|televisi/, 'ELECTRONIC', 48],
    [/printer/, 'ELECTRONIC', 48],
    [/pompa|dispenser|router|modem/, 'UTILITY_EQUIPMENT', 48],
  ];

  const match = definitions.find(([pattern]) => pattern.test(text));
  if (!match) return null;

  const quantityMatch = text.match(/\b(\d+)\s*(buah|biji|unit)\b/);
  const roomMatch = text.match(/\b(?:kamar|kmr)\s*(f[1-3]|[a-m])\b/i);
  return {
    category: match[1],
    usefulLifeMonths: match[2],
    quantity: quantityMatch ? Number(quantityMatch[1]) : 1,
    roomCode: roomMatch ? roomMatch[1].toUpperCase() : null,
  };
}

function buildHistoricalRecords() {
  const workbook = XLSX.readFile(REPORT_PATH);
  const sheet = workbook.Sheets['Pengeluaran Semua'];
  if (!sheet) throw new Error('Sheet "Pengeluaran Semua" tidak ditemukan pada laporan sumber.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const expenses = [];
  const assets = [];

  for (const row of rows.slice(1)) {
    const [sourceSheet, sourceRow, rawYear, month, sourceCategory, category, description, rawAmount] = row;
    if (!sourceSheet || !sourceCategory || !rawAmount) continue;
    const year = Number(rawYear);
    const amountRupiah = parseAmount(rawAmount);
    if (!Number.isInteger(year) || amountRupiah <= 0) {
      throw new Error(`Baris pengeluaran tidak valid: ${JSON.stringify(row)}`);
    }
    if (!EXPENSE_CATEGORIES.has(category)) {
      throw new Error(`Kategori pengeluaran tidak didukung (${category}) pada baris sumber ${sourceRow}`);
    }

    const sourceKind = sourceSheet === 'Master Pengeluaran' ? 'MASTER' : 'DETAIL';
    const sourceKey = `EXP-${sourceKind}-${year}-${sourceRow}`;
    const expense = {
      sourceKey,
      sourceSheet,
      sourceRow: Number(sourceRow),
      sourceCategory,
      expenseDate: sourceDate(year, month),
      type: 'VARIABLE',
      status: 'CONFIRMED',
      category,
      description: String(description).trim() || String(sourceCategory).trim(),
      amountRupiah,
      vendorName: null,
      note: `[KOST48-HIST:${sourceKey}] Impor historis ${sourceSheet} baris ${sourceRow}; tanggal sumber hanya memuat bulan, dipakai tanggal 1.`,
    };
    expenses.push(expense);

    const asset = inferAsset(expense.description, sourceCategory);
    if (asset) {
      assets.push({
        assetCode: `HIST-${sourceKey}`,
        name: expense.description,
        acquisitionDate: expense.expenseDate,
        acquisitionCostRupiah: expense.amountRupiah,
        expenseSourceKey: sourceKey,
        ...asset,
        notes: `Pembelian historis dari ${sourceSheet} baris ${sourceRow}; status fisik perlu stock opname.`,
      });
    }
  }

  return { expenses, assets };
}

function applyRoomSpecifications(seed) {
  for (const [roomCode, room] of Object.entries(seed.rooms ?? {})) {
    const isCapsule = /^F[1-3]$/i.test(roomCode);
    room.specification = {
      source: 'Estimasi owner untuk seed awal; perlu verifikasi ukur fisik.',
      estimatedRoomAreaM2: isCapsule ? 9 : 12,
      estimatedBathroomAreaM2: isCapsule ? 2.25 : 3,
      roomFloorFinish: 'Keramik',
      bathroomFloorFinish: 'Keramik',
      bathroomWallFinish: 'Keramik dinding penuh',
      bathroomType: 'Kamar mandi dalam',
      electricalOutletPoints: 2,
      roomLightPoints: 1,
      bathroomLightPoints: 1,
      hasToilet: true,
      hasShower: true,
    };
  }
}

function buildPropertyDisclosure() {
  const landAreaM2 = 998;
  const buildingAreaM2 = 130;
  const landNjopPerM2 = 2640000;
  const buildingNjopPerM2 = 968000;
  const landMarketMidPerM2 = 10000000;
  const buildingReplacementMidPerM2 = 5000000;

  return {
    address: 'Jl. Raya Lontar 48, RT 002 RW 001, Lontar, Sambikerep, Surabaya',
    asOfDate: '2026-07-19',
    taxSource: 'SPPT PBB-P2 Tahun 2026 (dokumen pemilik)',
    pbb: {
      landAreaM2,
      buildingAreaM2,
      landNjopPerM2,
      buildingNjopPerM2,
      landNjopRupiah: landAreaM2 * landNjopPerM2,
      buildingNjopRupiah: buildingAreaM2 * buildingNjopPerM2,
      pbbDueRupiah: 5491120,
    },
    indicativeMarketValue: {
      label: 'Perkiraan indikatif, bukan appraisal dan bukan nilai buku',
      landPerM2RangeRupiah: { low: 7000000, mid: landMarketMidPerM2, high: 15000000 },
      buildingReplacementPerM2RangeRupiah: { low: 3800000, mid: buildingReplacementMidPerM2, high: 6500000 },
      landValueRangeRupiah: {
        low: landAreaM2 * 7000000,
        mid: landAreaM2 * landMarketMidPerM2,
        high: landAreaM2 * 15000000,
      },
      buildingReplacementRangeRupiah: {
        low: buildingAreaM2 * 3800000,
        mid: buildingAreaM2 * buildingReplacementMidPerM2,
        high: buildingAreaM2 * 6500000,
      },
      propertyValueRangeRupiah: {
        low: landAreaM2 * 7000000 + buildingAreaM2 * 3800000,
        mid: landAreaM2 * landMarketMidPerM2 + buildingAreaM2 * buildingReplacementMidPerM2,
        high: landAreaM2 * 15000000 + buildingAreaM2 * 6500000,
      },
      assumptions: [
        'Nilai tengah tanah memakai Rp10 juta/m² karena akses, lebar muka, kondisi sertifikat, dan bentuk lahan belum diverifikasi.',
        'Kisaran tanah memakai pembanding Sambikerep/Lontar sekitar Rp7–15 juta/m²; listing raya Lontar menjadi batas atas indikatif.',
        'Bangunan menggunakan biaya pengganti indikatif Rp3,8–6,5 juta/m² atas luas bangunan PBB 130 m², bukan harga transaksi.',
      ],
      sources: [
        {
          name: 'Rumah123 — properti Jl. Raya Lontar No. 66, 470 m², Rp15 juta/m² (listing pembanding)',
          url: 'https://www.rumah123.com/properti/surabaya-sambikerep/dijual-tanah-raya-lontar-sambikerep-surabaya-barat-tanah-di-jl-raya-lontar-no66-lontar-sambikerep-kota-surabaya-jawa-las8946036/',
        },
        {
          name: 'Rumah123 — listing tanah Sambikerep/Lontar (pembanding kisaran)',
          url: 'https://www.rumah123.com/jual/surabaya/sambikerep/tanah/',
        },
        {
          name: 'RJP — kisaran biaya bangun rumah Surabaya Barat 2026 (pembanding biaya pengganti)',
          url: 'https://rezekijayaperkasa.com/estimasi-biaya-bangun-rumah-surabaya-barat-sememi/',
        },
      ],
    },
    disclosureFixedAssets: [
      {
        assetCode: 'PROP-LAND-NJOP-2026',
        name: 'Tanah Jl. Raya Lontar 48 — referensi NJOP PBB 2026',
        category: 'OTHER',
        acquisitionDate: '2026-01-01',
        acquisitionCostRupiah: landAreaM2 * landNjopPerM2,
        usefulLifeMonths: 1200,
        notes: 'Nilai NJOP PBB, bukan harga perolehan atau nilai pasar. Nilai pasar indikatif disimpan pada propertyDisclosure.',
      },
      {
        assetCode: 'PROP-BUILDING-NJOP-2026',
        name: 'Bangunan Jl. Raya Lontar 48 — referensi NJOP PBB 2026',
        category: 'BUILDING',
        acquisitionDate: '2026-01-01',
        acquisitionCostRupiah: buildingAreaM2 * buildingNjopPerM2,
        usefulLifeMonths: 240,
        notes: 'Nilai NJOP PBB, bukan harga perolehan atau nilai pasar. Luas bangunan sumber PBB: 130 m².',
      },
    ],
  };
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) throw new Error(`Laporan sumber tidak ditemukan: ${REPORT_PATH}`);
  const seed = JSON.parse(fs.readFileSync(DATA_FILES[0], 'utf8'));
  const { expenses, assets } = buildHistoricalRecords();
  applyRoomSpecifications(seed);
  seed.historicalExpenses = expenses;
  seed.historicalFixedAssets = assets;
  seed.propertyDisclosure = buildPropertyDisclosure();
  seed.historicalExpenseAudit = {
    sourceWorkbook: path.basename(REPORT_PATH),
    sourceSheet: 'Pengeluaran Semua',
    records: expenses.length,
    totalRupiah: expenses.reduce((total, expense) => total + expense.amountRupiah, 0),
    fixedAssetCandidates: assets.length,
  };

  const content = `${JSON.stringify(seed, null, 2)}\n`;
  for (const dataFile of DATA_FILES) fs.writeFileSync(dataFile, content, 'utf8');

  console.log(`Sinkron selesai: ${expenses.length} pengeluaran (Rp${seed.historicalExpenseAudit.totalRupiah.toLocaleString('id-ID')}), ${assets.length} aset historis untuk verifikasi.`);
}

main();
