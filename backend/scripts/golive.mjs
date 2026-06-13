// KOST48 — go-live LAN (mode produksi, DB kost48_v3). Jalankan: `npm run golive`
// Zero-dependency: set env produksi + auto-deteksi IP LAN untuk CORS, lalu `npm run start`.
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { spawnSync } from 'node:child_process';

// 1) DATABASE_URL produksi = .env (swap kost48_v3_pro -> kost48_v3)
let dbUrl = '';
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (m) dbUrl = m[1].replace('kost48_v3_pro', 'kost48_v3');
} catch (e) { /* ignore */ }
if (!dbUrl) { console.error('[go-live] DATABASE_URL tidak ditemukan di backend/.env'); process.exit(1); }
if (!/\/kost48_v3(\?|$)/.test(dbUrl)) dbUrl = dbUrl.replace(/\/[a-zA-Z0-9_]+(\?|$)/, '/kost48_v3$1');

// 2) Deteksi semua IPv4 LAN → CORS allowlist (frontend di port FE)
const fePort = process.env.GOLIVE_FE_PORT || '5173';
const ips = [];
for (const list of Object.values(networkInterfaces())) {
  for (const ni of list || []) {
    if (ni.family === 'IPv4' && !ni.internal && !ni.address.startsWith('169.254.')) ips.push(ni.address);
  }
}
const cors = ['http://localhost:' + fePort, ...ips.map((ip) => `http://${ip}:${fePort}`)].join(',');

// 3) Env produksi
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = dbUrl;
process.env.CORS_ORIGIN = cors;
process.env.PORT = process.env.PORT || '3000';
process.env.AUTO_OPS_ENABLED = process.env.AUTO_OPS_ENABLED || 'true';

console.log('[go-live] mode=production  port=' + process.env.PORT);
console.log('[go-live] DB=' + dbUrl.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@'));
console.log('[go-live] CORS_ORIGIN=' + cors);
if (ips.length) console.log('[go-live] Akses LAN: http://' + ips[0] + ':' + fePort + ' (frontend: cd frontend && npm run golive)');

// 4) Jalankan backend
const r = spawnSync('npm', ['run', 'start'], { stdio: 'inherit', env: process.env, shell: true });
process.exit(r.status ?? 0);
