// KOST48 — build frontend untuk LAN. Auto-deteksi IP LAN, set VITE_API_BASE_URL, lalu build.
// Jalankan: `npm run build:lan`  (override IP: GOLIVE_IP=192.168.x.x npm run build:lan)
import { writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { spawnSync } from 'node:child_process';

const ips = [];
for (const list of Object.values(networkInterfaces())) {
  for (const ni of list || []) {
    if (ni.family === 'IPv4' && !ni.internal && !ni.address.startsWith('169.254.')) ips.push(ni.address);
  }
}
const ip = process.env.GOLIVE_IP || ips[0];
const bePort = process.env.GOLIVE_BE_PORT || '3000';
if (!ip) { console.error('[build:lan] IP LAN tak terdeteksi. Set GOLIVE_IP=<ip> manual.'); process.exit(1); }

const url = `http://${ip}:${bePort}/api`;
writeFileSync(new URL('../.env.production.local', import.meta.url), `# auto-generated oleh build:lan — JANGAN commit\nVITE_API_BASE_URL=${url}\n`);
console.log('[build:lan] IP LAN=' + ip + '  VITE_API_BASE_URL=' + url);
console.log('[build:lan] Setelah build: jalankan `npm run golive` untuk serve di 0.0.0.0:5173');

const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 0);
