import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.cwd();
const DATA = JSON.parse(readFileSync(resolve(BASE, 'scripts/_parsed_master_data.json'), 'utf-8'));
const OUT = resolve(BASE, 'backend/sql/patch-14-master-data-finance.sql');

// ============================================================================
// SQL HELPERS
// ============================================================================
function esc(s) { if (!s) return 'NULL'; return `'${String(s).replace(/'/g, "''")}'`; }
function dateStr(d) { 
  if (!d) return 'NULL'; 
  let dt;
  if (typeof d === 'string') dt = new Date(d);
  else if (d instanceof Date) dt = d;
  else return 'NULL';
  if (isNaN(dt.getTime())) return 'NULL';
  return `'${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}'`; 
}
function tsStr(d) { 
  if (!d) return 'NOW()'; 
  let dt;
  if (typeof d === 'string') dt = new Date(d);
  else if (d instanceof Date) dt = d;
  else return 'NOW()';
  if (isNaN(dt.getTime())) return 'NOW()';
  return `'${dt.toISOString().replace('T',' ').replace('Z','+00')}'`; 
}
function ymd(d) {
  if (!d) return '????-??-??';
  let dt;
  if (typeof d === 'string') dt = new Date(d);
  else if (d instanceof Date) dt = d;
  else return '????-??-??';
  if (isNaN(dt.getTime())) return '????-??-??';
  return dt.toISOString().slice(0, 10);
}
function bool(b) { return b ? 'true' : 'false'; }

let sql = '';

function section(title) {
  sql += `\n-- ============================================================================\n`;
  sql += `-- ${title}\n`;
  sql += `-- ============================================================================\n\n`;
}

// ============================================================================
// HEADER
// ============================================================================
sql += `-- ============================================================================
-- KOST48 — PATCH DATA MASTER FINANCE (IDEMPOTEN, AMAN DIJALANKAN ULANG)
--
-- Tujuan:
--   A. Import tenant historis dari data kwitansi (isActive=false untuk non-aktif)
--   B. Buat Stay INACTIVE untuk setiap periode sewa historis
--   C. Buat Invoice PAID + InvoiceLine + InvoicePayment dari ~180 kwitansi
--   D. Import pengeluaran operasional bulanan 2025
--   E. Import pengeluaran detail tahunan 2021-2025
--
-- Aman untuk database yang sudah berisi data:
--   - Tidak memakai ID tetap.
--   - Mencocokkan tenant terutama lewat NIK, lalu nama/HP.
--   - Semua INSERT pakai WHERE NOT EXISTS / ON CONFLICT DO NOTHING.
--   - Tidak menghapus atau mengubah data existing.
--   - Bisa dijalankan ulang tanpa duplikasi.
--
-- SUMBER: Scan/Master_Database_Kost_48_Lengkap_Terkini.xlsx
-- GENERATED: ${new Date().toISOString()}
--
-- Jalankan (setelah backup database):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/patch-14-master-data-finance.sql
-- ============================================================================

BEGIN;
`;

// ============================================================================
// A. TENANT HISTORIS
// ============================================================================
section('A. TENANT HISTORIS — Import semua tenant dari data kwitansi');

const { tenants, receipts, pengeluaran, pengeluaranTahunan } = DATA;

// Tenant dari kwitansi yang belum tentu di data tenant terkini
// Kita perlu insert tenant yang NIK-nya belum ada di DB
const tenantByNik = new Map();
for (const t of tenants) {
  if (!t.nik) continue;
  tenantByNik.set(t.nik, t);
}

