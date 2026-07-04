/*
 * SI-1 — SEED DATA BISNIS via HTTP (event-path). Fase 2.
 * Owner: "dummy data dimasukkan lewat jalur satu per satu kejadian (push ke backend),
 * jangan by pass ke database." → SEMUA data bisnis dibuat dgn memanggil endpoint NYATA,
 * sehingga aturan bisnis (deposit, periode, promosi, invoice, jurnal) PASTI berlaku.
 *
 * Data kamar mencerminkan kondisi real KOST48 Surabaya (kost48surabaya.com):
 *   13 kamar: A, B, C, D, G, H, I, J, K, L, M, F1, F2
 *   (E, F, N, O, P, Q sudah tidak ada / dikonsolidasi ke F1/F2)
 *
 * Prasyarat: jalankan `node scripts/seed-dev-reset.js` dulu, lalu START backend dev.
 * Pakai: node scripts/seed-dev-via-api.js   (opsional: API_BASE=http://localhost:3000/api)
 *
 * Urutan kejadian per kamar berpenghuni:
 *   POST /tenants → POST /tenants/:id/portal-access → POST /stays (check-in, deposit, meter awal)
 *   → POST /invoices/create-with-lines-and-issue (sewa) → POST /invoice-payments (lunas/menunggak)
 *   + sebagian: POST /meter-readings/cycle, sebagian: POST /stays/:id/renew (riwayat perpanjang).
 */
const API = process.env.API_BASE || 'http://localhost:3000/api';
const OWNER = { identifier: 'owner@kost48.com', password: 'Owner#2026' };

