// KOST48 — buat PAKET DEPLOY RAMPING (combined single-server) untuk cPanel/VPS hemat RAM/inode.
// Pakai: npm run make-deploy
// Hasil: folder `deploy/` = backend PREBUILT (`dist/`) + frontend PREBUILT (`client/`) + prisma/ + sql/ + seed-owner.
// SEMUA build terjadi DI LOKAL. Di server cukup: `npm run cpanel:install` (= npm ci prod-only, tanpa scripts/audit) → start `dist/main.js`.
// Kenapa TANPA build di server: hosting shared 512MB bisa OOM saat tsc/npm ci penuh, dan devDeps memboroskan inode.
// Prisma client hasil generate = WASM query compiler + driver adapter pg → platform-independent;
// binary engine `*.node` (Windows) dibuang dari paket karena tidak dipakai di Linux.
import { rmSync, mkdirSync, cpSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const OUT = 'deploy';
const NO_BUILD = process.argv.includes('--no-build');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function sortObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function run(label, cmd, args, cwd) {
  console.log('[deploy] ' + label);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status) { console.error('[deploy] GAGAL: ' + label); process.exit(r.status); }
}

function requirePath(path, hint) {
  if (!existsSync(path)) {
    console.error('[deploy] GAGAL: ' + path + ' tidak ditemukan. ' + hint);
    process.exit(1);
  }
}

function writeDeployPackageFiles() {
  const backendPkg = readJson('backend/package.json');
  const generatedPkgPath = 'backend/dist/generated/prisma/package.json';
  const generatedDeps = existsSync(generatedPkgPath) ? (readJson(generatedPkgPath).dependencies || {}) : {};
  const dependencies = { ...(backendPkg.dependencies || {}) };

  // Runtime memakai dist/generated/prisma, jadi tiga paket ini hanya menambah biaya install deploy.
  delete dependencies['kost48-golive'];
  delete dependencies['@types/web-push'];
  delete dependencies['@prisma/client'];

  for (const [name, version] of Object.entries(generatedDeps)) {
    if (!dependencies[name]) dependencies[name] = version;
  }

  writeJson(OUT + '/package.json', {
    name: backendPkg.name,
    version: backendPkg.version,
    private: true,
    license: backendPkg.license,
    type: backendPkg.type,
    main: backendPkg.main,
    engines: backendPkg.engines,
    scripts: {
      'cpanel:install': 'npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund --progress=false',
      'install:prod': 'npm run cpanel:install',
      'cpanel:migrate': 'npx --yes prisma db push --skip-generate',
      'seed:owner': 'node scripts/seed-owner.js',
      start: 'node dist/main.js',
      'start:prod': 'node --max-old-space-size=192 dist/main.js',
    },
    dependencies: sortObject(dependencies),
  });

  writeFileSync(OUT + '/.npmrc', [
    'omit=dev',
    'omit=optional',
    'ignore-scripts=true',
    'audit=false',
    'fund=false',
    'progress=false',
    'package-lock=true',
    'engine-strict=false',
    '',
  ].join('\n'));
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    n += e.isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

if (NO_BUILD) {
  console.log('[deploy] 1/6 skip build (--no-build), pakai dist yang sudah ada...');
  requirePath('frontend/dist', 'Jalankan build frontend lokal dulu, atau pakai npm run make-deploy tanpa --no-build.');
  requirePath('backend/dist/generated/prisma/package.json', 'Jalankan build backend lokal dulu, atau pakai npm run make-deploy tanpa --no-build.');
} else {
  writeFileSync('frontend/.env.production.local', '# auto (deploy) — jangan commit\nVITE_API_BASE_URL=/api\n');
  run('1/6 build frontend (combined, VITE_API_BASE_URL=/api)...', npm, ['run', 'build'], 'frontend');

  run('2/6 build backend (tsc + prisma generate → dist/ + dist/generated)...', npm, ['run', 'build'], 'backend');
}

console.log('[deploy] 3/6 siapkan folder ' + OUT + '/ ...');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + '/scripts', { recursive: true });