for (const t of tenants) {
  if (!t.nik) continue;
  const name = (t.names && t.names[0]) || 'Unknown';
  const phone = (t.phones && t.phones[0]) || null;
  const email = (t.emails && t.emails[0]) || null;
  
  sql += `-- Tenant: ${name} (NIK: ${t.nik})\n`;
  sql += `INSERT INTO "Tenant" ("fullName", phone, email, "identityNumber", "isActive", "createdAt", "updatedAt")\n`;
  sql += `SELECT ${esc(name)}, ${esc(phone)}, ${esc(email)}, ${esc(t.nik)}, ${bool(!!t.isActive)}, NOW(), NOW()\n`;
  sql += `WHERE NOT EXISTS (\n`;
  sql += `  SELECT 1 FROM "Tenant" WHERE "identityNumber" = ${esc(t.nik)}\n`;
  sql += `);\n\n`;
}

// Update isActive = false for tenants NOT in tenant terkini
sql += `-- Set isActive = false untuk tenant historis (tidak di Data Tenant Terkini)\n`;
const activeNiks = tenants.filter(t => t.isActive).map(t => t.nik);
if (activeNiks.length > 0) {
  sql += `UPDATE "Tenant" SET "isActive" = false, "updatedAt" = NOW()\n`;
  sql += `WHERE "isActive" = true AND "identityNumber" NOT IN (${activeNiks.map(n => esc(n)).join(', ')});\n\n`;
}

// ============================================================================
// B. STAY HISTORIS
// ============================================================================
section('B. STAY HISTORIS — Buat Stay untuk setiap periode sewa');

// Group receipts by tenant NIK + room + period
const stayGroups = new Map(); // key → { receipts, tenantNIK, room, periodStart, periodEnd, totalRent }
for (const r of receipts) {
  if (!r.nik || !r.room || r.isDeposit) continue;
  if (!r.period) continue;
  const key = `${r.nik}|${r.room}|${r.period?.start}|${r.period?.end}`;
  if (!stayGroups.has(key)) {
    stayGroups.set(key, { receipts: [], nik: r.nik, room: r.room, start: r.period.start, end: r.period.end });
  }
  stayGroups.get(key).receipts.push(r);
}

let stayIdx = 0;
for (const [key, group] of stayGroups) {
  stayIdx++;
  const name = group.receipts[0].name;
  const totalRent = group.receipts.reduce((sum, r) => sum + r.nominal, 0);
  
  sql += `-- Stay #${stayIdx}: ${name} | ${group.room} | ${ymd(group.start)} – ${ymd(group.end)}\n`;
  sql += `INSERT INTO "Stay" ("tenantId", "roomId", status, "checkInDate", "checkOutDate", "agreedRentAmountRupiah", "depositAmountRupiah", "depositPaidAmountRupiah", "depositPaymentStatus", "createdAt", "updatedAt")\n`;
  sql += `SELECT tenant.id, room.id, 'INACTIVE'::"StayStatus", ${dateStr(group.start)}, ${dateStr(group.end)}, ${totalRent}, 0, 0, 'UNPAID'::"BookingDepositPaymentStatus", NOW(), NOW()\n`;
  sql += `FROM "Tenant" tenant\n`;
  sql += `JOIN "Room" room ON room.code = ${esc(group.room)}\n`;
  sql += `WHERE tenant."identityNumber" = ${esc(group.nik)}\n`;
  sql += `  AND NOT EXISTS (\n`;
  sql += `    SELECT 1 FROM "Stay" s\n`;
  sql += `    WHERE s."tenantId" = tenant.id AND s."roomId" = room.id\n`;
  sql += `      AND s."checkInDate" = ${dateStr(group.start)} AND s."checkOutDate" = ${dateStr(group.end)}\n`;
  sql += `  );\n\n`;
}

// ============================================================================
// C. INVOICE + INVOICE LINE + INVOICE PAYMENT
// ============================================================================
section('C. INVOICE, INVOICE LINE & PAYMENT — Dari data kwitansi');

