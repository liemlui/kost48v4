// KOST48 — buat PAKET DEPLOY RAMPING (combined single-server) untuk cPanel/VPS hemat RAM/inode.
// Pakai: npm run make-deploy
// Hasil: folder `deploy/` = backend PREBUILT (`dist/`) + frontend PREBUILT (`client/`) + runtime `node_modules` + prisma/ + seed-owner.
// SEMUA build dan install dependency terjadi DI LOKAL. Di server hanya isi env → start `dist/main.js`; tidak ada npm install atau prisma db push.
// Kenapa TANPA build/install di server: hosting shared 512MB bisa OOM saat tsc/npm ci penuh, dan devDeps memboroskan inode.
// Prisma client hasil generate = WASM query compiler + driver adapter pg → platform-independent;
// binary engine `*.node` (Windows) dibuang dari paket karena tidak dipakai di Linux.
import {
  rmSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const OUT = 'deploy';
const ARCHIVE = 'kost48-deploy-bundled.tgz';
const STALE_ARCHIVE = 'kost48-deploy.tgz';
const ARCHIVE_TMP = ARCHIVE + '.tmp';
const BUILD_MARKER = '.kost48-build-manifest.json';
const NO_BUILD = process.argv.includes('--no-build');

const BUILD_TARGETS = {
  frontend: {
    marker: 'frontend/dist/' + BUILD_MARKER,
    inputs: [
      'frontend/src',
      'frontend/public',
      'frontend/index.html',
      'frontend/package.json',
      'frontend/package-lock.json',
      'frontend/tsconfig.json',
      'frontend/vite.config.ts',
      'frontend/vitest.shims.d.ts',
      'frontend/.env.production',
      'frontend/.env.production.local',
      'frontend/scripts/stamp-pwa-build.mjs',
      'frontend/scripts/verify-pwa.mjs',
    ],
    outputs: ['frontend/dist/index.html'],
  },
  backend: {
    marker: 'backend/dist/' + BUILD_MARKER,
    inputs: [
      'backend/src',
      'backend/prisma/schema.prisma',
      'backend/package.json',
      'backend/package-lock.json',
      'backend/nest-cli.json',
      'backend/prisma.config.ts',
      'backend/tsconfig.json',
      'backend/tsconfig.build.json',
    ],
    outputs: ['backend/dist/main.js', 'backend/dist/generated/prisma/package.json'],
  },
};

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function sortObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function fail(message, exitCode = 1) {
  console.error('[deploy] GAGAL: ' + message);
  process.exit(exitCode);
}

function run(label, cmd, args, cwd) {
  console.log('[deploy] ' + label);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.error || r.status !== 0) {
    if (r.error) console.error(r.error.message);
    fail(label, Number.isInteger(r.status) && r.status > 0 ? r.status : 1);
  }
  return r;
}

function runCaptured(label, cmd, args, cwd) {
  console.log('[deploy] ' + label);
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: true,
  });
  if (r.error || r.status !== 0) {
    if (r.stderr) console.error(r.stderr.trim());
    if (r.error) console.error(r.error.message);
    fail(label, Number.isInteger(r.status) && r.status > 0 ? r.status : 1);
  }
  return r.stdout || '';
}

function requirePath(path, hint) {
  if (!existsSync(path)) {
    fail(path + ' tidak ditemukan. ' + hint);
  }
}

function collectFiles(path, files) {
  requirePath(path, 'Input build wajib tidak boleh hilang.');
  const entry = statSync(path);
  if (entry.isFile()) {
    files.push(path.replaceAll('\\', '/'));
    return;
  }
  for (const child of readdirSync(path, { withFileTypes: true })) {
    collectFiles(path + '/' + child.name, files);
  }
}

function fingerprintInputs(paths) {
  const files = [];
  for (const path of paths) collectFiles(path, files);
  files.sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), fileCount: files.length };
}

function writeBuildMarkers() {
  const createdAt = new Date().toISOString();
  for (const [target, config] of Object.entries(BUILD_TARGETS)) {
    const fingerprint = fingerprintInputs(config.inputs);
    writeJson(config.marker, {
      version: 1,
      target,
      createdAt,
      node: process.version,
      ...fingerprint,
    });
  }
}

