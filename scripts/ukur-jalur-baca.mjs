#!/usr/bin/env node
// ukur-jalur-baca.mjs — cetak biaya baca "jalur wajib" dokumen KOST48.
//
// Gunanya: mengukur APA YANG DIWAJIBKAN aturan (bukan apa yang benar-benar dibaca sebuah sesi).
// Jalankan dari akar repo:  node scripts/ukur-jalur-baca.mjs
// Keluaran: berkas + byte jalur wajib, paket rujukan tersering, dan perbandingan dengan baseline 2026-10-05.
//
// Catatan kejujuran: skrip ini TIDAK bisa tahu berkas mana yang benar-benar dibuka oleh sebuah sesi.
// Untuk uji nyata (Q30), catat manual berkas yang dibuka agen pada satu tugas, lalu bandingkan dengan keluaran ini.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const WAJIB = ["AGENTS.md", "docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"];
const RUJUKAN_SERING = [
  "docs/ATURAN.md",
  "docs/OPERASI.md",
  "docs/AUDIT.md",
  "docs/KEPUTUSAN-OWNER.md",
  "docs/domain/keuangan.md",
];
const BASELINE = { berkas: 50, kb: 1037, catatan: "potret B0 2026-10-05 sebelum rombak" };

const ukur = (f) => {
  const p = join(ROOT, f.split("/").join(sep));
  if (!existsSync(p)) return { f, ada: false, b: 0 };
  return { f, ada: true, b: statSync(p).size };
};
const baris = (x) => `  ${x.ada ? " " : "!"} ${x.f.padEnd(30)} ${(x.b / 1024).toFixed(1).padStart(8)} KB`;

let total = 0, n = 0;
console.log("=== JALUR WAJIB (aturan: dibaca sebelum bertindak) ===");
for (const f of WAJIB) { const x = ukur(f); total += x.b; if (x.ada) n++; console.log(baris(x)); }
console.log(`  ${n} berkas = ${(total / 1024).toFixed(1)} KB`);

let totalR = 0, nR = 0;
console.log("\n=== RUJUKAN TERSERING (dibaca saat topiknya relevan) ===");
for (const f of RUJUKAN_SERING) { const x = ukur(f); totalR += x.b; if (x.ada) nR++; console.log(baris(x)); }
console.log(`  ${nR} berkas = ${(totalR / 1024).toFixed(1)} KB`);

const semua = n + nR;
const semuaKb = (total + totalR) / 1024;
console.log("\n=== PERBANDINGAN ===");
console.log(`  paket wajib+rujukan sekarang : ${semua} berkas / ${semuaKb.toFixed(1)} KB`);
console.log(`  baseline ${BASELINE.catatan.padEnd(18)}: ${BASELINE.berkas} berkas / ${BASELINE.kb} KB`);
console.log(`  selisih                      : ${(100 - (semuaKb / BASELINE.kb) * 100).toFixed(0)}% lebih sedikit`);

// pohon dokumen
const md = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { if (!/arsip|legacy/.test(e.name)) md(full, out); }
    else if (e.name.endsWith(".md")) out.push(full);
  }
  return out;
};
const aktif = md(join(ROOT, "docs"));
const kb = aktif.reduce((a, f) => a + statSync(f).size, 0) / 1024;
console.log(`\n=== POHON DOKUMEN AKTIF (di luar arsip) ===\n  ${aktif.length} berkas / ${kb.toFixed(0)} KB`);

// sanity: berkas wajib harus ada
const hilang = WAJIB.filter((f) => !existsSync(join(ROOT, f.split("/").join(sep))));
if (hilang.length) { console.log(`\nPERINGATAN: berkas wajib hilang: ${hilang.join(", ")}`); process.exitCode = 1; }
