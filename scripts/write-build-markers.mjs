import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

function collectFiles(path, files) {
  const stat = statSync(path);
  if (stat.isFile()) { files.push(path.replaceAll('\\', '/')); return; }
  for (const child of readdirSync(path, { withFileTypes: true })) {
    collectFiles(path + '/' + child.name, files);
  }
}

function fingerprint(dir, inputs) {
  const files = [];
  for (const p of inputs) collectFiles(dir + '/' + p.replace(/^[^/]+\//, ''), files);
  files.sort();
  const hash = createHash('sha256');
  for (const f of files) { hash.update(f); hash.update('\0'); hash.update(readFileSync(f)); hash.update('\0'); }
  return { sha256: hash.digest('hex'), fileCount: files.length };
}

const baseDir = process.cwd();

// Frontend marker
const feInputs = ['frontend/src','frontend/public','frontend/index.html','frontend/package.json','frontend/package-lock.json','frontend/tsconfig.json','frontend/vite.config.ts','frontend/tsconfig.app.json','frontend/tsconfig.node.json'];
const feFiles = [];
for (const p of feInputs) collectFiles(baseDir + '/' + p, feFiles);
feFiles.sort();
const feHash = createHash('sha256');
for (const f of feFiles) { feHash.update(f); feHash.update('\0'); feHash.update(readFileSync(f)); feHash.update('\0'); }
const feMarker = { version: 1, target: 'frontend', createdAt: new Date().toISOString(), node: process.version, sha256: feHash.digest('hex'), fileCount: feFiles.length };
writeFileSync('frontend/dist/.kost48-build-manifest.json', JSON.stringify(feMarker, null, 2) + '\n');
console.log('Frontend marker written, files:', feFiles.length);

// Backend marker
const beInputs = ['backend/src','backend/prisma/schema.prisma','backend/package.json','backend/package-lock.json','backend/nest-cli.json','backend/prisma.config.ts','backend/tsconfig.json','backend/tsconfig.build.json'];
const beFiles = [];
for (const p of beInputs) collectFiles(baseDir + '/' + p, beFiles);
beFiles.sort();
const beHash = createHash('sha256');
for (const f of beFiles) { beHash.update(f); beHash.update('\0'); beHash.update(readFileSync(f)); beHash.update('\0'); }
const beMarker = { version: 1, target: 'backend', createdAt: new Date().toISOString(), node: process.version, sha256: beHash.digest('hex'), fileCount: beFiles.length };
writeFileSync('backend/dist/.kost48-build-manifest.json', JSON.stringify(beMarker, null, 2) + '\n');
console.log('Backend marker written, files:', beFiles.length);