function verifyFreshBuilds() {
  for (const [target, config] of Object.entries(BUILD_TARGETS)) {
    for (const output of config.outputs) {
      requirePath(output, 'Jalankan `npm run make-deploy` agar build dibuat ulang.');
    }
    requirePath(
      config.marker,
      '`--no-build` hanya aman setelah minimal satu `npm run make-deploy` berhasil dengan script terbaru.',
    );

    let marker;
    try {
      marker = readJson(config.marker);
    } catch {
      fail(config.marker + ' rusak. Jalankan `npm run make-deploy` agar build dibuat ulang.');
    }
    const current = fingerprintInputs(config.inputs);
    if (marker.version !== 1 || marker.target !== target || marker.sha256 !== current.sha256) {
      fail(
        'build ' + target + ' sudah stale terhadap source/config/lockfile. ' +
        'Jalankan `npm run make-deploy` (tanpa `:fast`).',
      );
    }
  }
}

function invalidateOldPackagingOutputs() {
  // Jangan biarkan kegagalan build/package membuat arsip lama terlihat seperti hasil baru.
  rmSync(ARCHIVE, { force: true });
  rmSync(ARCHIVE_TMP, { force: true });
  rmSync(STALE_ARCHIVE, { force: true });
  rmSync(OUT, { recursive: true, force: true });
}

function writeDeployPackageFiles() {
  const backendPkg = readJson('backend/package.json');
  const backendLock = readJson('backend/package-lock.json');
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

  // Package deploy harus memakai versi runtime yang benar-benar diuji oleh lockfile backend.
  // Membiarkan range ^/~ di sini pernah membuat pg/Nest ikut naik saat packaging saja.
  const pinnedDependencies = {};
  for (const name of Object.keys(dependencies)) {
    const locked = backendLock.packages?.['node_modules/' + name];
    if (!locked?.version) {
      fail(
        'dependency runtime `' + name + '` tidak ditemukan di backend/package-lock.json. ' +
        'Jalankan `npm install` yang sesuai di backend lalu commit lockfile.',
      );
    }
    pinnedDependencies[name] = locked.version;
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
      'seed:owner': 'node scripts/seed-owner.js',
      start: 'node dist/main.js',
      'start:prod': 'node --max-old-space-size=192 dist/main.js',
    },
    dependencies: sortObject(pinnedDependencies),
    ...(backendPkg.overrides ? { overrides: backendPkg.overrides } : {}),
  });

  // Seed npm dengan lockfile backend agar pohon runtime tidak di-resolve ulang dari nol.
  // `npm install --package-lock-only` di bawah hanya merekonsiliasi subset production deploy.
  cpSync('backend/package-lock.json', OUT + '/package-lock.json');

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

function dependencyNameFromLockPath(path) {
  const marker = 'node_modules/';
  const index = path.lastIndexOf(marker);
  return index === -1 ? null : path.slice(index + marker.length);
}

function validateDeployLock() {
  const deployPkg = readJson(OUT + '/package.json');
  const deployLock = readJson(OUT + '/package-lock.json');
  const backendLock = readJson('backend/package-lock.json');
  const rootDependencies = deployLock.packages?.['']?.dependencies || {};
  const expectedDependencies = deployPkg.dependencies || {};

  if (JSON.stringify(sortObject(rootDependencies)) !== JSON.stringify(sortObject(expectedDependencies))) {
    fail('daftar dependency root package-lock deploy tidak identik dengan package.json deploy.');
  }

  for (const [name, expectedVersion] of Object.entries(expectedDependencies)) {
    if (rootDependencies[name] !== expectedVersion) {
      fail('package-lock deploy tidak sinkron untuk `' + name + '` (root dependency).');
    }
    const locked = deployLock.packages?.['node_modules/' + name];
    if (locked?.version !== expectedVersion) {
      fail(
        'package-lock deploy mengunci `' + name + '` ke ' + (locked?.version || 'versi kosong') +
        ', seharusnya ' + expectedVersion + '.',
      );
    }
  }

  const allowedVersions = new Map();
  for (const [path, entry] of Object.entries(backendLock.packages || {})) {
    const name = dependencyNameFromLockPath(path);
    if (!name || !entry.version) continue;
    if (!allowedVersions.has(name)) allowedVersions.set(name, new Set());
    allowedVersions.get(name).add(entry.version);
  }

  for (const [path, entry] of Object.entries(deployLock.packages || {})) {
    const name = dependencyNameFromLockPath(path);
    if (!name || !entry.version) continue;
    if (name === '@prisma/client') {
      fail('package-lock deploy masih memuat @prisma/client yang sengaja dikeluarkan dari runtime prebuilt.');
    }
    if (!allowedVersions.get(name)?.has(entry.version)) {
      fail(
        'dependency drift: lock deploy memuat `' + name + '@' + entry.version +
        '` yang tidak ada di backend/package-lock.json.',
      );
    }
  }
}