console.log('[deploy] 4/6 copy backend PREBUILT (dist tanpa binary *.node) + prisma/sql + package deploy + frontend client/ ...');
// dist/ prebuilt — buang engine binary platform-spesifik (query_engine-*.dll.node dsb; Linux pakai WASM).
cpSync('backend/dist', OUT + '/dist', { recursive: true, filter: (src) => !src.endsWith('.node') });
for (const item of ['prisma', 'sql']) {
  const from = 'backend/' + item;
  if (existsSync(from)) cpSync(from, OUT + '/' + item, { recursive: true });
}
if (existsSync('backend/setup.sql')) cpSync('backend/setup.sql', OUT + '/setup.sql');
writeDeployPackageFiles();
cpSync('backend/scripts/seed-owner.js', OUT + '/scripts/seed-owner.js'); // seed OWNER pertama (F1-12) di server
cpSync('frontend/dist', OUT + '/client', { recursive: true });

run('5/6 buat package-lock produksi (tanpa install node_modules)...', npm, ['install', '--package-lock-only', '--omit=dev', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--progress=false'], OUT);

console.log('[deploy] 6/6 tulis .env.example + README + arsip tgz ...');
writeFileSync(OUT + '/.env.example', [
  '# Salin jadi `.env` di ROOT folder app (dibaca app + script seed). JANGAN commit.',
  'DATABASE_URL="postgresql://USER:PASS@localhost:5432/kost48_v3?schema=public"',
  'JWT_SECRET="ganti-dengan-secret-acak-kuat-min-32-char"',
  'NODE_ENV=production',
  'CORS_ORIGIN="https://domain-anda"   # combined same-origin: cukup domainnya',
  'KTP_ACTIVATION_GATE_ENABLED=true    # L-4 WAJIB true di produksi (nilai awal row settings; sesudahnya dikelola via UI Settings → Operasional)',
  '# Auto-ops: VPS/always-on -> AUTO_OPS_ENABLED=true. Shared hosting/Passenger (idle-sleep)',
  '# -> AUTO_OPS_ENABLED=false + AUTO_OPS_CRON_TOKEN, lalu cPanel Cron panggil POST /api/auto-ops/cron.',
  'AUTO_OPS_ENABLED=false',
  'AUTO_OPS_CRON_TOKEN="ganti-token-cron-acak-panjang"',
  '# Web push (opsional, butuh HTTPS): VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT=mailto:owner@...',
  '# Email reset password (opsional): BREVO_API_KEY + MAIL_FROM_EMAIL + MAIL_FROM_NAME',
  '# PORT: cPanel/Passenger mengatur sendiri. VPS: set mis. PORT=3000.',
  '# FRONTEND_DIST_PATH opsional (default <app>/client sudah benar).',
  '# ⚠️ NODE_OPTIONS=--max-old-space-size=192 TIDAK bisa lewat .env — set di cPanel',
  '#    "Setup Node.js App" → Environment Variables (dibaca node saat start).',
  '',
].join('\n'));

writeFileSync(OUT + '/README-DEPLOY.md', `# KOST48 — Deploy cPanel/VPS (combined, PREBUILT, hemat RAM 512MB)

Paket ini SUDAH di-build di lokal: backend \`dist/\` + frontend \`client/\`. Server TIDAK build apa pun
(tanpa tsc, tanpa prisma generate, tanpa devDependencies) → aman untuk hosting RAM 512MB & limit inode.

## Langkah cPanel (urut)
1. **PostgreSQL Databases**: buat DB \`kost48_v3\` + user + all privileges. Catat kredensial.
2. **Upload** \`kost48-deploy.tgz\` ke folder app (mis. \`~/kost48\`) → File Manager: Extract.
3. **Setup Node.js App**: Node 22 · Application root = folder app · **Startup file = \`dist/main.js\`** ·
   Environment Variables: **\`NODE_OPTIONS=--max-old-space-size=192\`** (batas heap; tidak bisa via .env).
4. **SSH** (masuk venv Node dari halaman Setup Node.js App):
   \`\`\`bash
   npm run cpanel:install        # prod deps saja, TANPA build/postinstall/audit
   cp .env.example .env && nano .env   # isi DATABASE_URL, JWT_SECRET, CORS_ORIGIN, token cron
   \`\`\`
5. **Schema DB (sekali)** — pilih salah satu:
   - **A (disarankan, tanpa download apa pun):** jalankan SQL schema penuh via psql/pgAdmin Query Tool:
     \`\`\`bash
     psql "<DATABASE_URL>" -f setup.sql
     \`\`\`
   - **B (fallback):** \`npm run cpanel:migrate\` (= npx prisma db push --skip-generate; unduh CLI sementara,
     jalankan saat app TIDAK running agar tidak rebutan RAM).

   Lalu **WAJIB** pagar DB (trigger/CHECK di luar schema Prisma; addendum v4 sudah ter-konsolidasi di dalamnya):
   \`\`\`bash
   psql "<DATABASE_URL>" -f sql/bootstrap.sql
   \`\`\`
6. **Seed OWNER pertama** (idempoten, wajib agar bisa login):
   \`\`\`bash
   OWNER_EMAIL=owner@domain-anda OWNER_PASSWORD='GANTI_kuat' OWNER_FULLNAME='Pemilik KOST48' npm run seed:owner
   \`\`\`
7. **Minimal setelah login OWNER**: seed COA (\`POST /api/accounting/default-coa/seed\`) + buat periode OPEN + CashAccount.
8. **Opsional / boleh belakangan: seed data detail** (kamar nyata, foto, barang, fasilitas, FAQ, layanan tambahan):
   \`\`\`bash
   psql "<DATABASE_URL>" -f sql/seed-kost48-default-data.sql
   \`\`\`
   Di phpPgAdmin, upload file \`sql/seed-kost48-default-data.sql\` lewat SQL script bila \`psql\` tidak tersedia.
   Lewati langkah ini dulu kalau targetnya hanya deploy aplikasi hidup; data detail bisa diisi setelah domain dan login OWNER beres.

9. **Restart App** (Setup Node.js App) + **AutoSSL** domain → HTTPS (wajib untuk PWA/push).
10. **Cron Jobs** (auto-ops, tiap 5–10 menit — WAJIB di shared hosting karena Passenger idle-sleep):
   \`curl -fsS -X POST -H "X-Cron-Token: <token>" https://domain-anda/api/auto-ops/cron >/dev/null 2>&1\`
11. **Smoke**: \`https://domain/\` tampil · \`/api/public/rooms\` 200 · login OWNER · trial-balance seimbang ·
   cPanel Resource Usage: memory faults 0.

## Catatan RAM/inode 512MB
- Semua prebuilt; server hanya \`npm ci\` production-only dari lockfile deploy ramping.
- Binary engine Prisma \`*.node\` dibuang — runtime pakai WASM query compiler + driver adapter pg.
- Passenger meng-idle-kan proses saat sepi (RAM turun sendiri); cron membangunkannya.
- Jika Resource Usage menunjukkan memory faults: turunkan \`NODE_OPTIONS\` ke 160.

⚠️ Ganti password OWNER default & JANGAN commit \`.env\`. VPS: \`pm2 start dist/main.js --name kost48\`.
`);

let tarOk = false;
try { spawnSync('tar', ['-czf', 'kost48-deploy.tgz', '-C', OUT, '.'], { stdio: 'ignore', shell: true }); tarOk = existsSync('kost48-deploy.tgz'); } catch {}

const total = countFiles(OUT);
console.log('\n[deploy] SELESAI.');
console.log('  Folder siap-upload : ' + OUT + '/  (' + total + ' file — estimasi pemakaian inode upload)');
if (tarOk) console.log('  Arsip (opsional)   : kost48-deploy.tgz');
console.log('  Di server: npm run cpanel:install -> isi .env -> schema+OWNER -> Restart App  (lihat ' + OUT + '/README-DEPLOY.md)');
