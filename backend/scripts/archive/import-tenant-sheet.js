/*
 * IMPORT TENANT SHEET → DATABASE
 * ==============================
 * Baca CSV export dari Google Sheet DATA_TENANT_KOST48 → update Tenant + create User (portal access).
 *
 * PRASYARAT:
 *   - Backend up & running (API_BASE, default http://localhost:3000/api)
 *   - seed-prod.js sudah dijalankan (kamar + tenant + NIK ada di DB)
 *   - CSV dari Google Sheet (14 kolom: roomCode,fullName,identityNumber,email,phone,occupation,
 *     companyOrCampus,birthDate,gender,originProvince,emergencyContactName,emergencyContactPhone,
 *     howDidYouHear,notes)
 *
 * PAKAI:
 *   node scripts/archive/import-tenant-sheet.js tenant-data.csv
 *   (opsional) API_BASE=http://localhost:3000/api node scripts/archive/import-tenant-sheet.js tenant-data.csv
 *
 * YANG DILAKUKAN:
 *   1. Baca CSV → cari tenant by identityNumber (NIK)
 *   2. Update Tenant: email, phone, occupation, birthDate, gender, originProvince, emergency contact,
 *      companyOrCampus, howDidYouHear, notes
 *   3. Create User (role TENANT) dengan email + password auto-generated
 *   4. Print daftar kredensial (email + password) → copy-paste ke WhatsApp
 */

const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3000/api';
const OWNER = {
  identifier: (process.env.OWNER_EMAIL || 'liem.lui@gmail.com').trim(),
  password: process.env.OWNER_PASSWORD || '',
};
if (!OWNER.password || OWNER.password.length < 8) {
  console.error('❌ OWNER_PASSWORD wajib diisi (min 8 karakter) — jangan pakai password default/contoh.');
  process.exit(1);
}
const PASSWORD_LENGTH = 10;

let TOKEN = '';

function generatePassword(len = PASSWORD_LENGTH) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusable chars
  const rand = new Uint32Array(len);
  require('crypto').randomFillSync(rand);
  return Array.from(rand, (r) => chars[r % chars.length]).join('');
}

async function api(method, path, body, { token = null, optional = false } = {}) {
  const tok = token ?? TOKEN;
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const msg = `${method} ${path} → ${res.status} ${JSON.stringify(j?.message ?? j)}`;
    if (optional) { console.warn('   ⚠️  (lewati) ' + msg); return null; }
    throw new Error(msg);
  }
  return j?.data ?? j;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginAs(identifier, password) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await api('POST', '/auth/login', { identifier, password }, { token: '' });
      const tok = r?.accessToken ?? null;
      if (tok) return tok;
    } catch (err) {
      if (String(err?.message ?? '').includes('429') && attempt < 3) {
        console.log(`   ⏳ Rate limit login — menunggu 5,5 menit (percobaan ${attempt}/3)...`);
        await sleep(5.5 * 60 * 1000);
        continue;
      }
      throw err;
    }
  }
  return null;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV kosong atau hanya header');
  const headers = lines[0].split('\t'); // Google Sheets export pakai tab separator
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (cols[j] || '').trim();
    }
    if (row.identityNumber && row.fullName) rows.push(row);
  }
  return rows;
}

function maskNik(nik) {
  const s = String(nik);
  if (s.length < 8) return s;
  return s.slice(0, 4) + '****' + s.slice(-4);
}