function verifyBundledRuntime() {
  for (const required of [
    'node_modules/.package-lock.json',
    'node_modules/@nestjs/common/package.json',
    'node_modules/@prisma/adapter-pg/package.json',
    'node_modules/pg/package.json',
    'node_modules/web-push/package.json',
  ]) {
    requirePath(OUT + '/' + required, 'runtime dependency wajib dibundel lokal; jangan install di server.');
  }
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    n += e.isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

function verifyNoLongLivedIotStream() {
  const forbiddenRules = [
    { label: 'IotSseController', test: (content) => content.includes('IotSseController') },
    { label: 'IotSseService', test: (content) => content.includes('IotSseService') },
    { label: 'text/event-stream', test: (content) => content.includes('text/event-stream') },
    // FullCalendar legitimately uses its own `EventSource` model. Only the
    // browser constructor opens a long-lived HTTP connection.
    { label: 'new EventSource(...)', test: (content) => /\bnew\s+EventSource\s*\(/.test(content) },
  ];
  const matches = [];

  function scan(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = path + '/' + entry.name;
      if (entry.isDirectory()) {
        scan(child);
        continue;
      }
      if (!/\.(?:js|html)$/i.test(entry.name)) continue;
      const content = readFileSync(child, 'utf8');
      const rule = forbiddenRules.find((candidate) => candidate.test(content));
      if (rule) matches.push(child + ' [' + rule.label + ']');
      if (child.startsWith(OUT + '/client/') && content.includes('/api/iot/stream/tenant/raw')) {
        matches.push(child + ' [retired tenant stream endpoint]');
      }
    }
  }

  scan(OUT + '/dist');
  scan(OUT + '/client');
  if (matches.length > 0) {
    fail('runtime deploy masih memuat stream IoT jangka panjang: ' + matches.slice(0, 8).join(', '));
  }
}

function createVerifiedArchive() {
  if (existsSync(OUT + '/uploads')) {
    fail('folder uploads tidak boleh masuk paket deploy; backup data upload harus dikelola terpisah.');
  }
  if (existsSync(OUT + '/.env')) {
    fail('file .env rahasia tidak boleh masuk paket deploy.');
  }

  rmSync(ARCHIVE, { force: true });
  rmSync(ARCHIVE_TMP, { force: true });
  run('buat arsip deploy...', 'tar', ['-czf', ARCHIVE_TMP, '-C', OUT, '.']);

  if (!existsSync(ARCHIVE_TMP) || statSync(ARCHIVE_TMP).size === 0) {
    rmSync(ARCHIVE_TMP, { force: true });
    fail('tar selesai tanpa menghasilkan arsip yang valid.');
  }

  const listing = runCaptured('verifikasi isi arsip deploy...', 'tar', ['-tzf', ARCHIVE_TMP]);
  const entries = new Set(
    listing
      .split(/\r?\n/)
      .map((entry) => entry.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''))
      .filter(Boolean),
  );
  for (const required of [
    'dist/main.js',
    'client/index.html',
    'package.json',
    'package-lock.json',
    'node_modules/.package-lock.json',
    'node_modules/@nestjs/common/package.json',
    'node_modules/@prisma/adapter-pg/package.json',
  ]) {
    if (!entries.has(required)) {
      rmSync(ARCHIVE_TMP, { force: true });
      fail('arsip tidak lengkap: `' + required + '` tidak ditemukan.');
    }
  }
  for (const entry of entries) {
    const segments = entry.split('/');
    const basename = segments.at(-1);
    if (segments.includes('uploads')) {
      rmSync(ARCHIVE_TMP, { force: true });
      fail('arsip memuat uploads; data pengguna tidak boleh ikut ke paket kode.');
    }
    if ((basename === '.env' || basename.startsWith('.env.')) && basename !== '.env.example') {
      rmSync(ARCHIVE_TMP, { force: true });
      fail('arsip memuat file environment rahasia: `' + entry + '`.');
    }
    if (/iot-sse\.(?:controller|service)\.js$/i.test(entry)) {
      rmSync(ARCHIVE_TMP, { force: true });
      fail('arsip memuat implementasi SSE IoT yang sudah dipensiunkan: `' + entry + '`.');
    }
    if (
      entry === 'scripts/seed-prod-reset.js'
      || entry === 'scripts/seed-prod-real.js'
      || entry === 'scripts/seed-data.json'
      || entry === 'scripts/real-seed-assets.js'
      || entry === 'scripts/import-real-historical-assets.js'
    ) {
      rmSync(ARCHIVE_TMP, { force: true });
      fail('arsip memuat seed/data bisnis sensitif: `' + entry + '`. Data real tidak boleh dibawa ke paket kode.');
    }
  }

  renameSync(ARCHIVE_TMP, ARCHIVE);
}

