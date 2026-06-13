// KOST48 — GO-LIVE satu perintah: pastikan port bebas, build frontend LAN, jalankan backend+frontend bersamaan.
// Pakai:  npm run golive          (bebaskan port -> build:lan -> jalankan keduanya)
//         npm run golive:fast     (tanpa rebuild frontend)
// Port TETAP: backend 3000, frontend 5173 (dipastikan bebas dulu — kill proses nyangkut).
// Zero-dependency (hanya modul bawaan Node). Hentikan dengan Ctrl+C (kedua proses ikut mati).
import { spawn, spawnSync, execSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const BE_PORT = Number(process.env.GOLIVE_BE_PORT || 3000);
const FE_PORT = Number(process.env.GOLIVE_FE_PORT || 5173);
const NO_BUILD = process.argv.includes('--no-build');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function pidsOnPort(port) {
  const pids = new Set();
  try {
    if (isWin) {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      for (const line of out.split(/\r?\n/)) {
        const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
        if (m && Number(m[1]) === port && m[2] !== '0') pids.add(m[2]);
      }
    } else {
      execSync(`lsof -ti tcp:${port} -s tcp:LISTEN`, { encoding: 'utf8' })
        .split(/\s+/).filter(Boolean).forEach((p) => pids.add(p));
    }
  } catch { /* tak ada yang pakai */ }
  return [...pids];
}

function freePort(port, label) {
  for (const pid of pidsOnPort(port)) {
    try {
      execSync(isWin ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`[golive] port ${port} (${label}): proses nyangkut PID ${pid} dihentikan`);
    } catch { /* ignore */ }
  }
}

const ips = [];
for (const list of Object.values(networkInterfaces())) {
  for (const ni of list || []) {
    if (ni.family === 'IPv4' && !ni.internal && !ni.address.startsWith('169.254.')) ips.push(ni.address);
  }
}

console.log('[golive] memastikan port bebas (backend ' + BE_PORT + ', frontend ' + FE_PORT + ')...');
freePort(BE_PORT, 'backend');
freePort(FE_PORT, 'frontend');

if (!NO_BUILD) {
  console.log('[golive] build frontend untuk LAN...');
  const b = spawnSync(npm, ['run', 'build:lan'], { cwd: 'frontend', stdio: 'inherit', shell: true, env: process.env });
  if (b.status) { console.error('[golive] build:lan GAGAL — batal.'); process.exit(b.status); }
}

console.log('[golive] menjalankan backend + frontend...');
const be = spawn(npm, ['run', 'golive'], { cwd: 'backend', stdio: 'inherit', shell: true, env: { ...process.env, PORT: String(BE_PORT) } });
const fe = spawn(npm, ['run', 'golive'], { cwd: 'frontend', stdio: 'inherit', shell: true, env: process.env });

let dead = false;
const stopAll = () => { if (dead) return; dead = true; try { be.kill(); } catch {} try { fe.kill(); } catch {} };
process.on('SIGINT', () => { console.log('\n[golive] menutup (Ctrl+C)...'); stopAll(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); process.exit(0); });
be.on('exit', (c) => { console.log('[golive] backend berhenti (code ' + c + ')'); stopAll(); process.exit(c || 0); });
fe.on('exit', (c) => { console.log('[golive] frontend berhenti (code ' + c + ')'); stopAll(); process.exit(c || 0); });

if (ips.length) {
  setTimeout(() => {
    console.log('\n========================================================');
    console.log('  KOST48 GO-LIVE — akses dari HP/PC di WiFi kos:');
    console.log('    Frontend : http://' + ips[0] + ':' + FE_PORT);
    console.log('    API      : http://' + ips[0] + ':' + BE_PORT + '/api');
    console.log('    Login OWNER: liem.lui@gmail.com');
    console.log('  (firewall inbound ' + BE_PORT + '+' + FE_PORT + ' harus diizinkan — lihat 04_DEPLOY §C)');
    console.log('========================================================\n');
  }, 2500);
}
