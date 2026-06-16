/*
 * SI-1 — SEED DATA BISNIS via HTTP (event-path). Fase 2.
 * Owner: "dummy data dimasukkan lewat jalur satu per satu kejadian (push ke backend),
 * jangan by pass ke database." → SEMUA data bisnis dibuat dgn memanggil endpoint NYATA,
 * sehingga aturan bisnis (deposit, periode, promosi, invoice, jurnal) PASTI berlaku.
 *
 * Prasyarat: jalankan `node scripts/seed-dev-reset.js` dulu, lalu START backend dev.
 * Pakai: node scripts/seed-dev-via-api.js   (opsional: API_BASE=http://localhost:3000/api)
 *
 * Urutan kejadian per kamar berpenghuni:
 *   POST /tenants → POST /tenants/:id/portal-access → POST /stays (check-in, deposit, meter awal)
 *   → POST /invoices/create-with-lines-and-issue (sewa) → POST /invoice-payments (lunas, sebagian)
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
const ymd = (d) => d.toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const rp = (n) => 'Rp' + n.toLocaleString('id-ID');

// ── 16 penghuni (kamar A–P) + 4 kamar kosong (Q–T) ──
const NAMES = [
  ['A', 'Maya Pratiwi', 'maya', 'FEMALE'], ['B', 'Dimas Saputra', 'dimas', 'MALE'],
  ['C', 'Cindy Wijaya', 'cindy', 'FEMALE'], ['D', 'Hendra Gunawan', 'hendra', 'MALE'],
  ['E', 'Gita Lestari', 'gita', 'FEMALE'], ['F', 'Indah Permata', 'indah', 'FEMALE'],
  ['G', 'Bayu Nugroho', 'bayu', 'MALE'], ['H', 'Karin Salsabila', 'karin', 'FEMALE'],
  ['I', 'Lani Kusuma', 'lani', 'FEMALE'], ['J', 'Rizky Ramadhan', 'rizky', 'MALE'],
  ['K', 'Putri Anggraini', 'putri', 'FEMALE'], ['L', 'Fajar Maulana', 'fajar', 'MALE'],
  ['M', 'Sari Melati', 'sari', 'FEMALE'], ['N', 'Andi Wirawan', 'andi', 'MALE'],
  ['O', 'Nadia Safitri', 'nadia', 'FEMALE'], ['P', 'Eko Prasetyo', 'eko', 'MALE'],
];
const EMPTY = ['Q', 'R', 'S', 'T'];
const TENANT_PW = 'Tenant#2026';
const RENT_BY_TIER = { lt: 1200000, mid: 1400000, top: 1600000 };

const summary = { rooms: 0, tenants: 0, onboarded: 0, stays: 0, rentInvoices: 0, paidFull: 0, unpaid: 0, meterInvoices: 0, meterFree: 0, renewals: 0 };

(async () => {
  console.log('=== SI-1 SEED via HTTP ===\nAPI:', API);

  // 1) Login OWNER
  const login = await api('POST', '/auth/login', OWNER, { token: '' });
  TOKEN = login?.accessToken ?? login?.token;
  if (!TOKEN) throw new Error('Login owner gagal (token kosong).');
  console.log('✓ Login OWNER');

  // 2) Kamar (A–T) via POST /rooms
  const roomId = {};
  const allCodes = [...NAMES.map((n) => n[0]), ...EMPTY];
  for (let i = 0; i < allCodes.length; i++) {
    const code = allCodes[i];
    const monthly = i % 3 === 0 ? RENT_BY_TIER.top : i % 3 === 1 ? RENT_BY_TIER.mid : RENT_BY_TIER.lt;
    const d = await api('POST', '/rooms', {
      code: `K-${code}`, name: `Kamar ${code}`, floor: i < 11 ? '1' : '2',
      monthlyRateRupiah: monthly, defaultDepositRupiah: 500000,
      electricityTariffPerKwhRupiah: 1500, hasAc: i % 2 === 0, acWattage: 330, acCleanIntervalDays: 90,
      notes: 'Kamar dummy DEV (seed event-path).',
    });
    roomId[code] = idOf(d);
    summary.rooms++;
  }
  console.log(`✓ ${summary.rooms} kamar`);

  // 3) Per penghuni: tenant → portal access → check-in → invoice sewa → pembayaran
  const stays = [];
  for (let i = 0; i < NAMES.length; i++) {
    const [code, fullName, slug, gender] = NAMES[i];
    const monthly = i % 3 === 0 ? RENT_BY_TIER.top : i % 3 === 1 ? RENT_BY_TIER.mid : RENT_BY_TIER.lt;
    const ktp = '3578' + String(100000000001 + i).padStart(12, '0');
    const phone = '0812' + String(10000000 + i * 7).padStart(8, '0');
    const email = `${slug}.tenant@kost48.test`;

    // 3a) Tenant
    const tenant = await api('POST', '/tenants', {
      fullName, phone, email, identityNumber: ktp, gender, originCity: 'Surabaya', occupation: i % 2 ? 'Karyawan' : 'Mahasiswa',
    });
    const tenantId = idOf(tenant);
    summary.tenants++;

    // 3b) Akses portal (supaya bisa login)
    await api('POST', `/tenants/${tenantId}/portal-access`, { email, password: TENANT_PW, fullName }, { optional: true });

    // 3b') Lengkapi profil onboarding (PATCH) → memicu poin ONBOARDING_QUEST (event-path, gamifikasi)
    const bd = new Date(Date.UTC(1995 + (i % 8), i % 12, (i % 27) + 1));
    const onb = await api('PATCH', `/tenants/${tenantId}`, {
      fullName, phone, identityNumber: ktp, gender, originCity: 'Surabaya', occupation: i % 2 ? 'Karyawan' : 'Mahasiswa',
      birthDate: bd.toISOString().slice(0, 10), companyOrCampus: i % 2 ? 'PT Maju Jaya' : 'Universitas Airlangga',
      emergencyContactName: `Wali ${fullName.split(' ')[0]}`, emergencyContactPhone: '0813' + String(20000000 + i).padStart(8, '0'),
    }, { optional: true });
    if (onb) summary.onboarded = (summary.onboarded ?? 0) + 1;

    // 3c) Check-in (event huni; deposit tunai + meter awal) — stagger 2026-05-18..06-15
    const checkIn = new Date('2026-05-18'); checkIn.setDate(checkIn.getDate() + i * 2);
    const planOut = addMonths(checkIn, 1);
    const elec0 = 1000 + i * 50;
    const stay = await api('POST', '/stays', {
      tenantId, roomId: roomId[code], pricingTerm: 'MONTHLY', agreedRentAmountRupiah: monthly,
      checkInDate: ymd(checkIn), plannedCheckOutDate: ymd(planOut), depositCollected: true,
      bookingSource: 'WALK_IN', stayPurpose: i % 2 ? 'WORK' : 'STUDY', initialElectricityKwh: String(elec0), initialWaterM3: String(20 + i),
    });
    const stayId = idOf(stay);
    stays.push({ stayId, code, monthly, checkIn, planOut, elec0, tenantId });
    summary.stays++;

    // 3d) Check-in SUDAH auto-terbitkan invoice sewa periode pertama (event-path) →
    //     ambil invoice ISSUED milik stay ini, lalu bayar lunas 12 dari 16 (sisakan 4 menunggak).
    const issued = asList(await api('GET', `/invoices?stayId=${stayId}&status=ISSUED`));
    const rentInv = issued.find((iv) => Number(iv.totalAmountRupiah) === monthly) ?? issued[0] ?? null;
    if (rentInv) {
      summary.rentInvoices++;
      if (i < 12) {
        await api('POST', '/invoice-payments', {
          invoiceId: rentInv.id, paymentDate: ymd(checkIn), amountRupiah: Number(rentInv.totalAmountRupiah),
          method: i % 2 ? 'TRANSFER' : 'CASH', note: 'Pembayaran sewa (seed dummy)',
        });
        summary.paidFull++;
      } else { summary.unpaid++; }
    } else {
      console.warn(`   ⚠️  Tidak menemukan invoice auto utk stay #${stayId} (kamar ${code}).`);
    }
  }
  console.log(`✓ ${summary.stays} check-in + ${summary.rentInvoices} invoice sewa (${summary.paidFull} lunas, ${summary.unpaid} menunggak)`);

  // 4) Catat meter (siklus) untuk 6 kamar — sebagian kena tagihan, sebagian dalam jatah gratis
  for (let i = 0; i < 6; i++) {
    const s = stays[i];
    const usage = i % 2 === 0 ? 45 : 20; // 45 → 15 kWh kena tarif; 20 → dalam jatah 30 (gratis)
    const r = await api('POST', '/meter-readings/cycle', {
      roomId: roomId[s.code], readingAt: ymd(addDays(s.checkIn, 26)), // siklus, > tgl meter awal (hindari bentrok)
      electricityReadingValue: String(s.elec0 + usage), note: 'Catat meter siklus (seed dummy)',
    }, { optional: true });
    if (r) { if (r.invoice || r.invoiceId) summary.meterInvoices++; else summary.meterFree++; }
  }
  console.log(`✓ Meter: ${summary.meterInvoices} bertagihan, ${summary.meterFree} dalam jatah gratis`);

  // 5) Perpanjangan (riwayat): /stays/:id/renew SENGAJA dinonaktifkan owner — wajib lewat
  //    alur Permintaan Perpanjangan (DP → invoice pelunasan → finalisasi). Itu multi-langkah;
  //    tidak diseed di sini. Riwayat 2-periode bisa dibuat manual lewat UI, atau enhancement
  //    seeder berikutnya yang menjalankan flow renew-requests penuh (SI-2/SI-3).
  console.log('ℹ️  Perpanjangan TIDAK diseed (direct-renew dimatikan; pakai alur Permintaan Perpanjangan).');

  console.log('\n=== RINGKASAN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n✅ SELESAI. Semua data bisnis lewat endpoint nyata (aturan bisnis berlaku).');
  console.log('   Login: owner@kost48.com / Owner#2026 · admin@kost48.com / admin123 · staff@kost48.com / staff123');
  console.log('   Tenant: <nama>.tenant@kost48.test / Tenant#2026 (mis. maya.tenant@kost48.test)');
  process.exit(0);
})().catch((e) => { console.error('\n❌ Seed GAGAL:', e?.message ?? e); process.exit(1); });
