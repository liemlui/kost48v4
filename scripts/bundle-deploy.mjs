// KOST48 — BUNDLED DEPLOY (termasuk node_modules) untuk cPanel 512MB
// ============================================================================
// Masalah : npm ci di server cPanel (RAM 512MB) OOM / Killed.
// Solusi  : install production node_modules di LOKAL (RAM besar),
//           masukkan ke TGZ → server tinggal extract + node dist/main.js.
//           TANPA npm install di server! Nol.
//
// Alur    : build (make-deploy) → npm ci di deploy/ → TGZ bundled
// Server  : extract TGZ → cp .env.example .env → node dist/main.js
//
// Pakai   : npm run bundle:deploy           (build + bundle, 5-10 menit)
//           npm run bundle:deploy:fast      (skip build, pakai build existing)
// ============================================================================

import {
  rmSync,
  existsSync,
  renameSync,
  statSync,
  readdirSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// ── Konfigurasi ────────────────────────────────────────────────────────────
const OUT = 'deploy';
const ARCHIVE = 'kost48-deploy-bundled.tgz';
const ARCHIVE_TMP = ARCHIVE + '.tmp';
const NO_BUILD = process.argv.includes('--no-build');

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fail(message, exitCode = 1) {
  console.error('\n[bundle-deploy] ❌ GAGAL: ' + message);
  process.exit(exitCode);
}

function run(label, cmd, args, cwd) {
  console.log('[bundle-deploy] ' + label + ' ...');
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.error || r.status !== 0) {
    if (r.error) console.error(r.error.message);
    fail(label, Number.isInteger(r.status) && r.status > 0 ? r.status : 1);
  }
  return r;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  KOST48 — Bundled Deploy (node_modules included)        ║');
console.log('║  Target: cPanel shared hosting ≤ 512MB RAM              ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 1. Hapus arsip lama
rmSync(ARCHIVE, { force: true });
rmSync(ARCHIVE_TMP, { force: true });

// 2. Jalankan make-deploy (full build + setup deploy folder)
const makeDeployArgs = NO_BUILD ? ['run', 'make-deploy:fast'] : ['run', 'make-deploy'];
run('Step 1/4: Build frontend + backend + setup deploy folder (make-deploy)',
  npm, makeDeployArgs, '.');

// Verifikasi deploy folder sudah siap
if (!existsSync(join(OUT, 'package.json'))) {
  fail('Folder deploy/ tidak berisi package.json — make-deploy gagal?');
}
if (!existsSync(join(OUT, 'dist/main.js'))) {
  fail('Folder deploy/ tidak berisi dist/main.js — make-deploy gagal?');
}

// 3. Install production dependencies DI DALAM deploy/
console.log('');
console.log('────────────────────────────────────────────────────────');
console.log('  Step 2/4: Install production node_modules di deploy/');
console.log('  (ini yang bikin server TIDAK perlu npm install)');
console.log('────────────────────────────────────────────────────────');

// Hapus node_modules di deploy kalau ada dari run sebelumnya (supaya fresh)
rmSync(join(OUT, 'node_modules'), { recursive: true, force: true });

// Gunakan npm ci dari lockfile yang sudah direkonsiliasi oleh make-deploy
run('  npm ci --omit=dev (production only) di deploy/',
  npm, [
    'ci',
    '--omit=dev',
    '--omit=optional',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--progress=false',
  ], OUT);

// Verifikasi node_modules terinstall
if (!existsSync(join(OUT, 'node_modules'))) {
  fail('node_modules tidak terinstall di deploy/ — npm ci gagal?');
}

// Hitung ukuran node_modules
function countDirSize(dir) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += countDirSize(p);
      } else {
        total += statSync(p).size;
      }
    }
  } catch { /* ignore permission errors */ }
  return total;
}
const nmSize = countDirSize(join(OUT, 'node_modules'));
console.log('  node_modules/ terinstall di deploy/  (ukuran: ' + formatMB(nmSize) + ')');

