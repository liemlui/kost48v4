import { createHash } from 'node:crypto';
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = resolve(frontendRoot, 'dist');
const indexPath = resolve(distDir, 'index.html');
const serviceWorkerPath = resolve(distDir, 'sw.js');
const versionPath = resolve(distDir, 'version.json');
const BUILD_PLACEHOLDER = '__KOST48_BUILD_ID__';

function listBuildFiles(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = resolve(directory, entry);
      return statSync(path).isDirectory() ? listBuildFiles(path) : [path];
    })
    .filter((path) => path !== versionPath)
    .sort();
}

function normalizeGeneratedMetadata() {
  const indexHtml = readFileSync(indexPath, 'utf8').replace(
    /\s*<meta name="kost48-build" content="[^"]+"\s*\/>/,
    '',
  );
  const serviceWorker = readFileSync(serviceWorkerPath, 'utf8').replace(
    /const BUILD_ID = '[A-Za-z0-9_-]+';/,
    `const BUILD_ID = '${BUILD_PLACEHOLDER}';`,
  );

  if (!serviceWorker.includes(BUILD_PLACEHOLDER)) {
    throw new Error('PWA build ID placeholder is missing from sw.js.');
  }

  writeFileSync(indexPath, indexHtml, 'utf8');
  writeFileSync(serviceWorkerPath, serviceWorker, 'utf8');
}

function deriveBuildId() {
  const hash = createHash('sha256');
  for (const path of listBuildFiles(distDir)) {
    hash.update(relative(distDir, path).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return hash.digest('base64url').slice(0, 12);
}

normalizeGeneratedMetadata();

const buildId = deriveBuildId();
const indexHtml = readFileSync(indexPath, 'utf8').replace(
  '</head>',
  `    <meta name="kost48-build" content="${buildId}" />\n  </head>`,
);
const serviceWorker = readFileSync(serviceWorkerPath, 'utf8').replaceAll(
  BUILD_PLACEHOLDER,
  buildId,
);

writeFileSync(indexPath, indexHtml, 'utf8');
writeFileSync(serviceWorkerPath, serviceWorker, 'utf8');
writeFileSync(
  versionPath,
  `${JSON.stringify({ schema: 1, buildId }, null, 2)}\n`,
  'utf8',
);

console.log(`Stamped PWA build ${buildId}.`);
