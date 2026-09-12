/*
 * SEED AKUN AUDIT — AO-03 (fixture/kredensial UAT non-personal).
 * Menyiapkan 5 akun audit lintas role (OWNER, ADMIN, STAFF, TENANT stay aktif,
 * TENANT tanpa stay) untuk crawler Playwright. Kriteria AO-03: kredensial tidak
 * ditulis di docs/test (semua dari env); crawl berjalan TANPA reset data UAT.
 * Jalur event-path via HTTP (jangan by pass DB) — NON-DESTRUKTIF: tidak menghapus
 * data, tidak ubah password/role akun yang sudah ada, tidak membuat stay/invoice.
 * Fixture tenant WAJIB eksplisit (AUDIT_TENANT_ACTIVE_ID): skrip tidak memilih tenant
 * existing otomatis. Target API non-lokal tolak tanpa AUDIT_ALLOW_REMOTE=1.
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

// Guard target: provisioning hanya untuk lingkungan UAT non-produksi lokal.
const API_HOST = (() => { try { return new URL(API).hostname; } catch { return ''; } })();
const ALLOW_REMOTE = String(process.env.AUDIT_ALLOW_REMOTE ?? '').trim() === '1';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
if (!ALLOW_REMOTE && !LOCAL_HOSTS.includes(String(API_HOST).toLowerCase())) {
  console.error(`❌ API_BASE non-lokal (${API_HOST}) — target provisioning wajib UAT non-produksi.`);
  console.error('   Set AUDIT_ALLOW_REMOTE=1 hanya bila lingkungan remote divalidasi sebagai UAT.');
  process.exit(1);
}

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
const TENANT_ACTIVE_ID = Number(process.env.AUDIT_TENANT_ACTIVE_ID ?? 0);
const TENANT_NO_STAY_ID = Number(process.env.AUDIT_TENANT_NO_STAY_ID ?? 0);

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

// Ambil semua halaman (backend menbatsi limit a 100 via buildPagination).
async function listAll(path, pageSize = 100) {
  const items = [];
  let page = 1;
  while (page <= 300) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await api('GET', `${path}${sep}page=${page}&limit=${pageSize}`);
    const batch = Array.isArray(res?.items) ? res.items : [];
    items.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }
  return items;
}

const summary = { owner: false, admin: 'skip', staff: 'skip', tenantActive: 'skip', tenantNoStay: 'skip' };
let issues = [];

(async () => {
  console.log('=== SEED AKUN AUDIT AO-03 (UAT non-produksi) ===');
  console.log('API:', API);

  // 0) Bootstrap OWNER — diverifikasi, TIDAK pernah dibuat/diubah.
  TOKEN = await loginAs(OWNER_IDENTIFIER, OWNER_PASSWORD);
  summary.owner = true;
  console.log('✓ OWNER audit terverifikasi (akun sudah ada, password tidak diubah).');

  // 1) Inventaris user & tenant untuk idempotensi — pagination lengkap (tiap halaman ≤100).
  const allUsers = await listAll('/users');
  const userByEmail = new Map(allUsers.map((u) => [String(u.email).toLowerCase(), u]));
  const tenantItems = await listAll('/tenants');

  // 2) ADMIN & STAFF — buat bila belum ada; verifikasi LOGIN setelah create (role tentok).
  for (const [label, target, role] of [
    ['ADMIN', ADMIN, 'ADMIN'],
    ['STAFF', STAFF, 'STAFF'],
  ]) {
    const existing = userByEmail.get(target.email.toLowerCase());
    const summaryKey = label === 'ADMIN' ? 'admin' : 'staff';
    if (existing) {
      if (existing.role !== role) {
        issues.push(`❌ ${label} ${target.email} sudah ada dengan role ${existing.role} — gate audit belum lengkap (role tidak diubah).`);
        summary[summaryKey] = 'ada-role-beda';
        continue;
      }
      await loginAs(target.email, target.password); // verifikasi; gagal → exit
      summary[summaryKey] = 'ada-terverifikasi';
      console.log(`  ℹ️  ${label} sudah ada (${target.email}) — login terverifikasi.`);
      continue;
    }
    try {
      await api('POST', '/users', { fullName: `Audit ${label} Non-Personal (UAT)`, email: target.email, password: target.password, role, isActive: true });
      await loginAs(target.email, target.password); // verifikasi akun baru
      summary[summaryKey] = 'dibuat-verifikasi';
      console.log(`  ✓ ${label} dibuat + login terverifikasi: ${target.email}`);
    } catch (err) {
      issues.push(`❌ Gagal buat/verifikasi ${label} ${target.email}: ${err.message}`);
    }
  }

  // 3) TENANT dengan stay aktif — OPSIONAL untuk AO-13. Wajib `AUDIT_TENANT_ACTIVE_ID`
  //    eksplisit (fixture non-personal). Bila tidak ada fixture valid, DILEWATI (bukan gagal),
  //    karena crawl AO-13 hanya butuh OWNER/ADMIN/STAFF; state tenant ditunda ke AO-14.
  {
    const stayActive = await listAll('/stays?status=ACTIVE');
    const activeTenantIds = new Set(stayActive
      .map((s) => s.tenantId ?? s.tenant?.id ?? null)
      .filter((id) => id != null));
    const candidate = Number.isFinite(TENANT_ACTIVE_ID) && TENANT_ACTIVE_ID > 0
      ? tenantItems.find((t) => Number(t.id) === TENANT_ACTIVE_ID)
      : null;

    if (userByEmail.has(TENANT_ACTIVE.email.toLowerCase())) {
      await loginAs(TENANT_ACTIVE.email, TENANT_PASSWORD);
      summary.tenantActive = 'ada-terverifikasi';
      console.log(`  ℹ️  TENANT aktif sudah punya akun (${TENANT_ACTIVE.email}) — login terverifikasi.`);
    } else if (!activeTenantIds.size) {
      console.warn('  ⚠️  Tidak ada stay ACTIVE di UAT — akun TENANT aktif DILEWATI (defer ke AO-14).');
      summary.tenantActive = 'dilewati-tanpa-stay';
    } else if (!candidate) {
      console.warn('  ⚠️  AUDIT_TENANT_ACTIVE_ID kosong/tidak ditemukan — TENANT aktif DILEWATI (defer ke AO-14).');
      summary.tenantActive = 'dilewati';
    } else if (!activeTenantIds.has(TENANT_ACTIVE_ID)) {
      console.warn(`  ⚠️  TENANT #${TENANT_ACTIVE_ID} tidak punya stay ACTIVE — DILEWATI.`);
      summary.tenantActive = 'dilewati-tidak-aktif';
    } else if (candidate.portalUserSummary) {
      console.warn(`  ⚠️  TENANT #${TENANT_ACTIVE_ID} sudah punya portal — DILEWATI (pilih fixture lain bila AO-14 butuh).`);
      summary.tenantActive = 'dilewati-portal-ada';
    } else {
      await api('POST', `/tenants/${candidate.id}/portal-access`, {
        email: TENANT_ACTIVE.email,
        password: TENANT_PASSWORD,
        fullName: 'Audit Tenant Non-Personal — Stay Aktif',
      });
      await loginAs(TENANT_ACTIVE.email, TENANT_PASSWORD);
      summary.tenantActive = 'portal-dibuat-verifikasi';
      console.log(`  ✓ TENANT aktif (tenant #${candidate.id}) diberi akun audit ${TENANT_ACTIVE.email} + login terverifikasi.`);
    }
  }

  // 4) TENANT tanpa stay — AUDIT_TENANT_NO_STAY_ID opsional; default = tenant dummy non-personal jelas.
  {
    const hasStay = (t) => Boolean(t.currentStay || t.activeStayId);
    if (userByEmail.has(TENANT_NO_STAY.email.toLowerCase())) {
      await loginAs(TENANT_NO_STAY.email, TENANT_PASSWORD);
      summary.tenantNoStay = 'ada-terverifikasi';
      console.log(`  ℹ️  TENANT tanpa stay sudah punya akun (${TENANT_NO_STAY.email}) — login terverifikasi.`);
    } else if (Number.isFinite(TENANT_NO_STAY_ID) && TENANT_NO_STAY_ID > 0) {
      const candidate = tenantItems.find((t) => Number(t.id) === TENANT_NO_STAY_ID);
      if (!candidate) {
        issues.push(`❌ TENANT #${TENANT_NO_STAY_ID} tidak ditemukan.`);
        summary.tenantNoStay = 'id-tidak-ada';
      } else if (hasStay(candidate) || candidate.portalUserSummary) {
        issues.push(`❌ TENANT #${TENANT_NO_STAY_ID} punya stay aktif atau sudah punya portal — tidak layak untuk state tanpa stay.`);
        summary.tenantNoStay = 'tidak-layak';
      } else {
        await api('POST', `/tenants/${candidate.id}/portal-access`, {
          email: TENANT_NO_STAY.email,
          password: TENANT_PASSWORD,
          fullName: 'Audit Tenant Non-Personal — Tanpa Stay',
        });
        await loginAs(TENANT_NO_STAY.email, TENANT_PASSWORD);
        summary.tenantNoStay = 'portal-dibuat-verifikasi';
        console.log(`  ✓ TENANT tanpa stay (tenant #${candidate.id}) diberi akun audit ${TENANT_NO_STAY.email} + login terverifikasi.`);
      }
    } else {
      // Default: buat tenant NON-PERSONAL jelas (identitas dummy audit), lalu portal access.
      const dummyNik = '9000000000000001';
      let candidate = tenantItems.find((t) => String(t.identityNumber) === dummyNik);
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
          issues.push(`❌ Gagal buat tenant non-personal: ${err.message}`);
        }
      }
      if (!candidate) {
        issues.push('❌ Fixture TENANT tanpa stay tidak tersedia.');
        summary.tenantNoStay = 'dummy-gagal';
      } else {
        await api('POST', `/tenants/${candidate.id}/portal-access`, {
          email: TENANT_NO_STAY.email,
          password: TENANT_PASSWORD,
          fullName: 'Audit Tenant Non-Personal — Tanpa Stay',
        });
        await loginAs(TENANT_NO_STAY.email, TENANT_PASSWORD);
        summary.tenantNoStay = 'dummy-portal-verifikasi';
        console.log(`  ✓ TENANT dummy tanpa stay (tenant #${candidate.id}) diberi akun audit ${TENANT_NO_STAY.email} + login terverifikasi.`);
      }
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) {
    console.error('\n❌ GATE AUDIT TIDAK LENGKAP — provisioning gagal/parsial:');
    for (const issue of issues) console.error(`   - ${issue}`);
    process.exit(1);
  }
  console.log('\n✅ SELESAI. Password audit tidak pernah dicetak atau disimpan di repo.');
  console.log('   Isi env lokal crawler (E2E_* di frontend) dengan email + password yang sama untuk menjalankan crawl.');
  console.log('   Prasyarat AO-13: akun OWNER/ADMIN/STAFF login OK. State TENANT aktif opsional (defer ke AO-14).');
})().catch((e) => { console.error('\n❌ Seed akun audit GAGAL:', e?.message ?? e); process.exit(1); });