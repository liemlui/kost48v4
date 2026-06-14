import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { gzipSync } from 'node:zlib';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const publicDir = resolve(frontendRoot, 'public');
const distDir = resolve(frontendRoot, 'dist');
const assetsDir = resolve(distDir, 'assets');
const MAX_INITIAL_JS_GZIP = 380 * 1024;
const MAX_INITIAL_CSS_GZIP = 120 * 1024;

function readText(path) {
  assert.ok(existsSync(path), `Missing required file: ${path}`);
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function pngDimensions(path) {
  const bytes = readFileSync(path);
  assert.equal(
    bytes.subarray(1, 4).toString('ascii'),
    'PNG',
    `${path} is not a PNG file`,
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function resolveWebPath(baseDir, webPath) {
  assert.ok(webPath.startsWith('/'), `Expected absolute web path: ${webPath}`);
  return resolve(baseDir, webPath.slice(1));
}

function gzipBytes(paths) {
  return paths.reduce(
    (total, path) => total + gzipSync(readFileSync(path)).byteLength,
    0,
  );
}

assert.ok(existsSync(distDir), 'dist/ is missing; run the production build first.');

const publicManifest = readJson(resolve(publicDir, 'manifest.webmanifest'));
const distManifest = readJson(resolve(distDir, 'manifest.webmanifest'));
assert.deepEqual(distManifest, publicManifest, 'Built manifest differs from public source.');

for (const field of ['id', 'name', 'short_name', 'start_url', 'scope', 'display']) {
  assert.ok(publicManifest[field], `Manifest field is required: ${field}`);
}
assert.equal(publicManifest.scope, '/', 'Manifest scope must cover the whole app.');
assert.ok(
  publicManifest.start_url.startsWith('/'),
  'Manifest start_url must be same-origin and absolute.',
);

const iconSizes = new Set();
let hasMaskableIcon = false;
for (const icon of publicManifest.icons ?? []) {
  assert.equal(icon.type, 'image/png', `Unexpected icon type for ${icon.src}`);
  const sourcePath = resolveWebPath(publicDir, icon.src);
  const builtPath = resolveWebPath(distDir, icon.src);
  assert.ok(existsSync(sourcePath), `Missing source icon: ${icon.src}`);
  assert.ok(existsSync(builtPath), `Missing built icon: ${icon.src}`);

  const declared = /^(\d+)x(\d+)$/.exec(icon.sizes);
  assert.ok(declared, `Invalid icon size declaration: ${icon.sizes}`);
  const dimensions = pngDimensions(sourcePath);
  assert.deepEqual(
    dimensions,
    { width: Number(declared[1]), height: Number(declared[2]) },
    `Icon dimensions do not match manifest: ${icon.src}`,
  );
  iconSizes.add(icon.sizes);
  if ((icon.purpose ?? '').split(/\s+/).includes('maskable')) {
    hasMaskableIcon = true;
  }
}
assert.ok(iconSizes.has('192x192'), 'Manifest needs a 192x192 icon.');
assert.ok(iconSizes.has('512x512'), 'Manifest needs a 512x512 icon.');
assert.ok(hasMaskableIcon, 'Manifest needs a maskable icon.');

for (const file of [
  'index.html',
  'manifest.webmanifest',
  'offline.html',
  'sw.js',
  'version.json',
]) {
  assert.ok(existsSync(resolve(distDir, file)), `Missing production PWA file: ${file}`);
}

const indexHtml = readText(resolve(distDir, 'index.html'));
const serviceWorker = readText(resolve(distDir, 'sw.js'));
const sourceServiceWorker = readText(resolve(publicDir, 'sw.js'));
const offlineHtml = readText(resolve(distDir, 'offline.html'));
const version = readJson(resolve(distDir, 'version.json'));

new Script(serviceWorker, { filename: 'dist/sw.js' });
assert.match(version.buildId, /^[A-Za-z0-9_-]+$/, 'Invalid generated build ID.');
assert.ok(
  indexHtml.includes(`name="kost48-build" content="${version.buildId}"`),
  'index.html does not expose the generated build ID.',
);
assert.ok(
  serviceWorker.includes(`const BUILD_ID = '${version.buildId}'`),
  'Service worker does not use the generated build ID.',
);
assert.ok(
  sourceServiceWorker.includes('__KOST48_BUILD_ID__'),
  'Source service worker lost its build ID placeholder.',
);
assert.ok(
  !serviceWorker.includes('__KOST48_BUILD_ID__'),
  'Built service worker still contains the build ID placeholder.',
);

for (const contract of [
  "request.method !== 'GET'",
  "request.headers.has('Authorization')",
  "url.pathname.startsWith('/api/')",
  "cacheControl",
  'NAVIGATION_TIMEOUT_MS',
  'navigationPreload',
  'offline.html',
  'SKIP_WAITING',
]) {
  assert.ok(serviceWorker.includes(contract), `Service worker contract missing: ${contract}`);
}
for (const sensitivePath of [
  '/payment-submissions/proofs',
  '/tickets/images',
  '/announcements/images',
]) {
  assert.ok(
    !serviceWorker.includes(sensitivePath),
    `Sensitive media path must not be cached: ${sensitivePath}`,
  );
}
assert.doesNotMatch(
  serviceWorker,
  /addEventListener\(\s*['"](?:push|sync|periodicsync)['"]/,
  'Push/background sync must remain disabled until backend controls exist.',
);
assert.match(offlineHtml, /<html[^>]+lang="id"/i, 'Offline page must declare Indonesian.');
assert.match(offlineHtml, /<title>[^<]+<\/title>/i, 'Offline page needs a title.');

const initialAssetPaths = [
  ...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g),
].map((match) => resolveWebPath(distDir, match[1]));
assert.ok(initialAssetPaths.length >= 2, 'Unable to identify initial JS/CSS assets.');
for (const path of initialAssetPaths) {
  assert.ok(existsSync(path), `index.html references a missing asset: ${path}`);
}

const initialJs = initialAssetPaths.filter((path) => extname(path) === '.js');
const initialCss = initialAssetPaths.filter((path) => extname(path) === '.css');
const initialJsGzip = gzipBytes(initialJs);
const initialCssGzip = gzipBytes(initialCss);
assert.ok(
  initialJsGzip <= MAX_INITIAL_JS_GZIP,
  `Initial JS gzip budget exceeded: ${initialJsGzip} > ${MAX_INITIAL_JS_GZIP}`,
);
assert.ok(
  initialCssGzip <= MAX_INITIAL_CSS_GZIP,
  `Initial CSS gzip budget exceeded: ${initialCssGzip} > ${MAX_INITIAL_CSS_GZIP}`,
);

const jsChunks = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
assert.ok(jsChunks.length >= 10, 'Route code splitting regressed: too few JS chunks.');

console.log(
  [
    'PWA verification passed.',
    `build=${version.buildId}`,
    `chunks=${jsChunks.length}`,
    `initial-js-gzip=${Math.round(initialJsGzip / 1024)} KiB`,
    `initial-css-gzip=${Math.round(initialCssGzip / 1024)} KiB`,
  ].join(' '),
);