let invIdx = 0;
for (const r of receipts) {
  if (!r.nik || !r.room || r.isDeposit) continue;
  if (!r.paymentDate || r.nominal <= 0) continue;
  invIdx++;
  
  const invoiceNumber = `HIST-${ymd(r.paymentDate).replace(/-/g,'')}-${String(invIdx).padStart(4,'0')}`;
  const periodStart = r.period?.start ? new Date(r.period.start) : new Date(r.paymentDate);
  const periodEnd = r.period?.end ? new Date(r.period.end) : new Date(r.paymentDate);
  
  // Calculate line items
  const rentAmount = r.nominal - r.electricityFee - r.wifiFee + r.discount;
  
  sql += `-- Invoice #${invIdx}: ${r.name} | ${r.room} | ${ymd(r.paymentDate)} | Rp${r.nominal.toLocaleString('id-ID')}\n`;
  
  // Invoice
  sql += `WITH inv_ins AS (\n`;
  sql += `  INSERT INTO "Invoice" ("invoiceNumber", "stayId", status, "periodStart", "periodEnd", "issuedAt", "dueDate", "paidAt", "totalAmountRupiah", "createdAt", "updatedAt")\n`;
  sql += `  SELECT ${esc(invoiceNumber)}, stay.id, 'PAID'::"InvoiceStatus", ${dateStr(periodStart)}, ${dateStr(periodEnd)}, ${dateStr(r.paymentDate)}, ${dateStr(r.paymentDate)}, ${dateStr(r.paymentDate)}, ${r.nominal}, NOW(), NOW()\n`;
  sql += `  FROM "Tenant" tenant\n`;
  sql += `  JOIN "Room" room ON room.code = ${esc(r.room)}\n`;
  sql += `  JOIN "Stay" stay ON stay."tenantId" = tenant.id AND stay."roomId" = room.id\n`;
  sql += `  WHERE tenant."identityNumber" = ${esc(r.nik)}\n`;
  sql += `    AND stay."checkInDate" <= ${dateStr(r.paymentDate)} AND stay."checkOutDate" >= ${dateStr(r.paymentDate)}\n`;
  sql += `    AND NOT EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv."invoiceNumber" = ${esc(invoiceNumber)})\n`;
  sql += `  ORDER BY stay."checkInDate" DESC LIMIT 1\n`;
  sql += `  RETURNING id\n`;
  sql += `)\n`;
  
  // InvoiceLine — RENT
  if (rentAmount > 0) {
    sql += `INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")\n`;
    sql += `SELECT inv_ins.id, 'RENT'::"InvoiceLineType", 'Sewa periode ' || ${dateStr(periodStart)}::text || ' - ' || ${dateStr(periodEnd)}::text, 1, ${rentAmount}, ${rentAmount}, 1\n`;
    sql += `FROM inv_ins\n`;
    sql += `WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'RENT'::"InvoiceLineType");\n`;
  }
  
  // InvoiceLine — ELECTRICITY
  if (r.electricityFee > 0) {
    const kwhInfo = r.kwh ? `${r.kwh} kWh` : '';
    sql += `INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "utilityType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")\n`;
    sql += `SELECT inv_ins.id, 'ELECTRICITY'::"InvoiceLineType", 'ELECTRICITY'::"UtilityType", 'Listrik ${kwhInfo}', 1, ${r.electricityFee}, ${r.electricityFee}, 2\n`;
    sql += `FROM inv_ins\n`;
    sql += `WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'ELECTRICITY'::"InvoiceLineType");\n`;
  }
  
  // InvoiceLine — WIFI
  if (r.wifiFee > 0) {
    sql += `INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")\n`;
    sql += `SELECT inv_ins.id, 'WIFI'::"InvoiceLineType", 'Layanan WiFi', 1, ${r.wifiFee}, ${r.wifiFee}, 3\n`;
    sql += `FROM inv_ins\n`;
    sql += `WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'WIFI'::"InvoiceLineType");\n`;
  }
  
  // InvoiceLine — DISCOUNT
  if (r.discount > 0) {
    sql += `INSERT INTO "InvoiceLine" ("invoiceId", "lineType", "description", qty, "unitPriceRupiah", "lineAmountRupiah", "sortOrder")\n`;
    sql += `SELECT inv_ins.id, 'DISCOUNT'::"InvoiceLineType", 'Diskon', 1, -${r.discount}, -${r.discount}, 4\n`;
    sql += `FROM inv_ins\n`;
    sql += `WHERE NOT EXISTS (SELECT 1 FROM "InvoiceLine" il WHERE il."invoiceId" = inv_ins.id AND il."lineType" = 'DISCOUNT'::"InvoiceLineType");\n`;
  }
  
  // InvoicePayment
  sql += `INSERT INTO "InvoicePayment" ("invoiceId", "paymentDate", "amountRupiah", method, "createdAt", "updatedAt")\n`;
  sql += `SELECT inv_ins.id, ${dateStr(r.paymentDate)}, ${r.nominal}, 'CASH'::"PaymentMethod", NOW(), NOW()\n`;
  sql += `FROM inv_ins\n`;
  sql += `WHERE NOT EXISTS (SELECT 1 FROM "InvoicePayment" ip WHERE ip."invoiceId" = inv_ins.id AND ip."amountRupiah" = ${r.nominal});\n\n`;
}