let TOKEN = '';
async function api(method, path, body, { token = TOKEN, optional = false } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
const asList = (d) => (Array.isArray(d) ? d : (d?.items ?? d?.rows ?? d?.data ?? d?.results ?? []));

// Cache token per identifier → hindari login berulang.
// AJ-04: rate limit login (W-01) = 10 req / 5 menit per IP — seed butuh ~15 login.
// Saat kena 429, tunggu window-nya lewat lalu coba lagi (guard produksi TIDAK dilonggarkan).
const tokenCache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function loginAs(identifier, password) {
  if (tokenCache.has(identifier)) return tokenCache.get(identifier);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await api('POST', '/auth/login', { identifier, password }, { token: '' });
      const tok = r?.accessToken ?? null;
      if (tok) tokenCache.set(identifier, tok);
      return tok;
    } catch (err) {
      if (String(err?.message ?? '').includes('429') && attempt < 3) {
        console.log(`   ⏳ Rate limit login — menunggu 5,5 menit sebelum lanjut (percobaan ${attempt}/3)...`);
        await sleep(5.5 * 60 * 1000);
        continue;
      }
      throw err;
    }
  }
  return null;
}
// H11: toISOString() = UTC → bisa salah tanggal di WIB pagi. toLocaleDateString('en-CA') pakai timezone lokal.
const ymd = (d) => d.toLocaleDateString('en-CA');
// L14: setMonth overflow guard — set date ke 1 dulu agar 31 Jan + 1 bulan = 28 Feb, bukan 3 Mar.
const addMonths = (d, n) => { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ── 13 kamar nyata KOST48 Surabaya (data real dari kost48surabaya.com) ──────
// Semua kamar saat ini status PENUH (OCCUPIED). Tarif sesuai website.
const ROOMS = [
  // Lantai 1
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
  { code: 'M',  name: 'Kamar M',  category: 'STANDARD', roomType: 'REGULAR',   roomSize: 'LARGE',    monthly: 1400000, deposit: 500000, floor: '1', hasAc: false, acWattage: 0,   acCleanIntervalDays: 0,  notes: '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Lemari baju; Gantungan baju; Superior/Economy' },
  // Lantai 2
  { code: 'F1', name: 'Kamar F1', category: 'DELUXE',   roomType: 'MEZZANINE', roomSize: 'STANDARD', monthly: 1750000, deposit: 500000, floor: '2', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed; Lemari baju' },
  { code: 'F2', name: 'Kamar F2', category: 'DELUXE',   roomType: 'MEZZANINE', roomSize: 'STANDARD', monthly: 1750000, deposit: 500000, floor: '2', hasAc: true,  acWattage: 380, acCleanIntervalDays: 90, notes: '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed; Lemari baju; Perabot lengkap' },
];

// ── 13 dummy tenant (satu per kamar) dengan status bervariasi ───────────────
// Status dipilih untuk mendemonstrasikan berbagai kondisi bisnis:
//   paid       = stay aktif + invoice lunas
//   unpaid     = stay aktif + invoice bulan ke-2 BELUM bayar (menunggak)
//   partial    = stay aktif + baru masuk, invoice bulan ke-2 open penuh (no-partial D-02)
//   renew      = stay aktif + buat RenewRequest PENDING
//   checkoutH10= stay aktif + planOut = hari ini + 10 hari (mendekati keluar)
//   pet        = stay aktif + hasPet = true (demo konstanta pet deposit)
const TENANTS = [
  { code: 'A',  name: 'Maya Pratiwi',    slug: 'maya',   gender: 'FEMALE', occ: 'Karyawan',    scenario: 'paid',        monthsAgo: 2, occ2: 1 },
  { code: 'B',  name: 'Dimas Saputra',   slug: 'dimas',  gender: 'MALE',   occ: 'Mahasiswa',   scenario: 'renew',       monthsAgo: 3, occ2: 1 },
  { code: 'C',  name: 'Cindy Wijaya',    slug: 'cindy',  gender: 'FEMALE', occ: 'Karyawan',    scenario: 'pet',         monthsAgo: 2, occ2: 1 },
  { code: 'D',  name: 'Hendra Gunawan',  slug: 'hendra', gender: 'MALE',   occ: 'Karyawan',    scenario: 'paid',        monthsAgo: 1, occ2: 1 },
  { code: 'G',  name: 'Gita Lestari',    slug: 'gita',   gender: 'FEMALE', occ: 'Mahasiswa',   scenario: 'paid',        monthsAgo: 2, occ2: 1 },
  { code: 'H',  name: 'Indah Permata',   slug: 'indah',  gender: 'FEMALE', occ: 'Mahasiswa',   scenario: 'paid',        monthsAgo: 3, occ2: 2 }, // 2 orang
  { code: 'I',  name: 'Bayu Nugroho',    slug: 'bayu',   gender: 'MALE',   occ: 'Karyawan',    scenario: 'unpaid',      monthsAgo: 1, occ2: 1 },
  { code: 'J',  name: 'Karin Salsabila', slug: 'karin',  gender: 'FEMALE', occ: 'Mahasiswa',   scenario: 'paid',        monthsAgo: 2, occ2: 1 },
  { code: 'K',  name: 'Lani Kusuma',     slug: 'lani',   gender: 'FEMALE', occ: 'Karyawan',    scenario: 'checkoutH10', monthsAgo: 0, occ2: 1 }, // planOut = hari ini + 10
  { code: 'L',  name: 'Rizky Ramadhan',  slug: 'rizky',  gender: 'MALE',   occ: 'Mahasiswa',   scenario: 'paid',        monthsAgo: 1, occ2: 1 },
  { code: 'M',  name: 'Putri Anggraini', slug: 'putri',  gender: 'FEMALE', occ: 'Karyawan',    scenario: 'paid',        monthsAgo: 2, occ2: 1 },
  { code: 'F1', name: 'Fajar Maulana',   slug: 'fajar',  gender: 'MALE',   occ: 'Karyawan',    scenario: 'paid',        monthsAgo: 3, occ2: 1 },
  { code: 'F2', name: 'Sari Melati',     slug: 'sari',   gender: 'FEMALE', occ: 'Mahasiswa',   scenario: 'partial',     monthsAgo: 0, occ2: 1 }, // baru masuk
];

const TENANT_PW = 'Tenant#2026';
const METER_START_BASE = 1000;

const summary = {
  rooms: 0, facilities: 0, tenants: 0, onboarded: 0, stays: 0,
  paidFull: 0, unpaid: 0, partial: 0, meterInvoices: 0, meterFree: 0,
  tickets: 0, tipAcks: 0, surveys: 0, renewals: 0,
};

(async () => {
  console.log('=== SI-1 SEED via HTTP (Kamar Nyata KOST48) ===\nAPI:', API);

  // 1) Login OWNER — lewat loginAs agar ikut retry rate-limit (AJ-04)
  TOKEN = await loginAs(OWNER.identifier, OWNER.password);
  if (!TOKEN) throw new Error('Login owner gagal (token kosong).');
  console.log('✓ Login OWNER');

  // 2) Buat 13 kamar nyata via POST /rooms
  const roomId = {};
  for (const rm of ROOMS) {
    const d = await api('POST', '/rooms', {
      code: rm.code,
      name: rm.name,
      floor: rm.floor,
      category: rm.category,
      roomType: rm.roomType,
      roomSize: rm.roomSize,
      monthlyRateRupiah: rm.monthly,
      defaultDepositRupiah: rm.deposit,
      electricityTariffPerKwhRupiah: 2500, // tarif kWh sesuai konstanta operasional
      hasAc: rm.hasAc,
      acWattage: rm.hasAc ? rm.acWattage : undefined,
      acCleanIntervalDays: rm.hasAc ? rm.acCleanIntervalDays : undefined,
      notes: rm.notes,
    });
    roomId[rm.code] = idOf(d);
    summary.rooms++;
  }
  console.log(`✓ ${summary.rooms} kamar`);

  // 2b) Tambah fasilitas per kamar
  const facilityMap = {
    'DELUXE':   [
      { name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur',    publicVisible: true },
      { name: 'Lemari Baju',      quantity: 1, category: 'perabot',  publicVisible: true },
      { name: 'Gantungan Baju',   quantity: 1, category: 'perabot',  publicVisible: true },
    ],
    'ECONOMY':  [
      { name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur',    publicVisible: true },
      { name: 'Lemari Baju',      quantity: 1, category: 'perabot',  publicVisible: true },
      { name: 'Gantungan Baju',   quantity: 1, category: 'perabot',  publicVisible: true },
    ],
    'STANDARD': [
      { name: 'Kasur Busa Tebal', quantity: 1, category: 'tidur',    publicVisible: true },
      { name: 'Lemari Baju',      quantity: 1, category: 'perabot',  publicVisible: true },
      { name: 'Gantungan Baju',   quantity: 1, category: 'perabot',  publicVisible: true },
    ],
  };
  for (const rm of ROOMS) {
    const facs = facilityMap[rm.category] ?? [];
    for (const fac of facs) {
      const r = await api('POST', `/rooms/${roomId[rm.code]}/facilities`, fac, { optional: true });
      if (r) summary.facilities++;
    }
    // Tambah kipas di semua kamar
    const kipas = await api('POST', `/rooms/${roomId[rm.code]}/facilities`, {
      name: 'Kipas Angin', quantity: 1, category: 'pendingin', publicVisible: true,
    }, { optional: true });
    if (kipas) summary.facilities++;
  }
  console.log(`✓ ${summary.facilities} fasilitas kamar`);

  // 3) Per tenant: buat akun → portal access → check-in → invoice → bayar (sesuai skenario)
  const stays = [];
  // AJ-04: TODAY dinamis (dulu hardcode '2026-06-24' → seed langsung "menua": stay lewat
  // kontrak, tersapu AutoOps, meter ditolak). Anchor jam 12 siang lokal agar ymd() stabil WIB.
  const now = new Date();
  const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);

  for (let i = 0; i < TENANTS.length; i++) {
    const t = TENANTS[i];
    const rm = ROOMS.find((r) => r.code === t.code);
    const ktp  = '3578' + String(100000000001 + i).padStart(12, '0');
    const phone = '0812' + String(10000000 + i * 7).padStart(8, '0');
    const email = `${t.slug}.tenant@kost48.test`;

    // 3a) Buat tenant
    const tenant = await api('POST', '/tenants', {
      fullName: t.name, phone, email, identityNumber: ktp,
      gender: t.gender, originCity: 'Surabaya', occupation: t.occ,
    });
    const tenantId = idOf(tenant);
    summary.tenants++;

    // 3b) Akses portal
    await api('POST', `/tenants/${tenantId}/portal-access`, { email, password: TENANT_PW, fullName: t.name }, { optional: true });

    // 3c) Lengkapi profil onboarding
    const bd = new Date(Date.UTC(1993 + (i % 8), i % 12, (i % 27) + 1));
    const onb = await api('PATCH', `/tenants/${tenantId}`, {
      fullName: t.name, phone, identityNumber: ktp, gender: t.gender,
      originCity: 'Surabaya', occupation: t.occ,
      birthDate: ymd(bd),
      companyOrCampus: t.occ === 'Karyawan' ? 'PT Maju Jaya Surabaya' : 'Universitas Airlangga',
      emergencyContactName: `Orang Tua ${t.name.split(' ')[0]}`,
      emergencyContactPhone: '0813' + String(20000000 + i).padStart(8, '0'),
    }, { optional: true });
    if (onb) summary.onboarded++;

    // 3d) Hitung tanggal check-in & planOut sesuai skenario.
    // AJ-04: dulu checkIn = TODAY - monthsAgo BULAN → planOut sudah lewat → begitu sewa awal
    // lunas (AJ-03), StaySweep langsung meng-checkout otomatis (money-guard tak menahan lagi)
    // dan kamar jadi MAINTENANCE. Kini offset MINGGUAN agar kontrak masih berjalan; khusus
    // Bayu (unpaid) sengaja overdue + invoice ke-2 menunggak → money-guard menahan checkout
    // otomatis (persis skenario notifikasi C17).
    let checkIn, planOut;
    if (t.scenario === 'checkoutH10') {
      // Lani: H-10 dari hari ini. planOut = hari ini + 10 hari
      planOut   = addDays(TODAY, 10);
      checkIn   = addMonths(planOut, -1); // 1 bulan sebelum planOut
    } else if (t.scenario === 'partial') {
      // Sari (F2): baru masuk 2 minggu lalu
      checkIn   = addDays(TODAY, -14);
      planOut   = addMonths(checkIn, 1);
    } else if (t.scenario === 'unpaid') {
      // Bayu (I): kontrak lewat 10 hari + tagihan bulan ke-2 belum dibayar (menunggak nyata)
      checkIn   = addDays(TODAY, -40);
      planOut   = addMonths(checkIn, 1);
    } else {
      // Lainnya: masuk 1-3 MINGGU lalu → planOut masih di depan (stay aktif stabil ±1 bulan)
      checkIn   = addDays(TODAY, -7 * (t.monthsAgo || 1));
      planOut   = addMonths(checkIn, 1);
    }

    const elec0 = METER_START_BASE + i * 50;
    // AJ-03 (C10-02): deposit jaminan WAJIB terkumpul saat check-in untuk semua occupied.
    const depositCollected = true;

    // 3e) Check-in
    const stay = await api('POST', '/stays', {
      tenantId, roomId: roomId[t.code],
      pricingTerm: 'MONTHLY',
      agreedRentAmountRupiah: rm.monthly,
      checkInDate: ymd(checkIn),
      plannedCheckOutDate: ymd(planOut),
      depositCollected,
      bookingSource: i % 3 === 0 ? 'WALK_IN' : i % 3 === 1 ? 'WHATSAPP' : 'WEBSITE',
      stayPurpose: t.occ === 'Mahasiswa' ? 'STUDY' : 'WORK',
      initialElectricityKwh: String(elec0),
      initialWaterM3: String(20 + i),
    });
    const stayId = idOf(stay);
    stays.push({ stayId, code: t.code, monthly: rm.monthly, checkIn, planOut, elec0, tenantId, scenario: t.scenario, slug: t.slug });
    summary.stays++;

    // 3f) Ambil invoice auto-terbit → bayar sesuai skenario
    const issued = asList(await api('GET', `/invoices?stayId=${stayId}&status=ISSUED`));
    const rentInv = issued.find((iv) => Number(iv.totalAmountRupiah) === rm.monthly) ?? issued[0] ?? null;

    if (rentInv) {
      // AJ-03 (C10-02): sewa bulan PERTAMA selalu LUNAS — rule Fase V "check-in wajib lunas".
      // Skenario menunggak/bayar-sebagian dipindah ke invoice bulan ke-2 (lebih realistis).
      await api('POST', '/invoice-payments', {
        invoiceId: rentInv.id,
        paymentDate: ymd(checkIn),
        amountRupiah: Number(rentInv.totalAmountRupiah),
        method: i % 2 === 0 ? 'TRANSFER' : 'CASH',
        note: 'Pembayaran sewa bulan pertama (seed dummy)',
      });
      summary.paidFull++;
    } else {
      console.warn(`   ⚠️  Tidak menemukan invoice auto utk stay #${stayId} (kamar ${t.code}).`);
    }

    // AJ-03: invoice sewa bulan ke-2 utk skenario tunggakan (Bayu/I) & open penuh (Sari/F2).
    if (t.scenario === 'unpaid' || t.scenario === 'partial') {
      const inv2 = await api('POST', '/invoices/create-with-lines-and-issue', {
        stayId,
        invoiceNumber: `SEED2-${t.code}-${Date.now()}`,
        periodStart: ymd(planOut),
        periodEnd: ymd(addMonths(planOut, 1)),
        dueDate: ymd(addDays(planOut, 7)),
        notes: 'Sewa perpanjangan bulan ke-2 (seed dummy)',
        lines: [{ lineType: 'RENT', description: `Sewa kamar ${t.code} bulan ke-2`, qty: '1', unitPriceRupiah: rm.monthly }],
      }, { optional: true });
      // Catatan no-partial (D-02): pembayaran manual WAJIB lunas penuh — tidak ada
      // pembayaran sebagian. Maka skenario "partial" pun = invoice ke-2 menunggak penuh
      // (beda dari Bayu hanya pada narasi: penghuni baru yang belum bayar bulan ke-2).
      const inv2Id = inv2 ? idOf(inv2) : null;
      if (inv2Id && t.scenario === 'partial') {
        summary.partial++;
        console.log(`   ⚠️  [${t.code}] ${t.name}: invoice bulan ke-2 BELUM dibayar (baru masuk — no-partial D-02)`);
      } else if (inv2Id) {
        summary.unpaid++;
        console.log(`   ⚠️  [${t.code}] ${t.name}: invoice bulan ke-2 BELUM dibayar (menunggak)`);
      } else {
        console.warn(`   ⚠️  Gagal membuat invoice bulan ke-2 utk kamar ${t.code} — skenario ${t.scenario} dilewati.`);
      }
    }
  }
  console.log(`✓ ${summary.stays} check-in + ${summary.paidFull} sewa awal lunas + ${summary.partial + summary.unpaid} invoice bulan ke-2 open/menunggak (no-partial D-02)`);

  // 4) Catat meter siklus untuk kamar Deluxe AC (A, B, C, J, K)
  const meterCandidates = ['A', 'B', 'C', 'J', 'K'];
  for (const code of meterCandidates) {
    const s = stays.find((x) => x.code === code);
    if (!s) continue;
    const usage = code === 'A' || code === 'K' ? 48 : 22; // A/K melebihi jatah 30 kWh; B/C/J dalam jatah
    // AJ-04: server bisa menormalkan checkInDate lampau → baca meter "hari ini" agar
    // selalu ≥ tanggal check-in tersimpan (dulu checkIn+28 hari → ditolak "sebelum check-in").
    const readAt = TODAY;
    const r = await api('POST', '/meter-readings/cycle', {
      roomId: roomId[code],
      readingAt: ymd(readAt),
      electricityReadingValue: String(s.elec0 + usage),
      note: 'Catat meter siklus (seed dummy)',
    }, { optional: true });
    if (r) {
      if (r.invoice || r.invoiceId) summary.meterInvoices++;
      else summary.meterFree++;
    }
  }
  console.log(`✓ Meter: ${summary.meterInvoices} bertagihan, ${summary.meterFree} dalam jatah gratis`);

  // 5) Tiket + tip staf
  const staffTok = await loginAs('staff@kost48.com', 'staff123');
  if (staffTok) {
    await api('PATCH', '/auth/me/tip-info', {
      tipGopay: '0812-3456-7890', tipShopeepay: '0899-1111-2222',
      tipDana: '0812-3456-7890', tipBank: 'BCA 1234567890 a.n. Staf KOST48',
    }, { token: staffTok, optional: true });
    const staffId = idOf(await api('GET', '/auth/me', null, { token: staffTok }));

    const ticketSeeds = [
      { slug: 'maya',  title: 'AC kamar A kurang dingin',          cat: 'AC',          tip: true },
      { slug: 'cindy', title: 'Keran kamar mandi bocor',            cat: 'PLUMBING',    tip: true },
      { slug: 'gita',  title: 'WiFi sering putus di lantai 1',      cat: 'WIFI',        tip: true },
      { slug: 'bayu',  title: 'Lampu kamar I mati',                 cat: 'ELECTRICITY', tip: false },
      { slug: 'lani',  title: 'AC kamar K perlu service cuci',      cat: 'AC',          tip: true },
    ];

    for (const t of ticketSeeds) {
      const ttok = await loginAs(`${t.slug}.tenant@kost48.test`, TENANT_PW);
      if (!ttok) continue;
      const tkId = idOf(await api('POST', '/tickets/portal', {
        title: t.title, description: `${t.title} (seed dummy)`, category: t.cat,
      }, { token: ttok, optional: true }));
      if (!tkId) continue;
      summary.tickets++;
      await api('POST', `/tickets/${tkId}/assign`,     { assignedToId: staffId }, { optional: true });
      await api('POST', `/tickets/${tkId}/start`,      {}, { token: staffTok, optional: true });
      await api('POST', `/tickets/${tkId}/mark-done`,  { resolutionNote: 'Sudah ditangani (seed).' }, { token: staffTok, optional: true });
      if (t.tip) { await api('POST', `/tickets/${tkId}/tip-acknowledge`, {}, { token: ttok, optional: true }); summary.tipAcks++; }
    }
    console.log(`✓ Tiket: ${summary.tickets} dibuat (${summary.tipAcks} ditandai tip)`);
  }

  // 6) Survei kepuasan penghuni (tenant yang sudah masuk beberapa bulan)
  const surveySeeds = [
    { slug: 'maya',  overall: 5, rec: true,  comment: 'Kos bersih, staf ramah, lokasi strategis dekat PTC.' },
    { slug: 'cindy', overall: 4, rec: true,  comment: 'Nyaman; WiFi kadang lambat jam 8 malam.' },
    { slug: 'gita',  overall: 5, rec: true,  comment: 'Puas, respons keluhan cepat dan transparan.' },
    { slug: 'bayu',  overall: 3, rec: false, comment: 'Kamar mandi KM luar perlu perawatan lebih sering.' },
    { slug: 'karin', overall: 4, rec: true },
    { slug: 'rizky', overall: 5, rec: true,  comment: 'Recommended untuk mahasiswa dan pekerja muda.' },
    { slug: 'fajar', overall: 4, rec: true,  comment: 'Harga sesuai fasilitas, listrik transparan.' },
  ];
  for (const sv of surveySeeds) {
    const ttok = await loginAs(`${sv.slug}.tenant@kost48.test`, TENANT_PW);
    if (!ttok) continue;
    const r = await api('POST', '/surveys', {
      overallRating: sv.overall, cleanliness: sv.overall, staffService: sv.overall >= 4 ? 5 : 3,
      facility: 4, valueForMoney: sv.overall, wouldRecommend: sv.rec, comment: sv.comment,
    }, { token: ttok, optional: true });
    if (r) summary.surveys++;
  }
  console.log(`✓ ${summary.surveys} survei kepuasan`);

  // 7) RenewRequest PENDING — Dimas (Kamar B, kontrak 3 bulan lalu)
  {
    const dimasStay = stays.find((s) => s.code === 'B');
    if (dimasStay) {
      const tTok = await loginAs('dimas.tenant@kost48.test', TENANT_PW).catch(() => null);
      if (tTok) {
        const rr = await api('POST', '/tenant/renew-requests', {
          stayId: dimasStay.stayId, requestedTerm: 'MONTHLY',
          requestNotes: 'Mau perpanjang 1 bulan lagi (seed sample)',
        }, { token: tTok, optional: true });
        if (rr) { summary.renewals++; console.log('✓ RenewRequest PENDING untuk Kamar B (Dimas Saputra)'); }
      }
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n✅ SELESAI. Semua data via endpoint nyata (aturan bisnis berlaku).');
  console.log('   Login: owner@kost48.com / Owner#2026 · admin@kost48.com / admin123 · staff@kost48.com / staff123');
  console.log('   Tenant: <slug>.tenant@kost48.test / Tenant#2026 (mis. maya.tenant@kost48.test)');
  console.log('   Kamar: A B C D G H I J K L M F1 F2 (13 kamar, semua OCCUPIED)');
  console.log('\n   Status bervariasi:');
  console.log('   • Dimas (B): RenewRequest PENDING');
  console.log('   • Cindy (C): hasPet = true');
  console.log('   • Indah (H): 2 orang (occupantCount=2)');
  console.log('   • Bayu  (I): sewa awal lunas; invoice bulan ke-2 menunggak (belum dibayar)');
  console.log('   • Lani  (K): checkoutH10 (planOut = 10 hari dari sekarang)');
  console.log('   • Sari  (F2): sewa awal + deposit lunas; invoice bulan ke-2 open penuh (no-partial D-02)');
  process.exit(0);
})().catch((e) => { console.error('\n❌ Seed GAGAL:', e?.message ?? e); process.exit(1); });
