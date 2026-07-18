import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';

const BASE = process.cwd();
const EXCEL = resolve(BASE, 'Scan/Master_Database_Kost_48_Lengkap_Terkini.xlsx');
const OUT = resolve(BASE, 'scripts/_parsed_master_data.json');

// ============================================================================
// HELPERS
// ============================================================================

/** "Rp1,600,000" → 1600000 */
function parseRupiah(v) {
  if (typeof v === 'number') return Math.round(v);
  if (!v) return 0;
  const s = String(v).replace(/[^0-9]/g, '');
  return parseInt(s, 10) || 0;
}

/** "Satu Juta Tujuh Ratus Ribu Rupiah" → 1700000 */
const WORD_MAP = {
  'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
  'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
  'sebelas': 11, 'seratus': 100, 'ratus': 100, 'ribu': 1000,
  'juta': 1000000, 'puluh': 1, 'belas': 1
};
function parseWordRupiah(v) {
  if (!v || typeof v !== 'string') return 0;
  let s = v.toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (!s) return 0;
  // Pattern: "Satu Juta Tujuh Ratus Ribu Rupiah"
  let total = 0, current = 0;
  const words = s.split(/\s+/);
  for (const w of words) {
    const val = WORD_MAP[w];
    if (!val && w !== 'rupiah') continue;
    if (w === 'juta') { current = (current || 1) * 1000000; total += current; current = 0; }
    else if (w === 'ribu') { current = (current || 1) * 1000; total += current; current = 0; }
    else if (w === 'ratus') { current = (current || 1) * 100; /* belum ditambah, nanti diakumulasi */ }
    else if (w === 'puluh') { current = (current || 1) * 10; }
    else if (w === 'belas') { current += 10; }
    else if (w === 'rupiah') { /* abaikan */ }
    else if (val) { current += val; }
  }
  total += current;
  // Fallback: "Delapan Ratus Ribu" = 8 * 100 * 1000 = 800000
  if (total === 0) {
    for (const w of words) {
      const val = WORD_MAP[w];
      if (!val) continue;
      if (w === 'ratus' || w === 'puluh') current *= val;
      else if (w === 'ribu') { current *= 1000; total += current; current = 0; }
      else if (w === 'juta') { current *= 1000000; total += current; current = 0; }
      else current = val;
    }
    total += current;
  }
  return total;
}

