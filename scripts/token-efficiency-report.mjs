#!/usr/bin/env node
// FILE: token-efficiency-report.mjs — ukur metrik efisiensi token AI (Fase 6 audit-reasonix)
// Pakai: node scripts/token-efficiency-report.mjs  (jalankan dari root repo)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = /generated|node_modules|\.bak\./;
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
};
const count = (src, re) => (src.match(re) || []).length;

const stats = {};
const big = [], noHeader = [], inlineStyle = [], dateRaw = [], toLocaleAll = [];
for (const [key, root] of [['backend', 'backend/src'], ['frontend', 'frontend/src']]) {
  const s = (stats[key] = { files: 0, lines: 0, anyColon: 0, anyCast: 0 });
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8');
    const lines = src.split('\n').length;
    s.files++; s.lines += lines;
    s.anyColon += count(src, /: any\b/g);
    s.anyCast += count(src, /as any\b/g);
    if (lines > 500) big.push([lines, f]);
    if (lines > 400 && !/^(\/\/|\/\*).*—/.test(src.split('\n')[0])) noHeader.push(f);
    if (key === 'frontend') {
      if (/\.toLocale(Date|Time)String\(/.test(src)) dateRaw.push(f);
      if (/\.toLocaleString\(/.test(src)) toLocaleAll.push(f);
      const n = count(src, /style=\{\{/g);
      if (n > 5) inlineStyle.push([n, f]);
    }
  }
}

console.log('=== TOKEN EFFICIENCY REPORT ===');
for (const [key, s] of Object.entries(stats)) {
  console.log(`${key}: ${s.files} file / ${s.lines} baris · ": any"=${s.anyColon} · "as any"=${s.anyCast}`);
}
console.log(`\n[E9] File >400 baris tanpa header tujuan: ${noHeader.length}`);
noHeader.slice(0, 15).forEach((f) => console.log(`  ${f}`));
console.log(`\n[E7] File FE toLocaleDateString/TimeString: ${dateRaw.length}`);
dateRaw.slice(0, 25).forEach((f) => console.log(`  ${f}`));
console.log(`[E7-info] File FE .toLocaleString( (angka non-uang boleh): ${toLocaleAll.length}`);
console.log(`\n[E11] File FE inline style >5: ${inlineStyle.length}`);
inlineStyle.sort((a, b) => b[0] - a[0]).forEach(([n, f]) => console.log(`  ${n}x  ${f}`));
console.log(`\n[info] File >500 baris: ${big.length} (JANGAN dipecah — cukup section markers)`);
big.sort((a, b) => b[0] - a[0]).slice(0, 10).forEach(([n, f]) => console.log(`  ${n}  ${f}`));
