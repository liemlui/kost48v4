// KOST48 — GO-LIVE COMBINED (1 server): backend menyajikan frontend + API dalam 1 proses/port.
// Pakai:  npm run golive:1            (build frontend [/api relatif] -> copy ke backend/client -> build backend -> jalankan dist/main.js)
//         npm run golive:1 --no-build (jalankan saja, tanpa rebuild)
// Keunggulan: 1 port, tanpa CORS, frontend host-agnostic (VITE_API_BASE_URL=/api). Cocok VPS & cPanel/Passenger.
import { readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { spawnSync, execSync } from 'node:child_process';

const PORT = Number(process.env.GOLIVE_PORT || 3000);
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const NO_BUILD = process.argv.includes('--no-build');

function pidsOnPort(port) {
  const pids = new Set();
  try {
    if (isWin) {
      for (const line of execSync('netstat -ano -p tcp', { encoding: 'utf8' }).split(/\r?\n/)) {
        const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
        if (m && Number(m[1]) === port && m[2] !== '0') pids.add(m[2]);
      }
    } else {
      execSync(`lsof -ti tcp:${port} -s tcp:LISTEN`, { encoding: 'utf8' }).split(/\s+/).filter(Boolean).forEach((p) => pids.add(p));
    }
  } catch { /* kosong */ }
  return [...pids];
}
for (const pid of pidsOnPort(PORT)) {
  try { execSync(isWin ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`, { stdio: 'ignore' }); console.log(`[golive] port ${PORT}: proses nyangkut PID ${pid} dihentikan`); } catch {}
}

let dbUrl = '';
try { const e = readFileSync('backend/.env', 'utf8'); const m = e.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m); if (m) dbUrl = m[1].replace('kost48_v3_pro', 'kost48_v3'); } catch {}
if (!dbUrl) { console.error('[golive] DATABASE_URL tak ditemukan di backend/.env'); process.exit(1); }

const ips = [];
for (const l of Object.values(networkInterfaces())) for (const ni of l || []) if (ni.family === 'IPv4' && !ni.internal && !ni.address.startsWith('169.254.')) ips.push(ni.address);
const cors = ['http://localhost:' + PORT, ...ips.map((ip) => `http://${ip}:${PORT}`)].join(',');

if (!NO_BUILD) {
  console.log('[golive] build frontend (combined, VITE_API_BASE_URL=/api)...');
  writeFileSync('frontend/.env.production.local', '# auto (combined) — jangan commit\nVITE_API_BASE_URL=/api\n');
  let r = spawnSync(npm, ['run', 'build'], { cwd: 'frontend', stdio: 'inherit', shell: true });
  if (r.status) { console.error('[golive] build frontend GAGAL'); process.exit(r.status); }
  console.log('[golive] copy frontend/dist -> backend/client');
  rmSync('backend/client', { recursive: true, force: true });
  cpSync('frontend/dist', 'backend/client', { recursive: true });
  console.log('[golive] build backend...');
  r = spawnSync(npm, ['run', 'build'], { cwd: 'backend', stdio: 'inherit', shell: true });
  if (r.status) { console.error('[golive] build backend GAGAL'); process.exit(r.status); }
}

console.log('[golive] menjalankan 1 SERVER (frontend+API) di port ' + PORT + '...');
if (ips.length) setTimeout(() => {
  console.log('\n========================================================');
  console.log('  KOST48 GO-LIVE (1 server) — akses WiFi kos:');
  console.log('    http://' + ips[0] + ':' + PORT + '   (API: /api, same-origin)');
  console.log('    Login OWNER: liem.lui@gmail.com');
  console.log('  Firewall: izinkan inbound ' + PORT + ' (1 port saja).');
  console.log('========================================================\n');
}, 2000);

const env = { ...process.env, NODE_ENV: 'production', DATABASE_URL: dbUrl, CORS_ORIGIN: cors, AUTO_OPS_ENABLED: 'true', PORT: String(PORT) };
const run = spawnSync('node', ['dist/main.js'], { cwd: 'backend', stdio: 'inherit', shell: true, env });
process.exit(run.status ?? 0);
