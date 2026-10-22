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
import { join, resolve, relative, sep, isAbsolute } from "node:path";

const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".");
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
  const p = isAbsolute(f) ? f : join(ROOT, f.split("/").join(sep));
  if (!existsSync(p)) return { f, ada: false, b: 0 };
  return { f, ada: true, b: statSync(p).size };
};
const baris = (x) => `  ${x.ada ? " " : "!"} ${x.f.padEnd(30)} ${(x.b / 1024).toFixed(1).padStart(8)} KB`;

// ── mode --baca (D7 DOCS-GEN2): hitung biaya baca AKTUAL sebuah tugas ────────
// Aturan: model menilai berkas mana yang masuk konteks; skrip ini MENGHITUNG byte-nya.
// Format laporan: `BACA: <n> berkas / <KB>`. Anggaran per level diturunkan dari token
// indikatif AGENTS §5 × 4 (KONTRAK §3: token ≈ byte/4) — lihat default-dev §12.
const ANGGARAN_KB = { XS: [4, 12], S: [12, 28], M: [28, 60], L: [60, 120], XL: [40, 100] };
const iBaca = process.argv.indexOf("--baca");
if (iBaca >= 0) {
  const argumen = process.argv.slice(iBaca + 1).filter((a) => !a.startsWith("--"));
  const level = (process.argv.find((a) => a.startsWith("--level=")) || "").split("=")[1];
  if (argumen.length === 0) {
    console.error("pakai: node scripts/ukur-jalur-baca.mjs --baca <path...> [--level=XS|S|M|L|XL]");
    process.exit(2);
  }
  let total = 0;
  let ada = 0;
  console.log("=== BACA: berkas yang masuk konteks ===");
  for (const f of argumen) {
    const x = ukur(f);
    total += x.b;
    if (x.ada) ada++;
    console.log(baris(x));
  }
  const kb = total / 1024;
  console.log(`  BACA: ${ada} berkas / ${kb.toFixed(1)} KB (${total} B)${ada < argumen.length ? ` (${argumen.length - ada} tidak ada)` : ""}`);
  const anggaran = level ? ANGGARAN_KB[level.toUpperCase()] : null;
  if (level && !anggaran) {
    console.log(`  level "${level}" tidak dikenal; anggaran tidak dinilai`);
    process.exitCode = 1;
  } else if (anggaran) {
    const [bawah, atas] = anggaran;
    if (kb >= bawah && kb <= atas) console.log(`  anggaran ${level.toUpperCase()} ${bawah}–${atas} KB: DI DALAM`);
    else if (kb < bawah) console.log(`  anggaran ${level.toUpperCase()} ${bawah}–${atas} KB: di bawah (tidak perlu dijelaskan)`);
    else console.log(`  anggaran ${level.toUpperCase()} ${bawah}–${atas} KB: DI ATAS${kb > atas * 1.2 ? " >20% — wajib satu baris alasan" : ""}`);
  }
  process.exit(process.exitCode ?? 0);
}

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
