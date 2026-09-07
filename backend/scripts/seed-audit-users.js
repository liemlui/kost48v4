/*
 * SEED AKUN AUDIT — AO-03 (fixture/kredensial UAT non-personal).
 * Menyiapkan 5 akun audit lintas role (OWNER, ADMIN, STAFF, TENANT stay aktif,
 * TENANT tanpa stay) untuk crawler Playwright. Kriteria AO-03: kredensial tidak
 * ditulis di docs/test (semua dari env); crawl berjalan TANPA reset data UAT.
 * Jalur event-path via HTTP (jangan by pass DB) — NON-DESTRUKTIF: tidak menghapus
 * data, tidak ubah password/role akun yang sudah ada, tidak membuat stay/invoice.
 * ⚠️  MUTASI DB (membuat user/portal) → izin owner terpisah; target NON-produksi.
 *
 * Pemakaian (dari backend/):
 *   $env:API_BASE='http://localhost:3000/api'
 *   $env:AUDIT_OWNER_IDENTIFIER='owner@kost48.com'  # OWNER yang SUDAH ada (bootstrap)
 *   $env:AUDIT_OWNER_PASSWORD='...'
 *   $env:AUDIT_ADMIN_PASSWORD='...' $env:AUDIT_STAFF_PASSWORD='...'
 *   $env:AUDIT_TENANT_PASSWORD='...' $env:AUDIT_CONFIRM='1'
 *   node scripts/seed-audit-users.js   (atau: npm run seed:audit-users)
 * Default email: admin@kost48.com / staff@kost48.com /
 *   audit.tenant.active@kost48.test / audit.tenant.nostay@kost48.test
 */

const API = process.env.API_BASE || 'http://localhost:3000/api';

const OWNER_IDENTIFIER = (process.env.AUDIT_OWNER_IDENTIFIER || 'owner@kost48.com').trim();
const OWNER_PASSWORD = process.env.AUDIT_OWNER_PASSWORD || '';

function requiredPassword(name, min = 8) {
  const value = (process.env[name] ?? '').trim();
  if (value.length < min) {
    console.error(`❌ ${name} wajib diisi dan minimal ${min} karakter (password audit tidak disimpan di source).`);
    process.exit(1);
  }
  return value;
}

const ADMIN = { email: (process.env.AUDIT_ADMIN_EMAIL || 'admin@kost48.com').trim(), password: requiredPassword('AUDIT_ADMIN_PASSWORD') };
const STAFF = { email: (process.env.AUDIT_STAFF_EMAIL || 'staff@kost48.com').trim(), password: requiredPassword('AUDIT_STAFF_PASSWORD') };
const TENANT_PASSWORD = requiredPassword('AUDIT_TENANT_PASSWORD');
const TENANT_ACTIVE = { email: (process.env.AUDIT_TENANT_ACTIVE_EMAIL || 'audit.tenant.active@kost48.test').trim() };
const TENANT_NO_STAY = { email: (process.env.AUDIT_TENANT_NO_STAY_EMAIL || 'audit.tenant.nostay@kost48.test').trim() };

const AUDIT_CONFIRM = String(process.env.AUDIT_CONFIRM ?? '');
if (AUDIT_CONFIRM !== '1') {
  console.error('❌ Script ini MUTASI DB (membuat user/portal audit). Target hanya UAT non-produksi.');
  console.error('   Set AUDIT_CONFIRM=1 setelah memastikan API_BASE menunjuk lingkungan NON-PRODUKSI.');
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
  if (!tok) throw new Error(`Login gagal untuk ${identifier} (tidak ada accessToken).`);
  return tok;
}

const summary = { owner: false, admin: 'skip', staff: 'skip', tenantActive: 'skip', tenantNoStay: 'skip' };

