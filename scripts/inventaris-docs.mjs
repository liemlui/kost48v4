#!/usr/bin/env node
/**
 * inventaris-docs.mjs — alat ukur dokumentasi KOST48 (baca-saja).
 *
 * Mengukur korpus dokumen aktif (docs/ tanpa arsip), jalur baca wajib (tier-0),
 * mojibake, emoji, dan sensus pola ID. Tidak menulis berkas apa pun.
 *
 * Pakai:
 *   node scripts/inventaris-docs.mjs
 *   node scripts/inventaris-docs.mjs --selftest
 *
 * Angka yang dicetak hanya berlaku untuk pohon kerja saat perintah dijalankan;
 * dokumen wajib menuliskannya sebagai "potret <tanggal>" + perintah ini.
 *
 * Batas yang diketahui:
 * - Sensus ID memakai heuristik regex, bukan parser. Ia menghitung pola, bukan makna;
 *   dua token yang sama bisa berarti dua hal (itulah temuan yang ingin ditunjukkan).
 * - Mojibake dihitung dari pola byte khas salah decode UTF-8, termasuk kutipan sengaja.
 * - Emoji dihitung pada tier-0 saja.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOCS = path.join(ROOT, 'docs');
const SKIP_DIRS = new Set(['arsip', 'assets']);
const TIER0 = [
  'AGENTS.md',
  'docs/KONTRAK.md',
  'docs/ANTREAN.md',
  'docs/PETA-KODE.md',
  'docs/KEPUTUSAN-OWNER.md',
];

const MOJIBAKE = [/â€/g, /Ã[\u0080-\u00BF]/g, /Â[\u0080-\u00BF]/g, /ï¿½/g, /\uFFFD/g, /â”/g];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const ID = /\b(?:[A-Z]{1,4}-[A-Z0-9]{1,5}(?:-[A-Z0-9]{1,5})?|[A-Z]{1,3}\d{1,3}[a-z]?)\b/g;
const NOISE = new Set([
  'HTML', 'HTTP', 'JSON', 'UTF', 'API', 'PDF', 'CSV', 'PNG', 'JPG', 'URL', 'ID', 'OK',
  'PR', 'SHA', 'LF', 'CRLF', 'CSS', 'SQL', 'JWT', 'PWA', 'COA', 'AC', 'KM', 'LT', 'LB',
]);

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p, out);
    } else if (e.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function read(p) {
  const buf = fs.readFileSync(p);
  const text = buf.toString('utf8');
  return { bytes: buf.length, lines: text.split('\n').length, text };
}

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function scan(files) {
  const rows = files.map((p) => ({ path: p, ...read(p) }));
  const totals = {
    files: rows.length,
    bytes: rows.reduce((s, r) => s + r.bytes, 0),
    lines: rows.reduce((s, r) => s + r.lines, 0),
  };
  const mojibake = [];
  for (const r of rows) {
    const n = MOJIBAKE.reduce((s, re) => s + countMatches(r.text, re), 0);
    if (n) mojibake.push({ file: rel(r.path), hits: n });
  }
  const ids = new Map();
  for (const r of rows) {
    for (const token of r.text.match(ID) || []) {
      ids.set(token, (ids.get(token) || 0) + 1);
    }
  }
  return { rows, totals, mojibake, ids };
}

function main() {
  const files = walk(DOCS);
  const { rows, totals, mojibake, ids } = scan(files);
  const tier0 = TIER0.map((f) => path.join(ROOT, f)).filter(fs.existsSync).map((p) => ({ path: p, ...read(p) }));

  console.log(`AKTIF docs/: ${totals.files} berkas | ${kb(totals.bytes)} | ${totals.lines} baris`);
  console.log(`TIER0: ${tier0.length} berkas | ${kb(tier0.reduce((s, r) => s + r.bytes, 0))}`);
  for (const r of tier0) console.log(`  ${rel(r.path)} | ${kb(r.bytes)}`);

  console.log(`MOJIBAKE: ${mojibake.reduce((s, m) => s + m.hits, 0)} hit di ${mojibake.length} berkas`);
  for (const m of mojibake) console.log(`  ${m.file} | ${m.hits}`);

  for (const r of tier0) {
    const n = countMatches(r.text, EMOJI);
    if (n) console.log(`EMOJI ${rel(r.path)}: ${n}`);
  }

  const candidates = [...ids.entries()].filter(([k, v]) => v >= 2 && !NOISE.has(k));
  console.log(`ID: ${candidates.length} pola (>=2 kemunculan, di luar daftar noise)`);
  console.log(
    candidates.sort((a, b) => b[1] - a[1]).slice(0, 25)
      .map(([k, v]) => `${k}:${v}`).join(' · '),
  );

  const biggest = rows.sort((a, b) => b.bytes - a.bytes).slice(0, 10);
  console.log('TERBESAR:');
  for (const r of biggest) console.log(`  ${rel(r.path)} | ${kb(r.bytes)}`);
}

function selftest() {
  const sample = 'ID W-OWN-001 dan FEAT-ADM-012; kamar F1; mojibake â€” dan emoji 🧑.';
  const cases = [
    ['mojibake', MOJIBAKE.reduce((s, re) => s + countMatches(sample, re), 0), 1],
    ['emoji', countMatches(sample, EMOJI), 1],
    ['id', (sample.match(ID) || []).length, 3],
  ];
  let failed = 0;
  for (const [name, actual, expected] of cases) {
    const ok = actual === expected;
    console.log(`${ok ? 'OK  ' : 'GAGAL'} ${name}: ${actual} (harap ${expected})`);
    if (!ok) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--selftest')) selftest();
else main();
