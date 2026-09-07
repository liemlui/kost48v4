/*
 * SEED PRODUKSI — 13 tenant real + akun portal (TANPA membuat kamar).
 *
 * Kapan dipakai: saat 13 kamar SUDAH dibuat oleh `sql/seed-production-rooms.sql`
 * (jalur shared hosting). Berbeda dengan `seed-prod.js` (yang juga membuat kamar),
 * script ini hanya membuat TENANT + PORTAL ACCESS sehingga tidak konflik dengan
 * kode kamar yang sudah ada (409 "Kode kamar sudah digunakan").
 *
 * Pakai (dari workstation — backend produksi harus sudah reachable):
 *   API_BASE=https://[DOMAIN]/api \
 *   OWNER_EMAIL=liem.lui@gmail.com OWNER_PASSWORD='...' \
 *   SEED_TENANT_PASSWORD='password-awal-tenant' \
 *   node scripts/seed-prod-tenants.js
 *
 * - Idempoten: tenant dicari dulu via NIK (identityNumber); bila sudah ada dipakai ulang.
 * - Portal access hanya dibuat untuk tenant yang punya email (12 dari 13).
 * - GUNAWAN (F1) tidak dibuatkan akun portal (email null — segera checkout).
 * - Tenant login: email + SEED_TENANT_PASSWORD (password awal SAMA untuk semua).
 * - TIDAK membuat stay/invoice/bayar/deposit — itu via UI Owner.
 */

const API = process.env.API_BASE || 'http://localhost:3000/api';
const OWNER = {
  identifier: (process.env.OWNER_EMAIL || 'liem.lui@gmail.com').trim(),
  password: process.env.OWNER_PASSWORD || '',
};
const TENANT_PASSWORD = process.env.SEED_TENANT_PASSWORD || '';

if (!OWNER.password || OWNER.password.length < 8) {
  console.error('❌ OWNER_PASSWORD wajib diisi (min 8 karakter).');
  process.exit(1);
}
if (!TENANT_PASSWORD || TENANT_PASSWORD.length < 8) {
  console.error('❌ SEED_TENANT_PASSWORD wajib diisi (min 8 karakter) untuk akun portal tenant.');
  process.exit(1);
}

let TOKEN = '';

async function api(method, path, body, { token = null } = {}) {
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
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return j?.data ?? j;
}

async function loginAs(identifier, password) {
  const r = await api('POST', '/auth/login', { identifier, password }, { token: '' });
  const tok = r?.accessToken ?? null;
  if (!tok) throw new Error('Login owner gagal (tidak ada accessToken).');
  return tok;
}

// ── 13 TENANT REAL KOST48 — sama persis dengan seed-prod.js ──
const TENANTS = [
  { code: 'A',  name: 'Shinta Larista',              nik: '3574036206990003', gender: 'FEMALE', email: 'shinta22larista@gmail.com',    phone: '082230184559' },
  { code: 'B',  name: 'Dini Widiastutik',            nik: '3275085012800021', gender: 'FEMALE', email: 'diniwidi11@gmail.com',         phone: '089679596799' },
  { code: 'C',  name: 'Miko Rakatama Adhi Winarto',  nik: '6471051708970006', gender: 'MALE',   email: 'Mikorakatamaa@gmail.com',      phone: '089682611559' },
  { code: 'D',  name: 'Ade Chandra',                 nik: '3173052309720009', gender: 'MALE',   email: 'adhechan72@gmail.com',         phone: '085716345588' },
  { code: 'F1', name: 'GUNAWAN',                     nik: '1505062511740001', gender: 'MALE',   email: null,                          phone: '081330787868' },
  { code: 'F2', name: 'Patrick Wilfred',             nik: '3275020504910019', gender: 'MALE',   email: 'wilfredpatrick@hotmail.com',  phone: '081289399915' },
  { code: 'G',  name: 'Yofi Nurkolifah',             nik: '3519122204030003', gender: 'FEMALE', email: 'jtt1234511@gmail.com',         phone: '082244277043' },
  { code: 'H',  name: 'Welly Tanoto',                nik: '3578070811730004', gender: 'MALE',   email: 'Wellytanoto73@gmail.com',     phone: '082139730928' },
  { code: 'I',  name: 'Theo Wijaya',                 nik: '3571021308860003', gender: 'MALE',   email: 'theowijaya0886@gmail.com',    phone: '081717531937' },
  { code: 'J',  name: 'Lovandra',                    nik: '3175070312930003', gender: null,     email: 'lovandra.fachri103@gmail.com', phone: '08812149261' },
  { code: 'K',  name: 'Meliana Tamara',              nik: '3578125102000002', gender: 'FEMALE', email: 'melontamara556@gmail.com',     phone: '085334192220' },
  { code: 'L',  name: 'Destarika Hasan',             nik: '1671065812020008', gender: 'FEMALE', email: 'desterikahasan@gmail.com',      phone: '085964263779' },
  { code: 'M',  name: 'Gabriel Excelly Pranajaya',   nik: '3511115908030001', gender: null,     email: 'gabrielexcelly1908@gmail.com', phone: '082228871199' },
];

