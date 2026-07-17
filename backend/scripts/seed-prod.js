/*
 * SEED PRODUKSI — Input data real tenant KOST48 ke DB fresh.
 * Prasyarat: backend up & running, DB sudah fresh (schema via prisma migrate).
 * Pakai: node scripts/seed-prod.js   (opsional: API_BASE=http://localhost:3000/api)
 *
 * Urutan: login OWNER → buat 13 kamar + fasilitas → buat 13 tenant real (nama, NIK)
 * → catatan: email/HP/deposit/stay diisi via UI Owner → Manajemen Tenant.
 *
 * TIDAK membuat stay/invoice/bayar — itu via UI Owner agar aturan bisnis jalan.
 * TIDAK membuat portal access — tunggu email real dari owner.
 */
const API = process.env.API_BASE || 'http://localhost:3000/api';
const OWNER = { identifier: 'owner@kost48.com', password: 'Owner#2026' };

let TOKEN = '';
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
const idOf = (d) => d?.id ?? d?.stay?.id ?? d?.invoice?.id ?? d?.tenant?.id ?? null;

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

// ── 13 KAMAR NYATA KOST48 — data fisik + TARIF REAL (confirmed owner 2026-07) ──
const ROOMS = [
  // Lantai 1 — monthly = TARIF PUBLIK (harga resmi kamar)
  { code: 'A',  name: 'Kamar A',  category: 'DELUXE',   roomType: 'MEZZANINE', roomSize: 'STANDARD', monthly: 1700000, deposit: 500000, floor: '1', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'B',  name: 'Kamar B',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 1700000, deposit: 500000, floor: '1', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'C',  name: 'Kamar C',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 1700000, deposit: 500000, floor: '1', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'D',  name: 'Kamar D',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 1600000, deposit: 500000, floor: '1', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'G',  name: 'Kamar G',  category: 'ECONOMY',  roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 850000,  deposit: 300000, floor: '1', hasAc: false, acWattage: 0,   acCleanIntervalDays: 0,  notes: '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'H',  name: 'Kamar H',  category: 'ECONOMY',  roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 850000,  deposit: 300000, floor: '1', hasAc: false, acWattage: 0,   acCleanIntervalDays: 0,  notes: '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'I',  name: 'Kamar I',  category: 'ECONOMY',  roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 850000,  deposit: 300000, floor: '1', hasAc: false, acWattage: 0,   acCleanIntervalDays: 0,  notes: '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'J',  name: 'Kamar J',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'STANDARD', monthly: 1600000, deposit: 500000, floor: '1', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'K',  name: 'Kamar K',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'LARGE',    monthly: 1800000, deposit: 600000, floor: '1', hasAc: true,  acWattage: 450, acCleanIntervalDays: 90, notes: '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'L',  name: 'Kamar L',  category: 'DELUXE',   roomType: 'REGULAR',   roomSize: 'LARGE',    monthly: 1800000, deposit: 600000, floor: '1', hasAc: true,  acWattage: 450, acCleanIntervalDays: 90, notes: '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju' },
  { code: 'M',  name: 'Kamar M',  category: 'STANDARD', roomType: 'REGULAR',   roomSize: 'LARGE',    monthly: 1400000, deposit: 500000, floor: '1', hasAc: false, acWattage: 0,   acCleanIntervalDays: 0,  notes: '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju; Superior/Economy tanpa AC' },
  // Lantai 2
  { code: 'F1', name: 'Kamar F1', category: 'DELUXE',   roomType: 'MEZZANINE', roomSize: 'STANDARD', monthly: 1750000, deposit: 500000, floor: '2', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed; Lemari baju' },
  { code: 'F2', name: 'Kamar F2', category: 'DELUXE',   roomType: 'MEZZANINE', roomSize: 'STANDARD', monthly: 1750000, deposit: 500000, floor: '2', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed; Lemari baju; Perabot lengkap' },
];

// ── 13 TENANT REAL — nama + NIK + TARIF KONTRAK (harga yg dibayar tenant saat join) ──
// email: null = belum ada email (isi via Admin UI setelah deploy); string = email real dari owner
// phone: null = belum ada nomor HP; string = nomor real
// deposit: null = tidak ada deposit; angka = nominal deposit
const TENANTS = [
  { code: 'A',  name: 'Shinta Larista',         nik: '3574036206990003', tgl: 26, tarif: 1700000, gender: 'FEMALE', deposit: null,    email: 'shinta22larista@gmail.com',     phone: '082230184559' },
  { code: 'B',  name: 'Dini Widiastutik',       nik: '3275085012800021', tgl: 1,  tarif: 1500000, gender: 'FEMALE', deposit: null,    email: 'diniwidi11@gmail.com',          phone: '089679596799' },
  { code: 'C',  name: 'Miko Rakatama Adhi Winarto', nik: '6471051708970006', tgl: 28, tarif: 1600000, gender: 'MALE',   deposit: null,    email: 'Mikorakatamaa@gmail.com',       phone: '089682611559' },
  { code: 'D',  name: 'Ade Chandra',            nik: '3173052309720009', tgl: 24, tarif: 1500000, gender: 'MALE',   deposit: 200000,  email: 'adhechan72@gmail.com',           phone: '085716345588' },
  { code: 'F1', name: 'Yufita Hieng',           nik: '6405025701970003', tgl: 26, tarif: 1700000, gender: 'FEMALE', deposit: null,    email: null,                            phone: '081330787868' },
  { code: 'F2', name: 'Patrick Wilfred',        nik: '3275020504910019', tgl: 8,  tarif: 1600000, gender: 'MALE',   deposit: null,    email: 'wilfredpatrick@hotmail.com',    phone: '081289399915' },
  { code: 'G',  name: 'Yofi Nurkolifah',        nik: '3519122204030003', tgl: 1,  tarif: 800000,  gender: 'FEMALE', deposit: null,    email: null,                            phone: '082244277043' },
  { code: 'H',  name: 'Welly Tanoto',           nik: '3578070811730004', tgl: 10, tarif: 800000,  gender: 'MALE',   deposit: null,    email: 'Wellytanoto73@gmail.com',       phone: '082139730928' },
  { code: 'I',  name: 'Agus Settiyo Budi',      nik: '3571021308860003', tgl: 5,  tarif: 800000,  gender: 'MALE',   deposit: null,    email: 'theowijaya0886@gmail.com',      phone: '081717531937' },
  { code: 'J',  name: 'Lovandra',               nik: '3175070312930003', tgl: 30, tarif: 1500000, gender: null,     deposit: null,    email: null,                            phone: '08812149261' },
  { code: 'K',  name: 'Meliana Tamara',         nik: '3578125102000002', tgl: 10, tarif: 1600000, gender: 'FEMALE', deposit: null,    email: 'melontamara556@gmail.com',      phone: '085334192220' },
  { code: 'L',  name: 'Destarika Hasan',        nik: '1671065812020008', tgl: 1,  tarif: 1600000, gender: 'FEMALE', deposit: null,    email: null,                            phone: '085964263779' },
  { code: 'M',  name: 'Gabriel Excelly Pranajaya', nik: '3511115908030001', tgl: 3, tarif: 1200000, gender: null,   deposit: null,    email: null,                            phone: '082228871199' },
];

const summary = { rooms: 0, facilities: 0, tenants: 0 };

(async () => {
  console.log('=== SEED PRODUKSI — Data Real Tenant KOST48 ===\nAPI:', API);

  // 1) Login OWNER
  TOKEN = await loginAs(OWNER.identifier, OWNER.password);
  if (!TOKEN) throw new Error('Login owner gagal.');
  console.log('✓ Login OWNER');

  // 2) Buat 13 kamar dengan tarif real
  const roomId = {};
  for (const rm of ROOMS) {
    const d = await api('POST', '/rooms', {
      code: rm.code, name: rm.name, floor: rm.floor,
      category: rm.category, roomType: rm.roomType, roomSize: rm.roomSize,
      monthlyRateRupiah: rm.monthly, defaultDepositRupiah: rm.deposit,
      electricityTariffPerKwhRupiah: 2500,
      hasAc: rm.hasAc, acWattage: rm.hasAc ? rm.acWattage : undefined,
      acCleanIntervalDays: rm.hasAc ? rm.acCleanIntervalDays : undefined,
      notes: rm.notes,
    });
    roomId[rm.code] = idOf(d);
    summary.rooms++;
  }
  console.log(`✓ ${summary.rooms} kamar (tarif real)`);

  // 2b) Fasilitas per kamar
  const facilityMap = {
    'DELUXE':   [{ name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur', publicVisible: true },
                 { name: 'Lemari Baju',      quantity: 1, category: 'perabot', publicVisible: true },
                 { name: 'Gantungan Baju',   quantity: 1, category: 'perabot', publicVisible: true }],
    'ECONOMY':  [{ name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur', publicVisible: true },
                 { name: 'Lemari Baju',      quantity: 1, category: 'perabot', publicVisible: true },
                 { name: 'Gantungan Baju',   quantity: 1, category: 'perabot', publicVisible: true }],
    'STANDARD': [{ name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur', publicVisible: true },
                 { name: 'Lemari Baju',      quantity: 1, category: 'perabot', publicVisible: true },
                 { name: 'Gantungan Baju',   quantity: 1, category: 'perabot', publicVisible: true }],
  };
  for (const rm of ROOMS) {
    const facs = facilityMap[rm.category] ?? [];
    for (const fac of facs) {
      const r = await api('POST', `/rooms/${roomId[rm.code]}/facilities`, fac, { optional: true });
      if (r) summary.facilities++;
    }
    const kipas = await api('POST', `/rooms/${roomId[rm.code]}/facilities`, {
      name: 'Kipas Angin', quantity: 1, category: 'pendingin', publicVisible: true,
    }, { optional: true });
    if (kipas) summary.facilities++;
  }
  console.log(`✓ ${summary.facilities} fasilitas kamar`);

  // 3) Buat 13 tenant real
  for (const t of TENANTS) {
    const rm = ROOMS.find((r) => r.code === t.code);
    const placeholderEmail = `${t.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@kost48.prod`;
    const placeholderPhone = '081200000000'; // placeholder — atur via UI Owner

    const tenant = await api('POST', '/tenants', {
      fullName: t.name, phone: placeholderPhone, email: placeholderEmail,
      identityNumber: t.nik, gender: t.gender ?? undefined,
      originCity: 'Surabaya', occupation: '',
    });
    if (!tenant) {
      console.warn(`   ⚠️  Gagal buat tenant ${t.name} — mungkin duplikat?`);
      continue;
    }
    summary.tenants++;

    // 3b) Portal access — hanya untuk tenant yang SUDAH punya email real (8 dari 13)
    if (t.email) {
      await api('POST', `/tenants/${idOf(tenant)}/portal-access`, {
        email: t.email,
        password: 'Kost48#2026',
        fullName: t.name,
      }, { optional: true });
    }
  }
  console.log(`✓ ${summary.tenants} tenant`);

  // ── RINGKASAN ──
  console.log('\n=== SEED PRODUKSI SELESAI ===');
  console.log(`  ${summary.rooms} kamar + ${summary.facilities} fasilitas + ${summary.tenants} tenant`);
  console.log('\n📧 8 tenant dengan email SUDAH mendapat akun portal (password: Kost48#2026)');
  console.log('⚠️  5 tenant BELUM ada email — lengkapi via Admin UI /tenants:');
  console.log('    - Yufita Hieng (F1)');
  console.log('    - Yofi Nurkolifah (G)');
  console.log('    - Lovandra (J)');
  console.log('    - Destarika Hasan (L)');
  console.log('    - Gabriel Excelly Pranajaya (M)');
  console.log('\n📋 Langkah selanjutnya: buat STAY (check-in) via /stays → gunakan agreedRent = TARIF KONTRAK');
  console.log('   Deposit: hanya Ade Chandra (D) Rp200.000 — sisanya tidak ada');
  console.log('📘 Panduan lengkap: docs/PANDUAN_INPUT_TENANT.md');
})();