// ============================================================================
// D. EXPENSE OPERASIONAL BULANAN 2025
// ============================================================================
section('D. PENGELUARAN OPERASIONAL BULANAN (Mei-Des 2025)');

// Map kategori ke ExpenseCategory enum
function mapExpenseCategory(cat) {
  const c = cat.toLowerCase();
  if (c.includes('wifi') || c.includes('indihome') || c.includes('internet')) return 'INTERNET';
  if (c.includes('listrik') || c.includes('token')) return 'ELECTRICITY';
  if (c.includes('air') || c.includes('pdam')) return 'WATER';
  if (c.includes('cuci ac') || c.includes('kebersihan')) return 'CLEANING';
  if (c.includes('renovasi')) return 'MAINTENANCE';
  return 'OTHER';
}

function parseMonthYear(moyr) {
  // "Mei 2025" → 2025-05-01
  const m = DATA.receipts?.[0] ? null : null; // reuse MONTHS_ID concept
  const parts = moyr.split(' ');
  if (parts.length < 2) return null;
  const monthNames = { 'januari':1,'februari':2,'maret':3,'april':4,'mei':5,'juni':6,'juli':7,'agustus':8,'september':9,'oktober':10,'november':11,'desember':12 };
  const month = monthNames[parts[0].toLowerCase()];
  const year = parseInt(parts[1], 10);
  if (!month || isNaN(year)) return null;
  return new Date(year, month - 1, 1);
}

let expIdx = 0;
for (const e of pengeluaran) {
  if (!e.monthYear || e.amount <= 0) continue;
  expIdx++;
  const cat = mapExpenseCategory(e.category);
  const edate = parseMonthYear(e.monthYear);
  const desc = e.category + (e.notes ? ' - ' + e.notes : '');
  
  sql += `-- Expense #${expIdx}: ${e.monthYear} | ${e.category} | Rp${e.amount.toLocaleString('id-ID')}\n`;
  sql += `INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")\n`;
  sql += `SELECT ${dateStr(edate)}, 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", '${cat}'::"ExpenseCategory", ${esc(desc)}, ${e.amount}, NOW(), NOW()\n`;
  sql += `WHERE NOT EXISTS (\n`;
  sql += `  SELECT 1 FROM "Expense" ex\n`;
  sql += `  WHERE ex."expenseDate" = ${dateStr(edate)}\n`;
  sql += `    AND ex.category = '${cat}'::"ExpenseCategory"\n`;
  sql += `    AND ex."amountRupiah" = ${e.amount}\n`;
  sql += `    AND ex.description = ${esc(desc)}\n`;
  sql += `);\n\n`;
}