(async () => {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error('PAKAI: node scripts/archive/import-tenant-sheet.js tenant-data.csv');
    process.exit(1);
  }
  if (!fs.existsSync(csvFile)) {
    console.error('File tidak ditemukan: ' + csvFile);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCsv(csvText);
  console.log(`=== IMPORT TENANT CSV → DATABASE ===\nFile: ${csvFile}\nBaris: ${rows.length} tenant\n`);

  // Login
  TOKEN = await loginAs(OWNER.identifier, OWNER.password);
  if (!TOKEN) throw new Error('Login owner gagal.');
  console.log('✓ Login OWNER\n');

  // Ambil daftar tenant existing dari API (by identityNumber)
  const allTenants = await api('GET', '/tenants?limit=100');
  const tenantByNik = {};
  for (const t of (allTenants?.items ?? allTenants ?? [])) {
    if (t.identityNumber) tenantByNik[t.identityNumber] = t;
  }
  console.log(`✓ ${Object.keys(tenantByNik).length} tenant existing di DB\n`);

  // Proses setiap baris CSV
  const results = [];
  let updated = 0;
  let accountsCreated = 0;

  for (const row of rows) {
    const nik = row.identityNumber;
    const existing = tenantByNik[nik];

    if (!existing) {
      console.warn(`⚠️  NIK ${maskNik(nik)} (${row.fullName}) — TIDAK DITEMUKAN di DB. Skip.`);
      results.push({ name: row.fullName, nik: maskNik(nik), status: 'SKIP — tidak ditemukan' });
      continue;
    }

    // Validasi nama cocok
    if (existing.fullName.toLowerCase() !== row.fullName.toLowerCase()) {
      console.warn(`⚠️  Nama tidak cocok: CSV="${row.fullName}" vs DB="${existing.fullName}". Skip.`);
      results.push({ name: row.fullName, nik: maskNik(nik), status: 'SKIP — nama tidak cocok' });
      continue;
    }

    // Validasi email diisi
    const email = row.email;
    if (!email || !email.includes('@')) {
      console.warn(`⚠️  ${row.fullName} — email kosong/invalid: "${email}". Skip.`);
      results.push({ name: row.fullName, nik: maskNik(nik), status: 'SKIP — email kosong' });
      continue;
    }

    // Update Tenant — semua field yang diisi
    const updatePayload = {};
    if (email) updatePayload.email = email;
    if (row.phone) updatePayload.phone = row.phone;
    if (row.occupation) updatePayload.occupation = row.occupation;
    if (row.companyOrCampus) updatePayload.companyOrCampus = row.companyOrCampus;
    if (row.birthDate) {
      const parts = row.birthDate.split('-');
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (d && m && y) updatePayload.birthDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T00:00:00.000Z`;
      }
    }
    if (row.gender) updatePayload.gender = row.gender === 'Laki-laki' ? 'MALE' : row.gender === 'Perempuan' ? 'FEMALE' : undefined;
    if (row.originProvince) updatePayload.originProvince = row.originProvince;
    if (row.emergencyContactName) updatePayload.emergencyContactName = row.emergencyContactName;
    if (row.emergencyContactPhone) updatePayload.emergencyContactPhone = row.emergencyContactPhone;
    if (row.howDidYouHear) {
      const sourceMap = { 'Teman/Keluarga': 'FRIEND_REFERRAL', 'Google Search': 'GOOGLE_SEARCH', 'Instagram/Facebook': 'INSTAGRAM', 'Google Maps': 'GOOGLE_MAPS', 'Lainnya': 'OTHER' };
      updatePayload.howDidYouHear = sourceMap[row.howDidYouHear] || row.howDidYouHear;
    }
    if (row.notes) updatePayload.notes = row.notes;

    try {
      await api('PATCH', `/tenants/${existing.id}`, updatePayload);
      updated++;
      console.log(`✓ ${row.fullName} (${maskNik(nik)}) — tenant updated`);
    } catch (err) {
      console.warn(`⚠️  ${row.fullName} — gagal update tenant: ${err.message}`);
    }

    // Create User (portal access) — jika belum ada
    const existingUser = await api('GET', `/tenants/${existing.id}/portal-access`, {}, { optional: true });
    const password = generatePassword();

    if (!existingUser || !existingUser.email) {
      try {
        await api('POST', `/tenants/${existing.id}/portal-access`, {
          email: email,
          password: password,
          fullName: row.fullName,
        });
        accountsCreated++;
        results.push({
          name: row.fullName,
          room: row.roomCode,
          email: email,
          password: password,
          status: 'BARU — akun dibuat',
        });
        console.log(`   🔑 Akun portal DIBUAT: ${email}`);
      } catch (err) {
        results.push({
          name: row.fullName,
          room: row.roomCode,
          email: email,
          password: '(gagal)',
          status: 'GAGAL buat akun',
        });
        console.warn(`   ⚠️  Gagal buat akun: ${err.message}`);
      }
    } else {
      results.push({
        name: row.fullName,
        room: row.roomCode,
        email: email,
        password: '(sudah ada)',
        status: 'SUDAH PUNYA akun',
      });
      console.log(`   ℹ️  Akun sudah ada: ${existingUser.email}`);
    }

    // Jeda kecil antar request
    await sleep(200);
  }

  // ── RINGKASAN ──
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  IMPORT SELESAI                                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Tenant updated : ${updated}/${rows.length}`);
  console.log(`  Akun baru      : ${accountsCreated}`);
  console.log('');

  console.log('📋 DAFTAR KREDENSIAL — Kirim ke tenant via WhatsApp:');
  console.log('────────────────────────────────────────────────────');
  for (const r of results) {
    if (r.status === 'BARU — akun dibuat') {
      console.log(`\n${r.name} (Kamar ${r.room})`);
      console.log(`  Email    : ${r.email}`);
      console.log(`  Password : ${r.password}`);
      console.log(`  Login di : https://[domain]/login (tab "Penghuni")`);
    }
  }

  console.log('\n📱 TEMPLATE WHATSAPP:');
  console.log('────────────────────────────────────────────────────');
  console.log('Halo Kak [Nama], akun portal KOST48 kamu sudah siap! 🎉');
  console.log('');
  console.log('🌐 Login di: https://[domain]/login');
  console.log('📧 Email: [email]');
  console.log('🔑 Password: [password]');
  console.log('');
  console.log('Di portal kamu bisa:');
  console.log('  ✅ Lihat status sewa & tagihan');
  console.log('  ✅ Bayar & upload bukti transfer');
  console.log('  ✅ Lapor kerusakan / masalah');
  console.log('  ✅ Pantau pemakaian listrik (kWh meter)');
  console.log('  ✅ Baca pengumuman & aturan kos');
  console.log('');
  console.log('Password bisa diganti sendiri setelah login ya. 🙏');
})();