(async () => {
  console.log('=== SEED AKUN AUDIT AO-03 (UAT non-produksi) ===');
  console.log('API:', API);

  // 0) Bootstrap OWNER — diverifikasi, TIDAK pernah dibuat/diubah.
  TOKEN = await loginAs(OWNER_IDENTIFIER, OWNER_PASSWORD);
  summary.owner = true;
  console.log('✓ OWNER audit terverifikasi (akun sudah ada, password tidak diubah).');

  // 1) Inventaris user & tenant untuk idempotensi.
  const users = await api('GET', '/users?limit=300');
  const userByEmail = new Map((users?.items ?? []).map((u) => [String(u.email).toLowerCase(), u]));
  const tenants = await api('GET', '/tenants?limit=300');
  const tenantItems = tenants?.items ?? [];

  // 2) ADMIN & STAFF — buat bila belum ada; verifikasi bila sudah ada.
  for (const [label, target, role] of [
    ['ADMIN', ADMIN, 'ADMIN'],
    ['STAFF', STAFF, 'STAFF'],
  ]) {
    const existing = userByEmail.get(target.email.toLowerCase());
    if (existing) {
      if (existing.role !== role) {
        console.warn(`  ⚠️  ${label} ${target.email} sudah ada dengan role ${existing.role} — SKIP (role tidak diubah).`);
        summary[label === 'ADMIN' ? 'admin' : 'staff'] = 'ada-role-beda';
        continue;
      }
      await loginAs(target.email, target.password); // verifikasi; gagal → exit
      summary[label === 'ADMIN' ? 'admin' : 'staff'] = 'ada-terverifikasi';
      console.log(`  ℹ️  ${label} sudah ada (${target.email}) — login terverifikasi.`);
      continue;
    }
    try {
      await api('POST', '/users', { fullName: `Audit ${label} Non-Personal (UAT)`, email: target.email, password: target.password, role, isActive: true });
      summary[label === 'ADMIN' ? 'admin' : 'staff'] = 'dibuat';
      console.log(`  ✓ ${label} dibuat: ${target.email}`);
    } catch (err) {
      console.warn(`  ⚠️  Gagal buat ${label} ${target.email}: ${err.message}`);
    }
  }

  // 3) TENANT dengan stay aktif — pakai tenant yang SUDAH aktif; jangan reset password lama.
  {
    const stayActive = await api('GET', '/stays?status=ACTIVE&limit=300');
    const activeTenantIds = new Set((stayActive?.items ?? [])
      .map((s) => s.tenantId ?? s.tenant?.id ?? null)
      .filter((id) => id != null));
    if (!activeTenantIds.size) {
      console.warn('  ⚠️  Tidak ada stay ACTIVE di UAT — akun TENANT aktif tidak dapat dipakai.');
      summary.tenantActive = 'tidak-ada-stay-aktif';
    } else if (userByEmail.has(TENANT_ACTIVE.email.toLowerCase())) {
      await loginAs(TENANT_ACTIVE.email, TENANT_PASSWORD);
      summary.tenantActive = 'ada-terverifikasi';
      console.log(`  ℹ️  TENANT aktif sudah punya akun (${TENANT_ACTIVE.email}) — login terverifikasi.`);
    } else {
      const candidate = tenantItems.find((t) => activeTenantIds.has(Number(t.id)) && !t.portalUserSummary);
      if (!candidate) {
        console.warn('  ⚠️  Tidak ada kandidat TENANT aktif tanpa portal — semua tenant stay-aktif sudah punya portal.');
        console.warn('       Berikan email bebas via AUDIT_TENANT_ACTIVE_EMAIL, atau izinkan fixture UAT baru dibuat.');
        summary.tenantActive = 'tidak-ada-kandidat';
      } else {
        await api('POST', `/tenants/${candidate.id}/portal-access`, {
          email: TENANT_ACTIVE.email,
          password: TENANT_PASSWORD,
          fullName: 'Audit Tenant Non-Personal — Stay Aktif',
        });
        summary.tenantActive = 'portal-dibuat';
        console.log(`  ✓ TENANT aktif (tenant #${candidate.id}) diberi akun audit ${TENANT_ACTIVE.email}`);
      }
    }
  }

  // 4) TENANT tanpa stay aktif — cari tenant tanpa currentStay tanpa portal; fallback buat tenant non-personal.
  {
    const hasStay = (t) => Boolean(t.currentStay || t.activeStayId);
    if (userByEmail.has(TENANT_NO_STAY.email.toLowerCase())) {
      await loginAs(TENANT_NO_STAY.email, TENANT_PASSWORD);
      summary.tenantNoStay = 'ada-terverifikasi';
      console.log(`  ℹ️  TENANT tanpa stay sudah punya akun (${TENANT_NO_STAY.email}) — login terverifikasi.`);
    } else {
      let candidate = tenantItems.find((t) => !hasStay(t) && !t.portalUserSummary);
      if (!candidate) {
        // Fallback: buat tenant NON-PERSONAL jelas (identitas dummy audit), lalu portal access.
        const dummyNik = '9000000000000001';
        candidate = tenantItems.find((t) => String(t.identityNumber) === dummyNik);
        if (!candidate) {
          try {
            candidate = await api('POST', '/tenants', {
              fullName: 'Audit Tenant Non-Personal — Tanpa Stay (UAT)',
              phone: '081200000001',
              email: undefined,
              identityNumber: dummyNik,
              originCity: 'Non-personal audit',
              occupation: '',
              isActive: true,
            });
            console.log(`  ✓ Tenant non-personal dibuat #${candidate?.id} (tanpa stay).`);
          } catch (err) {
            console.warn(`  ⚠️  Gagal buat tenant non-personal: ${err.message}`);
          }
        }
      }
      if (!candidate) {
        console.warn('  ⚠️  Tidak ada kandidat TENANT tanpa stay — siapkan data UAT atau beri izin fixture baru.');
        summary.tenantNoStay = 'tidak-ada-kandidat';
      } else {
        await api('POST', `/tenants/${candidate.id}/portal-access`, {
          email: TENANT_NO_STAY.email,
          password: TENANT_PASSWORD,
          fullName: 'Audit Tenant Non-Personal — Tanpa Stay',
        });
        summary.tenantNoStay = 'portal-dibuat';
        console.log(`  ✓ TENANT tanpa stay (tenant #${candidate.id}) diberi akun audit ${TENANT_NO_STAY.email}`);
      }
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n✅ SELESAI. Password audit tidak pernah dicetak atau disimpan di repo.');
  console.log('   Isi env lokal crawler (E2E_* di frontend) dengan email + password yang sama untuk menjalankan crawl.');
  console.log('   Prasyarat gate: akun OWNER/ADMIN/STAFF login OK dan dua state TENANT tersedia.');
})().catch((e) => { console.error('\n❌ Seed akun audit GAGAL:', e?.message ?? e); process.exit(1); });