const summary = { created: 0, reused: 0, portal: 0, skippedPortal: 0 };

(async () => {
  console.log('=== SEED PRODUKSI — 13 Tenant + Portal Access (tanpa kamar) ===');
  console.log('API:', API);

  // 1) Login OWNER
  TOKEN = await loginAs(OWNER.identifier, OWNER.password);
  console.log('✓ Login OWNER');

  // 2) Ambil tenant yang sudah ada (idempotency via NIK)
  const existing = await api('GET', '/tenants?limit=100');
  const byNik = new Map();
  for (const t of existing?.items ?? []) {
    if (t.identityNumber) byNik.set(String(t.identityNumber), t);
  }
  console.log(`ℹ️  ${byNik.size} tenant sudah ada di DB`);

  // 3) Buat tenant + portal access
  for (const t of TENANTS) {
    let tenantId = byNik.get(t.nik)?.id ?? null;
    const existingPortal = byNik.get(t.nik)?.portalUserSummary ?? null;

    if (!tenantId) {
      try {
        const created = await api('POST', '/tenants', {
          fullName: t.name,
          phone: t.phone,
          email: t.email ?? undefined,
          identityNumber: t.nik,
          gender: t.gender ?? undefined,
          originCity: 'Surabaya',
          occupation: '',
        });
        tenantId = created?.id ?? null;
        if (!tenantId) throw new Error('Response tidak berisi id tenant.');
        summary.created++;
        console.log(`  ✓ Tenant dibuat: ${t.name} (#${tenantId}, kamar ${t.code})`);
      } catch (err) {
        console.warn(`  ⚠️  Gagal buat tenant ${t.name} — ${err.message}`);
        continue;
      }
    } else {
      summary.reused++;
      console.log(`  ℹ️  Tenant sudah ada: ${t.name} (#${tenantId}) — dipakai ulang`);
    }

    // 4) Portal access — hanya untuk tenant ber-email & belum punya akun
    if (!t.email) {
      console.log(`  ⊘  ${t.name}: tanpa email → akun portal dilewati`);
      continue;
    }
    if (existingPortal) {
      summary.skippedPortal++;
      console.log(`  ℹ️  ${t.name}: akun portal sudah ada (${existingPortal.portalEmail}) — skip`);
      continue;
    }
    try {
      await api('POST', `/tenants/${tenantId}/portal-access`, {
        email: t.email,
        password: TENANT_PASSWORD,
        fullName: t.name,
      });
      summary.portal++;
      console.log(`  ✓ Portal dibuat: ${t.email} (${t.name})`);
    } catch (err) {
      console.warn(`  ⚠️  Gagal buat portal ${t.name} — ${err.message}`);
    }
  }

  console.log('\n=== SEED TENANT SELESAI ===');
  console.log(`  Tenant dibuat: ${summary.created} · dipakai ulang: ${summary.reused}`);
  console.log(`  Portal dibuat: ${summary.portal} · sudah ada: ${summary.skippedPortal}`);
  console.log('\n📧 Tenant login dengan EMAIL + password dari SEED_TENANT_PASSWORD (sama untuk semua).');
  console.log('   Ganti password per tenant via UI Owner → Manajemen Tenant → Reset Password bila perlu.');
  console.log('⚠️  GUNAWAN (F1) tanpa akun portal (segera checkout).');
  console.log('\n📋 Langkah selanjutnya: buat STAY (check-in) via UI Owner → Stays.');
})();