/** "8 Juni - 8 Juli 2026" → { start: Date, end: Date } */
function parsePeriod(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[–—\-]/g, '-').replace(/\s+/g, ' ').trim();
  // Pattern: "8 Juni - 8 Juli 2026"
  const m1 = cleaned.match(/^(\d{1,2})\s+(\w+)\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (m1) return {
    start: parseDate(`${m1[1]} ${m1[2]} ${m1[5]}`),
    end: parseDate(`${m1[3]} ${m1[4]} ${m1[5]}`),
  };
  // Pattern: "8 Juni - 15 Juni 2026"
  const m2 = cleaned.match(/^(\d{1,2})\s+(\w+)\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  // Pattern: "5 Feb - Mar 2026"
  const m3 = cleaned.match(/^(\d{1,2})\s+(\w+)\s*-\s*(\w+)\s+(\d{4})$/i);
  if (m3) return {
    start: parseDate(`${m3[1]} ${m3[2]} ${m3[4]}`),
    end: parseDate(`1 ${m3[3]} ${m3[4]}`),
  };
  // Pattern: "1 Febuari - 1 Maret 2026" (typo)
  const m4 = cleaned.match(/^(\d{1,2})\s+(\w+)\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (m4) return {
    start: parseDate(`${m4[1]} ${m4[2]} ${m4[5]}`),
    end: parseDate(`${m4[3]} ${m4[4]} ${m4[5]}`),
  };
  // Pattern: "1 Feb - 1 Mar 2026"
  const m5 = cleaned.match(/^(\d{1,2})\s+(\w+)\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (m5) return {
    start: parseDate(`${m5[1]} ${m5[2]} ${m5[5]}`),
    end: parseDate(`${m5[3]} ${m5[4]} ${m5[5]}`),
  };
  return null;
}

const MONTHS_ID = {
  'januari':0,'februari':0,'feb':0,'maret':2,'mar':2,'april':3,'apr':3,
  'mei':4,'may':4,'juni':5,'jun':5,'juli':6,'jul':6,'agustus':7,'agt':7,'aug':7,
  'september':8,'sep':8,'oktober':9,'okt':9,'oct':9,'november':10,'nov':10,
  'desember':11,'des':11,'dec':11
};
function parseDate(s) {
  if (!s) return null;
  const orig = String(s).trim();
  // ISO format: "2026-06-22"
  const isoMatch = orig.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  // Text format: "22 Juni 2026"
  s = orig.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const parts = s.split(/\s+/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = MONTHS_ID[parts[1].toLowerCase()];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

/** Normalize room code: "F1", "Kapsul F1", "i"→"I", "Kapsul"→null */
function normalizeRoom(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toUpperCase();
  // Remove prefixes
  s = s.replace(/^KAMAR\s+/i, '').replace(/^KAPSUL\s*/i, '').replace(/^CAPSULE\s*/i, '');
  // "F1 KAPSUL" → "F1"
  s = s.replace(/\s+KAPSUL/i, '');
  // "Capsule (F1-4)" / "(F1-4)" → extract first room code "F1"
  const capsuleRange = s.match(/\(?\s*(F\d)\s*[-–]\s*\d+\s*\)?/);
  if (capsuleRange) s = capsuleRange[1];
  // "F1(Bawah)" → "F1"
  s = s.replace(/\(.*\)/, '');
  s = s.trim();
  // "A (KIPAS)" → "A"
  s = s.replace(/\s+\(.*/, '');
  // "J NON AC" → "J"
  s = s.replace(/\s+NON\s+AC/i, '');
  // "A & G" → null (multi-room)
  if (s.includes('&') || s.includes(',')) return null;
  // Empty after cleanup
  if (!s || s === '-' || s === 'KAPSUL' || s === 'CAPSULE') return null;
  return s;
}

/** Group tenant names by NIK → canonical name */
function buildNIKIndex(rows) {
  const map = new Map(); // NIK → { names: Set, phones: Set, emails: Set }
  for (const r of rows) {
    const nik = cleanNIK(r.nik);
    if (!nik) continue;
    if (!map.has(nik)) map.set(nik, { names: new Set(), phones: new Set(), emails: new Set() });
    const entry = map.get(nik);
    if (r.name) entry.names.add(r.name.trim());
    if (r.phone) entry.phones.add(r.phone.trim());
    if (r.email) entry.emails.add(r.email.trim());
  }
  return map;
}

function cleanNIK(nik) {
  if (!nik) return null;
  let s = String(nik).replace(/[^0-9]/g, '');
  if (s.length === 16) return s;
  return null;
}

function cleanPhone(phone) {
  if (!phone) return null;
  let s = String(phone).replace(/[^0-9+]/g, '');
  // "+62 822-30..." → "082230..."
  if (s.startsWith('+62')) s = '0' + s.slice(3);
  if (s.startsWith('62') && s.length > 10) s = '0' + s.slice(2);
  // Truncated: "0822-30..." skip
  if (s.includes('...') || s.includes('…')) return null;
  // Must be 10-13 digits
  if (s.length < 10 || s.length > 13) return null;
  return s;
}

function cleanEmail(email) {
  if (!email) return null;
  let s = String(email).trim().toLowerCase();
  if (s === '-' || s === '' || s.includes('...') || s.includes('…')) return null;
  if (!s.includes('@') && s.length < 5) return null;
  return s;
}

// ============================================================================
// SHEET 1: Master Data Kwitansi → receipts
// ============================================================================
function parseKwitansi(wb) {
  const ws = wb.Sheets['Master Data Kwitansi'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  
  const headers = raw[0].map(h => String(h || '').trim());
  const receipts = [];
  
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    
    const name = String(row[0] || '').trim();
    const nik = cleanNIK(row[1]);
    const roomRaw = String(row[2] || '').trim();
    const room = normalizeRoom(roomRaw);
    const period = parsePeriod(row[3]);
    const paymentDate = parseDate(row[4]);
    const nominal = parseRupiah(row[5]);
    const kwhRaw = String(row[6] || '').trim();
    const kwh = (kwhRaw === '-' || kwhRaw === '' || kwhRaw === '0' || kwhRaw === '??') ? null : parseInt(kwhRaw, 10);
    const notes = String(row[7] || '').trim();
    
    // Extract WiFi fee from notes
    let wifiFee = 0;
    const wifiMatch = notes.match(/wifi\s*(?:rp?\s*)?(\d{2,3})\s*rb/i);
    if (wifiMatch) wifiFee = parseInt(wifiMatch[1], 10) * 1000;
    const wifiMatch2 = notes.match(/wifi\s*(?:ro|rn|so)?\s*(?:rp?\s*)?(\d{2,3})\s*rb/i);
    if (wifiMatch2 && !wifiFee) wifiFee = parseInt(wifiMatch2[1], 10) * 1000;
    
    // Extract electricity fee from notes
    let electricityFee = 0;
    const elecMatch = notes.match(/2500[=\- ]*rp[.\s]*([0-9,.]+)/i);
    if (elecMatch) electricityFee = parseRupiah(elecMatch[1]);
    const elecMatch2 = notes.match(/listrik\s*(?:rp?\s*)?([0-9,.]+)/i);
    if (elecMatch2 && !electricityFee) electricityFee = parseRupiah(elecMatch2[1]);
    
    // Extract deposit
    let deposit = 0;
    const depositMatch = notes.match(/deposit\s*(?:rp?\s*)?([0-9,.]+)/i);
    if (depositMatch) deposit = parseRupiah(depositMatch[1]);
    if (name.includes('Deposit') || roomRaw.toLowerCase().includes('deposit')) deposit = nominal;
    
    // Extract discount
    let discount = 0;
    const discMatch = notes.match(/diskon\s*(?:rp?\s*)?([0-9,.]+)/i);
    if (discMatch) discount = parseRupiah(discMatch[1]);
    
    receipts.push({
      name, nik, roomRaw, room, period, paymentDate,
      nominal, kwh, notes,
      wifiFee, electricityFee, deposit, discount,
      isDeposit: roomRaw.toLowerCase().includes('deposit') || name.includes('Deposit') || notes.toLowerCase().includes('deposit'),
      row: i + 1,
    });
  }
  
  return receipts;
}

// ============================================================================
// SHEET 2: Data Tenant Terkini → current tenants
// ============================================================================
function parseTenantTerkini(wb) {
  const ws = wb.Sheets['Data Tenant Terkini'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  
  const tenants = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    
    const phone = cleanPhone(row[0]);
    const depositRaw = String(row[1] || '').trim();
    const hasDeposit = depositRaw.toLowerCase().includes('deposit') && !depositRaw.toLowerCase().includes('tidak');
    const depositAmount = hasDeposit ? parseRupiah(depositRaw.replace(/deposit\s*/i, '')) || 200000 : 0;
    const email = cleanEmail(row[2]);
    const entryDay = parseInt(String(row[3] || '0'), 10) || null;
    const room = normalizeRoom(row[4]);
    const name = String(row[5] || '').trim();
    const nik = cleanNIK(row[6]);
    const priceWord = String(row[7] || '').trim();
    const price = parseWordRupiah(priceWord) || parseRupiah(priceWord);
    
    tenants.push({ phone, hasDeposit, depositAmount, email, entryDay, room, name, nik, price, row: i + 1 });
  }
  return tenants;
}

// ============================================================================
// SHEET 3: Master Rekap Laporan Bulanan → monthly summaries
// ============================================================================
function parseRekapBulanan(wb) {
  const ws = wb.Sheets['Master Rekap Laporan Bulanan'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  
  const rekap = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    
    const monthYear = String(row[0] || '').trim(); // "Mei 2025"
    const room = normalizeRoom(row[1]);
    const name = String(row[2] || '').trim();
    const tarif = parseRupiah(row[3]);
    const listrik = parseRupiah(row[4]);
    const wifi = parseRupiah(row[5]);
    const total = parseRupiah(row[6]);
    
    rekap.push({ monthYear, room, name, tarif, listrik, wifi, total, row: i + 1 });
  }
  return rekap;
}

// ============================================================================
// SHEET 4: Master Pengeluaran → monthly expenses 2025
// ============================================================================
function parsePengeluaran(wb) {
  const ws = wb.Sheets['Master Pengeluaran'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  
  const expenses = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    
    const monthYear = String(row[0] || '').trim();
    const category = String(row[1] || '').trim();
    const amount = parseRupiah(row[2]);
    const notes = String(row[3] || '').trim();
    
    expenses.push({ monthYear, category, amount, notes, row: i + 1 });
  }
  return expenses;
}

// ============================================================================
// SHEET 5: Detail Pengeluaran Tahunan → yearly expense details 2021-2025
// ============================================================================
function parsePengeluaranTahunan(wb) {
  const ws = wb.Sheets['Detail Pengeluaran Tahunan'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return [];
  
  const expenses = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    
    const year = parseInt(String(row[0] || '0'), 10) || null;
    const month = String(row[1] || '').trim();
    const item = String(row[2] || '').trim();
    const amount = parseRupiah(row[3]);
    const category = String(row[4] || '').trim();
    
    expenses.push({ year, month, item, amount, category, row: i + 1 });
  }
  return expenses;
}

// ============================================================================
// MAIN
// ============================================================================
console.log('📖 Membaca Excel:', EXCEL);
const wb = XLSX.readFile(EXCEL);

const kwitansi = parseKwitansi(wb);
const tenantTerkini = parseTenantTerkini(wb);
const rekapBulanan = parseRekapBulanan(wb);
const pengeluaran = parsePengeluaran(wb);
const pengeluaranTahunan = parsePengeluaranTahunan(wb);

// Build NIK index for tenant grouping
const nikIndex = buildNIKIndex(kwitansi);

// Build output
const output = {
  _meta: {
    generatedAt: new Date().toISOString(),
    source: 'Master_Database_Kost_48_Lengkap_Terkini.xlsx',
    counts: {
      kwitansi: kwitansi.length,
      tenantTerkini: tenantTerkini.length,
      rekapBulanan: rekapBulanan.length,
      pengeluaran: pengeluaran.length,
      pengeluaranTahunan: pengeluaranTahunan.length,
    },
  },
  // All unique tenants from kwitansi + data tenant terkini
  tenants: buildTenantList(kwitansi, tenantTerkini, nikIndex),
  // All receipts
  receipts: kwitansi,
  // Monthly summaries
  rekapBulanan,
  // Expenses
  pengeluaran,
  pengeluaranTahunan,
};

function buildTenantList(kwitansi, tenantTerkini, nikIndex) {
  const tenantMap = new Map(); // NIK → tenant info
  
  // First pass: from kwitansi
  for (const k of kwitansi) {
    const nik = k.nik;
    if (!nik) continue;
    if (!tenantMap.has(nik)) {
      const ni = nikIndex.get(nik);
      tenantMap.set(nik, {
        nik,
        names: ni ? [...ni.names] : [k.name],
        phones: ni ? [...ni.phones].filter(p => cleanPhone(p)) : [cleanPhone(k.name === k.name ? '' : '')].filter(Boolean),
        emails: ni ? [...ni.emails].filter(e => cleanEmail(e)) : [],
      });
    }
  }
  
  // Second pass: from tenant terkini (overrides)
  for (const t of tenantTerkini) {
    const nik = t.nik;
    if (!nik) continue;
    const existing = tenantMap.get(nik);
    if (existing) {
      existing.price = t.price;
      existing.room = t.room;
      existing.isActive = true;
      existing.entryDay = t.entryDay;
      existing.hasDeposit = t.hasDeposit;
      existing.depositAmount = t.depositAmount;
      if (t.email) existing.emails = [...new Set([...existing.emails, t.email])];
      if (t.phone) existing.phones = [...new Set([...existing.phones, t.phone])];
    } else {
      tenantMap.set(nik, {
        nik,
        names: [t.name],
        phones: t.phone ? [t.phone] : [],
        emails: t.email ? [t.email] : [],
        price: t.price,
        room: t.room,
        isActive: true,
        entryDay: t.entryDay,
        hasDeposit: t.hasDeposit,
        depositAmount: t.depositAmount,
      });
    }
  }
  
  return [...tenantMap.values()];
}

writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf-8');
console.log('✅ Parsing selesai. Output:', OUT);
console.log(`   Kwitansi: ${kwitansi.length} | Tenant Terkini: ${tenantTerkini.length} | Rekap: ${rekapBulanan.length} | Pengeluaran: ${pengeluaran.length} | Pengeluaran Tahunan: ${pengeluaranTahunan.length}`);
console.log(`   Unique tenants: ${output.tenants.length}`);