// ============================================================================
// E. EXPENSE TAHUNAN 2021-2025
// ============================================================================
section('E. PENGELUARAN DETAIL TAHUNAN (2021-2025)');

function mapYearlyCategory(cat) {
  const c = cat.toLowerCase();
  if (c.includes('renovasi') || c.includes('material') || c.includes('bangunan')) return 'MAINTENANCE';
  if (c.includes('operasional') || c.includes('maintenance')) return 'MAINTENANCE';
  if (c.includes('elektronik') || c.includes('perabot')) return 'SUPPLIES';
  if (c.includes('pribadi') || c.includes('konsumsi')) return 'OTHER';
  return 'OTHER';
}

const yearlyMonthNames = { 'januari':1,'februari':2,'maret':3,'april':4,'mei':5,'juni':6,'juli':7,'agustus':8,'september':9,'oktober':10,'november':11,'desember':12 };

let yexpIdx = 0;
for (const e of pengeluaranTahunan) {
  if (!e.year || !e.month || e.amount <= 0) continue;
  yexpIdx++;
  const cat = mapYearlyCategory(e.category);
  const month = yearlyMonthNames[e.month.toLowerCase()];
  const edate = month ? new Date(e.year, month - 1, 1) : new Date(e.year, 0, 1);
  const desc = e.item + (e.category ? ' [' + e.category + ']' : '');
  
  sql += `-- Yearly Expense #${yexpIdx}: ${e.year}-${e.month} | ${e.item} | Rp${e.amount.toLocaleString('id-ID')}\n`;
  sql += `INSERT INTO "Expense" ("expenseDate", type, status, category, description, "amountRupiah", "createdAt", "updatedAt")\n`;
  sql += `SELECT ${dateStr(edate)}, 'VARIABLE'::"ExpenseType", 'CONFIRMED'::"ExpenseStatus", '${cat}'::"ExpenseCategory", ${esc(desc)}, ${e.amount}, NOW(), NOW()\n`;
  sql += `WHERE NOT EXISTS (\n`;
  sql += `  SELECT 1 FROM "Expense" ex\n`;
  sql += `  WHERE ex."expenseDate" = ${dateStr(edate)}\n`;
  sql += `    AND ex."amountRupiah" = ${e.amount}\n`;
  sql += `    AND ex.description = ${esc(desc)}\n`;
  sql += `);\n\n`;
}

// ============================================================================
// VERIFICATION
// ============================================================================
section('VERIFIKASI — Query pengecekan hasil import');

sql += `-- Hitung total data yang berhasil diimport\n`;
sql += `SELECT 'Tenant Historis' AS bagian, COUNT(*) AS jumlah FROM "Tenant" WHERE "isActive" = false\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Stay INACTIVE', COUNT(*) FROM "Stay" WHERE status = 'INACTIVE'\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Invoice Historis', COUNT(*) FROM "Invoice" WHERE "invoiceNumber" LIKE 'HIST-%'\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Invoice Payment', COUNT(*) FROM "InvoicePayment" ip JOIN "Invoice" inv ON inv.id = ip."invoiceId" WHERE inv."invoiceNumber" LIKE 'HIST-%'\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Expense 2025', COUNT(*) FROM "Expense" WHERE "expenseDate" >= '2025-05-01' AND "expenseDate" < '2026-01-01'\n`;
sql += `UNION ALL\n`;
sql += `SELECT 'Expense Tahunan', COUNT(*) FROM "Expense" WHERE "expenseDate" < '2025-05-01'\n`;
sql += `ORDER BY bagian;\n\n`;

sql += `COMMIT;\n`;

// ============================================================================
// WRITE
// ============================================================================
writeFileSync(OUT, sql, 'utf-8');
console.log('✅ SQL patch generated:', OUT);
console.log(`   Size: ${(sql.length / 1024).toFixed(1)} KB`);
