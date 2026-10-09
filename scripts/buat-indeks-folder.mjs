#!/usr/bin/env node
// buat-indeks-folder.mjs — buat README.md indeks untuk folder dokumen yang belum punya.
//
// Isi tabel diturunkan dari berkas itu sendiri (judul H1 + baris blok baca bila ada),
// jadi indeks tidak pernah berbohong soal isi berkas. Berkas yang sudah ada TIDAK ditimpa
// kecuali diminta dengan --segarkan (dipasang 2026-10-07: sebelumnya klaim "dibuat ulang"
// di 5 indeks tidak bisa dieksekusi karena skrip selalu melewati berkas yang sudah ada).
//
// Pakai: node scripts/buat-indeks-folder.mjs [akar-repo] [--segarkan]
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

const argRoot = process.argv.slice(2).find((a) => !a.startsWith("--"));
const ROOT = resolve(argRoot ?? ".");
const SEGARKAN = process.argv.includes("--segarkan");
const FOLDER = ["docs/domain", "docs/operations", "docs/product", "docs/history", "docs/rencana", "docs/kerja"];

const judul = (isi) => (isi.match(/^#\s+(.+)$/m) || [, "(tanpa judul)"])[1].trim();
const ringkas = (isi) => {
  const m = isi.match(/^>\s*·?\s*(?:Baca kalau:?)\s*(.+)$/im) || isi.match(/^>\s*\*\*Blok baca\*\*.+?Baca kalau:\s*(.+)$/im);
  if (m) return m[1].trim().replace(/\|/g, "/").slice(0, 120);
  const s = isi.match(/^>\s*(?:Status:|\*\*Status\*\*)\s*(.+)$/im);
  return s ? s[1].trim().slice(0, 120) : "—";
};

for (const f of FOLDER) {
  const dir = join(ROOT, f.split("/").join(sep));
  if (!existsSync(dir)) { console.log(`  lewat (tidak ada): ${f}`); continue; }
  const out = join(dir, "README.md");
  if (existsSync(out) && !SEGARKAN) { console.log(`  sudah punya indeks: ${f}/README.md (pakai --segarkan untuk menyegarkan)`); continue; }
  // Indeks TIDAK mendaftarkan dirinya sendiri: ukurannya berubah justru karena tabel ini ditulis,
  // sehingga klaim KB-nya mustahil tepat (ditemukan 2026-10-07 — 3 baris selalu menyimpang ~0,2 KB).
  const berkas = readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "README.md").sort();
  const baris = berkas.map((n) => {
    const isi = readFileSync(join(dir, n), "utf8");
    const kb = (statSync(join(dir, n)).size / 1024).toFixed(1);
    return `| [${n}](${n}) | ${judul(isi)} | ${kb} KB | ${ringkas(isi)} |`;
  });
  const isi = [
    `# Indeks ${f.split("/").pop()} — daftar berkas & kapan dibaca`,
    "",
    "> **Blok baca** · Jenis: **indeks folder** · Status: **aktif (dihasilkan otomatis)** · Untuk siapa: agen/owner yang mencari berkas di folder ini",
    `> · Baca kalau: mencari berkas di \`${f}/\` tanpa membuka semuanya. · **Jangan** dibaca kalau: sudah tahu berkas tujuannya.`,
    "",
    `Isi tabel diturunkan langsung dari setiap berkas (judul + "baca kalau"), jadi tidak ada daftar yang bisa menyimpang. Dibuat ulang dengan \`node scripts/buat-indeks-folder.mjs --segarkan\`.`,
    "",
    "| Berkas | Judul | Ukuran | Kapan dibaca |",
    "|---|---|---:|---|",
    ...baris,
    "",
  ].join("\n");
  writeFileSync(out, isi, "utf8");
  console.log(`  dibuat: ${f}/README.md (${berkas.length} berkas terdaftar, ${(Buffer.byteLength(isi, "utf8") / 1024).toFixed(1)} KB)`);
}