// 4. Buat TGZ bundled (termasuk node_modules)
console.log('');
console.log('────────────────────────────────────────────────────────');
console.log('  Step 3/4: Buat arsip TGZ (dist + client + node_modules + prisma + sql)');
console.log('────────────────────────────────────────────────────────');

run('  tar -czf kost48-deploy-bundled.tgz', 'tar', ['-czf', ARCHIVE_TMP, '-C', OUT, '.'], '.');

if (!existsSync(ARCHIVE_TMP) || statSync(ARCHIVE_TMP).size === 0) {
  rmSync(ARCHIVE_TMP, { force: true });
  fail('tar selesai tanpa menghasilkan arsip yang valid.');
}

// 5. Verifikasi isi arsip
console.log('');
console.log('────────────────────────────────────────────────────────');
console.log('  Step 4/4: Verifikasi isi arsip');
console.log('────────────────────────────────────────────────────────');

// List isi arsip untuk verifikasi
const listResult = spawnSync('tar', ['-tzf', ARCHIVE_TMP], { encoding: 'utf8' });
const entries = new Set(
  (listResult.stdout || '')
    .split(/\r?\n/)
    .map(e => e.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''))
    .filter(Boolean),
);

const required = ['dist/main.js', 'client/index.html', 'package.json', 'node_modules'];
const missing = required.filter(r => !entries.has(r));
if (missing.length > 0) {
  rmSync(ARCHIVE_TMP, { force: true });
  fail('Arsip tidak lengkap — tidak ditemukan: ' + missing.join(', '));
}

// Verifikasi tidak ada .env atau uploads
for (const entry of entries) {
  const segments = entry.split('/');
  const basename = segments.at(-1);
  if (segments.includes('uploads')) {
    rmSync(ARCHIVE_TMP, { force: true });
    fail('Arsip memuat uploads/ — data pengguna tidak boleh ikut!');
  }
  if ((basename === '.env' || basename.startsWith('.env.')) && basename !== '.env.example') {
    rmSync(ARCHIVE_TMP, { force: true });
    fail('Arsip memuat file environment rahasia: ' + entry);
  }
}

renameSync(ARCHIVE_TMP, ARCHIVE);

// ── Ringkasan ───────────────────────────────────────────────────────────────
const archiveSize = statSync(ARCHIVE).size;

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  ✅ BUNDLED DEPLOY SELESAI                              ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log('  📦 Arsip  : ' + ARCHIVE + '  (' + formatMB(archiveSize) + ')');
console.log('  📁 Isi    : dist/ + client/ + node_modules/ + prisma/ + sql/ + scripts/');
console.log('');
console.log('  🚀 LANGKAH DI cPanel (TANPA npm install):');
console.log('  ─────────────────────────────────────────');
console.log('  1. Upload ' + ARCHIVE + ' ke folder app (File Manager)');
console.log('  2. Extract TGZ (File Manager → Extract)');
console.log('  3. Setup Node.js App (Node 22, startup: dist/main.js)');
console.log('  4. Environment Variables: NODE_OPTIONS=--max-old-space-size=192');
console.log('  5. SSH ke server:');
console.log('       cp .env.example .env && nano .env');
console.log('       (isi DATABASE_URL, JWT_SECRET, CORS_ORIGIN, dll)');
console.log('  6. Setup DB:');
console.log('       psql "<DATABASE_URL>" --single-transaction -v ON_ERROR_STOP=1 -f sql/bootstrap-production-schema.sql');
console.log('       psql "<DATABASE_URL>" -v ON_ERROR_STOP=1 -f sql/seed-production-rooms.sql');
console.log('  7. Seed OWNER:');
console.log('       OWNER_EMAIL=... OWNER_PASSWORD=... OWNER_FULLNAME=... npm run seed:owner');
console.log('  8. Restart App → domain + AutoSSL → ✅ LIVE');
console.log('');
console.log('  💾 TIDAK perlu npm install / npm ci di server!');
console.log('  💾 Semua dependencies SUDAH ada di dalam TGZ.');
console.log('');