invalidateOldPackagingOutputs();

if (NO_BUILD) {
  console.log('[deploy] 1/6 verifikasi build existing (--no-build)...');
  verifyFreshBuilds();
  console.log('[deploy] build existing cocok dengan source/config/lockfile.');
} else {
  writeFileSync('frontend/.env.production.local', '# auto (deploy) — jangan commit\nVITE_API_BASE_URL=/api\n');
  run('1/6 build frontend (combined, VITE_API_BASE_URL=/api)...', npm, ['run', 'build'], 'frontend');

  run('2/6 build backend (tsc + prisma generate → dist/ + dist/generated)...', npm, ['run', 'build'], 'backend');
  writeBuildMarkers();
}

console.log('[deploy] 3/6 siapkan folder ' + OUT + '/ ...');
mkdirSync(OUT + '/scripts', { recursive: true });

console.log('[deploy] 4/6 copy backend PREBUILT (dist tanpa binary *.node) + prisma + SQL schema/seed + package deploy + frontend client/ ...');
// dist/ prebuilt — buang engine binary platform-spesifik (query_engine-*.dll.node dsb; Linux pakai WASM).
cpSync('backend/dist', OUT + '/dist', {
  recursive: true,
  filter: (src) => !src.endsWith('.node') && !src.endsWith(BUILD_MARKER),
});
cpSync('backend/prisma', OUT + '/prisma', { recursive: true });
if (existsSync('backend/sql')) cpSync('backend/sql', OUT + '/sql', { recursive: true });
writeDeployPackageFiles();
cpSync('backend/scripts/seed-owner.js', OUT + '/scripts/seed-owner.js'); // seed OWNER pertama (F1-12) di server
if (existsSync('backend/scripts/bootstrap-tuya-kwh.js')) cpSync('backend/scripts/bootstrap-tuya-kwh.js', OUT + '/scripts/bootstrap-tuya-kwh.js'); // register 13 KWH Tuya device
cpSync('frontend/dist', OUT + '/client', {
  recursive: true,
  filter: (src) => !src.endsWith(BUILD_MARKER),
});
verifyNoLongLivedIotStream();

