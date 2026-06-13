// KOST48 — buat PAKET DEPLOY RAMPING (combined single-server) untuk cPanel/VPS.
// Pakai: npm run make-deploy
// Hasil: folder `deploy/` = backend SOURCE (tanpa node_modules/dist/generated) + frontend PREBUILT (`client/`) + .env.example + README.
// Di server (Linux, SSH): npm ci  ->  npm run build  ->  npm prune --omit=dev  ->  node dist/main.js
// Kenapa build di server: query-engine Prisma platform-spesifik (Windows != Linux) -> di-generate di server.
// Frontend TIDAK dibangun di server (sudah jadi di client/), jadi frontend/node_modules tak perlu di server.
import { rmSync, mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const OUT = 'deploy';

console.log('[deploy] 1/4 build frontend (combined, VITE_API_BASE_URL=/api)...');
writeFileSync('frontend/.env.production.local', '# auto (deploy) — jangan commit\nVITE_API_BASE_URL=/api\n');
let r = spawnSync(npm, ['run', 'build'], { cwd: 'frontend', stdio: 'inherit', shell: true });
if (r.status) { console.error('[deploy] build frontend GAGAL'); process.exit(r.status); }

console.log('[deploy] 2/4 siapkan folder ' + OUT + '/ ...');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log('[deploy] 3/4 copy backend source (tanpa node_modules/dist/generated)...');
for (const item of ['src', 'prisma', 'sql', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.build.json', 'nest-cli.json']) {
  const from = 'backend/' + item;
  if (existsSync(from)) cpSync(from, OUT + '/' + item, { recursive: true });
}
rmSync(OUT + '/src/generated', { recursive: true, force: true }); // prisma client di-regenerate di server (engine Linux)

console.log('[deploy] 4/4 copy frontend prebuilt -> ' + OUT + '/client ...');
cpSync('frontend/dist', OUT + '/client', { recursive: true });

writeFileSync(OUT + '/.env.example', [
  '# Salin jadi .env (VPS) atau isi di cPanel "Environment Variables".',
  'DATABASE_URL="postgresql://USER:PASS@HOST:5432/kost48_v3?schema=public"',
  'JWT_SECRET="ganti-dengan-secret-acak-kuat-min-32-char"',
  'NODE_ENV=production',
  'CORS_ORIGIN="https://domain-anda"   # combined same-origin: cukup domainnya',
  '# Auto-ops: VPS/always-on -> AUTO_OPS_ENABLED=true. Shared hosting/Passenger (idle-sleep)',
  '# -> AUTO_OPS_ENABLED=false + AUTO_OPS_CRON_TOKEN, lalu cPanel Cron panggil GET /api/auto-ops/cron.',
  'AUTO_OPS_ENABLED=true',
  'AUTO_OPS_CRON_TOKEN="ganti-token-cron-acak-panjang"   # wajib bila pakai cron (shared hosting)',
  '# PORT: cPanel/Passenger mengatur sendiri. VPS: set mis. PORT=3000.',
  '# FRONTEND_DIST_PATH opsional (default <backend>/client sudah benar).',
  '',
].join('\n'));

writeFileSync(OUT + '/README-DEPLOY.md', `# KOST48 — Deploy (combined single-server)

Paket ini = backend (source) + frontend sudah di-build (\`client/\`). Server menjalankan SATU proses Node yang melayani frontend + API.

## Prasyarat host
- Node.js (>=18) — cPanel "Setup Node.js App" / VPS.
- PostgreSQL (buat DB \`kost48_v3\` + user).
- SSH (untuk perintah di bawah).

## Langkah (SSH di folder app, di dalam Node venv cPanel)
\`\`\`bash
# 1. Setup 1 perintah: install + build (prisma generate engine Linux + tsc) + buang devDeps -> RAMPING
npm run cpanel:setup

# 2. Env: isi DATABASE_URL/JWT_SECRET/CORS_ORIGIN (cPanel "Environment Variables" atau .env dari .env.example)

# 3. Skema + seed DB (sekali)
npm run cpanel:migrate        # = prisma db push (skema ke PostgreSQL)
psql "<DATABASE_URL>" -f sql/bootstrap.sql
psql "<DATABASE_URL>" -f sql/bootstrap_v4_addendum.sql
# Buat OWNER pertama (ganti password!) — contoh:
#   INSERT INTO "User"("fullName",email,"passwordHash",role,"isActive","createdAt","updatedAt")
#   VALUES('Owner','owner@domain', '<bcrypt-hash>', 'OWNER', true, now(), now());
# Lalu login OWNER -> seed COA (POST /api/accounting/default-coa/seed) + periode OPEN + CashAccount.

# 4. Start
#   cPanel: set Startup File = dist/main.js, lalu Restart App.
#   VPS:    pm2 start dist/main.js --name kost48   (atau: node dist/main.js)
\`\`\`

## Setelah jalan
- Buka https://domain-anda (frontend) — API di /api (same-origin, tanpa CORS).
- AutoSSL/Let's Encrypt untuk HTTPS (PWA penuh).
- **Auto-ops (shared hosting/Passenger idle-sleep):** set AUTO_OPS_ENABLED=false + AUTO_OPS_CRON_TOKEN, lalu cPanel **Cron Jobs** tiap 5-10 menit:
  \`curl -fsS -H "X-Cron-Token: <token>" https://domain-anda/api/auto-ops/cron >/dev/null 2>&1\`
  (Always-on/VPS: cukup AUTO_OPS_ENABLED=true, cron opsional.)
- **Yang TIDAK perlu di server:** \`frontend/node_modules\` (frontend sudah di-build di \`client/\`).
`);

let tarOk = false;
try { spawnSync('tar', ['-czf', 'kost48-deploy.tgz', '-C', OUT, '.'], { stdio: 'ignore', shell: true }); tarOk = existsSync('kost48-deploy.tgz'); } catch {}

console.log('\n[deploy] SELESAI.');
console.log('  Folder siap-upload : ' + OUT + '/');
if (tarOk) console.log('  Arsip (opsional)   : kost48-deploy.tgz');
console.log('  Di server: npm ci -> npm run build -> npm prune --omit=dev -> node dist/main.js  (lihat ' + OUT + '/README-DEPLOY.md)');
