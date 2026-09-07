// KOST48 - kompatibilitas nama lama untuk generator deploy kanonik.
// Semua build, install, verifikasi, dan arsip dikerjakan make-deploy.mjs.

import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const archive = 'kost48-deploy-bundled.tgz';
const noBuild = process.argv.includes('--no-build');
const args = ['run', noBuild ? 'make-deploy:fast' : 'make-deploy'];

console.log('[bundle-deploy] Delegasi ke make-deploy' + (noBuild ? ':fast' : '') + '...');
const result = spawnSync(npm, args, { stdio: 'inherit', shell: true });

if (result.error || result.status !== 0) {
  if (result.error) console.error(result.error.message);
  process.exit(Number.isInteger(result.status) && result.status > 0 ? result.status : 1);
}

if (!existsSync(archive) || statSync(archive).size === 0) {
  console.error(`[bundle-deploy] GAGAL: ${archive} tidak dibuat oleh make-deploy.`);
  process.exit(1);
}

console.log(`[bundle-deploy] Selesai: ${archive}`);