run('5/6 buat package-lock runtime produksi...', npm, ['install', '--package-lock-only', '--omit=dev', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--progress=false'], OUT);
validateDeployLock();
run('5/6 bundel dependency runtime secara lokal (server tidak install)...', npm, ['ci', '--omit=dev', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--progress=false'], OUT);
verifyBundledRuntime();

console.log('[deploy] 6/6 tulis .env.example + README + arsip tgz ...');
writeFileSync(OUT + '/.env.example', [
  '# Salin jadi `.env` di ROOT folder app (dibaca app + script seed). JANGAN commit.',
  'DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/kost48_v3?schema=public"',
  'JWT_SECRET="ganti-dengan-secret-acak-kuat-min-32-char"',
  'NODE_ENV=production',
  'CORS_ORIGIN="https://domain-anda"   # combined same-origin: cukup domainnya',
  'KTP_ACTIVATION_GATE_ENABLED=true    # L-4 WAJIB true di produksi (nilai awal row settings; sesudahnya dikelola via UI Settings → Operasional)',
  '# Landing page: booking online ditutup; status kamar diubah lewat wizard footer.',
  'PUBLIC_ONLINE_BOOKING_ENABLED=false',
  '# PIN owner wizard (minimal 6 karakter); tidak pernah disimpan browser.',
  'AVAILABILITY_OWNER_PIN="ganti-dengan-pin-panjang-acak"',
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
  '# ── Tuya IoT Cloud (KWH meter per kamar) ──────────────────────────────────────',
  '# Access ID/Client ID dan Secret dari Tuya IoT Console.',
  '# Dipakai untuk polling 13 KWH meter per kamar (lihat docs/M14_IOT_TUYA_DEVICES.md).',
  '# TUYA_ACCESS_KEY=isi_********************key',
  '# TUYA_SECRET_KEY=isi_**********************cret',
  '# TUYA_API_BASE=https://openapi.tuyaus.com',
  '# Shared hosting: IOT_TUYA_POLL_ENABLED=false + cPanel Cron panggil',
  '# POST /api/iot/tuya/cron tiap 5-10 menit dengan header X-Iot-Cron-Token.',
  '# IOT_TUYA_POLL_ENABLED=false',
  '# IOT_TUYA_POLL_MINUTES=10',
  '# IOT_TUYA_CRON_TOKEN=gant********************jang',
  '# IOT_STALE_AFTER_MINUTES=30',
  '',
  '# ── IoT ESP32 Water Flow (opsional, untuk sensor air) ─────────────────────────',
  '# 32 byte random base64. Dipakai mengenkripsi secret device ESP32-C3.',
  '# Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  '# ⚠️ SIMPAN IOT_MASTER_KEY ini — JANGAN diubah antar deploy. Kalau hilang, ESP32 harus di-provision ulang.',
  '# IOT_MASTER_KEY=isi_dengan_base64_32_byte_yang_disimpan_aman',
  '',
].join('\n'));

writeFileSync(OUT + '/README-DEPLOY.md', `# KOST48 v1.3.0 — Deploy cPanel/VPS (PREBUILT, include node_modules)

Kode aplikasi sudah di-build di lokal. Server tetap memasang dependency runtime terkunci dengan \`npm run cpanel:install\`.
Tanpa tsc, tanpa prisma generate, tanpa devDependencies — aman untuk hosting RAM 512MB & limit inode.

## 🚀 Langkah cPanel (1x run, ≈20 menit)

1. **PostgreSQL Databases**: buat DB produksi BARU (mis. \`kost48_prod\`) + user + all privileges. Jangan drop DB UAT. Catat kredensial.
2. **Upload** \`kost48-deploy.tgz\` ke folder app (mis. \`~/kost48\`) → File Manager: Extract.
3. **Setup Node.js App**: Node **22** · Application root = folder app · **Startup file = \`dist/main.js\`**
   - Environment Variables: **\`NODE_OPTIONS=--max-old-space-size=192\`** (batas heap; tidak bisa via .env)
4. **SSH** (masuk venv Node dari halaman Setup Node.js App):
   \`\`\`bash
   cp .env.example .env && nano .env
   # isi: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, AUTO_OPS_CRON_TOKEN, IOT_TUYA_CRON_TOKEN, IOT_MASTER_KEY
   npm run cpanel:install
   \`\`\`
5. **Setup database** — hanya untuk database produksi baru/kosong. Jangan drop UAT, jangan impor seed historis, dan jangan gunakan db push:
   \`\`\`bash
   # Migration ledger produksi (Prisma 7.8.0)
   npm run cpanel:migrate
   OWNER_EMAIL=owner@domain-anda OWNER_PASSWORD='buat-password-kuat' OWNER_FULLNAME='Pemilik KOST48' node scripts/seed-owner.js
   \`\`\`
   > Sebelum start, pasang dan verifikasi bootstrap guard database yang khusus schema. \`sql/seed.sql\` membawa data historis/PII dan DILARANG untuk produksi. Lihat \`docs/DEPLOYMENT_ONLINE_20260723.md\` di source release untuk gate lengkap.
6. **Start App** (Setup Node.js App → Start) + **AutoSSL** domain → HTTPS.
7. **Cron Jobs** (WAJIB — Passenger idle-sleep):
   \`\`\`
   */5  * * * * curl -fsS -X POST -H "X-Cron-Token: <TOKEN>" https://domain/api/auto-ops/cron
   */10 * * * * curl -fsS -X POST -H "X-Iot-Cron-Token: <TOKEN>" https://domain/api/iot/tuya/cron
   \`\`\`
8. **Smoke**: \`https://domain/\` tampil · \`/api/public/rooms\` 200 · login OWNER.

## Redeploy (update)
\`\`\`bash
# Stop app → backup DB + uploads/ → extract TGZ baru → npm run cpanel:install bila lockfile berubah
# Untuk produksi yang sudah berisi data: npm run cpanel:migrate (patch-only) → Start app.
\`\`\`

## Catatan RAM 512MB
- Semua prebuilt; server tidak build apa pun.
- Passenger idle-sleep saat sepi; cron membangunkannya.
- Jika memory faults: turunkan \`NODE_OPTIONS\` ke 160.

⚠️ Jangan commit \`.env\`, data tenant, KTP/NIK, atau password. VPS: \`pm2 start dist/main.js --name kost48\`.
`);

// Override README lama: bundle sekarang benar-benar membawa runtime node_modules.
writeFileSync(OUT + '/README-DEPLOY.md', [
  '# KOST48 — Bundle cPanel/VPS siap-jalankan',
  '',
  'Kode backend, frontend, Prisma client hasil generate, dan runtime node_modules sudah dibundel dari workstation.',
  'Di server jangan menjalankan npm install, npm ci, prisma db push, atau build/generate apa pun.',
  '',
  '## Langkah server',
  '',
  '1. Upload kost48-deploy-bundled.tgz ke application root lalu extract.',
  '2. Setup Node.js App: Node 22, mode Production, application root folder hasil extract, startup file dist/main.js.',
  '   Atur NODE_OPTIONS=--max-old-space-size=192 pada Environment Variables cPanel.',
  '3. Salin dan isi environment: cp .env.example .env lalu edit .env tanpa mengirim secret ke chat.',
  '   Untuk shared hosting gunakan AUTO_OPS_ENABLED=false dan IOT_TUYA_POLL_ENABLED=false.',
  '4. Database BARU/kosong: jalankan bootstrap schema sekali dari Terminal. Perintah ini berhenti bila database sudah berisi tabel:',
  '   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f sql/bootstrap-production-schema.sql',
  '   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/seed-production-rooms.sql',
  '   Bootstrap memasang schema.sql dan migration 20260723 + 20260724. Seed hanya membuat 13 kamar tanpa tenant/transaksi.',
  '   Jangan jalankan pada database UAT/produksi yang sudah berisi data; jangan gunakan prisma db push/reset atau sql/seed.sql.',
  '5. Setelah bootstrap schema berhasil, buat OWNER sekali saja:',
  "   OWNER_EMAIL=owner@domain-anda OWNER_PASSWORD='password-kuat-unik' OWNER_FULLNAME='Pemilik KOST48' node scripts/seed-owner.js",
  '   Jangan menyimpan OWNER_PASSWORD permanen di .env.',
  '6. Klik Restart Application di cPanel, aktifkan AutoSSL/HTTPS, lalu smoke test / dan /api/public/rooms.',
  '7. Setelah UAT lulus, pasang cron hanya bila AUTO_OPS/IOT memang diaktifkan:',
  '   */5  * * * * curl -fsS -X POST -H "X-Cron-Token: <TOKEN>" https://domain/api/auto-ops/cron >/dev/null 2>&1',
  '   */10 * * * * curl -fsS -X POST -H "X-Iot-Cron-Token: <TOKEN>" https://domain/api/iot/tuya/cron >/dev/null 2>&1',
  '',
  '## Redeploy',
  '',
  'Stop aplikasi → backup DB/uploads → extract bundle baru tanpa menimpa .env/uploads → Restart Application → smoke/UAT.',
  'Bundle sudah memuat dependency runtime; tidak ada perintah npm di server.',
  '',
  'Jangan commit .env, data tenant, KTP/NIK, atau password.',
  '',
].join('\n'));

createVerifiedArchive();

const total = countFiles(OUT);
console.log('\n[deploy] SELESAI.');
console.log('  Folder siap-upload : ' + OUT + '/  (' + total + ' file — estimasi pemakaian inode upload)');
console.log('  Arsip terverifikasi: ' + ARCHIVE);
console.log('  Di server: extract bundle -> isi .env -> verifikasi DB/guard -> Restart App (tanpa npm install/prisma db push; lihat ' + OUT + '/README-DEPLOY.md)');
